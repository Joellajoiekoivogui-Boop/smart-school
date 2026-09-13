const { Boutique, AgentSettings, Customer, Conversation, Message } = require('../models');
const claudeAgent = require('./claudeAgent');

/**
 * Point d'entree unique pour faire avancer une conversation d'un tour,
 * que le declencheur soit un message WhatsApp entrant ou une relance
 * automatique. Gere le chargement du contexte, l'appel a l'agent et la
 * persistance (messages, resume de conversation, dernier contact).
 */
async function getOrCreateCustomer(boutiqueId, whatsappId, displayName) {
  let customer = await Customer.findOne({ boutiqueId, whatsappId });
  if (!customer) {
    customer = await Customer.create({ boutiqueId, whatsappId, nom: displayName || '' });
  }
  return customer;
}

async function getOrCreateOpenConversation(boutiqueId, customerId) {
  let conversation = await Conversation.findOne({
    boutiqueId,
    customerId,
    statut: { $in: ['ouverte', 'en_attente_relance'] },
  }).sort({ createdAt: -1 });

  if (!conversation) {
    conversation = await Conversation.create({ boutiqueId, customerId, statut: 'ouverte' });
  }
  return conversation;
}

async function loadContext(boutiqueId, customerId, conversationId) {
  const [boutique, settings, customer, conversation, history] = await Promise.all([
    Boutique.findById(boutiqueId).lean(),
    AgentSettings.findOne({ boutiqueId }).lean(),
    Customer.findById(customerId),
    Conversation.findById(conversationId),
    Message.find({ conversationId }).sort({ createdAt: 1 }).lean(),
  ]);

  return {
    boutique,
    settings: settings || (await AgentSettings.create({ boutiqueId })).toObject(),
    customer,
    conversation,
    history,
  };
}

/**
 * Traite un message entrant du client : persiste le message, interroge
 * l'agent, persiste et renvoie sa reponse. `send` est une fonction
 * (texte) => Promise fournie par le canal (WhatsApp) pour livrer la reponse.
 */
async function handleIncomingClientMessage({ boutiqueId, whatsappId, displayName, text, whatsappMessageId }, send) {
  const customer = await getOrCreateCustomer(boutiqueId, whatsappId, displayName);
  customer.derniereInteractionAt = new Date();
  await customer.save();

  const conversation = await getOrCreateOpenConversation(boutiqueId, customer._id);

  await Message.create({
    boutiqueId,
    conversationId: conversation._id,
    auteur: 'client',
    contenu: text,
    whatsappMessageId: whatsappMessageId || null,
  });

  if (!customer.agentActifPourCeClient) {
    // Un humain a deja repris la main : l'agent n'intervient plus sur ce fil.
    return { skipped: true };
  }

  const context = await loadContext(boutiqueId, customer._id, conversation._id);
  const result = await claudeAgent.respond(context, text);

  if (result.reply) {
    await Message.create({
      boutiqueId,
      conversationId: conversation._id,
      auteur: 'agent',
      contenu: result.reply,
      toolCalls: result.toolCalls,
    });
    await send(result.reply);
  }

  await Conversation.findByIdAndUpdate(conversation._id, {
    dernierMessageAt: new Date(),
    dernierMessageDe: result.handedOff ? 'agent' : 'agent',
    statut: result.handedOff ? 'transferee_humain' : 'ouverte',
  });

  return result;
}

/**
 * Envoie une relance proactive sur une conversation inactive. Utilise par
 * le job planifie - voir src/jobs/followupJob.js.
 */
async function sendFollowup(conversationId, send) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return { skipped: true };

  const context = await loadContext(conversation.boutiqueId, conversation.customerId, conversation._id);
  if (!context.customer.agentActifPourCeClient) return { skipped: true };

  const result = await claudeAgent.generateFollowup(context);
  if (result.reply) {
    await Message.create({
      boutiqueId: conversation.boutiqueId,
      conversationId: conversation._id,
      auteur: 'agent',
      contenu: result.reply,
      toolCalls: result.toolCalls,
      isRelance: true,
    });
    await send(result.reply);
    await Conversation.findByIdAndUpdate(conversation._id, {
      dernierMessageAt: new Date(),
      dernierMessageDe: 'agent',
      relanceEnvoyeeAt: new Date(),
      $inc: { nombreRelances: 1 },
      statut: 'ouverte',
    });
  }
  return result;
}

module.exports = { handleIncomingClientMessage, sendFollowup, loadContext };
