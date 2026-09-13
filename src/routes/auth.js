const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, motDePasse } = req.body;
  if (!email || !motDePasse) return res.status(400).json({ erreur: 'Email et mot de passe requis.' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ erreur: 'Identifiants invalides.' });

  const valide = await bcrypt.compare(motDePasse, user.motDePasseHash);
  if (!valide) return res.status(401).json({ erreur: 'Identifiants invalides.' });

  const token = jwt.sign(
    { userId: user._id, boutiqueId: user.boutiqueId, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

  res.json({ token, user: { nom: user.nom, email: user.email, role: user.role } });
});

module.exports = router;
