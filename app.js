import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger.js';
import connectDB from './config/db.js';

// Import des routes
import authRoutes from './routes/api/authRoutes.js';
import menuRoutes from './routes/api/menuRoutes.js';
import orderRoutes from './routes/api/orderRoutes.js';
import paymentRoutes from './routes/api/paymentRoutes.js';
import tableRoutes from './routes/api/tableRoutes.js';
import userRoutes from './routes/api/userRoutes.js';
import rfidRoutes from './routes/rfid.js';

// Configuration initiale
const app = express();

// Connexion à la base de données
connectDB();

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Limite les requêtes à 100 par fenêtre de 15 minutes
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

// Middlewares de base
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rfid', rfidRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs 404
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint non trouvé' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  logger.error(`Erreur non gérée: ${err.stack}`);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Serveur démarré en mode ${process.env.NODE_ENV} sur le port ${PORT}`);
  logger.info(`URL de base: ${process.env.API_BASE_URL}`);
});