import RfidCard from '../models/RfidCard.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import logger from '../utils/logger.js';

const rfidController = {
  /**
   * Vérifier une carte RFID
   */
  verifyRfidCard: async (req, res) => {
    try {
      const { uid } = req.body;

      const card = await RfidCard.findOne({ uid })
        .populate('clientId', 'name phone email');

      if (!card) {
        return res.json({ valid: false });
      }

      res.json({
        valid: true,
        balance: decrypt(card.solde),
        client: card.clientId
      });

    } catch (err) {
      logger.error(`Erreur vérification RFID: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Paiement par carte RFID
   */
  processRfidPayment: async (req, res) => {
    try {
      const { orderId, uid } = req.body;

      const [order, card] = await Promise.all([
        Order.findById(orderId),
        RfidCard.findOne({ uid })
      ]);

      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable' });
      }

      if (!card) {
        return res.status(400).json({ error: 'Carte invalide' });
      }

      const balance = decrypt(card.solde);
      if (balance < order.totalAmount) {
        return res.status(400).json({ 
          error: `Solde insuffisant (${balance} FCFA)` 
        });
      }

      // Débiter la carte
      const newBalance = balance - order.totalAmount;
      card.solde = encrypt(newBalance);
      await card.save();

      // Mettre à jour la commande
      order.paymentStatus = 'paid';
      order.paymentDetails = {
        method: 'rfid',
        cardUid: uid,
        previousBalance: balance,
        newBalance
      };
      await order.save();

      logger.info(`Paiement RFID réussi pour la commande #${orderId}`);
      res.json({ 
        success: true,
        newBalance
      });

    } catch (err) {
      logger.error(`Erreur paiement RFID: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Recharger une carte RFID (Caissier/Admin)
   */
  rechargeRfidCard: async (req, res) => {
    try {
      const { uid, amount } = req.body;

      const card = await RfidCard.findOne({ uid });
      if (!card) {
        return res.status(404).json({ error: 'Carte introuvable' });
      }

      const currentBalance = decrypt(card.solde);
      const newBalance = currentBalance + Number(amount);
      card.solde = encrypt(newBalance);
      await card.save();

      logger.info(`Carte ${uid} rechargée de ${amount} FCFA`);
      res.json({
        success: true,
        newBalance
      });

    } catch (err) {
      logger.error(`Erreur recharge RFID: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Obtenir toutes les cartes RFID
   */
  getAllRfidCards: async (req, res) => {
    res.json([]);
  },

  /**
   * Obtenir les détails d'une carte RFID
   */
  getRfidCardDetails: async (req, res) => {
    res.json({});
  },

  /**
   * Activer/Désactiver une carte RFID
   */
  toggleCardStatus: async (req, res) => {
    res.json({});
  },

  /**
   * Supprimer une carte RFID
   */
  deleteRfidCard: async (req, res) => {
    res.json({});
  },

  /**
   * Gérer la lecture RFID
   */
  handleRfidReading: async (req, res) => {
    res.json({});
  }
};

export default rfidController;