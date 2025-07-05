import Menu from '../models/Menu.js';
import logger from '../utils/logger.js';

const menuController = {
  /**
   * Créer un nouveau menu (Admin seulement)
   */
  createMenu: async (req, res) => {
    try {
      const { name, subMenus } = req.body;

      const menu = await Menu.create({
        name,
        subMenus: subMenus.map(sub => ({
          name: sub.name,
          price: sub.price,
          image: sub.image || null,
          isAvailable: sub.isAvailable !== false
        }))
      });

      logger.info(`Menu créé: ${menu.name}`);
      res.status(201).json(menu);

    } catch (err) {
      logger.error(`Erreur création menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Lister tous les menus (Public)
   */
  getAllMenus: async (req, res) => {
    try {
      const menus = await Menu.find({})
        .select('-__v')
        .lean();

      // Formater les prix
      const formattedMenus = menus.map(menu => ({
        ...menu,
        subMenus: menu.subMenus.map(sub => ({
          ...sub,
          price: Number(sub.price).toFixed(2)
        }))
      }));

      res.json(formattedMenus);

    } catch (err) {
      logger.error(`Erreur récupération menus: ${err.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Récupérer un menu par ID
   */
  getMenu: async (req, res) => {
    try {
      const menu = await Menu.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ error: 'Menu non trouvé' });
      }
      res.json(menu);
    } catch (err) {
      logger.error(`Erreur récupération menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Lister les catégories de menus (extraction des noms)
   */
  getMenuCategories: async (req, res) => {
    try {
      const menus = await Menu.find({}).select('name');
      const categories = menus.map(menu => menu.name);
      res.json(categories);
    } catch (err) {
      logger.error(`Erreur récupération catégories: ${err.message}`);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  /**
   * Lister les menus par catégorie
   */
  getMenusByCategory: async (req, res) => {
    try {
      const menus = await Menu.find({ name: req.params.category });
      res.json(menus);
    } catch (err) {
      logger.error(`Erreur récupération menus par catégorie: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Mettre à jour un menu
   */
  updateMenu: async (req, res) => {
    try {
      const { name, subMenus } = req.body;
      const updateData = { name };
      if (subMenus) updateData.subMenus = subMenus;

      const menu = await Menu.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!menu) {
        return res.status(404).json({ error: 'Menu non trouvé' });
      }

      logger.info(`Menu mis à jour: ${menu._id}`);
      res.json(menu);

    } catch (err) {
      logger.error(`Erreur mise à jour menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Supprimer un menu
   */
  deleteMenu: async (req, res) => {
    try {
      const menu = await Menu.findByIdAndDelete(req.params.id);
      if (!menu) {
        return res.status(404).json({ error: 'Menu non trouvé' });
      }
      logger.info(`Menu supprimé: ${menu._id}`);
      res.json({ message: 'Menu supprimé' });
    } catch (err) {
      logger.error(`Erreur suppression menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Ajouter un sous-menu à un menu
   */
  addSubMenu: async (req, res) => {
    try {
      const { menuId } = req.params;
      const { name, price, image, isAvailable } = req.body;

      const menu = await Menu.findById(menuId);
      if (!menu) {
        return res.status(404).json({ error: 'Menu non trouvé' });
      }

      menu.subMenus.push({ name, price, image, isAvailable });
      await menu.save();

      logger.info(`Sous-menu ajouté au menu: ${menuId}`);
      res.status(201).json(menu);

    } catch (err) {
      logger.error(`Erreur ajout sous-menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Mettre à jour un sous-menu (Admin)
   */
  updateSubMenu: async (req, res) => {
    try {
      const { menuId, subMenuId } = req.params;
      const updateData = req.body;

      const menu = await Menu.findOneAndUpdate(
        { _id: menuId, 'subMenus._id': subMenuId },
        { $set: { 
          'subMenus.$.name': updateData.name,
          'subMenus.$.price': updateData.price,
          'subMenus.$.isAvailable': updateData.isAvailable
        }},
        { new: true }
      );

      if (!menu) {
        return res.status(404).json({ error: 'Menu non trouvé' });
      }

      logger.info(`Sous-menu mis à jour: ${subMenuId}`);
      res.json(menu);

    } catch (err) {
      logger.error(`Erreur mise à jour sous-menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Supprimer un sous-menu
   */
  deleteSubMenu: async (req, res) => {
    try {
      const { menuId, subMenuId } = req.params;
      const menu = await Menu.findById(menuId);
      if (!menu) {
        return res.status(404).json({ error: 'Menu non trouvé' });
      }
      menu.subMenus = menu.subMenus.filter(sub => sub._id.toString() !== subMenuId);
      await menu.save();
      logger.info(`Sous-menu supprimé: ${subMenuId}`);
      res.json(menu);
    } catch (err) {
      logger.error(`Erreur suppression sous-menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Changer la disponibilité d'un menu
   */
  toggleMenuAvailability: async (req, res) => {
    try {
      const menu = await Menu.findById(req.params.id);
      if (!menu) {
        return res.status(404).json({ error: 'Menu non trouvé' });
      }
      menu.isAvailable = !menu.isAvailable;
      await menu.save();
      logger.info(`Disponibilité menu changée: ${menu._id}`);
      res.json(menu);
    } catch (err) {
      logger.error(`Erreur changement disponibilité menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  },

  /**
   * Changer la disponibilité d'un sous-menu
   */
  toggleSubMenuAvailability: async (req, res) => {
    try {
      const { menuId, subMenuId } = req.params;
      const menu = await Menu.findById(menuId);
      if (!menu) {
        return res.status(404).json({ error: 'Menu non trouvé' });
      }
      const subMenu = menu.subMenus.id(subMenuId);
      if (!subMenu) {
        return res.status(404).json({ error: 'Sous-menu non trouvé' });
      }
      subMenu.isAvailable = !subMenu.isAvailable;
      await menu.save();
      logger.info(`Disponibilité sous-menu changée: ${subMenuId}`);
      res.json(menu);
    } catch (err) {
      logger.error(`Erreur changement disponibilité sous-menu: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  }
};

export default menuController;