import User from '../models/User.js';
import RfidCard from '../models/RfidCard.js';
import { encrypt } from '../utils/crypto.js';
import logger from '../utils/logger.js';

const userController = {
  /**
   * Créer un nouvel utilisateur (Admin seulement)
   */
  createUser: async (req, res) => {
    try {
      const { email, password, name, phone, role } = req.body;

      // Validation des rôles
      const allowedRoles = ['client', 'caissier', 'serveur', 'cuisinier', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Rôle non autorisé' });
      }

      // Vérification email unique
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: 'Email déjà utilisé' });
      }

      // Création utilisateur
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        email,
        password: hashedPassword,
        name,
        phone,
        role
      });

      // Ne pas renvoyer le mot de passe
      const userResponse = user.toObject();
      delete userResponse.password;

      logger.info(`Utilisateur créé: ${user.email} (${user.role})`);
      res.status(201).json(userResponse);

    } catch (err) {
      logger.error(`Erreur création utilisateur: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Lister tous les utilisateurs (Admin)
   */
  getAllUsers: async (req, res) => {
    try {
      const { role } = req.query;
      const filter = role ? { role } : {};

      const users = await User.find(filter)
        .select('-password -__v')
        .lean();

      res.json(users);

    } catch (err) {
      logger.error(`Erreur récupération utilisateurs: ${err.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Obtenir un utilisateur spécifique
   */
  getUser: async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select('-password -__v')
        .populate('rfidCard', 'uid solde')
        .lean();

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }

      // Décrypter le solde RFID si existe
      if (user.rfidCard) {
        user.rfidCard.solde = decrypt(user.rfidCard.solde);
      }

      res.json(user);

    } catch (err) {
      logger.error(`Erreur récupération utilisateur: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Mettre à jour un utilisateur (Admin ou self-update)
   */
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const currentUser = req.user;

      // Vérification des permissions
      if (currentUser.role !== 'admin' && currentUser.id !== id) {
        return res.status(403).json({ error: 'Permission refusée' });
      }

      // Empêcher la modification du rôle sauf par admin
      if (updates.role && currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Seul un admin peut modifier les rôles' });
      }

      // Si modification du mot de passe
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }

      const user = await User.findByIdAndUpdate(id, updates, { 
        new: true,
        runValidators: true 
      }).select('-password -__v');

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }

      logger.info(`Utilisateur mis à jour: ${user.email}`);
      res.json(user);

    } catch (err) {
      logger.error(`Erreur mise à jour utilisateur: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Supprimer un utilisateur (Admin seulement)
   */
  deleteUser: async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }

      // Supprimer la carte RFID associée si existe
      await RfidCard.deleteOne({ clientId: user._id });

      logger.info(`Utilisateur supprimé: ${user.email}`);
      res.json({ message: 'Utilisateur supprimé avec succès' });

    } catch (err) {
      logger.error(`Erreur suppression utilisateur: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Associer une carte RFID à un utilisateur (Admin/Caissier)
   */
  assignRfidCard: async (req, res) => {
    try {
      const { userId, uid, initialBalance = 0 } = req.body;

      // Vérifier si l'utilisateur existe
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }

      // Vérifier si la carte existe déjà
      const existingCard = await RfidCard.findOne({ 
        $or: [{ uid }, { clientId: userId }] 
      });

      if (existingCard) {
        return res.status(409).json({ 
          error: existingCard.uid === uid 
            ? 'Cette carte est déjà enregistrée' 
            : 'Cet utilisateur a déjà une carte associée'
        });
      }

      // Créer la carte
      const card = await RfidCard.create({
        uid,
        clientId: userId,
        solde: encrypt(initialBalance)
      });

      logger.info(`Carte RFID ${uid} assignée à ${user.email}`);
      res.status(201).json({
        uid: card.uid,
        solde: initialBalance,
        client: {
          id: user._id,
          name: user.name
        }
      });

    } catch (err) {
      logger.error(`Erreur assignation carte RFID: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  }
};

export default userController;