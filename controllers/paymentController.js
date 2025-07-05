import PAYME_CONFIG from '../config/payme.js';
import Order from '../models/Order.js';
import RfidCard from '../models/RfidCard.js';
import logger from '../utils/logger.js';
import { decrypt } from '../utils/crypto.js';

const paymentController = {
  /**
   * Traiter un paiement mobile (Payme)
   */
  processMobilePayment: async (req, res) => {
    try {
      const { orderId, phone } = req.body;
      
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable' });
      }

      if (order.status === 'paid') {
        return res.status(400).json({ error: 'Commande déjà payée' });
      }

      // Effectuer le paiement via Payme
      const paymentResult = await PAYME_CONFIG.makePayment({
        amount: order.totalAmount,
        phone,
        orderId
      });

      // Mettre à jour la commande
      order.paymentStatus = 'paid';
      order.paymentDetails = {
        method: 'mobile_money',
        transactionId: paymentResult.transactionId,
        provider: 'Payme'
      };
      await order.save();

      logger.info(`Paiement mobile réussi pour la commande #${orderId}`);
      res.json({
        success: true,
        transactionId: paymentResult.transactionId
      });

    } catch (err) {
      logger.error(`Erreur paiement mobile: ${err.message}`);
      res.status(400).json({ 
        error: err.message || 'Échec du paiement mobile' 
      });
    }
  },

  /**
   * Traiter un paiement cash
   */
  processCashPayment: async (req, res) => {
    try {
      const { orderId, amountReceived } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable' });
      }

      if (amountReceived < order.totalAmount) {
        return res.status(400).json({ 
          error: `Montant insuffisant. Manque ${order.totalAmount - amountReceived} FCFA` 
        });
      }

      order.paymentStatus = 'paid';
      order.paymentDetails = {
        method: 'cash',
        amountReceived,
        change: amountReceived - order.totalAmount
      };
      await order.save();

      logger.info(`Paiement cash pour la commande #${orderId}`);
      res.json({
        success: true,
        change: order.paymentDetails.change
      });

    } catch (err) {
      logger.error(`Erreur paiement cash: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Callback Payme (webhook)
   */
  paymentCallback: async (req, res) => {
    try {
      const { transactionId, status } = req.body;

      // Validation de la signature Payme
      if (!PAYME_CONFIG.verifySignature(req)) {
        return res.status(401).send('Signature invalide');
      }

      if (status === 'completed') {
        await Order.updateOne(
          { 'paymentDetails.transactionId': transactionId },
          { $set: { paymentStatus: 'confirmed' } }
        );
        logger.info(`Paiement confirmé: ${transactionId}`);
      }

      res.sendStatus(200);

    } catch (err) {
      logger.error(`Erreur callback Payme: ${err.message}`);
      res.status(400).send('Erreur de traitement');
    }
  }
};

export default paymentController;