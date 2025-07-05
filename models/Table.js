import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  number: {
    type: String,
    required: [true, 'Le numéro de table est requis'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^[A-Z]\d{1,2}$/.test(v);
      },
      message: 'Format de table invalide (ex: A1, B12)'
    }
  },
  capacity: {
    type: Number,
    required: [true, 'La capacité est requise'],
    min: [1, 'La capacité minimale est 1'],
    max: [12, 'La capacité maximale est 12']
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['available', 'occupied', 'reserved', 'maintenance'],
      message: 'Statut {VALUE} non valide'
    },
    default: 'available'
  },
  currentClients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function(clients) {
        return clients.length <= this.capacity;
      },
      message: 'Nombre de clients supérieur à la capacité'
    }
  }],
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  location: {
    type: String,
    required: true,
    enum: ['terrasse', 'salle_intérieure', 'bar', 'espace_vip']
  },
  features: {
    isWheelchairAccessible: {
      type: Boolean,
      default: false
    },
    hasPowerOutlet: Boolean,
    canMerge: Boolean
  },
  reservation: {
    clientName: String,
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return /^(77|76|70|78)\d{7}$/.test(v);
        },
        message: 'Numéro de téléphone invalide'
      }
    },
    time: Date,
    partySize: Number,
    notes: String
  },
  maintenanceNotes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimisation des requêtes
tableSchema.index({ number: 1 }, { unique: true });
tableSchema.index({ status: 1 });
tableSchema.index({ location: 1 });
tableSchema.index({ 'features.isWheelchairAccessible': 1 });

// Middleware pour valider le numéro de table
tableSchema.pre('save', function(next) {
  this.number = this.number.toUpperCase().trim();
  next();
});

// Virtual pour vérifier les places disponibles
tableSchema.virtual('availableSeats').get(function() {
  return this.capacity - this.currentClients.length;
});

// Virtual pour la durée d'occupation
tableSchema.virtual('occupationDuration').get(function() {
  if (this.status !== 'occupied') return 0;
  return (new Date() - this.updatedAt) / (1000 * 60); // en minutes
});

// Méthode pour assigner des clients
tableSchema.methods.assignClients = async function(clientIds) {
  if (clientIds.length > this.capacity) {
    throw new Error(`Capacité insuffisante (${this.capacity} max)`);
  }

  if (this.status === 'maintenance') {
    throw new Error('Table en maintenance');
  }

  this.currentClients = clientIds;
  this.status = 'occupied';
  await this.save();
  return this;
};

// Méthode pour libérer la table
tableSchema.methods.freeTable = async function() {
  this.currentClients = [];
  this.currentOrder = null;
  this.status = 'available';
  await this.save();
  return this;
};

// Méthode pour réserver la table
tableSchema.methods.reserve = async function(reservationData) {
  if (this.status !== 'available') {
    throw new Error('Table non disponible pour réservation');
  }

  this.reservation = reservationData;
  this.status = 'reserved';
  await this.save();
  return this;
};

// Méthode statique pour trouver les tables disponibles
tableSchema.statics.findAvailableTables = function(minCapacity = 1, location = null) {
  const query = { 
    status: 'available',
    capacity: { $gte: minCapacity }
  };

  if (location) {
    query.location = location;
  }

  return this.find(query).sort('capacity');
};

const Table = mongoose.model('Table', tableSchema);

export default Table;