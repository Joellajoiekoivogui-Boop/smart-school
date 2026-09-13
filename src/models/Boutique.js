const mongoose = require('mongoose');
const { Schema } = mongoose;

const BoutiqueSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    secteur: {
      type: String,
      enum: ['boutique_generale', 'pharmacie', 'vetements', 'electronique', 'restaurant', 'services', 'autre'],
      default: 'autre',
    },
    whatsappNumber: { type: String, required: true, unique: true, index: true },
    devise: { type: String, default: 'GNF' },
    responsable: {
      nom: String,
      telephone: String,
      email: String,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Boutique', BoutiqueSchema);
