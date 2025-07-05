import JWT_CONFIG from '../config/jwt.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const authMiddleware = {
  /**
   * Authentification JWT de base
   */
  authenticate: async (req, res, next) => {
    try {
      // 1. Récupération du token
      let token;
      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
      ) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
      }

      if (!token) {
        logger.warn('Tentative d\'accès non authentifiée');
        return res.status(401).json({ 
          error: 'Veuillez vous connecter pour accéder à cette ressource' 
        });
      }

      // 2. Vérification du token
      const decoded = JWT_CONFIG.verify(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
      }

      // 3. Vérification de l'existence de l'utilisateur
      const currentUser = await User.findById(decoded.id).select('+active');
      if (!currentUser || !currentUser.active) {
        return res.status(401).json({ error: 'Utilisateur non trouvé ou désactivé' });
      }

      // 4. Ajout de l'utilisateur à la requête
      req.user = {
        id: currentUser._id,
        email: currentUser.email,
        role: currentUser.role,
        name: currentUser.name
      };

      next();
    } catch (err) {
      logger.error(`Erreur d'authentification: ${err.message}`);
      res.status(401).json({ error: 'Échec de l\'authentification' });
    }
  },

  /**
   * Vérification des rôles autorisés
   */
  authorize: (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        logger.warn('Tentative d\'autorisation sans authentification');
        return res.status(401).json({ error: 'Non authentifié' });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(
          `Accès refusé pour ${req.user.email} (rôle: ${req.user.role}) ` +
          `à la route: ${req.originalUrl}`
        );
        return res.status(403).json({ 
          error: 'Vous n\'avez pas les droits nécessaires' 
        });
      }

      next();
    };
  },

  /**
   * Protection contre les attaques par force brute
   */
  loginLimiter: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives max
    handler: (req, res) => {
      logger.warn(
        `Trop de tentatives de connexion depuis l'IP: ${req.ip} ` +
        `pour l'email: ${req.body.email}`
      );
      res.status(429).json({
        error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes'
      });
    }
  },

  /**
   * Vérification de la propriété ou des droits admin
   */
  checkOwnership: (model, paramName = 'id') => {
    return async (req, res, next) => {
      try {
        const doc = await model.findById(req.params[paramName]);

        if (!doc) {
          return res.status(404).json({ error: 'Ressource introuvable' });
        }

        // Admin peut tout faire
        if (req.user.role === 'admin') return next();

        // Vérifier si l'utilisateur est le propriétaire
        if (doc.user && doc.user.toString() !== req.user.id) {
          return res.status(403).json({ 
            error: 'Vous n\'êtes pas autorisé à modifier cette ressource' 
          });
        }

        // Vérification spéciale pour les cartes RFID
        if (model.modelName === 'RfidCard' && doc.clientId.toString() !== req.user.id) {
          return res.status(403).json({ error: 'Carte RFID non associée à ce compte' });
        }

        next();
      } catch (err) {
        logger.error(`Erreur vérification propriété: ${err.message}`);
        res.status(500).json({ error: 'Erreur serveur' });
      }
    };
  },

  /**
   * Middleware pour les comptes inactifs
   */
  checkActiveStatus: async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user.active) {
      return res.status(403).json({ 
        error: 'Votre compte est désactivé. Contactez l\'administrateur.' 
      });
    }
    next();
  }
};

export default authMiddleware;