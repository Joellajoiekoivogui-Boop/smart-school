const express = require('express');
const { Product } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Catalogue, prix, stock et promotions - source de verite consultee par
// l'agent avant de repondre a un client. Toute mise a jour ici est
// immediatement visible par l'agent.

router.get('/', async (req, res) => {
  const products = await Product.find({ boutiqueId: req.user.boutiqueId, isDeleted: false }).sort({ createdAt: -1 });
  res.json(products);
});

router.post('/', async (req, res) => {
  const product = await Product.create({ ...req.body, boutiqueId: req.user.boutiqueId });
  res.status(201).json(product);
});

router.put('/:id', async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, boutiqueId: req.user.boutiqueId },
    req.body,
    { new: true }
  );
  if (!product) return res.status(404).json({ erreur: 'Produit introuvable.' });
  res.json(product);
});

router.delete('/:id', async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, boutiqueId: req.user.boutiqueId },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );
  if (!product) return res.status(404).json({ erreur: 'Produit introuvable.' });
  res.json({ supprime: true });
});

module.exports = router;
