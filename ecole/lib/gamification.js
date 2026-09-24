/**
 * Gamification de l'entraînement (jamais des notes scolaires) : points
 * d'expérience, niveaux, série de jours, objectif hebdomadaire et badges.
 * Tout est personnel : aucun classement entre élèves.
 */
import { toISODate } from './seed.js';
import { difficulties } from './compute.js';

export const LEVELS = [
  { min: 0, name: 'Débutant' },
  { min: 100, name: 'Apprenti' },
  { min: 250, name: 'Explorateur' },
  { min: 500, name: 'Confirmé' },
  { min: 900, name: 'Expert' },
  { min: 1500, name: 'Maître' },
];

export const BADGES = [
  { id: 'first', icon: '🎯', name: 'Premier pas', desc: 'Terminer une première séance.', test: (g) => g.sessions >= 1 },
  { id: 'perfect', icon: '💯', name: 'Sans faute', desc: 'Réussir une séance à 100 %.', test: (g) => g.perfect >= 1 },
  { id: 'streak3', icon: '🔥', name: 'Régulier', desc: '3 jours d’entraînement d’affilée.', test: (g) => g.bestStreak >= 3 },
  { id: 'streak7', icon: '⚡', name: 'Inarrêtable', desc: '7 jours d’affilée.', test: (g) => g.bestStreak >= 7 },
  { id: 'ten', icon: '📚', name: 'Assidu', desc: '10 séances terminées.', test: (g) => g.sessions >= 10 },
  { id: 'polyvalent', icon: '🧭', name: 'Polyvalent', desc: 'S’entraîner dans 4 matières.', test: (g) => g.subjects >= 4 },
  { id: 'comeback', icon: '📈', name: 'Remontada', desc: 'Réussir à 80 % une notion travaillée en difficulté.', test: (g) => g.comeback },
  { id: 'goal', icon: '🏅', name: 'Objectif atteint', desc: 'Atteindre son objectif de la semaine.', test: (g) => g.weekDone >= g.weeklyGoal },
];

function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (x.getDay() + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - wd);
  return x;
}

export function gamification(state, studentId, now = new Date()) {
  const attempts = state.trainingAttempts
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => a.at.localeCompare(b.at));
  let xp = 0;
  let perfect = 0;
  const firstRatioByTopic = {};
  let comeback = false;
  for (const a of attempts) {
    xp += a.score * 10 + 5; // 10 points par bonne réponse + 5 pour l'effort
    if (a.score === a.total) {
      perfect++;
      xp += 20;
    }
    const key = `${a.subjectId}|${a.topic}`;
    const ratio = a.score / a.total;
    if (firstRatioByTopic[key] == null) firstRatioByTopic[key] = ratio;
    else if (firstRatioByTopic[key] < 0.6 && ratio >= 0.8) comeback = true;
  }

  const days = [...new Set(attempts.map((a) => toISODate(new Date(a.at))))].sort();
  let bestStreak = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    const t = new Date(`${d}T12:00:00`).getTime();
    run = prev != null && t - prev === 86400000 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prev = t;
  }
  const today = toISODate(now);
  const yesterday = toISODate(new Date(now.getTime() - 86400000));
  const last = days[days.length - 1];
  const currentStreak = last === today || last === yesterday ? run : 0;

  const weekStart = startOfWeek(now).toISOString();
  const weekDone = attempts.filter((a) => a.at >= weekStart).length;
  const weeklyGoal = state.trainingGoals?.[studentId] || 5;

  const level = [...LEVELS].reverse().find((l) => xp >= l.min);
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  const g = {
    xp,
    level: { ...level, number: idx + 1 },
    nextLevel: next || null,
    levelProgress: next ? (xp - level.min) / (next.min - level.min) : 1,
    sessions: attempts.length,
    perfect,
    bestStreak,
    currentStreak,
    trainedToday: last === today,
    weekDone,
    weeklyGoal,
    subjects: new Set(attempts.map((a) => a.subjectId)).size,
    comeback,
  };
  g.badges = BADGES.map((b) => ({ ...b, earned: b.test(g) }));
  return g;
}

/**
 * Recommandations d'entraînement personnalisé : notions en difficulté
 * d'abord (notes + entraînement), puis notions jamais travaillées.
 */
export function recommendations(state, studentId, limit = 4) {
  const recos = [];
  const available = new Set(state.exercises.map((x) => `${x.subjectId}|${x.topic}`));
  for (const d of difficulties(state, studentId)) {
    if (available.has(`${d.subjectId}|${d.topic}`)) {
      recos.push({ subjectId: d.subjectId, topic: d.topic, reason: `${Math.round(d.ratio * 100)} % de réussite — à consolider`, weight: 1 - d.ratio });
    }
  }
  const trained = new Set(state.trainingAttempts.filter((a) => a.studentId === studentId).map((a) => `${a.subjectId}|${a.topic}`));
  for (const key of available) {
    if (recos.length >= limit) break;
    if (trained.has(key) || recos.some((r) => `${r.subjectId}|${r.topic}` === key)) continue;
    const [subjectId, topic] = key.split('|');
    recos.push({ subjectId, topic, reason: 'Notion pas encore travaillée', weight: 0.2 });
  }
  return recos.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

/**
 * Compose une séance adaptative : 60 % de questions sur les notions en
 * difficulté, le reste pour réviser d'autres notions de la matière.
 */
export function adaptiveQuestions(state, studentId, subjectId, count = 5, rand = Math.random) {
  const pool = state.exercises.filter((x) => x.subjectId === subjectId);
  const weak = new Set(difficulties(state, studentId).filter((d) => d.subjectId === subjectId).map((d) => d.topic));
  const shuffle = (list) => list.map((x) => [rand(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const weakQs = shuffle(pool.filter((x) => weak.has(x.topic)));
  const otherQs = shuffle(pool.filter((x) => !weak.has(x.topic)));
  const nWeak = Math.min(weakQs.length, Math.ceil(count * 0.6));
  return shuffle([...weakQs.slice(0, nWeak), ...otherQs.slice(0, count - nWeak), ...weakQs.slice(nWeak)]).slice(0, count);
}
