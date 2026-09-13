const { AgentSettings } = require('../../models');
const env = require('../../config/env');

/**
 * Recherche web via Exa - utilisee uniquement quand le catalogue, les
 * promotions et la FAQ internes ne suffisent pas a repondre. La permission
 * (AgentSettings.peutRechercherSurInternet) est revérifiee cote serveur,
 * independamment de ce que le prompt systeme demande au modele.
 */

const searchWebTool = {
  name: 'search_web',
  description:
    "Recherche des informations sur le web via Exa, uniquement quand la question ne peut pas etre resolue avec search_catalog, check_active_promotions ou les autres outils internes. Ne jamais utiliser pour un prix ou un stock (toujours search_catalog pour cela). Peut etre refusee si la recherche externe n'est pas autorisee pour cette boutique - dans ce cas, utilise log_knowledge_gap ou escalate_to_human a la place.",
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'La question ou les termes de recherche' },
    },
    required: ['query'],
  },
};

async function executeSearchWeb(ctx, input) {
  const settings = await AgentSettings.findOne({ boutiqueId: ctx.boutiqueId }).lean();
  if (!settings?.peutRechercherSurInternet) {
    return {
      autorise: false,
      message:
        "La recherche externe n'est pas autorisee pour cette boutique. Informe le client que tu vas verifier aupres d'un responsable, et utilise log_knowledge_gap.",
    };
  }

  if (!env.exaApiKey) {
    return { autorise: true, erreur: "Cle API Exa non configuree cote serveur (EXA_API_KEY manquante)." };
  }

  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.exaApiKey },
      body: JSON.stringify({
        query: input.query,
        numResults: 5,
        contents: { text: { maxCharacters: 800 } },
      }),
    });

    if (!res.ok) {
      return { autorise: true, erreur: `Recherche Exa echouee (HTTP ${res.status}).` };
    }

    const data = await res.json();
    const resultats = (data.results || []).map((r) => ({
      titre: r.title || null,
      url: r.url,
      extrait: r.text || r.summary || '',
    }));

    if (resultats.length === 0) {
      return { autorise: true, resultats: [], message: 'Aucun resultat pertinent trouve.' };
    }

    return { autorise: true, resultats };
  } catch (err) {
    return { autorise: true, erreur: `Recherche Exa impossible: ${err.message}` };
  }
}

module.exports = {
  definitions: [searchWebTool],
  executors: { search_web: executeSearchWeb },
};
