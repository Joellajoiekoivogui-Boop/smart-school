const mongoose = require('mongoose');
const { Schema } = mongoose;

// Parametres de controle humain sur l'agent - un seul document par boutique.
const AgentSettingsSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, unique: true, index: true },
    agentActif: { type: Boolean, default: true },
    tonalite: {
      type: String,
      enum: ['chaleureux', 'professionnel', 'decontracte'],
      default: 'chaleureux',
    },
    peutPromettreDelaiLivraison: { type: Boolean, default: false },
    peutAccorderRemise: { type: Boolean, default: false },
    remiseMaxPourcent: { type: Number, default: 0, min: 0, max: 100 },
    peutRechercherSurInternet: { type: Boolean, default: false },
    delaiRelanceMinutes: { type: Number, default: 60 },
    maxRelancesParConversation: { type: Number, default: 2 },
    motsInterditsEscaladeImmediate: [{ type: String }], // ex: "avocat", "remboursement", "urgent"
    messageBienvenue: {
      type: String,
      default: 'Bonjour et bienvenue ! Comment puis-je vous aider aujourd\'hui ?',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AgentSettings', AgentSettingsSchema);
