const mongoose = require('mongoose');
const { Schema } = mongoose;

const ConversationSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    statut: {
      type: String,
      enum: ['ouverte', 'en_attente_relance', 'transferee_humain', 'cloturee'],
      default: 'ouverte',
      index: true,
    },
    // Resume vivant maintenu par l'agent : evite de relire tout l'historique,
    // utilise aussi pour le "handoff" vers un commercial humain.
    resume: { type: String, default: '' },
    dernierMessageAt: { type: Date, default: Date.now },
    dernierMessageDe: { type: String, enum: ['client', 'agent', 'humain'], default: 'client' },
    relanceEnvoyeeAt: { type: Date, default: null },
    nombreRelances: { type: Number, default: 0 },
    transfereA: {
      humainNom: String,
      raison: String,
      transfereAt: Date,
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ boutiqueId: 1, statut: 1, dernierMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
