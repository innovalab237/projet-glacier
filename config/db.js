import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Établit la connexion à MongoDB avec gestion des erreurs
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      wtimeoutMS: 2500
    });

    logger.info(`✅ MongoDB connecté: ${conn.connection.host}`);

    mongoose.connection.on('connecting', () => {
      logger.debug('Tentative de connexion à MongoDB...');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Déconnecté de MongoDB!');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Reconnexion à MongoDB réussie');
    });

  } catch (err) {
    logger.error(`❌ Échec de connexion MongoDB: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;