const mongoose = require('mongoose');
const { Schema } = mongoose;

// Qualification produite par l'agent a partir de l'analyse de la conversation.
const LeadSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    niveauInteret: {
      type: String,
      enum: ['froid', 'tiede', 'chaud', 'pret_a_acheter'],
      default: 'tiede',
      index: true,
    },
    intention: {
      type: String,
      enum: ['simple_question', 'comparaison', 'demande_devis', 'intention_achat', 'reclamation', 'autre'],
      default: 'simple_question',
    },
    produitsInteret: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    besoinExprime: { type: String, default: '' },
    objections: [{ type: String }],
    necessiteHumain: { type: Boolean, default: false, index: true },
    raisonEscalade: { type: String, default: '' },
    statut: {
      type: String,
      enum: ['nouveau', 'en_cours', 'qualifie', 'converti', 'perdu'],
      default: 'nouveau',
      index: true,
    },
    resumePourHumain: { type: String, default: '' },
  },
  { timestamps: true }
);

LeadSchema.index({ boutiqueId: 1, statut: 1, niveauInteret: 1 });

module.exports = mongoose.model('Lead', LeadSchema);
