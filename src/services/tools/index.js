const catalogTools = require('./catalogTools');
const leadTools = require('./leadTools');
const memoryTools = require('./memoryTools');

const allModules = [catalogTools, leadTools, memoryTools];

const definitions = allModules.flatMap((m) => m.definitions);
const executors = Object.assign({}, ...allModules.map((m) => m.executors));

/**
 * Execute un outil demande par l'agent. `ctx` porte les identifiants de
 * tenant/conversation/client necessaires pour que chaque outil reste
 * cantonne aux donnees de la bonne boutique.
 */
async function runTool(name, input, ctx) {
  const executor = executors[name];
  if (!executor) {
    return { erreur: `Outil inconnu: ${name}` };
  }
  try {
    return await executor(ctx, input);
  } catch (err) {
    console.error(`[tools] Echec de l'outil ${name}:`, err);
    return { erreur: `L'outil ${name} a echoue: ${err.message}` };
  }
}

module.exports = { definitions, runTool };
