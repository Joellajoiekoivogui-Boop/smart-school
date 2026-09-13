const OpenAI = require('openai');
const env = require('../config/env');
const { buildSystemPrompt } = require('../prompts/salesAgentSystemPrompt');
const { definitions: toolDefinitions, runTool } = require('./tools');

const client = new OpenAI({ apiKey: env.openaiApiKey });

const MAX_TOOL_ITERATIONS = 6;
const MAX_HISTORY_MESSAGES = 20;

/**
 * Meme moteur agentique que claudeAgent.js, mais pour un modele accede via
 * l'API OpenAI (Codex ou tout autre modele de chat avec function calling).
 * Interface identique ({ respond, generateFollowup }) pour rester
 * interchangeable via src/services/agent.js (AGENT_PROVIDER).
 */

function toOpenAITools() {
  return toolDefinitions.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

function buildSystemMessage({ boutique, settings, customer, conversationResume }) {
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

  return `${staticPrompt}\n\n---\n${dynamicContext || 'Nouvelle conversation, aucun historique connu.'}`;
}

function historyToMessages(history) {
  return history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.auteur === 'client' ? 'user' : 'assistant',
    content: m.contenu,
  }));
}

async function respond(context, userText) {
  const { boutique, settings, customer, conversation } = context;

  if (!settings.agentActif || customer.agentActifPourCeClient === false) {
    return { reply: null, toolCalls: [], handedOff: true };
  }

  const systemMessage = {
    role: 'system',
    content: buildSystemMessage({ boutique, settings, customer, conversationResume: conversation.resume }),
  };
  const tools = toOpenAITools();

  const messages = [
    systemMessage,
    ...historyToMessages(context.history || []),
    { role: 'user', content: userText },
  ];

  const toolCallsTrace = [];
  const ctx = {
    boutiqueId: boutique._id,
    conversationId: conversation._id,
    customerId: customer._id,
  };

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const completion = await client.chat.completions.create({
      model: env.codexModel,
      messages,
      tools,
      tool_choice: 'auto',
    });

    const message = completion.choices[0].message;

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: (message.content || '').trim(), toolCalls: toolCallsTrace, handedOff: false };
    }

    messages.push(message);

    let escalated = false;
    for (const call of message.tool_calls) {
      let input = {};
      try {
        input = JSON.parse(call.function.arguments || '{}');
      } catch {
        input = {};
      }

      const result = await runTool(call.function.name, input, ctx);
      toolCallsTrace.push({ nom: call.function.name, input, resultat: result });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });

      if (call.function.name === 'escalate_to_human') escalated = true;
    }

    if (escalated) {
      const finalCompletion = await client.chat.completions.create({
        model: env.codexModel,
        messages,
        tools,
        tool_choice: 'auto',
      });
      const reply = (finalCompletion.choices[0].message.content || '').trim();
      return { reply, toolCalls: toolCallsTrace, handedOff: true };
    }
  }

  return {
    reply: 'Je transmets votre demande a un responsable pour vous apporter une reponse precise.',
    toolCalls: toolCallsTrace,
    handedOff: false,
  };
}

async function generateFollowup(context) {
  const followupInstruction =
    "[Instruction interne, ne pas repeter au client] La conversation est inactive alors qu'un interet avait ete exprime. " +
    'Redige une relance courte, naturelle et non generique, qui reprend precisement ce dont vous aviez parle, pour relancer la discussion sans etre insistant.';

  return respond(context, followupInstruction);
}

module.exports = { respond, generateFollowup };
