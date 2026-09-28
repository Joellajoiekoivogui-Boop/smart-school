/**
 * Alertes intelligentes et priorités du tableau de bord.
 *
 * `smartAlerts` détecte les situations qui méritent l'attention (absence,
 * retard, devoir non rendu, baisse des résultats, échéance de paiement,
 * sortie, bulletin publié, demande d'autorisation…) pour chaque rôle.
 * `priorities` en tire une courte liste d'actions pour l'écran d'accueil.
 */
import {
  byId,
  childrenOf,
  formatDate,
  formatMoney,
  formatNote,
  paymentStatus,
  teacherOf,
} from './compute.js';
import { toISODate } from './seed.js';
import { recommendations } from './gamification.js';

const DAY = 86400000;

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / DAY);
}

/**
 * Baisse des résultats : moyenne des 2 dernières notes d'une matière
 * inférieure d'au moins 2 points à la moyenne des notes précédentes.
 */
export function resultDrops(state, studentId) {
  const out = [];
  for (const subject of state.subjects) {
    const evals = state.evaluations
      .filter((e) => e.subjectId === subject.id && e.scores[studentId] != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (evals.length < 4) continue;
    const recent = evals.slice(-2).map((e) => e.scores[studentId]);
    const before = evals.slice(0, -2).map((e) => e.scores[studentId]);
    const r = recent.reduce((a, b) => a + b, 0) / recent.length;
    const p = before.reduce((a, b) => a + b, 0) / before.length;
    if (p - r >= 2) out.push({ subject, recent: r, previous: p, drop: p - r, lastDate: evals[evals.length - 1].date });
  }
  return out.sort((a, b) => b.drop - a.drop);
}

function studentAlerts(state, sid, { prefix = '', forParent = false, today, since }) {
  const s = byId(state.students, sid);
  if (!s) return [];
  const items = [];
  const rules = state.school.alertRules || {};

  // Devoirs non rendus (échéance passée depuis moins de 10 jours)
  if (rules.devoirNonRendu !== false) {
    for (const h of state.homework.filter((h) => h.classId === s.classId && h.dueDate < today && daysBetween(h.dueDate, today) <= 10)) {
      if (state.submissions.some((x) => x.homeworkId === h.id && x.studentId === sid)) continue;
      items.push({
        id: `nr-${h.id}-${sid}`,
        kind: 'devoir',
        severity: 'attention',
        title: `${prefix}Devoir non rendu : ${h.title}`,
        body: `${byId(state.subjects, h.subjectId)?.name} — attendu le ${formatDate(h.dueDate)}`,
        at: `${h.dueDate}T18:00:00.000Z`,
        link: 'devoirs',
      });
    }
  }
  // Devoir à rendre demain (élève uniquement)
  if (!forParent) {
    const tomorrow = toISODate(new Date(new Date(`${today}T12:00:00`).getTime() + DAY));
    for (const h of state.homework.filter((h) => h.classId === s.classId && h.dueDate === tomorrow)) {
      if (state.submissions.some((x) => x.homeworkId === h.id && x.studentId === sid)) continue;
      items.push({
        id: `due-${h.id}-${sid}`,
        kind: 'devoir',
        severity: 'attention',
        title: `À rendre demain : ${h.title}`,
        body: byId(state.subjects, h.subjectId)?.name,
        at: `${today}T07:00:00.000Z`,
        link: 'devoirs',
      });
    }
  }
  // Baisse des résultats
  if (rules.baisseResultats !== false) {
    for (const d of resultDrops(state, sid)) {
      if (d.lastDate < since) continue;
      items.push({
        id: `drop-${sid}-${d.subject.id}-${d.lastDate}`,
        kind: 'baisse',
        severity: 'attention',
        title: `${prefix}Baisse des résultats en ${d.subject.name}`,
        body: `Moyenne récente ${formatNote(d.recent)} contre ${formatNote(d.previous)} auparavant.`,
        at: `${d.lastDate}T18:00:00.000Z`,
        link: forParent ? 'resultats' : 'progression',
      });
    }
  }
  // Copies corrigées récemment
  for (const sub of state.submissions.filter((x) => x.studentId === sid && x.gradedAt && x.gradedAt >= since)) {
    const h = byId(state.homework, sub.homeworkId);
    if (!h) continue;
    items.push({
      id: `graded-${sub.id}`,
      kind: 'note',
      severity: 'info',
      title: `${prefix}Devoir corrigé : ${h.title}`,
      body: `Note : ${formatNote(sub.grade)}/20${sub.feedback ? ` — « ${sub.feedback} »` : ''}`,
      at: `${sub.gradedAt}T16:00:00.000Z`,
      link: 'devoirs',
    });
  }
  // Bulletin publié
  for (const term of state.school.terms) {
    const pub = state.bulletinsPublished?.[`${s.classId}-${term.id}`];
    if (!pub) continue;
    items.push({
      id: `bull-${s.classId}-${term.id}-${sid}`,
      kind: 'bulletin',
      severity: 'info',
      title: `${prefix}Bulletin du ${term.name} disponible`,
      body: 'Consultable et téléchargeable en PDF.',
      at: pub.at,
      link: 'bulletins',
    });
  }

  if (forParent) {
    // Échéance de scolarité dans les 10 prochains jours
    if (rules.echeance !== false) {
      const pay = paymentStatus(state, sid, today);
      for (const inst of pay.installments) {
        if (inst.status === 'payee' || inst.status === 'en_retard') continue;
        const days = daysBetween(today, inst.dueDate);
        if (days < 0 || days > 10) continue;
        items.push({
          id: `ech-${sid}-${inst.id}`,
          kind: 'paiement',
          severity: 'attention',
          title: `${prefix}${inst.label} à régler ${days === 0 ? 'aujourd’hui' : `dans ${days} jour(s)`}`,
          body: `Reste ${formatMoney(inst.amount - inst.covered)} — paiement possible dans l’application.`,
          at: `${today}T08:00:00.000Z`,
          link: 'paiements',
        });
      }
    }
    // Sorties des 2 derniers jours
    if (rules.sortie !== false) {
      const twoDays = toISODate(new Date(new Date(`${today}T12:00:00`).getTime() - 2 * DAY));
      for (const e of state.exits.filter((x) => x.studentId === sid && x.date >= twoDays)) {
        items.push({
          id: `exit-${e.id}`,
          kind: 'sortie',
          severity: e.type === 'exceptionnelle' ? 'attention' : 'info',
          title: `${prefix}Sortie à ${e.time.replace(':', 'h')}`,
          body: `${formatDate(e.date, { weekday: 'long', day: 'numeric', month: 'short' })} — ${e.reason} (${e.accompaniedBy})`,
          at: `${e.date}T${e.time}:00`,
          link: 'sorties',
        });
      }
    }
    // Décisions sur les demandes d'autorisation
    for (const a of (state.exitAuthorizations || []).filter((x) => x.studentId === sid && x.decidedAt && x.decidedAt.slice(0, 10) >= since)) {
      items.push({
        id: `authd-${a.id}`,
        kind: 'sortie',
        severity: a.status === 'refusee' ? 'attention' : 'info',
        title: `${prefix}Sortie du ${formatDate(a.date)} ${a.status === 'approuvee' ? 'autorisée' : 'refusée'}`,
        body: `${a.time} — ${a.reason}`,
        at: a.decidedAt,
        link: 'sorties',
      });
    }
  }
  return items;
}

export function smartAlerts(state, user, now = new Date()) {
  if (!user) return [];
  const today = toISODate(now);
  const since = toISODate(new Date(now.getTime() - 7 * DAY));
  const items = [];

  if (user.role === 'eleve') items.push(...studentAlerts(state, user.personId, { today, since }));

  if (user.role === 'parent') {
    for (const c of childrenOf(state, user)) {
      items.push(...studentAlerts(state, c.id, { prefix: `${c.firstName} — `, forParent: true, today, since }));
    }
  }

  if (user.role === 'enseignant') {
    const teacher = teacherOf(state, user);
    const students = state.students.filter((s) => teacher?.classIds.includes(s.classId));
    for (const s of students) {
      for (const d of resultDrops(state, s.id).filter((d) => teacher.subjectIds.includes(d.subject.id) && d.lastDate >= since)) {
        items.push({
          id: `tdrop-${s.id}-${d.subject.id}-${d.lastDate}`,
          kind: 'baisse',
          severity: 'attention',
          title: `${s.firstName} ${s.lastName} : baisse en ${d.subject.name}`,
          body: `${formatNote(d.recent)} récemment contre ${formatNote(d.previous)}.`,
          at: `${d.lastDate}T18:00:00.000Z`,
          link: `eleves/${s.id}`,
        });
      }
    }
  }

  if (user.role === 'admin') {
    const pending = (state.exitAuthorizations || []).filter((a) => a.status === 'en_attente');
    for (const a of pending) {
      const s = byId(state.students, a.studentId);
      items.push({
        id: `authp-${a.id}`,
        kind: 'sortie',
        severity: 'attention',
        title: `Demande de sortie : ${s?.firstName} ${s?.lastName}`,
        body: `${formatDate(a.date)} à ${a.time} — ${a.reason}`,
        at: a.at,
        link: 'sorties',
      });
    }
    const unjustified = state.attendance.filter((a) => a.status === 'absent' && !a.justified && a.date >= since).length;
    if (unjustified) {
      items.push({
        id: `unjust-${today}-${unjustified}`,
        kind: 'absence',
        severity: 'attention',
        title: `${unjustified} absence(s) non justifiée(s) cette semaine`,
        body: 'À traiter dans Présences.',
        at: `${today}T08:00:00.000Z`,
        link: 'presences',
      });
    }
  }
  return items;
}

const SEVERITY_ORDER = { critique: 0, attention: 1, info: 2 };

/** Liste courte et ordonnée d'actions pour le tableau de bord. */
export function priorities(state, user, notifications, now = new Date()) {
  const today = toISODate(now);
  const list = [];
  const push = (p) => list.push({ severity: 'attention', ...p });

  if (user.role === 'enseignant') {
    const teacher = teacherOf(state, user);
    const classes = state.classes.filter((c) => teacher?.classIds.includes(c.id));
    const day = now.getDay() - 1;
    const teachesToday = new Set(state.timetable.filter((t) => t.teacherId === teacher?.id && t.day === day).map((t) => t.classId));
    for (const c of classes) {
      if (teachesToday.has(c.id) && !state.attendance.some((a) => a.classId === c.id && a.date === today)) {
        push({ id: `call-${c.id}`, title: `Faire l’appel en ${c.name}`, link: 'presences', severity: 'critique' });
      }
    }
    const hwIds = new Set(state.homework.filter((h) => h.teacherId === teacher?.id).map((h) => h.id));
    const toGrade = state.submissions.filter((s) => hwIds.has(s.homeworkId) && s.grade == null).length;
    if (toGrade) push({ id: 'grade', title: `${toGrade} copie(s) à corriger`, link: 'devoirs' });
  }
  if (user.role === 'admin') {
    const due = state.students.filter((s) => paymentStatus(state, s.id, today).overdue > 0).length;
    if (due) push({ id: 'debts', title: `${due} famille(s) avec un impayé échu`, link: 'scolarite' });
    const term = state.school.currentTermId;
    const unpublished = state.classes.filter((c) => !state.bulletinsPublished?.[`${c.id}-${term}`]).length;
    if (unpublished) push({ id: 'bull', title: `Bulletins à publier : ${unpublished} classe(s)`, link: 'notes', severity: 'info' });
  }
  if (user.role === 'eleve') {
    // Entraînement du jour ciblé sur la notion la plus fragile.
    const trainedToday = state.trainingAttempts.some((a) => a.studentId === user.personId && toISODate(new Date(a.at)) === today);
    const reco = recommendations(state, user.personId, 1)[0];
    if (!trainedToday && reco) {
      push({
        id: `train-${reco.subjectId}-${reco.topic}`,
        title: `Entraînement du jour : ${reco.topic}`,
        body: `${byId(state.subjects, reco.subjectId)?.name} — ${reco.reason}`,
        link: 'entrainement',
        severity: 'info',
      });
    }
  }

  for (const n of notifications.filter((n) => !n.read && n.severity && n.severity !== 'info')) {
    push({ id: n.id, title: n.title, body: n.body, link: n.link, severity: n.severity });
  }
  const seen = new Set();
  return list
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 6);
}
