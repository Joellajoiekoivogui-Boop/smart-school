/**
 * Fiche de vie scolaire : chronologie longitudinale de l'élève, qui regroupe
 * au fil du temps résultats, présences, devoirs, sorties exceptionnelles,
 * entraînement, observations pédagogiques et activités.
 */
import { byId, formatNote, teacherName } from './compute.js';
import { OBSERVATION_TYPES } from './actions.js';

export const LIFE_CATEGORIES = {
  resultats: { label: 'Résultats', icon: 'chart', tone: 'blue' },
  presences: { label: 'Présences', icon: 'checkCircle', tone: 'red' },
  devoirs: { label: 'Devoirs', icon: 'edit', tone: 'orange' },
  observations: { label: 'Observations', icon: 'message', tone: 'green' },
  vie: { label: 'Vie scolaire', icon: 'school', tone: 'navy' },
  entrainement: { label: 'Entraînement', icon: 'brain', tone: 'blue' },
};

export function lifeEvents(state, studentId) {
  const s = byId(state.students, studentId);
  if (!s) return [];
  const ev = [];
  const push = (e) => ev.push({ ...e, at: e.at.length === 10 ? `${e.at}T12:00:00` : e.at });

  push({ id: `enrol-${s.id}`, cat: 'vie', at: s.enrolledAt || state.school.terms[0].start, title: `Inscription en ${byId(state.classes, s.classId)?.name}`, body: `Année scolaire ${state.school.year} — matricule ${s.matricule}` });

  for (const e of state.evaluations) {
    const v = e.scores[studentId];
    if (v == null) continue;
    push({
      id: `ev-${e.id}`,
      cat: 'resultats',
      at: e.date,
      title: `${byId(state.subjects, e.subjectId)?.name} : ${formatNote(v)}/20`,
      body: `${e.title} (coef. ${e.coef})`,
      tone: v >= 14 ? 'green' : v >= 10 ? 'blue' : v >= 8 ? 'orange' : 'red',
    });
  }
  for (const a of state.attendance.filter((a) => a.studentId === studentId && a.status !== 'present')) {
    push({
      id: `at-${a.id}`,
      cat: 'presences',
      at: a.date,
      title: a.status === 'absent' ? 'Absence' : `Retard (arrivée ${a.arrival || '—'})`,
      body: a.status === 'absent' ? (a.justified ? 'Justifiée' : 'Non justifiée') : '',
      tone: a.status === 'absent' ? 'red' : 'orange',
    });
  }
  for (const sub of state.submissions.filter((x) => x.studentId === studentId)) {
    const h = byId(state.homework, sub.homeworkId);
    if (!h) continue;
    push({ id: `sub-${sub.id}`, cat: 'devoirs', at: sub.submittedAt, title: `Devoir remis : ${h.title}`, body: byId(state.subjects, h.subjectId)?.name });
    if (sub.grade != null) {
      push({
        id: `cor-${sub.id}`,
        cat: 'devoirs',
        at: sub.gradedAt || sub.submittedAt,
        title: `Devoir corrigé : ${formatNote(sub.grade)}/20`,
        body: `${h.title}${sub.feedback ? ` — « ${sub.feedback} »` : ''}`,
      });
    }
  }
  for (const e of state.exits.filter((x) => x.studentId === studentId && x.type === 'exceptionnelle')) {
    push({ id: `ex-${e.id}`, cat: 'vie', at: `${e.date}T${e.time}:00`, title: `Sortie exceptionnelle à ${e.time.replace(':', 'h')}`, body: `${e.reason} — ${e.accompaniedBy}` });
  }
  for (const o of (state.observations || []).filter((x) => x.studentId === studentId)) {
    const author = byId(state.users, o.authorId);
    push({
      id: `ob-${o.id}`,
      cat: o.type === 'activite' ? 'vie' : 'observations',
      at: o.at,
      title: OBSERVATION_TYPES[o.type] || 'Observation',
      body: o.text,
      author: author?.role === 'enseignant' ? teacherName(state, author.personId) : author?.name,
      tone: o.type === 'encouragement' ? 'green' : o.type === 'avertissement' ? 'red' : undefined,
      observationId: o.id,
      authorId: o.authorId,
    });
  }
  // Entraînement : une ligne par jour
  const byDay = {};
  for (const a of state.trainingAttempts.filter((x) => x.studentId === studentId)) {
    const d = a.at.slice(0, 10);
    (byDay[d] = byDay[d] || []).push(a);
  }
  for (const [d, list] of Object.entries(byDay)) {
    const score = list.reduce((x, a) => x + a.score, 0);
    const total = list.reduce((x, a) => x + a.total, 0);
    push({
      id: `tr-${d}`,
      cat: 'entrainement',
      at: list[list.length - 1].at,
      title: `Entraînement : ${list.length} séance(s), ${Math.round((score / total) * 100)} % de réussite`,
      body: [...new Set(list.map((a) => `${byId(state.subjects, a.subjectId)?.short} — ${a.topic}`))].join(' · '),
    });
  }
  for (const term of state.school.terms) {
    const pub = state.bulletinsPublished?.[`${s.classId}-${term.id}`];
    if (pub) push({ id: `bu-${term.id}`, cat: 'resultats', at: pub.at, title: `Bulletin du ${term.name} publié`, body: 'Disponible pour la famille.' });
  }
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}
