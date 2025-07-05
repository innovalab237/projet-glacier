import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/crypto.js';

const paymentCardSchema = new mongoose.Schema({
  lastFourDigits: {
    type: String,
    required: true,
    validate: {
      validator: val => /^\d{4}$/.test(val),
      message: 'Les 4 derniers chiffres doivent être valides'
    }
  },
  brand: {
    type: String,
    enum: ['visa', 'mastercard', 'orange_money', 'mtn_money', 'unknown']
  },
  token: {
    type: String,
    select: false // Ne jamais retourner ce champ dans les requêtes
  }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'La commande associée est requise']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le client est requis']
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [0.5, 'Le montant minimum est 0.5']
  },
  method: {
    type: String,
    required: true,
    enum: {
      values: ['cash', 'card', 'mobile_money', 'rfid', 'voucher'],
      message: 'Méthode de paiement {VALUE} non supportée'
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  cardDetails: {
    type: paymentCardSchema,
    required: function() {
      return this.method === 'card';
    }
  },
  mobileMoneyDetails: {
    phone: {
      type: String,
      validate: {
        validator: val => /^(77|76|70|78)\d{7}$/.test(val),
        message: 'Numéro de téléphone mobile money invalide'
      }
    },
    operator: {
      type: String,
      enum: ['orange', 'mtn', 'wave', 'free']
    }
  },
  rfidDetails: {
    cardUid: {
      type: String,
      set: encrypt,
      get: decrypt
    },
    previousBalance: Number,
    newBalance: Number
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  receiptNumber: String,
  refundReason: String,
  processedAt: Date,
  metadata: {
    ipAddress: String,
    deviceFingerprint: String
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    getters: true 
  },
  toObject: { 
    virtuals: true,
    getters: true 
  }
});

// Index pour les requêtes fréquentes
paymentSchema.index({ order: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, partialFilterExpression: { transactionId: { $exists: true } } });

// Middleware pre-save pour le numéro de reçu
paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.receiptNumber) {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    this.receiptNumber = `PAY-${datePart}-${randomPart}`;
  }
  next();
});

// Virtual pour le montant formaté
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.amount.toFixed(2)} FCFA`;
});

// Méthode pour effectuer un remboursement
paymentSchema.methods.processRefund = async function(amount, reason) {
  if (this.status !== 'completed') {
    throw new Error('Seuls les paiements complétés peuvent être remboursés');
  }

  if (amount > this.amount) {
    throw new Error('Le montant du remboursement ne peut excéder le paiement original');
  }

  this.refundReason = reason;
  
  if (amount === this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
    this.amount -= amount;
  }

  await this.save();
  return this;
};

// Méthode statique pour les statistiques
paymentSchema.statics.getDailySummary = async function(date = new Date()) {
  const start = new Date(date.setHours(0, 0, 0, 0));
  const end = new Date(date.setHours(23, 59, 59, 999));

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$method',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        method: '$_id',
        totalAmount: 1,
        count: 1,
        _id: 0
      }
    }
  ]);
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;