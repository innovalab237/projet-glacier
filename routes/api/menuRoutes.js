import express from 'express';
import menuController from '../../controllers/menuController.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { uploadMenuImage, resizeMenuImage } from '../../middlewares/uploadMiddleware.js';

const router = express.Router();

// Routes publiques (lecture seulement)
router.get('/', menuController.getAllMenus);
router.get('/categories', menuController.getMenuCategories);
router.get('/:id', menuController.getMenu);
router.get('/category/:category', menuController.getMenusByCategory);

// Routes protégées - Requièrent un JWT valide
router.use(authMiddleware.authenticate);

// Routes réservées aux administrateurs
router.use(authMiddleware.authorize('admin', 'cuisinier'));

router.post('/',
  uploadMenuImage,
  resizeMenuImage,
  menuController.createMenu
);

router.patch('/:id',
  uploadMenuImage,
  resizeMenuImage,
  menuController.updateMenu
);

router.delete('/:id', menuController.deleteMenu);

// Routes pour les sous-menus
router.post('/:menuId/submenus', menuController.addSubMenu);
router.patch('/:menuId/submenus/:subMenuId', menuController.updateSubMenu);
router.delete('/:menuId/submenus/:subMenuId', menuController.deleteSubMenu);

// Routes spéciales pour la disponibilité
router.patch('/:id/availability', menuController.toggleMenuAvailability);
router.patch('/:menuId/submenus/:subMenuId/availability', menuController.toggleSubMenuAvailability);

export default router;