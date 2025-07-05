import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const JWT_CONFIG = {
  /**
   * Génère un token JWT signé
   * @param {Object} payload - Données à encoder
   * @returns {String} Token JWT
   */
  sign: (payload) => {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN,
        algorithm: 'HS256'
      }
    );
  },

  /**
   * Vérifie et décode un token JWT
   * @param {String} token - Token à vérifier
   * @returns {Object|null} Données décodées ou null
   */
  verify: (token) => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      logger.error(`Erreur JWT: ${err.message}`);
      return null;
    }
  },

  /**
   * Middleware Express pour l'authentification JWT
   */
  middleware: (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Accès non autorisé' });
    }

    const decoded = JWT_CONFIG.verify(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    req.user = decoded;
    next();
  }
};

export default JWT_CONFIG;