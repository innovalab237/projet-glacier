import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/crypto.js';

const rfidCardSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: [true, 'L\'UID de la carte est requis'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: val => /^[0-9A-F]{8,16}$/.test(val),
      message: 'UID RFID invalide (doit contenir 8-16 caractères hexadécimaux)'
    }
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le client associé est requis'],
    validate: {
      validator: async function(clientId) {
        const user = await mongoose.model('User').findById(clientId);
        return user && user.role === 'client';
      },
      message: 'Le client spécifié n\'existe pas ou n\'a pas le bon rôle'
    }
  },
  solde: {
    type: String,
    required: [true, 'Le solde est requis'],
    set: amount => encrypt(parseFloat(amount).toFixed(2)),
    get: amount => parseFloat(decrypt(amount))
  },
  isActive: {
    type: Boolean,
    default: true
  },
  cardType: {
    type: String,
    enum: ['standard', 'premium', 'family', 'vip'],
    default: 'standard'
  },
  lastRecharge: {
    amount: Number,
    date: Date,
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  transactionHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    amount: Number,
    type: {
      type: String,
      enum: ['recharge', 'purchase', 'refund']
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }],
  metadata: {
    issuedAt: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an
    },
    hardwareVersion: String
  }
}, {
  timestamps: true,
  toJSON: { getters: true, virtuals: true },
  toObject: { getters: true, virtuals: true }
});

// Index pour performances
rfidCardSchema.index({ uid: 1 }, { unique: true });
rfidCardSchema.index({ client: 1 });
rfidCardSchema.index({ isActive: 1 });
rfidCardSchema.index({ 'metadata.expiryDate': 1 });

// Middleware pour valider l'UID avant sauvegarde
rfidCardSchema.pre('save', function(next) {
  this.uid = this.uid.replace(/\s/g, '').toUpperCase();
  next();
});

// Virtual pour vérifier si la carte est expirée
rfidCardSchema.virtual('isExpired').get(function() {
  return this.metadata.expiryDate < new Date();
});

// Virtual pour le solde formaté
rfidCardSchema.virtual('formattedSolde').get(function() {
  return `${this.solde.toFixed(2)} FCFA`;
});

// Méthode pour recharger la carte
rfidCardSchema.methods.recharge = async function(amount, cashierId) {
  if (amount <= 0) {
    throw new Error('Le montant de recharge doit être positif');
  }

  if (!this.isActive) {
    throw new Error('Impossible de recharger une carte inactive');
  }

  if (this.isExpired) {
    throw new Error('Impossible de recharger une carte expirée');
  }

  const newBalance = this.solde + amount;

  this.solde = newBalance;
  this.lastRecharge = {
    amount,
    date: new Date(),
    cashier: cashierId
  };

  this.transactionHistory.push({
    amount,
    type: 'recharge'
  });

  await this.save();
  return this;
};

// Méthode pour débiter la carte
rfidCardSchema.methods.debit = async function(amount, orderId) {
  if (amount <= 0) {
    throw new Error('Le montant doit être positif');
  }

  if (amount > this.solde) {
    throw new Error('Solde insuffisant');
  }

  const newBalance = this.solde - amount;

  this.solde = newBalance;
  this.transactionHistory.push({
    amount,
    type: 'purchase',
    order: orderId
  });

  await this.save();
  return this;
};

// Méthode statique pour trouver les cartes avec solde faible
rfidCardSchema.statics.findLowBalanceCards = function(threshold = 1000) {
  return this.find({ 
    isActive: true,
    'metadata.expiryDate': { $gt: new Date() }
  }).where('solde').lt(threshold);
};

const RfidCard = mongoose.model('RfidCard', rfidCardSchema);

export default RfidCard;