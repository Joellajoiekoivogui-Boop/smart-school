require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: required('MONGODB_URI', 'mongodb://localhost:27017/ai-sales-agent'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  agentModel: process.env.AGENT_MODEL || 'claude-sonnet-5',
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  whatsappSessionDir: process.env.WHATSAPP_SESSION_DIR || './whatsapp-session',
  followupCron: process.env.FOLLOWUP_CHECK_INTERVAL_CRON || '*/15 * * * *',
  followupDelayMinutes: parseInt(process.env.FOLLOWUP_DELAY_MINUTES || '60', 10),
  humanAlertWebhookUrl: process.env.HUMAN_ALERT_WEBHOOK_URL || null,
};
