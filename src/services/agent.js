const env = require('../config/env');

/**
 * Point d'entree unique utilise par conversationService : selectionne le
 * moteur agentique (OpenAI/Codex ou Claude) via AGENT_PROVIDER, sans que le
 * reste de l'application ait a connaitre le fournisseur actif. Les deux
 * moteurs exposent la meme interface : { respond(context, texte), generateFollowup(context) }.
 */
module.exports = env.agentProvider === 'claude' ? require('./claudeAgent') : require('./openaiAgent');
