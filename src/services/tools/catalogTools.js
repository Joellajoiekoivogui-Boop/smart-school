const { Product } = require('../../models');

/**
 * Outils donnant a l'agent un acces en lecture seule et a jour au catalogue,
 * aux prix, aux promotions et au stock reel de la boutique. L'agent ne doit
 * jamais inventer un prix ou une disponibilite : il appelle ces outils.
 */

const searchCatalogTool = {
  name: 'search_catalog',
  description:
    "Recherche des produits/services dans le catalogue reel de l'entreprise a partir d'un besoin exprime en langage naturel ou de mots-cles. Renvoie nom, prix actuel (promotion appliquee si active), stock disponible et description. A utiliser des qu'un client demande un produit, un prix, ou exprime un besoin - ne jamais deviner un prix.",
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Termes de recherche ou besoin exprime par le client' },
      categorie: { type: 'string', description: 'Categorie de produit si connue (optionnel)' },
      limit: { type: 'integer', description: 'Nombre max de resultats', default: 5 },
    },
    required: ['query'],
  },
};

const getProductDetailsTool = {
  name: 'get_product_details',
  description:
    "Recupere les details complets d'un produit precis (prix actuel, stock, caracteristiques) a partir de son identifiant, par exemple apres un search_catalog pour approfondir une recommandation.",
  input_schema: {
    type: 'object',
    properties: {
      productId: { type: 'string', description: 'Identifiant Mongo du produit' },
    },
    required: ['productId'],
  },
};

const checkActivePromotionsTool = {
  name: 'check_active_promotions',
  description: "Liste les promotions actuellement actives dans la boutique, pour proposer une offre pertinente au client.",
  input_schema: {
    type: 'object',
    properties: {},
  },
};

async function executeSearchCatalog(boutiqueId, { query, categorie, limit = 5 }) {
  const filter = { boutiqueId, isDeleted: false, disponible: true };
  if (categorie) filter.categorie = categorie;
  if (query) filter.$text = { $search: query };

  let products = await Product.find(filter)
    .limit(Math.min(limit, 10))
    .lean({ virtuals: true });

  // Repli si la recherche full-text ne trouve rien (index non construit ou requete trop vague)
  if (products.length === 0 && query) {
    const regex = new RegExp(query.split(/\s+/).filter(Boolean).join('|'), 'i');
    products = await Product.find({
      boutiqueId,
      isDeleted: false,
      disponible: true,
      $or: [{ nom: regex }, { motsCles: regex }, { description: regex }],
    })
      .limit(Math.min(limit, 10))
      .lean({ virtuals: true });
  }

  if (products.length === 0) {
    return { trouve: false, message: "Aucun produit correspondant trouve dans le catalogue actuel." };
  }

  return {
    trouve: true,
    resultats: products.map(formatProductForAgent),
  };
}

async function executeGetProductDetails(boutiqueId, { productId }) {
  const product = await Product.findOne({ _id: productId, boutiqueId, isDeleted: false }).lean({ virtuals: true });
  if (!product) return { trouve: false, message: 'Produit introuvable.' };
  return { trouve: true, produit: formatProductForAgent(product) };
}

async function executeCheckActivePromotions(boutiqueId) {
  const maintenant = new Date();
  const products = await Product.find({
    boutiqueId,
    isDeleted: false,
    'promotion.dateDebut': { $lte: maintenant },
    'promotion.dateFin': { $gte: maintenant },
  }).lean({ virtuals: true });

  return {
    promotions: products.map((p) => ({
      produitId: p._id,
      nom: p.nom,
      prixNormalGNF: p.prixGNF,
      prixPromoGNF: p.promotion.prixPromoGNF,
      libelle: p.promotion.libelle,
      finPromotion: p.promotion.dateFin,
    })),
  };
}

function formatProductForAgent(p) {
  return {
    id: String(p._id),
    nom: p.nom,
    description: p.description,
    categorie: p.categorie,
    prixActuelGNF: p.prixActuelGNF ?? p.prixGNF,
    enPromotion: Boolean(p.promotion),
    stockDisponible: p.stock,
    enStock: p.stock > 0,
  };
}

module.exports = {
  definitions: [searchCatalogTool, getProductDetailsTool, checkActivePromotionsTool],
  executors: {
    search_catalog: executeSearchCatalog,
    get_product_details: executeGetProductDetails,
    check_active_promotions: executeCheckActivePromotions,
  },
};
