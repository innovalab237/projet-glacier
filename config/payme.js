import axios from 'axios';
import logger from '../utils/logger.js';

const PAYME_CONFIG = {
  baseURL: process.env.PAYME_SANDBOX === 'true'
    ? 'https://test.payme.api'
    : 'https://api.payme.com',

  headers: {
    'X-Auth': process.env.PAYME_MERCHANT_ID,
    'Content-Type': 'application/json'
  },

  /**
   * Effectue un paiement via Payme
   * @param {Object} paymentData - { amount, phone, orderId }
   * @returns {Object} Réponse Payme
   */
  makePayment: async (paymentData) => {
    try {
      const payload = {
        amount: paymentData.amount * 100, // Conversion en centimes
        phone: paymentData.phone,
        order_id: paymentData.orderId,
        callback_url: `${process.env.API_BASE_URL}/payments/callback`
      };

      const response = await axios.post('/payment', payload, {
        baseURL: PAYME_CONFIG.baseURL,
        headers: {
          ...PAYME_CONFIG.headers,
          'X-Api-Key': process.env.PAYME_API_KEY
        }
      });

      logger.info(`Paiement Payme réussi: ${paymentData.orderId}`);
      return response.data;

    } catch (err) {
      logger.error(`Erreur Payme: ${err.response?.data?.message || err.message}`);
      throw new Error('Échec du paiement Payme');
    }
  },

  /**
   * Vérifie le statut d'un paiement
   */
  checkPaymentStatus: async (paymentId) => {
    // Implémentation similaire à makePayment
  }
};

export default PAYME_CONFIG;