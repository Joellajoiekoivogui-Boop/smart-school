const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const env = require('../../config/env');
const { Boutique } = require('../../models');
const conversationService = require('../conversationService');

/**
 * Connecte l'agent directement au numero WhatsApp existant de l'entreprise
 * via Baileys (protocole WhatsApp Web) - pas besoin d'un numero Business API
 * distinct : on scanne le QR code une fois avec le telephone habituel.
 */
let sock = null;
let boutiqueCache = null;

async function getOrBootstrapBoutique(ownWhatsappNumber) {
  if (boutiqueCache) return boutiqueCache;

  let boutique = await Boutique.findOne({ whatsappNumber: ownWhatsappNumber });
  if (!boutique) {
    boutique = await Boutique.create({
      nom: process.env.BUSINESS_NAME || 'Ma Boutique',
      whatsappNumber: ownWhatsappNumber,
    });
    console.log(`[whatsapp] Nouvelle boutique creee automatiquement pour ${ownWhatsappNumber}`);
  }
  boutiqueCache = boutique;
  return boutique;
}

function extractText(message) {
  if (!message) return null;
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(env.whatsappSessionDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('[whatsapp] Scannez ce QR code avec WhatsApp (Appareils lies) :');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[whatsapp] Connexion fermee.', shouldReconnect ? 'Reconnexion...' : 'Deconnecte definitivement.');
      if (shouldReconnect) startWhatsApp();
    } else if (connection === 'open') {
      const ownNumber = sock.user?.id?.split(':')[0];
      console.log(`[whatsapp] Connecte avec succes (${ownNumber}).`);
      getOrBootstrapBoutique(ownNumber).catch((err) =>
        console.error('[whatsapp] Erreur initialisation boutique:', err)
      );
    }
  });

  sock.ev.on('messages.upsert', async ({ messages: incoming, type }) => {
    if (type !== 'notify') return;

    for (const msg of incoming) {
      try {
        if (msg.key.fromMe) continue; // on ne repond pas a nos propres messages
        if (msg.key.remoteJid?.endsWith('@g.us')) continue; // pas de groupes pour l'instant

        const text = extractText(msg.message);
        if (!text) continue;

        const ownNumber = sock.user?.id?.split(':')[0];
        const boutique = await getOrBootstrapBoutique(ownNumber);

        await conversationService.handleIncomingClientMessage(
          {
            boutiqueId: boutique._id,
            whatsappId: msg.key.remoteJid,
            displayName: msg.pushName || '',
            text,
            whatsappMessageId: msg.key.id,
          },
          (replyText) => sock.sendMessage(msg.key.remoteJid, { text: replyText })
        );
      } catch (err) {
        console.error('[whatsapp] Erreur traitement message entrant:', err);
      }
    }
  });

  return sock;
}

function getSocket() {
  if (!sock) throw new Error('Le client WhatsApp n\'est pas encore initialise.');
  return sock;
}

async function sendMessageToCustomer(whatsappId, text) {
  return getSocket().sendMessage(whatsappId, { text });
}

module.exports = { startWhatsApp, getSocket, sendMessageToCustomer };
