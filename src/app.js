const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const agentSettingsRoutes = require('./routes/agentSettings');
const productRoutes = require('./routes/products');
const conversationRoutes = require('./routes/conversations');
const leadRoutes = require('./routes/leads');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/agent-settings', agentSettingsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/leads', leadRoutes);

app.use((req, res) => res.status(404).json({ erreur: 'Route introuvable.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[app] Erreur non geree:', err);
  res.status(500).json({ erreur: 'Erreur interne du serveur.' });
});

module.exports = app;
