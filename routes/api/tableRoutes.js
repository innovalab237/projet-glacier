import express from 'express';
import tableController from '../../controllers/tableController.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { uploadMenuImage as uploadTableImage, resizeMenuImage as resizeTableImage } from '../../middlewares/uploadMiddleware.js';

const router = express.Router();

// Protection globale des routes
router.use(authMiddleware.authenticate);

// Routes pour le personnel (serveurs/caissiers)
router.get('/available',
  authMiddleware.authorize('serveur', 'caissier', 'admin'),
  tableController.getAvailableTables
);

router.get('/occupied',
  authMiddleware.authorize('serveur', 'caissier', 'admin'),
  tableController.getOccupiedTables
);

router.patch('/:id/assign',
  authMiddleware.authorize('serveur', 'admin'),
  tableController.assignClientsToTable
);

router.patch('/:id/free',
  authMiddleware.authorize('serveur', 'admin'),
  tableController.freeTable
);

// Routes pour les réservations
router.post('/reserve',
  authMiddleware.authorize('client', 'serveur', 'admin'),
  tableController.reserveTable
);

router.patch('/reservations/:id/cancel',
  authMiddleware.authorize('client', 'serveur', 'admin'),
  tableController.cancelReservation
);

// Routes admin seulement
router.use(authMiddleware.authorize('admin'));

router.post('/',
  uploadTableImage.single('image'),
  resizeTableImage,
  tableController.createTable
);

router.get('/',
  tableController.getAllTables
);

router.get('/:id',
  tableController.getTableDetails
);

router.patch('/:id',
  uploadTableImage.single('image'),
  resizeTableImage,
  tableController.updateTable
);

router.delete('/:id',
  tableController.deleteTable
);

router.patch('/:id/merge',
  tableController.mergeTables
);

router.get('/stats/usage',
  tableController.getTableUsageStats
);

export default router;