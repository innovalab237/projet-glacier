/**
 * Middleware pour vérifier que la commande existe et l'attacher à la requête.
 * @param {Model} OrderModel - Le modèle Mongoose de la commande.
 */
export function attachOrder(OrderModel) {
  return async (req, res, next) => {
    try {
      const order = await OrderModel.findById(req.params.orderId || req.body.orderId);
      if (!order) {
        return res.status(404).json({ error: 'Commande introuvable' });
      }
      req.order = order;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware pour vérifier que la commande n'est pas déjà payée.
 */
export function checkOrderNotPaid(req, res, next) {
  if (req.order && req.order.paymentStatus === 'paid') {
    return res.status(400).json({ error: 'Commande déjà payée' });
  }
  next();
}