import express from 'express';
import userController from '../../controllers/userController.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { uploadUserPhoto, resizeUserPhoto } from '../../middlewares/uploadMiddleware.js';

const router = express.Router();

// Routes publiques
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.patch('/reset-password/:token', userController.resetPassword);

// Protection globale des routes suivantes
router.use(authMiddleware.authenticate);

// Routes utilisateur connecté
router.get('/me', userController.getMe);
router.patch('/update-me',
  uploadUserPhoto.single('photo'),
  resizeUserPhoto,
  userController.updateMe
);
router.patch('/update-password', userController.updatePassword);
router.delete('/delete-me', userController.deleteMe);

// Routes RFID (client + staff)
router.post('/rfid/link', userController.linkRfidCard);
router.get('/rfid/:cardId', userController.getRfidCardInfo);

// Routes pour le staff (caissiers, serveurs, cuisiniers)
router.use(authMiddleware.authorize('caissier', 'serveur', 'cuisinier', 'admin'));

router.get('/clients', userController.getAllClients);
router.get('/clients/:id', userController.getClient);

// Routes admin seulement
router.use(authMiddleware.authorize('admin'));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUser);
router.patch('/:id',
  uploadUserPhoto.single('photo'),
  resizeUserPhoto,
  userController.updateUser
);
router.delete('/:id', userController.deleteUser);
router.patch('/:id/role', userController.updateUserRole);
router.patch('/:id/activate', userController.toggleUserStatus);

export default router;