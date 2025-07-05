import express from 'express';
import authController from '../../controllers/authController.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Limiteur de requêtes pour les routes sensibles
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max
  message: 'Trop de tentatives depuis cette IP, veuillez réessayer plus tard',
  skipSuccessfulRequests: true
});

// Routes publiques
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Les routes suivantes nécessitent d'être implémentées dans le contrôleur
// Si elles ne le sont pas, commente-les ou ajoute des stubs dans le contrôleur

// router.post('/forgot-password', authLimiter, authController.forgotPassword);
// router.patch('/reset-password/:token', authLimiter, authController.resetPassword);

// Routes protégées (nécessitent un JWT valide)
router.use(authMiddleware.authenticate);

// router.patch('/update-password', authController.updatePassword);
// router.get('/me', authController.getMe, authController.getUser);
// router.patch('/update-me', authController.uploadUserPhoto, authController.resizeUserPhoto, authController.updateMe);
// router.delete('/delete-me', authController.deleteMe);

// Routes réservées aux admins
router.use(authMiddleware.authorize('admin'));

// router.get('/', authController.getAllUsers);
// router.get('/:id', authController.getUser);
// router.patch('/:id', authController.updateUser);
// router.delete('/:id', authController.deleteUser);

export default router;