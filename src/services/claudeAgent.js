const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const { buildSystemPrompt } = require('../prompts/salesAgentSystemPrompt');
const { definitions: toolDefinitions, runTool } = require('./tools');

const client = new Anthropic({ apiKey: env.anthropicApiKey });

const MAX_TOOL_ITERATIONS = 6;
const MAX_HISTORY_MESSAGES = 20;

/**
 * Construit le bloc systeme en deux parties pour maximiser le cache de prompt:
 * - le prompt commercial (identique tant que les reglages de la boutique ne
 *   changent pas) porte le breakpoint de cache
 * - le contexte dynamique (memoire client, resume de conversation) vient
 *   apres et n'est jamais mis en cache, car il change a chaque appel
 */
function buildSystemBlocks({ boutique, settings, customer, conversationResume }) {
  const staticPrompt = buildSystemPrompt({
    boutiqueNom: boutique.nom,
    tonalite: settings.tonalite,
    settings,
  });

  const memoireLines = (customer.memoire || [])
    .map((f) => `- ${f.cle}: ${f.valeur}`)
    .join('\n');

  const dynamicContext = [
    `Client: ${customer.nom || 'nom inconnu'} (${customer.estClientExistant ? 'client existant' : 'nouveau prospect'})`,
    memoireLines ? `Ce que l'on sait deja de ce client (ne pas lui redemander) :\n${memoireLines}` : null,
    conversationResume ? `Resume de la conversation en cours : ${conversationResume}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    { type: 'text', text: staticPrompt, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dynamicContext || 'Nouvelle conversation, aucun historique connu.' },
  ];
}

/**
 * Tools avec un breakpoint de cache sur la derniere definition : couvre
 * l'ensemble du tableau tant que les schemas des outils ne changent pas.
 */
function buildToolsWithCache() {
  return toolDefinitions.map((tool, idx) =>
    idx === toolDefinitions.length - 1 ? { ...tool, cache_control: { type: 'ephemeral' } } : tool
  );
}

function historyToMessages(history) {
  return history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.auteur === 'client' ? 'user' : 'assistant',
    content: m.contenu,
  }));
}

/**
 * Fait avancer la conversation d'un tour : envoie le nouveau message client
 * a l'agent, execute les outils qu'il demande, et renvoie la reponse finale
 * en texte ainsi que la trace des outils utilises (pour audit/affichage admin).
 *
 * `context` = { boutique, settings, customer, conversation, history }
 * `userText` = nouveau message du client
 */
async function respond(context, userText) {
  const { boutique, settings, customer, conversation } = context;

  if (!settings.agentActif || customer.agentActifPourCeClient === false) {
    return { reply: null, toolCalls: [], handedOff: true };
  }

  const system = buildSystemBlocks({
    boutique,
    settings,
    customer,
    conversationResume: conversation.resume,
  });
  const tools = buildToolsWithCache();

  const messages = [...historyToMessages(context.history || []), { role: 'user', content: userText }];

  const toolCallsTrace = [];
  const ctx = {
    boutiqueId: boutique._id,
    conversationId: conversation._id,
    customerId: customer._id,
  };

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const response = await client.messages.create({
      model: env.agentModel,
      max_tokens: 1024,
      system,
      tools,
      messages,
    });

    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

    if (toolUseBlocks.length === 0 || response.stop_reason !== 'tool_use') {
      const reply = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return { reply, toolCalls: toolCallsTrace, handedOff: false };
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults = [];
    for (const block of toolUseBlocks) {
      const result = await runTool(block.name, block.input, ctx);
      toolCallsTrace.push({ nom: block.name, input: block.input, resultat: result });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });

      // Une escalade humaine arrete la boucle : l'agent ne doit plus repondre
      // apres avoir transfere la main, il laisse le dernier message du tour.
      if (block.name === 'escalate_to_human') {
        messages.push({ role: 'user', content: toolResults });
        const finalResponse = await client.messages.create({
          model: env.agentModel,
          max_tokens: 512,
          system,
          tools,
          messages,
        });
        const reply = finalResponse.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
          .trim();
        return { reply, toolCalls: toolCallsTrace, handedOff: true };
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    reply: "Je transmets votre demande a un responsable pour vous apporter une reponse precise.",
    toolCalls: toolCallsTrace,
    handedOff: false,
  };
}

/**
 * Genere un message de relance proactive pour une conversation inactive
 * ou un interet a ete exprime sans conclusion. Utilise par le job de relance.
 */
async function generateFollowup(context) {
  const followupInstruction =
    "[Instruction interne, ne pas repeter au client] La conversation est inactive alors qu'un interet avait ete exprime. " +
    'Redige une relance courte, naturelle et non generique, qui reprend precisement ce dont vous aviez parle, pour relancer la discussion sans etre insistant.';

  return respond(context, followupInstruction);
}

module.exports = { respond, generateFollowup };
