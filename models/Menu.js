import mongoose from 'mongoose';
import validator from 'validator';

const subMenuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du sous-menu est obligatoire'],
    trim: true,
    maxlength: [50, 'Le nom ne peut dépasser 50 caractères'],
    minlength: [3, 'Le nom doit avoir au moins 3 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La description ne peut dépasser 200 caractères']
  },
  price: {
    type: Number,
    required: [true, 'Le prix est obligatoire'],
    min: [0, 'Le prix ne peut être négatif'],
    set: v => parseFloat(v.toFixed(2)) // Stocke avec 2 décimales
  },
  image: {
    type: String,
    validate: {
      validator: value => validator.isURL(value, { protocols: ['http','https'], require_protocol: true }),
      message: 'URL d\'image invalide'
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  ingredients: {
    type: [String],
    validate: {
      validator: function(arr) {
        return arr.every(ing => ing.length >= 2 && ing.length <= 30);
      },
      message: 'Chaque ingrédient doit avoir entre 2 et 30 caractères'
    }
  },
  allergens: {
    type: [String],
    enum: ['gluten', 'lactose', 'nuts', 'eggs', 'soy', 'none'],
    default: ['none']
  },
  preparationTime: { // en minutes
    type: Number,
    min: [1, 'Le temps minimum est 1 minute'],
    max: [1440, 'Le temps maximum est 24 heures']
  }
}, { _id: true }); // Garde les _id pour les sous-menus

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du menu est obligatoire'],
    unique: true,
    trim: true,
    maxlength: 50
  },
  category: {
    type: String,
    required: true,
    enum: {
      values: ['glaces', 'boissons', 'jeux', 'desserts', 'snacks'],
      message: 'Catégorie {VALUE} non supportée'
    }
  },
  subMenus: {
    type: [subMenuSchema],
    validate: {
      validator: function(arr) {
        return arr.length > 0 && arr.length <= 10; // Max 10 sous-menus
      },
      message: 'Un menu doit avoir entre 1 et 10 sous-menus'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    min: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches
menuSchema.index({ name: 1, category: 1 });
menuSchema.index({ isActive: 1, displayOrder: 1 });

// Middleware pour mettre à jour la date de modification
menuSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual pour compter les sous-menus disponibles
menuSchema.virtual('availableItemsCount').get(function() {
  return this.subMenus.filter(item => item.isAvailable).length;
});

// Méthode pour désactiver un menu
menuSchema.methods.toggleAvailability = async function() {
  this.isActive = !this.isActive;
  await this.save();
  return this;
};

// Méthode statique pour trouver par catégorie
menuSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true })
    .sort({ displayOrder: 1 })
    .select('-isActive -__v');
};

const Menu = mongoose.model('Menu', menuSchema);

export default Menu;