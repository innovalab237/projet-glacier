import Order from '../models/Order.js';
import Menu from '../models/Menu.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

const orderController = {
  /**
   * Créer une nouvelle commande (Client)
   */
  createOrder: async (req, res) => {
    try {
      const { table, items, notes } = req.body;
      const userId = req.user._id;

      // Validation des items
      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'La commande doit contenir au moins un article' });
      }

      // Vérification des items du menu
      const menuItems = await Menu.find({
        'subMenus._id': { $in: items.map(item => item.subMenuId) }
      });

      // Calcul du total et validation des items
      let totalAmount = 0;
      const validatedItems = items.map(item => {
        const menuItem = menuItems.flatMap(m => m.subMenus).find(s => s._id.equals(item.subMenuId));
        
        if (!menuItem) {
          throw new Error(`Article non trouvé: ${item.subMenuId}`);
        }
        if (!menuItem.isAvailable) {
          throw new Error(`Article non disponible: ${menuItem.name}`);
        }

        totalAmount += menuItem.price * item.quantity;
        return {
          subMenuId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity
        };
      });

      // Création de la commande
      const newOrder = new Order({
        user: userId,
        table,
        items: validatedItems,
        totalAmount,
        notes,
        status: 'pending',
        paymentStatus: 'pending'
      });

      await newOrder.save();
      logger.info(`Nouvelle commande créée: ${newOrder._id}`);

      res.status(201).json(newOrder);
    } catch (error) {
      logger.error(`Erreur création commande: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  },

  /**
   * Obtenir les commandes de l'utilisateur (Client)
   */
  getMyOrders: async (req, res) => {
    try {
      const orders = await Order.find({ user: req.user._id })
        .sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      logger.error(`Erreur récupération commandes: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Obtenir une commande spécifique (Client)
   */
  getOrder: async (req, res) => {
    try {
      res.json(req.order); // Middleware checkOwnership a déjà récupéré la commande
    } catch (error) {
      logger.error(`Erreur récupération commande: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Annuler une commande (Client)
   */
  cancelOrder: async (req, res) => {
    try {
      if (req.order.status !== 'pending') {
        return res.status(400).json({ error: 'Seules les commandes en attente peuvent être annulées' });
      }

      req.order.status = 'cancelled';
      await req.order.save();

      logger.info(`Commande annulée: ${req.order._id}`);
      res.json({ message: 'Commande annulée avec succès', order: req.order });
    } catch (error) {
      logger.error(`Erreur annulation commande: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Obtenir les commandes prêtes (Serveur)
   */
  getReadyOrders: async (req, res) => {
    try {
      const orders = await Order.find({ status: 'ready' })
        .sort({ readyAt: 1 })
        .populate('user', 'name');
      res.json(orders);
    } catch (error) {
      logger.error(`Erreur récupération commandes prêtes: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Marquer comme servie (Serveur)
   */
  markAsServed: async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      if (order.status !== 'ready') {
        return res.status(400).json({ error: 'Seules les commandes prêtes peuvent être servies' });
      }

      order.status = 'served';
      order.servedAt = new Date();
      order.servedBy = req.user._id;
      await order.save();

      logger.info(`Commande servie: ${order._id}`);
      res.json(order);
    } catch (error) {
      logger.error(`Erreur marquage comme servie: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Obtenir les commandes en cuisine (Cuisinier)
   */
  getKitchenOrders: async (req, res) => {
    try {
      const orders = await Order.find({ 
        status: { $in: ['pending', 'preparing'] } 
      })
      .sort({ createdAt: 1 })
      .populate('user', 'name');
      res.json(orders);
    } catch (error) {
      logger.error(`Erreur récupération commandes cuisine: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Commencer la préparation (Cuisinier)
   */
  startPreparation: async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      if (order.status !== 'pending') {
        return res.status(400).json({ error: 'Seules les commandes en attente peuvent être préparées' });
      }

      order.status = 'preparing';
      order.preparedBy = req.user._id;
      order.startedAt = new Date();
      await order.save();

      logger.info(`Préparation commencée: ${order._id}`);
      res.json(order);
    } catch (error) {
      logger.error(`Erreur début préparation: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Marquer comme prête (Cuisinier)
   */
  markAsReady: async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      if (order.status !== 'preparing') {
        return res.status(400).json({ error: 'Seules les commandes en préparation peuvent être marquées comme prêtes' });
      }

      order.status = 'ready';
      order.readyAt = new Date();
      await order.save();

      logger.info(`Commande prête: ${order._id}`);
      res.json(order);
    } catch (error) {
      logger.error(`Erreur marquage comme prête: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Obtenir les commandes en attente de paiement (Caissier)
   */
  getPendingPaymentOrders: async (req, res) => {
    try {
      const orders = await Order.find({ 
        status: 'served',
        paymentStatus: 'pending'
      })
      .sort({ servedAt: 1 })
      .populate('user', 'name');
      res.json(orders);
    } catch (error) {
      logger.error(`Erreur récupération commandes en attente: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Traiter le paiement (Caissier)
   */
  processPayment: async (req, res) => {
    try {
      const { paymentMethod } = req.body;
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      if (order.status !== 'served' || order.paymentStatus !== 'pending') {
        return res.status(400).json({ error: 'Paiement non autorisé pour cette commande' });
      }

      order.paymentStatus = 'paid';
      order.paymentMethod = paymentMethod;
      order.paidAt = new Date();
      order.cashier = req.user._id;
      await order.save();

      logger.info(`Paiement traité: ${order._id}`);
      res.json(order);
    } catch (error) {
      logger.error(`Erreur traitement paiement: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Obtenir toutes les commandes (Admin)
   */
  getAllOrders: async (req, res) => {
    try {
      const { status, startDate, endDate } = req.query;
      let query = {};

      if (status) query.status = status;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('user', 'name email');
      
      res.json(orders);
    } catch (error) {
      logger.error(`Erreur récupération toutes commandes: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Obtenir les statistiques quotidiennes (Admin)
   */
  getDailyStats: async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const stats = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      res.json(stats);
    } catch (error) {
      logger.error(`Erreur récupération stats quotidiennes: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Obtenir les articles les plus populaires (Admin)
   */
  getTopMenuItems: async (req, res) => {
    try {
      const { limit = 5, days } = req.query;
      let match = { paymentStatus: 'paid' };

      if (days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        match.createdAt = { $gte: startDate };
      }

      const topItems = await Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.subMenuId',
            name: { $first: '$items.name' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: parseInt(limit) }
      ]);

      res.json(topItems);
    } catch (error) {
      logger.error(`Erreur récupération top articles: ${error.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};

export default orderController;