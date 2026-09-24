/**
 * Calculs métier (sélecteurs purs) : moyennes, rangs, présences, scolarité,
 * progression, difficultés, notifications. Aucune écriture ici.
 */
import { can, canAccessStudent } from './permissions.js';
import { toISODate } from './seed.js';
import { smartAlerts } from './alerts.js';

export function round1(n) {
  return n == null || Number.isNaN(n) ? null : Math.round(n * 10) / 10;
}

export function fullName(p) {
  return p ? `${p.firstName} ${p.lastName}` : '—';
}

export const byId = (list, id) => list.find((x) => x.id === id);

export function studentClass(state, student) {
  return byId(state.classes, student?.classId);
}

export function classLevel(state, cls) {
  return byId(state.levels, cls?.levelId);
}

export function teacherName(state, teacherId) {
  const t = byId(state.teachers, teacherId);
  return t ? `${t.gender === 'F' ? 'Mme' : 'M.'} ${t.firstName} ${t.lastName}` : '—';
}

export function userForPerson(state, role, personId) {
  return state.users.find((u) => u.role === role && u.personId === personId);
}

// ---------------------------------------------------------------- Notes

function studentEvaluations(state, studentId, { subjectId, termId, until } = {}) {
  return state.evaluations.filter(
    (e) =>
      e.scores[studentId] != null &&
      (!subjectId || e.subjectId === subjectId) &&
      (!termId || e.termId === termId) &&
      (!until || e.date <= until),
  );
}

/** Moyenne pondérée (coefficients des évaluations) d'un élève dans une matière. */
export function subjectAverage(state, studentId, subjectId, opts = {}) {
  const evals = studentEvaluations(state, studentId, { ...opts, subjectId });
  if (!evals.length) return null;
  const total = evals.reduce((acc, e) => acc + e.scores[studentId] * e.coef, 0);
  const coefs = evals.reduce((acc, e) => acc + e.coef, 0);
  return total / coefs;
}

/** Moyenne générale pondérée par les coefficients des matières. */
export function generalAverage(state, studentId, opts = {}) {
  let total = 0;
  let coefs = 0;
  for (const subject of state.subjects) {
    const avg = subjectAverage(state, studentId, subject.id, opts);
    if (avg == null) continue;
    total += avg * subject.coef;
    coefs += subject.coef;
  }
  return coefs ? total / coefs : null;
}

export function classAverages(state, classId, opts = {}) {
  return state.students
    .filter((s) => s.classId === classId)
    .map((s) => ({ student: s, average: generalAverage(state, s.id, opts) }))
    .filter((r) => r.average != null)
    .sort((a, b) => b.average - a.average);
}

export function classRank(state, studentId, opts = {}) {
  const student = byId(state.students, studentId);
  if (!student) return null;
  const ranking = classAverages(state, student.classId, opts);
  const idx = ranking.findIndex((r) => r.student.id === studentId);
  return idx === -1 ? null : { rank: idx + 1, size: ranking.length };
}

export function subjectClassAverage(state, classId, subjectId, opts = {}) {
  const avgs = state.students
    .filter((s) => s.classId === classId)
    .map((s) => subjectAverage(state, s.id, subjectId, opts))
    .filter((a) => a != null);
  return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
}

export function appreciation(avg) {
  if (avg == null) return '—';
  if (avg >= 16) return 'Excellent';
  if (avg >= 14) return 'Très bien';
  if (avg >= 12) return 'Bien';
  if (avg >= 10) return 'Assez bien';
  if (avg >= 8) return 'Insuffisant';
  return 'Très insuffisant';
}

/** Bulletin complet d'un élève pour un trimestre. */
export function reportCard(state, studentId, termId) {
  const student = byId(state.students, studentId);
  const cls = studentClass(state, student);
  const lines = state.subjects.map((subject) => {
    const avg = subjectAverage(state, studentId, subject.id, { termId });
    return {
      subject,
      average: avg,
      classAverage: subjectClassAverage(state, cls.id, subject.id, { termId }),
      teacher: teacherName(state, subject.teacherId),
      appreciation: appreciation(avg),
      points: avg == null ? null : avg * subject.coef,
    };
  });
  const average = generalAverage(state, studentId, { termId });
  const ranking = classAverages(state, cls.id, { termId });
  return {
    student,
    cls,
    term: byId(state.school.terms, termId),
    lines,
    average,
    rank: classRank(state, studentId, { termId }),
    classAverage: ranking.length ? ranking.reduce((a, r) => a + r.average, 0) / ranking.length : null,
    best: ranking[0]?.average ?? null,
    attendance: attendanceStats(state, studentId),
    appreciation: appreciation(average),
  };
}

/**
 * Courbe de progression : moyenne générale cumulée après chaque date
 * d'évaluation (un point par semaine au plus).
 */
export function progressionSeries(state, studentId, subjectId = null) {
  const dates = [
    ...new Set(studentEvaluations(state, studentId, { subjectId }).map((e) => e.date)),
  ].sort();
  // Les évaluations d'une même « vague » (à quelques jours d'écart selon les
  // matières) sont regroupées en un seul point.
  const points = [];
  let bucketStart = null;
  for (const date of dates) {
    const value = subjectId
      ? subjectAverage(state, studentId, subjectId, { until: date })
      : generalAverage(state, studentId, { until: date });
    const t = new Date(`${date}T12:00:00`).getTime();
    if (bucketStart != null && t - bucketStart <= 2 * 86400000) points[points.length - 1] = { date, value };
    else {
      points.push({ date, value });
      bucketStart = t;
    }
  }
  return points;
}

/** Évolution en % entre la première moitié et la seconde moitié des évaluations. */
export function progressionPercent(state, studentId) {
  const evals = studentEvaluations(state, studentId).sort((a, b) => a.date.localeCompare(b.date));
  if (evals.length < 4) return null;
  const mid = Math.floor(evals.length / 2);
  const mean = (list) => list.reduce((a, e) => a + e.scores[studentId], 0) / list.length;
  const first = mean(evals.slice(0, mid));
  const second = mean(evals.slice(mid));
  return ((second - first) / first) * 100;
}

/** Thèmes où l'élève est en difficulté (notes < 10 ou entraînement < 60 %). */
export function difficulties(state, studentId) {
  const byTopic = {};
  for (const e of studentEvaluations(state, studentId)) {
    const k = `${e.subjectId}|${e.topic}`;
    byTopic[k] = byTopic[k] || { subjectId: e.subjectId, topic: e.topic, scores: [], training: [] };
    byTopic[k].scores.push(e.scores[studentId] / 20);
  }
  for (const a of state.trainingAttempts.filter((t) => t.studentId === studentId)) {
    const k = `${a.subjectId}|${a.topic}`;
    byTopic[k] = byTopic[k] || { subjectId: a.subjectId, topic: a.topic, scores: [], training: [] };
    byTopic[k].training.push(a.score / a.total);
  }
  return Object.values(byTopic)
    .map((t) => {
      const all = [...t.scores, ...t.training];
      return { ...t, ratio: all.reduce((a, b) => a + b, 0) / all.length };
    })
    .filter((t) => t.ratio < 0.55)
    .sort((a, b) => a.ratio - b.ratio);
}

// ---------------------------------------------------------------- Présences

export function attendanceStats(state, studentId) {
  const records = state.attendance.filter((a) => a.studentId === studentId);
  const absent = records.filter((a) => a.status === 'absent').length;
  const late = records.filter((a) => a.status === 'retard').length;
  const total = records.length;
  return {
    total,
    present: total - absent,
    absent,
    late,
    unjustified: records.filter((a) => a.status === 'absent' && !a.justified).length,
    rate: total ? ((total - absent) / total) * 100 : null,
  };
}

export function todayAttendance(state, studentId, today = toISODate(new Date())) {
  return state.attendance.find((a) => a.studentId === studentId && a.date === today) || null;
}

export function lastExit(state, studentId) {
  return (
    state.exits
      .filter((e) => e.studentId === studentId)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0] || null
  );
}

// ---------------------------------------------------------------- Scolarité

export function annualFee(state, student) {
  return classLevel(state, studentClass(state, student))?.annualFee ?? 0;
}

export function paymentStatus(state, studentId, today = toISODate(new Date())) {
  const student = byId(state.students, studentId);
  const fee = annualFee(state, student);
  const payments = state.payments
    .filter((p) => p.studentId === studentId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  let remaining = paid;
  let cumulativeDue = 0;
  let overdue = 0;
  const installments = state.school.installments.map((inst) => {
    const amount = Math.round(fee * inst.share);
    cumulativeDue += amount;
    const covered = Math.min(amount, Math.max(0, remaining));
    remaining -= covered;
    let status = 'a_venir';
    if (covered >= amount) status = 'payee';
    else if (inst.dueDate < today) {
      status = 'en_retard';
      overdue += amount - covered;
    } else if (covered > 0) status = 'partielle';
    return { ...inst, amount, covered, status };
  });
  return {
    fee,
    paid,
    balance: Math.max(0, fee - paid),
    percent: fee ? Math.min(100, (paid / fee) * 100) : 0,
    overdue,
    payments,
    installments,
  };
}

// ---------------------------------------------------------------- Devoirs

export function studentHomework(state, studentId) {
  const student = byId(state.students, studentId);
  return state.homework
    .filter((h) => h.classId === student?.classId)
    .map((h) => ({
      ...h,
      submission: state.submissions.find((s) => s.homeworkId === h.id && s.studentId === studentId) || null,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function pendingHomework(state, studentId, today = toISODate(new Date())) {
  return studentHomework(state, studentId).filter((h) => !h.submission && h.dueDate >= today);
}

// ---------------------------------------------------------------- Personnes liées

export function childrenOf(state, user) {
  if (user?.role !== 'parent') return [];
  const parent = byId(state.parents, user.personId);
  return (parent?.childrenIds || []).map((id) => byId(state.students, id)).filter(Boolean);
}

export function teacherOf(state, user) {
  return user?.role === 'enseignant' ? byId(state.teachers, user.personId) : null;
}

// ---------------------------------------------------------------- Annonces & notifications

export function announcementVisibleTo(state, announcement, user) {
  const t = announcement.target;
  if (!user) return false;
  if (user.role === 'admin' || announcement.authorId === user.id) return true;
  if (t.type === 'tous') return true;
  if (t.type === 'eleves') return user.role === 'eleve';
  if (t.type === 'parents') return user.role === 'parent';
  if (t.type === 'enseignants') return user.role === 'enseignant';
  if (t.type === 'classe') {
    if (user.role === 'eleve') return byId(state.students, user.personId)?.classId === t.classId;
    if (user.role === 'parent') return childrenOf(state, user).some((c) => c.classId === t.classId);
    if (user.role === 'enseignant') return teacherOf(state, user)?.classIds.includes(t.classId);
  }
  if (t.type === 'groupe') return (t.userIds || []).includes(user.id);
  return false;
}

export function visibleAnnouncements(state, user) {
  return state.announcements
    .filter((a) => announcementVisibleTo(state, a, user))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Flux de notifications calculé pour l'utilisateur (annonces + événements scolaires). */
export function notificationsFor(state, user, now = new Date()) {
  if (!can(user, 'notifications:read')) return [];
  const since = toISODate(new Date(now.getTime() - 7 * 86400000));
  const today = toISODate(now);
  const items = [];

  for (const a of visibleAnnouncements(state, user)) {
    items.push({ id: `ann-${a.id}`, kind: 'annonce', title: a.title, body: a.body, at: a.at });
  }

  const unread = state.messages.filter((m) => m.to === user.id && !m.read);
  if (unread.length) {
    const from = byId(state.users, unread[unread.length - 1].from);
    items.push({
      id: `msg-${unread[unread.length - 1].id}`,
      kind: 'message',
      title: `${unread.length} message(s) non lu(s)`,
      body: `Dernier message de ${from?.name || '—'}`,
      at: unread[unread.length - 1].at,
    });
  }

  const studentIds =
    user.role === 'eleve' ? [user.personId] : user.role === 'parent' ? childrenOf(state, user).map((c) => c.id) : [];
  for (const sid of studentIds) {
    const s = byId(state.students, sid);
    if (!canAccessStudent(state, user, sid)) continue;
    const prefix = user.role === 'parent' ? `${s.firstName} — ` : '';
    // Notes regroupées par jour pour ne pas noyer l'utilisateur.
    const notesByDate = {};
    for (const e of state.evaluations.filter((e) => e.scores[sid] != null && e.date >= since)) {
      (notesByDate[e.date] = notesByDate[e.date] || []).push(e);
    }
    for (const [date, evals] of Object.entries(notesByDate)) {
      const detail = evals.map((e) => `${byId(state.subjects, e.subjectId)?.short} ${formatNote(e.scores[sid])}`).join(' · ');
      items.push({
        id: `note-${date}-${sid}-${evals.length}`,
        kind: 'note',
        title:
          evals.length === 1
            ? `${prefix}Nouvelle note en ${byId(state.subjects, evals[0].subjectId)?.name}`
            : `${prefix}${evals.length} nouvelles notes`,
        body: evals.length === 1 ? `${evals[0].title} : ${formatNote(evals[0].scores[sid])}/20` : detail,
        at: `${date}T17:00:00.000Z`,
      });
    }
    for (const h of state.homework.filter((h) => h.classId === s.classId && h.createdAt >= since)) {
      items.push({
        id: `hw-${h.id}-${sid}`,
        kind: 'devoir',
        title: `${prefix}Nouveau devoir : ${h.title}`,
        body: `À rendre le ${formatDate(h.dueDate)}`,
        at: `${h.createdAt}T12:00:00.000Z`,
      });
    }
    if (user.role === 'parent') {
      for (const a of state.attendance.filter((a) => a.studentId === sid && a.status !== 'present' && a.date >= since)) {
        items.push({
          id: `att-${a.id}`,
          kind: a.status === 'absent' ? 'absence' : 'retard',
          severity: a.status === 'absent' ? 'critique' : 'attention',
          link: 'presences',
          title: `${prefix}${a.status === 'absent' ? 'Absence' : 'Retard'} signalé(e)`,
          body: a.status === 'absent' ? `Absent(e) le ${formatDate(a.date)}` : `Arrivée à ${a.arrival} le ${formatDate(a.date)}`,
          at: `${a.date}T09:00:00.000Z`,
        });
      }
      const pay = paymentStatus(state, sid, today);
      if (pay.overdue > 0) {
        items.push({
          id: `pay-overdue-${sid}-${pay.paid}`,
          kind: 'paiement',
          severity: 'critique',
          link: 'paiements',
          title: `${prefix}Échéance de scolarité en retard`,
          body: `Montant en retard : ${formatMoney(pay.overdue)}`,
          at: now.toISOString(),
        });
      }
    }
  }

  if (user.role === 'enseignant') {
    const teacher = teacherOf(state, user);
    const hwIds = new Set(state.homework.filter((h) => h.teacherId === teacher.id).map((h) => h.id));
    const toGrade = state.submissions.filter((s) => hwIds.has(s.homeworkId) && s.grade == null);
    if (toGrade.length) {
      items.push({
        id: `tograde-${toGrade.length}`,
        kind: 'devoir',
        title: `${toGrade.length} copie(s) à corriger`,
        body: 'Des élèves ont remis leurs devoirs en ligne.',
        at: now.toISOString(),
      });
    }
  }

  items.push(...smartAlerts(state, user, now));

  const read = new Set(state.readNotifications?.[user.id] || []);
  return items
    .map((n) => ({ ...n, read: read.has(n.id) }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------- Formatage

export function formatMoney(n) {
  if (n == null) return '—';
  return `${Math.round(n).toLocaleString('fr-FR')} GNF`;
}

export function formatDate(iso, opts = { day: 'numeric', month: 'short' }) {
  if (!iso) return '—';
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString('fr-FR', opts);
}

export function formatNote(n) {
  return n == null ? '—' : round1(n).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function timeAgo(iso, now = Date.now()) {
  const diff = Math.round((now - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `il y a ${diff} min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} j`;
}
