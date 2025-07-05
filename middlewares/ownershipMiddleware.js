//import { checkOwnership } from '../../middlewares/ownershipMiddleware.js';

/**
 * Middleware pour vérifier que l'utilisateur authentifié est bien le propriétaire de la ressource.
 * @param {Model} Model - Le modèle Mongoose à vérifier (ex: Order, RfidCard, etc.)
 * @param {string} ownerField - Le champ du propriétaire dans le modèle (par défaut 'client')
 */
export function checkOwnership(Model, ownerField = 'client') {
  return async (req, res, next) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: 'Ressource non trouvée' });
      }
      if (doc[ownerField].toString() !== req.user.id) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

