const cron = require('node-cron');
const env = require('../config/env');
const { Conversation, Customer, AgentSettings } = require('../models');
const conversationService = require('../services/conversationService');
const { sendMessageToCustomer } = require('../services/whatsapp/client');

/**
 * L'agent ne se contente pas d'attendre une question : ce job detecte les
 * conversations laissees en suspens par le client (ex: question de prix sans
 * suite) et declenche une relance intelligente generee par l'agent, plutot
 * qu'un message generique envoye a l'aveugle.
 */
async function checkAndSendFollowups() {
  const candidates = await Conversation.find({
    statut: 'ouverte',
    dernierMessageDe: 'client',
  }).lean();

  for (const conversation of candidates) {
    try {
      const settings = await AgentSettings.findOne({ boutiqueId: conversation.boutiqueId }).lean();
      const delaiMinutes = settings?.delaiRelanceMinutes ?? env.followupDelayMinutes;
      const maxRelances = settings?.maxRelancesParConversation ?? 2;

      if (conversation.nombreRelances >= maxRelances) continue;

      const inactifDepuis = Date.now() - new Date(conversation.dernierMessageAt).getTime();
      if (inactifDepuis < delaiMinutes * 60 * 1000) continue;

      const customer = await Customer.findById(conversation.customerId).lean();
      if (!customer || !customer.agentActifPourCeClient) continue;

      await conversationService.sendFollowup(conversation._id, (text) =>
        sendMessageToCustomer(customer.whatsappId, text)
      );
      console.log(`[relance] Relance envoyee pour la conversation ${conversation._id}`);
    } catch (err) {
      console.error(`[relance] Echec pour la conversation ${conversation._id}:`, err);
    }
  }
}

function startFollowupJob() {
  cron.schedule(env.followupCron, () => {
    checkAndSendFollowups().catch((err) => console.error('[relance] Erreur du job:', err));
  });
  console.log(`[relance] Job de relance planifie (${env.followupCron})`);
}

module.exports = { startFollowupJob, checkAndSendFollowups };
