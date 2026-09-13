const mongoose = require('mongoose');
const { Schema } = mongoose;

// Toute question a laquelle l'agent n'a pas pu repondre avec certitude.
// Sert de file d'attente pour enrichir progressivement la base de connaissances.
const KnowledgeGapSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    question: { type: String, required: true },
    contexte: { type: String, default: '' },
    statut: {
      type: String,
      enum: ['en_attente', 'resolu', 'ignore'],
      default: 'en_attente',
      index: true,
    },
    reponseValidee: { type: String, default: null },
    resoluPar: { type: String, default: null }, // nom/identifiant du responsable
    resoluAt: { type: Date, default: null },
  },
  { timestamps: true }
);

KnowledgeGapSchema.index({ boutiqueId: 1, statut: 1, createdAt: -1 });

module.exports = mongoose.model('KnowledgeGap', KnowledgeGapSchema);
