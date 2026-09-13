const mongoose = require('mongoose');
const { Schema } = mongoose;

const PromotionSchema = new Schema(
  {
    libelle: { type: String, required: true },
    prixPromoGNF: { type: Number, required: true, min: 0 },
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
  },
  { _id: false }
);

const ProductSchema = new Schema(
  {
    boutiqueId: { type: Schema.Types.ObjectId, ref: 'Boutique', required: true, index: true },
    nom: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    categorie: { type: String, index: true },
    prixGNF: { type: Number, required: true, min: 0 }, // toujours un entier, jamais de float
    stock: { type: Number, required: true, min: 0, default: 0 },
    seuilAlerteStock: { type: Number, default: 3 },
    disponible: { type: Boolean, default: true },
    promotion: { type: PromotionSchema, default: null },
    caracteristiques: { type: Map, of: String, default: {} },
    motsCles: [{ type: String, index: true }],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProductSchema.index({ boutiqueId: 1, nom: 'text', motsCles: 'text', description: 'text' });
ProductSchema.index({ boutiqueId: 1, disponible: 1 });

ProductSchema.virtual('prixActuelGNF').get(function computePrixActuel() {
  const maintenant = new Date();
  if (
    this.promotion &&
    this.promotion.dateDebut <= maintenant &&
    this.promotion.dateFin >= maintenant
  ) {
    return this.promotion.prixPromoGNF;
  }
  return this.prixGNF;
});

ProductSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', ProductSchema);
