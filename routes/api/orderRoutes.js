import express from 'express';
import orderController from '../../controllers/orderController.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { checkOwnership } from '../../middlewares/ownershipMiddleware.js';
import Order from '../../models/Order.js';

const router = express.Router();

// Protection globale des routes
router.use(authMiddleware.authenticate);

// Routes clients
router.post('/',
  authMiddleware.authorize('client'),
  orderController.createOrder
);

router.get('/my-orders',
  authMiddleware.authorize('client'),
  orderController.getMyOrders
);

router.get('/:id',
  authMiddleware.authorize('client'),
  checkOwnership(Order),
  orderController.getOrder
);

router.patch('/:id/cancel',
  authMiddleware.authorize('client'),
  checkOwnership(Order),
  orderController.cancelOrder
);

// Routes serveurs
router.get('/current/ready',
  authMiddleware.authorize('serveur'),
  orderController.getReadyOrders
);

router.patch('/:id/serve',
  authMiddleware.authorize('serveur'),
  orderController.markAsServed
);

// Routes cuisiniers
router.get('/current/kitchen',
  authMiddleware.authorize('cuisinier'),
  orderController.getKitchenOrders
);

router.patch('/:id/prepare',
  authMiddleware.authorize('cuisinier'),
  orderController.startPreparation
);

router.patch('/:id/ready',
  authMiddleware.authorize('cuisinier'),
  orderController.markAsReady
);

// Routes caissiers
router.get('/current/pending-payment',
  authMiddleware.authorize('caissier'),
  orderController.getPendingPaymentOrders
);

router.patch('/:id/process-payment',
  authMiddleware.authorize('caissier'),
  orderController.processPayment
);

// Routes admin
router.get('/',
  authMiddleware.authorize('admin'),
  orderController.getAllOrders
);

router.get('/stats/daily',
  authMiddleware.authorize('admin'),
  orderController.getDailyStats
);

router.get('/stats/top-items',
  authMiddleware.authorize('admin'),
  orderController.getTopMenuItems
);

export default router;