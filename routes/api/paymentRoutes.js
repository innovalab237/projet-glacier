import express from 'express';
import paymentController from '../../controllers/paymentController.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
//import { attachOrder, checkOrderNotPaid} from '../../middlewares/orderMiddleware.js';
import { checkOwnership } from '../../middlewares/ownershipMiddleware.js';
import orderController from '../../controllers/orderController.js';

const router = express.Router();

// Protection globale des routes
router.use(authMiddleware.authenticate);

// Routes pour les paiements clients
router.post('/process',
  authMiddleware.authorize('client'),
  checkOwnership,
  paymentController.processPayment
);

router.post('/mobile-money',
  authMiddleware.authorize('client'),
  checkOwnership,
  paymentController.processMobilePayment
);

router.post('/rfid',
  authMiddleware.authorize('client'),
  checkOwnership,
  paymentController.processRfidPayment
);

// Routes pour les recharges RFID
router.post('/rfid/recharge',
  authMiddleware.authorize('caissier', 'admin'),
  paymentController.rechargeRfidCard
);

router.get('/rfid/balance/:cardId',
  authMiddleware.authorize('client', 'caissier', 'admin'),
  paymentController.getRfidBalance
);

// Routes caissier
router.post('/cash',
  authMiddleware.authorize('caissier'),
  paymentController.processCashPayment
);

router.post('/refund',
  authMiddleware.authorize('caissier', 'admin'),
  paymentController.processRefund
);

// Routes admin (rapports et gestion)
router.get('/daily-report',
  authMiddleware.authorize('admin'),
  paymentController.getDailyPaymentsReport
);

router.get('/monthly-summary',
  authMiddleware.authorize('admin'),
  paymentController.getMonthlySummary
);

// Webhook pour les paiements externes
router.post('/webhook/payme',
  paymentController.handlePaymeWebhook
);

router.post('/webhook/mtn',
  paymentController.handleMtnWebhook
);

router.get('/:id',
  authMiddleware.authorize('client'),
  checkOwnership(Order),
  orderController.getOrder
);

export default router;