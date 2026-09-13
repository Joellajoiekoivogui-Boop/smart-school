const mongoose = require('mongoose');
const { Schema } = mongoose;

// Memoire client : ce que l'agent est autorise a retenir et reutiliser
// d'une conversation a l'autre, pour eviter de faire tout repeter au client.
const MemoryFactSchema = new Schema(
  {
    cle: { type: String, required: true }, // ex: "produit_prefere", "adresse_livraison"
    valeur: { type: String, required: true },
    source: { type: String, enum: ['client', 'agent_deduit', 'humain'], default: 'client' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CustomerSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, index: true },
    whatsappId: { type: String, required: true, index: true }, // ex: 224xxxxxxxxx@s.whatsapp.net
    nom: { type: String, default: '' },
    telephone: { type: String },
    estClientExistant: { type: Boolean, default: false },
    memoire: { type: [MemoryFactSchema], default: [] },
    tags: [{ type: String }], // ex: "vip", "recurrent", "sensible_prix"
    derniereInteractionAt: { type: Date, default: Date.now },
    agentActifPourCeClient: { type: Boolean, default: true }, // false si un humain a repris la main
  },
  { timestamps: true }
);

CustomerSchema.index({ boutiqueId: 1, whatsappId: 1 }, { unique: true });

module.exports = mongoose.model('Customer', CustomerSchema);
