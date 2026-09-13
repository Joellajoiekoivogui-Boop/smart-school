const express = require('express');
const { Lead, KnowledgeGap } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Vue commerciale : quels prospects sont les plus interessants, lesquels
// ont besoin d'une intervention humaine.
router.get('/', async (req, res) => {
  const filter = { boutiqueId: req.user.boutiqueId };
  if (req.query.niveauInteret) filter.niveauInteret = req.query.niveauInteret;
  if (req.query.statut) filter.statut = req.query.statut;
  if (req.query.necessiteHumain !== undefined) filter.necessiteHumain = req.query.necessiteHumain === 'true';

  const leads = await Lead.find(filter)
    .populate('customerId', 'nom whatsappId')
    .populate('produitsInteret', 'nom prixGNF')
    .sort({ updatedAt: -1 })
    .limit(200);
  res.json(leads);
});

router.put('/:id/statut', async (req, res) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, boutiqueId: req.user.boutiqueId },
    { statut: req.body.statut },
    { new: true }
  );
  if (!lead) return res.status(404).json({ erreur: 'Lead introuvable.' });
  res.json(lead);
});

// Base de connaissances a enrichir : questions auxquelles l'agent n'a pas su repondre.
router.get('/knowledge-gaps', async (req, res) => {
  const filter = { boutiqueId: req.user.boutiqueId };
  if (req.query.statut) filter.statut = req.query.statut;
  const gaps = await KnowledgeGap.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json(gaps);
});

router.put('/knowledge-gaps/:id/resoudre', async (req, res) => {
  const { reponseValidee, resoluPar } = req.body;
  const gap = await KnowledgeGap.findOneAndUpdate(
    { _id: req.params.id, boutiqueId: req.user.boutiqueId },
    { statut: 'resolu', reponseValidee, resoluPar, resoluAt: new Date() },
    { new: true }
  );
  if (!gap) return res.status(404).json({ erreur: 'Question introuvable.' });
  res.json(gap);
});

module.exports = router;
