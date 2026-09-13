const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    auteur: { type: String, enum: ['client', 'agent', 'humain', 'systeme'], required: true },
    contenu: { type: String, required: true },
    // Trace des outils utilises par l'agent pour produire la reponse (transparence/debug)
    toolCalls: [
      {
        nom: String,
        input: Schema.Types.Mixed,
        resultat: Schema.Types.Mixed,
      },
    ],
    whatsappMessageId: { type: String, default: null },
    isRelance: { type: Boolean, default: false }, // message d'initiative de l'agent
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
