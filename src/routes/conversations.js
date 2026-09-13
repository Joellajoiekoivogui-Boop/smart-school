const express = require('express');
const { Conversation, Message, Customer } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { sendMessageToCustomer } = require('../services/whatsapp/client');

const router = express.Router();
router.use(requireAuth);

// Permet au responsable de consulter les conversations, voir les prospects
// les plus interessants, reprendre la main a tout moment et desactiver
// l'agent pour un client precis.

router.get('/', async (req, res) => {
  const filter = { boutiqueId: req.user.boutiqueId };
  if (req.query.statut) filter.statut = req.query.statut;

  const conversations = await Conversation.find(filter)
    .populate('customerId', 'nom whatsappId estClientExistant tags')
    .sort({ dernierMessageAt: -1 })
    .limit(100);
  res.json(conversations);
});

router.get('/:id', async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, boutiqueId: req.user.boutiqueId }).populate(
    'customerId'
  );
  if (!conversation) return res.status(404).json({ erreur: 'Conversation introuvable.' });

  const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
  res.json({ conversation, messages });
});

// Le responsable reprend la main : l'agent se met en pause pour ce client.
router.post('/:id/reprendre', async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, boutiqueId: req.user.boutiqueId });
  if (!conversation) return res.status(404).json({ erreur: 'Conversation introuvable.' });

  await Customer.findByIdAndUpdate(conversation.customerId, { agentActifPourCeClient: false });
  conversation.statut = 'transferee_humain';
  await conversation.save();
  res.json({ reprise: true });
});

// Rendre la main a l'agent apres une intervention humaine.
router.post('/:id/rendre-a-agent', async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, boutiqueId: req.user.boutiqueId });
  if (!conversation) return res.status(404).json({ erreur: 'Conversation introuvable.' });

  await Customer.findByIdAndUpdate(conversation.customerId, { agentActifPourCeClient: true });
  conversation.statut = 'ouverte';
  await conversation.save();
  res.json({ rendu: true });
});

// Le responsable repond lui-meme, directement depuis le tableau de bord.
router.post('/:id/repondre', async (req, res) => {
  const { texte } = req.body;
  if (!texte) return res.status(400).json({ erreur: 'Le texte est requis.' });

  const conversation = await Conversation.findOne({ _id: req.params.id, boutiqueId: req.user.boutiqueId });
  if (!conversation) return res.status(404).json({ erreur: 'Conversation introuvable.' });

  const customer = await Customer.findById(conversation.customerId);
  await sendMessageToCustomer(customer.whatsappId, texte);

  await Message.create({
    boutiqueId: req.user.boutiqueId,
    conversationId: conversation._id,
    auteur: 'humain',
    contenu: texte,
  });

  conversation.dernierMessageAt = new Date();
  conversation.dernierMessageDe = 'humain';
  await conversation.save();

  res.json({ envoye: true });
});

module.exports = router;
