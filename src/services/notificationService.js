const env = require('../config/env');

/**
 * Point d'alerte unique vers les humains. Branche ici Slack, email ou SMS
 * selon les besoins - pour l'instant, webhook generique + log console.
 */
async function notifyHuman({ boutiqueId, titre, message }) {
  console.log(`[alerte-humaine] [boutique:${boutiqueId}] ${titre}\n${message}`);

  if (!env.humanAlertWebhookUrl) return;

  try {
    await fetch(env.humanAlertWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boutiqueId: String(boutiqueId), titre, message }),
    });
  } catch (err) {
    console.error('[alerte-humaine] Echec envoi webhook:', err.message);
  }
}

module.exports = { notifyHuman };
