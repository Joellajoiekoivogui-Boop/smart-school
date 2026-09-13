const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrderLineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nom: { type: String, required: true },
    quantite: { type: Number, required: true, min: 1 },
    prixUnitaireGNF: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    lignes: { type: [OrderLineSchema], required: true },
    totalGNF: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['devis', 'commande'], default: 'devis' },
    statut: {
      type: String,
      enum: ['brouillon', 'confirmee', 'en_livraison', 'livree', 'annulee'],
      default: 'brouillon',
      index: true,
    },
    paiement: {
      provider: { type: String, enum: ['orange', 'mtn', 'especes', null], default: null },
      telephone: String,
      transactionRef: String,
      status: { type: String, enum: ['en_attente', 'paye', 'echoue', null], default: null },
    },
    creePar: { type: String, enum: ['agent', 'humain'], default: 'agent' },
  },
  { timestamps: true }
);

OrderSchema.index({ boutiqueId: 1, statut: 1, createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);
