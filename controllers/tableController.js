import Table from '../models/Table.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const tableController = {
  /**
   * Créer une table (Admin)
   */
  createTable: async (req, res) => {
    try {
      const { number, capacity } = req.body;

      if (capacity > 6) {
        return res.status(400).json({ error: 'Capacité maximale: 6 places' });
      }

      const table = await Table.create({ 
        number,
        capacity,
        status: 'available'
      });

      logger.info(`Table créée: ${table.number}`);
      res.status(201).json(table);

    } catch (err) {
      logger.error(`Erreur création table: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Assigner un client à une table (Caissier)
   */
  assignClient: async (req, res) => {
    try {
      const { tableId, clientId } = req.body;

      const [table, client] = await Promise.all([
        Table.findById(tableId),
        User.findById(clientId)
      ]);

      if (!table || !client) {
        return res.status(404).json({ error: 'Table ou client introuvable' });
      }

      if (table.clients.length >= table.capacity) {
        return res.status(400).json({ error: 'Table complète' });
      }

      // Vérifier si le client n'est pas déjà à une table
      const existingAssignment = await Table.findOne({ 
        clients: clientId,
        status: 'occupied' 
      });
      if (existingAssignment) {
        return res.status(400).json({ 
          error: 'Client déjà assigné à une table' 
        });
      }

      table.clients.push(clientId);
      table.status = 'occupied';
      await table.save();

      logger.info(`Client ${clientId} assigné à la table ${table.number}`);
      res.json(table);

    } catch (err) {
      logger.error(`Erreur assignation table: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Libérer une table (Serveur)
   */
  freeTable: async (req, res) => {
    try {
      const { tableId } = req.params;

      const table = await Table.findByIdAndUpdate(
        tableId,
        { 
          $set: { 
            status: 'available',
            clients: [] 
          } 
        },
        { new: true }
      );

      if (!table) {
        return res.status(404).json({ error: 'Table introuvable' });
      }

      logger.info(`Table libérée: ${table.number}`);
      res.json(table);

    } catch (err) {
      logger.error(`Erreur libération table: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Lister toutes les tables
   */
  getAllTables: async (req, res) => {
    try {
      const tables = await Table.find()
        .populate('clients', 'name phone')
        .lean();

      res.json(tables);

    } catch (err) {
      logger.error(`Erreur récupération tables: ${err.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};

export default tableController;