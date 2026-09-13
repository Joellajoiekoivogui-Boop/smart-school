const jwt = require('jsonwebtoken');
const env = require('../config/env');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erreur: 'Authentification requise.' });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = payload; // { userId, boutiqueId, role }
    next();
  } catch {
    return res.status(401).json({ erreur: 'Session invalide ou expiree.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ erreur: 'Reserve aux administrateurs.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
