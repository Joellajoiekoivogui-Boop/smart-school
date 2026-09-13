const express = require('express');
const { AgentSettings } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Le responsable garde toujours la main : activer/desactiver l'agent,
// definir ce qu'il est autorise a promettre (remises, delais, etc.)
router.get('/', async (req, res) => {
  const settings = await AgentSettings.findOneAndUpdate(
    { boutiqueId: req.user.boutiqueId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json(settings);
});

router.put('/', async (req, res) => {
  const champsAutorises = [
    'agentActif',
    'tonalite',
    'peutPromettreDelaiLivraison',
    'peutAccorderRemise',
    'remiseMaxPourcent',
    'peutRechercherSurInternet',
    'delaiRelanceMinutes',
    'maxRelancesParConversation',
    'motsInterditsEscaladeImmediate',
    'messageBienvenue',
  ];
  const updates = {};
  for (const champ of champsAutorises) {
    if (req.body[champ] !== undefined) updates[champ] = req.body[champ];
  }

  const settings = await AgentSettings.findOneAndUpdate(
    { boutiqueId: req.user.boutiqueId },
    updates,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json(settings);
});

module.exports = router;
