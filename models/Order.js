import mongoose from 'mongoose';
import validator from 'validator';

const orderItemSchema = new mongoose.Schema({
  subMenuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu.subMenus',
    required: [true, 'Un élément de menu est requis']
  },
  name: {
    type: String,
    required: [true, 'Le nom de l\'article est requis']
  },
  quantity: {
    type: Number,
    required: [true, 'La quantité est requise'],
    min: [1, 'La quantité minimale est 1'],
    max: [20, 'La quantité maximale est 20']
  },
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix ne peut être négatif']
  },
  specialInstructions: {
    type: String,
    maxlength: [200, 'Les instructions ne peuvent dépasser 200 caractères']
  },
  customization: {
    type: Map,
    of: [String]
  }
}, { _id: false });

const paymentDetailsSchema = new mongoose.Schema({
  method: {
    type: String,
    required: [true, 'La méthode de paiement est requise'],
    enum: {
      values: ['cash', 'mobile_money', 'rfid', 'credit_card'],
      message: 'Méthode de paiement {VALUE} non supportée'
    }
  },
  transactionId: String,
  amountReceived: Number,
  change: Number,
  provider: String,
  cardLastFour: {
    type: String,
    validate: {
      validator: val => /^\d{4}$/.test(val),
      message: 'Les 4 derniers chiffres de la carte sont invalides'
    }
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le client est requis']
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: function() {
      return !this.isTakeaway;
    }
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: items => items.length > 0 && items.length <= 15,
      message: 'Une commande doit contenir entre 1 et 15 articles'
    }
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled', 'completed'],
      message: 'Statut {VALUE} non valide'
    },
    default: 'pending'
  },
  payment: {
    type: paymentDetailsSchema,
    required: function() {
      return this.status === 'completed' || this.status === 'served';
    }
  },
  isTakeaway: {
    type: Boolean,
    default: false
  },
  preparationNotes: String,
  estimatedReadyTime: Date,
  actualReadyTime: Date,
  servedTime: Date,
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimisation
orderSchema.index({ client: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ table: 1, status: 1 });

// Middleware pour calculer le temps de préparation estimé
orderSchema.pre('save', async function(next) {
  if (this.isModified('items') && this.items.length > 0) {
    const menuItems = await this.model('Menu').find({
      'subMenus._id': { $in: this.items.map(i => i.subMenuId) }
    });
    
    const totalPrepTime = this.items.reduce((total, item) => {
      const menuItem = menuItems.find(m => 
        m.subMenus.some(s => s._id.equals(item.subMenuId))
      );
      const subMenu = menuItem?.subMenus?.find(s => s._id.equals(item.subMenuId));
      return total + (subMenu?.preparationTime || 5) * item.quantity;
    }, 0);
    
    this.estimatedReadyTime = new Date(Date.now() + totalPrepTime * 60000);
  }
  next();
});

// Virtual pour le total de la commande
orderSchema.virtual('totalAmount').get(function() {
  return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

// Méthode pour annuler une commande
orderSchema.methods.cancelOrder = async function(reason) {
  if (this.status === 'served' || this.status === 'completed') {
    throw new Error('Impossible d\'annuler une commande déjà servie');
  }
  
  this.status = 'cancelled';
  this.preparationNotes = `Annulée: ${reason}`;
  await this.save();
  return this;
};

// Méthode statique pour les commandes en cours
orderSchema.statics.findCurrentOrders = function() {
  return this.find({
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
  }).sort({ estimatedReadyTime: 1 });
};

const Order = mongoose.model('Order', orderSchema);

export default Order;