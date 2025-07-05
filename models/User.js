import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: 'Veuillez fournir un email valide'
    }
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le nom ne peut excéder 50 caractères']
  },
  phone: {
    type: String,
    required: [true, 'Le téléphone est obligatoire'],
    validate: {
      validator: function(v) {
        return /^(77|76|70|78)\d{7}$/.test(v);
      },
      message: 'Numéro de téléphone Sénégalais invalide'
    }
  },
  role: {
    type: String,
    required: true,
    enum: {
      values: ['client', 'caissier', 'serveur', 'cuisinier', 'admin'],
      message: 'Rôle {VALUE} non supporté'
    },
    default: 'client'
  },
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  lastLogin: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu.subMenus'
  }],
  preferences: {
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'wo']
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimisation
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ phone: 1 }, { unique: true });

// Middleware de hashage du mot de passe
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Middleware pour filtrer les utilisateurs inactifs
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

// Virtual pour le nom complet
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Méthode pour vérifier le mot de passe
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Méthode pour vérifier si le mot de passe a été changé après un certain temps
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Méthode pour générer un token de réinitialisation
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Méthode pour mettre à jour les statistiques
userSchema.methods.updateStats = async function(orderAmount) {
  this.stats.totalOrders += 1;
  this.stats.totalSpent += orderAmount;
  await this.save();
};

// Méthode statique pour trouver par rôle
userSchema.statics.findByRole = function(role) {
  return this.find({ role }).select('-password -__v');
};

const User = mongoose.model('User', userSchema);

export default User;