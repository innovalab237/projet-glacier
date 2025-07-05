/**
 * Middleware pour vérifier que l'utilisateur possède bien la carte RFID utilisée.
 * À utiliser sur les routes nécessitant une vérification de propriété de carte.
 */
import RfidCard from '../models/RfidCard.js';

export const checkRfidOwnership = async (req, res, next) => {
  try {
    const { cardId } = req.body;
    if (!cardId) {
      return res.status(400).json({ error: 'ID de carte RFID manquant.' });
    }

    const card = await RfidCard.findById(cardId);
    if (!card) {
      return res.status(404).json({ error: 'Carte RFID introuvable.' });
    }

    // Vérifie que la carte appartient bien à l'utilisateur connecté
    if (card.client.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé à cette carte RFID.' });
    }

    req.rfidCard = card;
    next();
  } catch (err) {
    next(err);
  }
};