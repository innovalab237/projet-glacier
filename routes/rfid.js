import express from 'express';
import rfidController from '../controllers/rfidController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { checkRfidOwnership } from '../middlewares/rfidMiddleware.js';

const router = express.Router();

// Protection globale des routes
router.use(authMiddleware.authenticate);

// Routes pour les clients
router.post('/verify',
  authMiddleware.authorize('client'),
  rfidController.verifyRfidCard
);

router.post('/pay',
  authMiddleware.authorize('client'),
  checkRfidOwnership,
  rfidController.processRfidPayment
);

// Routes pour les caissiers
router.post('/recharge',
  authMiddleware.authorize('caissier', 'admin'),
  rfidController.rechargeRfidCard
);

router.get('/client/:clientId',
  authMiddleware.authorize('caissier', 'admin'),
  rfidController.getClientRfidCards
);

// Routes admin
router.get('/',
  authMiddleware.authorize('admin'),
  rfidController.getAllRfidCards
);

router.get('/:cardId',
  authMiddleware.authorize('admin'),
  rfidController.getRfidCardDetails
);

router.patch('/:cardId/status',
  authMiddleware.authorize('admin'),
  rfidController.toggleCardStatus
);

router.delete('/:cardId',
  authMiddleware.authorize('admin'),
  rfidController.deleteRfidCard
);

// Webhook pour les lectures RFID (accès public)
router.post('/readings',
  rfidController.handleRfidReading
);

export default router;