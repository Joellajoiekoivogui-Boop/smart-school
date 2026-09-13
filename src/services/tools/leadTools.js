const { Lead, KnowledgeGap, Order, Product } = require('../../models');
const { notifyHuman } = require('../notificationService');

/**
 * Outils de qualification commerciale, de gestion de l'inconnu et
 * d'escalade humaine. Ce sont les outils qui rendent l'agent "commercial"
 * plutot que simple repondeur : il analyse, classe et sait dire "je ne sais pas".
 */

const qualifyLeadTool = {
  name: 'qualify_lead',
  description:
    "A appeler des que suffisamment d'informations ont ete echangees pour evaluer l'interet du prospect (apres une question prix, une comparaison, une hesitation, etc.). Met a jour la fiche de qualification du prospect utilisee par le responsable commercial.",
  input_schema: {
    type: 'object',
    properties: {
      niveauInteret: { type: 'string', enum: ['froid', 'tiede', 'chaud', 'pret_a_acheter'] },
      intention: {
        type: 'string',
        enum: ['simple_question', 'comparaison', 'demande_devis', 'intention_achat', 'reclamation', 'autre'],
      },
      besoinExprime: { type: 'string', description: 'Resume du besoin du client en une phrase' },
      produitIds: { type: 'array', items: { type: 'string' }, description: 'Identifiants produits interessant le client' },
      objections: { type: 'array', items: { type: 'string' }, description: 'Freins ou objections exprimes' },
    },
    required: ['niveauInteret', 'intention', 'besoinExprime'],
  },
};

const logKnowledgeGapTool = {
  name: 'log_knowledge_gap',
  description:
    "A utiliser quand l'agent ne trouve la reponse dans aucune source disponible (catalogue, promotions, FAQ). Enregistre la question comme information manquante au lieu d'inventer une reponse. L'agent doit ensuite informer honnetement le client qu'il va verifier ou transferer a un humain.",
  input_schema: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'La question exacte a laquelle on ne sait pas repondre' },
      contexte: { type: 'string', description: 'Contexte utile pour que le responsable comprenne la question sans relire tout l\'historique' },
    },
    required: ['question'],
  },
};

const escalateToHumanTool = {
  name: 'escalate_to_human',
  description:
    "Transfere la conversation a un responsable commercial humain et desactive l'agent pour ce client jusqu'a reprise. A utiliser pour: une reclamation, une demande explicite de parler a un humain, une negociation hors des marges autorisees, ou une situation ambigue et sensible. Ne pas abuser de cet outil pour de simples questions produit resolubles via le catalogue.",
  input_schema: {
    type: 'object',
    properties: {
      raison: { type: 'string', description: "Raison de l'escalade" },
      resumePourHumain: {
        type: 'string',
        description: 'Resume complet de la conversation et des informations cles, pour que le commercial reprenne sans tout relire',
      },
      urgent: { type: 'boolean', default: false },
    },
    required: ['raison', 'resumePourHumain'],
  },
};

const createQuoteOrOrderTool = {
  name: 'create_quote_or_order',
  description:
    "Cree un devis ou une commande brouillon a partir de produits reels du catalogue (prix et stock verifies). Utiliser type='devis' pour une demande de devis, type='commande' seulement si le client a clairement confirme vouloir acheter et si les regles de l'agent l'autorisent.",
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['devis', 'commande'] },
      lignes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            quantite: { type: 'integer', minimum: 1 },
          },
          required: ['productId', 'quantite'],
        },
      },
    },
    required: ['type', 'lignes'],
  },
};

async function executeQualifyLead(ctx, input) {
  const { boutiqueId, conversationId, customerId } = ctx;
  const lead = await Lead.findOneAndUpdate(
    { boutiqueId, conversationId },
    {
      boutiqueId,
      conversationId,
      customerId,
      niveauInteret: input.niveauInteret,
      intention: input.intention,
      besoinExprime: input.besoinExprime,
      produitsInteret: input.produitIds || [],
      objections: input.objections || [],
      statut: 'en_cours',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { enregistre: true, leadId: String(lead._id) };
}

async function executeLogKnowledgeGap(ctx, input) {
  const { boutiqueId, conversationId, customerId } = ctx;
  const gap = await KnowledgeGap.create({
    boutiqueId,
    conversationId,
    customerId,
    question: input.question,
    contexte: input.contexte || '',
  });
  return {
    enregistre: true,
    knowledgeGapId: String(gap._id),
    instruction:
      "Informe le client honnetement que tu verifies cette information ou que tu la transmets, sans jamais inventer de reponse.",
  };
}

async function executeEscalateToHuman(ctx, input) {
  const { boutiqueId, conversationId, customerId } = ctx;
  const { Conversation, Customer } = require('../../models');

  await Conversation.findByIdAndUpdate(conversationId, {
    statut: 'transferee_humain',
    resume: input.resumePourHumain,
    transfereA: { raison: input.raison, transfereAt: new Date() },
  });
  await Customer.findByIdAndUpdate(customerId, { agentActifPourCeClient: false });
  await Lead.findOneAndUpdate(
    { boutiqueId, conversationId },
    { necessiteHumain: true, raisonEscalade: input.raison, resumePourHumain: input.resumePourHumain, statut: 'qualifie' },
    { upsert: true, setDefaultsOnInsert: true, new: true, customerId }
  );

  await notifyHuman({
    boutiqueId,
    titre: input.urgent ? '⚠️ Intervention humaine urgente requise' : 'Intervention humaine requise',
    message: `${input.raison}\n\nResume: ${input.resumePourHumain}`,
  });

  return {
    transfere: true,
    instruction: "Informe le client qu'un responsable va reprendre la conversation et le remercier pour sa patience.",
  };
}

async function executeCreateQuoteOrOrder(ctx, input) {
  const { boutiqueId, conversationId, customerId } = ctx;
  const productIds = input.lignes.map((l) => l.productId);
  const products = await Product.find({ _id: { $in: productIds }, boutiqueId, isDeleted: false }).lean({ virtuals: true });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const lignes = [];
  for (const ligne of input.lignes) {
    const produit = productMap.get(ligne.productId);
    if (!produit) {
      return { cree: false, erreur: `Produit ${ligne.productId} introuvable dans le catalogue.` };
    }
    if (input.type === 'commande' && produit.stock < ligne.quantite) {
      return {
        cree: false,
        erreur: `Stock insuffisant pour ${produit.nom} (disponible: ${produit.stock}, demande: ${ligne.quantite}).`,
      };
    }
    lignes.push({
      productId: produit._id,
      nom: produit.nom,
      quantite: ligne.quantite,
      prixUnitaireGNF: produit.prixActuelGNF ?? produit.prixGNF,
    });
  }

  const totalGNF = lignes.reduce((sum, l) => sum + l.prixUnitaireGNF * l.quantite, 0);

  const order = await Order.create({
    boutiqueId,
    customerId,
    conversationId,
    lignes,
    totalGNF,
    type: input.type,
    statut: 'brouillon',
    creePar: 'agent',
  });

  return {
    cree: true,
    orderId: String(order._id),
    totalGNF,
    recapitulatif: lignes.map((l) => `${l.quantite} x ${l.nom} = ${l.prixUnitaireGNF * l.quantite} GNF`),
  };
}

module.exports = {
  definitions: [qualifyLeadTool, logKnowledgeGapTool, escalateToHumanTool, createQuoteOrOrderTool],
  executors: {
    qualify_lead: executeQualifyLead,
    log_knowledge_gap: executeLogKnowledgeGap,
    escalate_to_human: executeEscalateToHuman,
    create_quote_or_order: executeCreateQuoteOrOrder,
  },
};
