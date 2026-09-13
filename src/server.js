const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const { startWhatsApp } = require('./services/whatsapp/client');
const { startFollowupJob } = require('./jobs/followupJob');

async function main() {
  await connectDB();

  app.listen(env.port, () => {
    console.log(`[server] Tableau de bord et API disponibles sur le port ${env.port}`);
  });

  await startWhatsApp();
  startFollowupJob();
}

main().catch((err) => {
  console.error('[server] Echec du demarrage:', err);
  process.exit(1);
});
