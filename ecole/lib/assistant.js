/**
 * Assistant scolaire.
 *
 * 1. En ligne : l'application appelle `/api/assistant` (fonction serveur qui
 *    interroge Claude avec la clé de l'école, jamais exposée au navigateur).
 * 2. Hors ligne / sans clé : un moteur local répond à partir des données de
 *    N°1 (banque d'exercices, programme, bibliothèque), en guidant l'élève par
 *    des indices plutôt qu'en donnant directement la réponse.
 */
import { byId, difficulties, studentClass } from './compute.js';

const STOP = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'a', 'à', 'au', 'aux', 'je', 'tu', 'il', 'est', 'que', 'qui', 'comment', 'pourquoi', 'quoi', 'sur', 'pour', 'pas', 'ne', 'me', 'moi', 'mon', 'ma', 'mes', 'ce', 'cette', 'faire', 'fait', 'explique', 'expliquer', 'moi', 'svp', 'stp', 'merci', 'bonjour', 'avec', 'dans', 'par', 'plus', 'comprends', 'comprendre', 'veux', 'peux', 'besoin', 'aide', 'aider']);

export function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9²³⁴⁵/+×÷=\- ]/g, ' ');
}

function words(text) {
  return normalize(text)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.endsWith('s') && w.length > 4 ? w.slice(0, -1) : w));
}

const SUBJECT_ALIASES = {
  maths: ['math', 'mathematique', 'calcul', 'fraction', 'equation', 'geometrie', 'puissance', 'triangle', 'nombre', 'moyenne', 'aire'],
  francais: ['francai', 'conjugaison', 'grammaire', 'orthographe', 'verbe', 'redaction', 'accord', 'participe'],
  anglais: ['anglai', 'english', 'present', 'past', 'vocabulary', 'grammar'],
  physique: ['physique', 'electricite', 'circuit', 'tension', 'courant', 'ohm', 'vitesse', 'force', 'lumiere'],
  chimie: ['chimie', 'atome', 'molecule', 'melange', 'reaction', 'combustion'],
  svt: ['svt', 'cellule', 'digestion', 'nutrition', 'ecosysteme', 'reproduction', 'biologie'],
  histgeo: ['histoire', 'geographie', 'empire', 'independance', 'colonisation', 'guinee', 'fleuve', 'region'],
  info: ['informatique', 'algorithme', 'programme', 'tableur', 'internet', 'mot de passe', 'ordinateur'],
};

/** Devine la matière et la notion évoquées dans une question. */
export function detectTopic(state, text) {
  const w = words(text);
  const joined = ` ${w.join(' ')} `;
  let best = null;
  for (const ex of state.exercises) {
    const tw = words(ex.topic);
    const score = tw.filter((t) => joined.includes(t.slice(0, 5))).length * 3;
    if (score && (!best || score > best.score)) best = { subjectId: ex.subjectId, topic: ex.topic, score };
  }
  if (best) return best;
  for (const [subjectId, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some((a) => joined.includes(a))) return { subjectId, topic: null, score: 1 };
  }
  return null;
}

function closestExercise(state, text, subjectId, threshold = 0.34) {
  const w = new Set(words(text));
  let best = null;
  for (const ex of state.exercises.filter((x) => !subjectId || x.subjectId === subjectId)) {
    const ew = words(ex.question);
    const overlap = ew.filter((x) => w.has(x)).length / Math.max(3, ew.length);
    if (!best || overlap > best.overlap) best = { ex, overlap };
  }
  return best && best.overlap >= threshold ? best.ex : null;
}

function pick(list, n, seed = Date.now()) {
  let s = seed % 2147483647 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return list
    .map((x) => [rnd(), x])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1])
    .slice(0, n);
}

/**
 * Réponse locale. Renvoie { text, quiz?, resources?, suggestTeacher? }.
 * `mode` : 'expliquer' | 'exercices' | 'question'.
 */
export function localAnswer(state, studentId, mode, text) {
  const student = byId(state.students, studentId);
  let found = detectTopic(state, text);
  // Pas de notion reconnue : on cherche l'exercice le plus proche de la question.
  if (!found || !found.topic) {
    const ex = closestExercise(state, text, found?.subjectId, found ? 0.2 : 0.34);
    if (ex) found = { subjectId: ex.subjectId, topic: ex.topic, score: 2 };
    else if (!found && /\d+\s*\/\s*\d+/.test(text)) found = { subjectId: 'maths', topic: 'Fractions', score: 1 };
  }
  const subject = found && byId(state.subjects, found.subjectId);
  const weak = difficulties(state, studentId);

  if (!found) {
    const suggestion = weak[0] ? ` Par exemple : « ${weak[0].topic} », une notion à consolider pour toi.` : '';
    return {
      text: `Je n’ai pas bien identifié la leçon. Précise la matière et la notion (ex. « Explique-moi les fractions » ou « Des exercices sur la loi d’Ohm »).${suggestion}`,
    };
  }

  const topicEx = state.exercises.filter((x) => x.subjectId === found.subjectId && (!found.topic || x.topic === found.topic));
  const resources = state.library
    .filter((r) => r.subjectId === found.subjectId && (!found.topic || normalize(`${r.topic} ${r.title}`).includes(normalize(found.topic).slice(0, 5))))
    .slice(0, 3);

  if (mode === 'exercices') {
    const quiz = pick(topicEx.length ? topicEx : state.exercises.filter((x) => x.subjectId === found.subjectId), 3);
    return {
      text: `Voici ${quiz.length} exercice(s) en ${subject.name}${found.topic ? ` sur « ${found.topic} »` : ''}. Réponds, puis vérifie : la correction s’affiche après ta réponse.`,
      quiz,
      resources,
    };
  }

  if (mode === 'question') {
    const ex = closestExercise(state, text, found.subjectId);
    if (ex) {
      return {
        text: `Bonne question ! Avant de te donner la réponse, essaie avec cet indice :\n\n💡 ${hintFrom(ex)}\n\nRéfléchis une minute, puis clique sur « Voir la solution » si tu bloques.`,
        solution: `${ex.choices[ex.answer]} — ${ex.explanation}`,
        resources,
      };
    }
  }

  // Expliquer une leçon (ou question sans correspondance exacte).
  const keyIdeas = [...new Set(topicEx.map((x) => x.explanation))].slice(0, 4);
  const isWeak = weak.some((d) => d.subjectId === found.subjectId && (!found.topic || d.topic === found.topic));
  const lines = [
    `📘 ${subject.name}${found.topic ? ` — ${found.topic}` : ''}`,
    '',
    keyIdeas.length ? 'Les idées clés, à partir d’exemples :' : `Je n’ai pas encore de fiche détaillée sur ce point en ${subject.name}.`,
    ...keyIdeas.map((k) => `• ${k}`),
    '',
    `À toi : ${topicEx[0] ? `essaie de répondre à « ${topicEx[0].question} » sans regarder la correction.` : 'reformule la règle avec tes mots, puis fais un exemple.'}`,
  ];
  if (isWeak) lines.push('', `C’est une notion que tu travailles en ce moment, ${student.firstName} : une séance d’entraînement ciblée t’aidera à progresser.`);
  return { text: lines.join('\n'), resources, suggestTeacher: !keyIdeas.length };
}

function hintFrom(ex) {
  // Indice sans divulguer la réponse : on élimine deux propositions fausses.
  const wrong = ex.choices.map((c, i) => [c, i]).filter(([, i]) => i !== ex.answer);
  const removed = wrong.slice(0, Math.max(0, ex.choices.length - 2)).map(([c]) => `« ${c} »`);
  const rest = ex.choices.filter((c) => !removed.includes(`« ${c} »`));
  return `Notion : ${ex.topic}. La bonne réponse n’est ni ${removed.join(' ni ')}. Il reste « ${rest.join(' » ou « ')} » : laquelle respecte la règle du cours ?`;
}

/** Contexte scolaire transmis à l'IA (aucune donnée nominative au-delà du prénom). */
export function assistantContext(state, studentId) {
  const s = byId(state.students, studentId);
  return {
    prenom: s.firstName,
    classe: studentClass(state, s)?.name,
    pays: 'Guinée',
    difficultes: difficulties(state, studentId)
      .slice(0, 4)
      .map((d) => `${byId(state.subjects, d.subjectId)?.name} : ${d.topic}`),
  };
}

/** Appelle la fonction serveur ; renvoie null si indisponible (hors ligne, pas de clé…). */
export async function remoteAnswer(messages, context, mode) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context, mode }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.text === 'string' && data.text.trim() ? data.text : null;
  } catch {
    return null;
  }
}
