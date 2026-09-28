/**
 * Fonction serveur Vercel : assistant scolaire N°1 propulsé par Claude.
 *
 * POST /api/assistant  { messages: [{ role, content }], context, mode }
 *   → 200 { text }
 *   → 503 si ANTHROPIC_API_KEY n'est pas configurée (l'application bascule
 *     alors sur son moteur local hors ligne).
 *
 * La clé reste côté serveur (variable d'environnement Vercel), jamais dans le
 * navigateur. Garde-fous : taille des messages, historique limité, limite de
 * débit best-effort par adresse IP.
 */
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5';
const MAX_TURNS = 16;
const MAX_CHARS = 2000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map();

const SYSTEM = `Tu es l'assistant scolaire de N°1, une plateforme utilisée par des collégiens en Guinée (programme guinéen, préparation au BEPC).

Ta mission : aider l'élève à COMPRENDRE et à progresser, pas faire le travail à sa place.
- Réponds en français simple et bienveillant, adapté à un élève de collège. Sois bref (10 lignes maximum sauf si on te demande plus).
- Pédagogie « indices d'abord » : pour un exercice ou un devoir, donne d'abord une piste ou une question qui guide, puis la méthode. Ne donne la réponse complète que si l'élève a essayé ou le demande explicitement après un indice.
- Pour « expliquer une leçon » : l'idée clé, un exemple concret tiré de la vie quotidienne en Guinée quand c'est pertinent (GNF, marché, Conakry, fleuve Niger…), puis une petite question pour vérifier.
- Pour « générer des exercices » : propose 3 exercices progressifs, numérotés, puis un « Corrigé » séparé à la fin.
- Reste sur le travail scolaire. Si la question sort de ce cadre ou concerne la santé, la sécurité ou un problème personnel, réponds avec tact et invite l'élève à en parler à un adulte de confiance ou à un enseignant.
- N'invente pas : si tu n'es pas sûr, dis-le et conseille de vérifier avec l'enseignant.
- Texte simple : pas de titres Markdown, listes courtes autorisées, notation mathématique lisible (ex. 3/4, x², √2).`;

const MODES = {
  expliquer: "L'élève veut qu'on lui explique une leçon.",
  exercices: "L'élève veut des exercices d'entraînement avec corrigé à la fin.",
  question: "L'élève pose une question précise : commence par un indice.",
};

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : String(fwd || '')).split(',')[0].trim() || req.socket?.remoteAddress || 'inconnu';
}

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_REQUESTS;
}

/** Valide et nettoie l'historique envoyé par le navigateur. */
function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const msgs = raw
    .slice(-MAX_TURNS)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

function contextText(context) {
  if (!context || typeof context !== 'object') return '';
  const parts = [];
  if (context.prenom) parts.push(`Prénom de l'élève : ${String(context.prenom).slice(0, 40)}`);
  if (context.classe) parts.push(`Classe : ${String(context.classe).slice(0, 20)}`);
  if (Array.isArray(context.difficultes) && context.difficultes.length) {
    parts.push(`Notions à consolider : ${context.difficultes.slice(0, 5).map((d) => String(d).slice(0, 60)).join(' ; ')}`);
  }
  return parts.join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'assistant_non_configure' });
  }
  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Trop de questions en peu de temps. Réessaie dans quelques minutes.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Requête invalide.' });
    }
  }
  const messages = sanitizeMessages(body?.messages);
  if (!messages) return res.status(400).json({ error: 'Conversation invalide.' });
  const mode = MODES[body?.mode] ? body.mode : 'question';

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: SYSTEM },
        { type: 'text', text: `${MODES[mode]}\n${contextText(body?.context)}` },
      ],
      messages,
    });

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({
        text: 'Je ne peux pas t’aider sur ce sujet. Pour tes cours, reformule ta question ; pour le reste, parles-en à un adulte de confiance.',
      });
    }
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return res.status(200).json({ text: text || 'Je n’ai pas de réponse pour le moment, reformule ta question.' });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'L’assistant est très sollicité, réessaie dans un instant.' });
    }
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      console.error('[assistant] Clé API invalide ou non autorisée');
      return res.status(503).json({ error: 'assistant_non_configure' });
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error('[assistant] Requête refusée :', error.message);
      return res.status(400).json({ error: 'Requête invalide.' });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[assistant] Erreur API ${error.status} :`, error.message);
      return res.status(502).json({ error: 'Assistant momentanément indisponible.' });
    }
    console.error('[assistant] Erreur inattendue :', error);
    return res.status(500).json({ error: 'Assistant momentanément indisponible.' });
  }
};

module.exports._internals = { sanitizeMessages, contextText };
