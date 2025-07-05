import bcrypt from 'bcryptjs';
import JWT_CONFIG from '../config/jwt.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const authController = {
  /**
   * Inscription d'un nouvel utilisateur
   */
  register: async (req, res) => {
    try {
      const { email, password, role, name, phone } = req.body;

      // Vérification des champs requis
      if (!email || !password || !role || !name || !phone) {
        return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
      }

      // Validation des rôles autorisés
      const allowedRoles = ['client', 'caissier', 'serveur', 'cuisinier', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }

      // Vérification de la longueur du mot de passe
      if (password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: 'Email déjà utilisé' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        email,
        password: hashedPassword,
        role,
        name,
        phone
      });

      // Ne pas renvoyer le mot de passe
      const userResponse = user.toObject();
      delete userResponse.password;

      logger.info(`Nouvel utilisateur créé: ${user.email}`);
      res.status(201).json(userResponse);

    } catch (err) {
      logger.error(`Erreur d'inscription: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Connexion utilisateur
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis.' });
      }

      const user = await User.findOne({ email }).select('+password +active');
      if (!user) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      // Vérifie si le compte est actif
      if (user.active === false) {
        return res.status(403).json({ error: 'Compte désactivé' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Identifiants invalides' });
      }

      const token = JWT_CONFIG.sign({
        id: user._id,
        role: user.role,
        email: user.email
      });

      // Cookie sécurisé en production
      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1 heure
      });

      logger.info(`Connexion réussie: ${user.email}`);
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          role: user.role
        }
      });

    } catch (err) {
      logger.error(`Erreur de connexion: ${err.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Déconnexion
   */
  logout: (req, res) => {
    res.clearCookie('jwt');
    logger.info('Utilisateur déconnecté');
    res.json({ message: 'Déconnecté avec succès' });
  }
};

export default authController;