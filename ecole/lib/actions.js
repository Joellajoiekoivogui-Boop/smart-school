/**
 * Actions (écritures) de N°1.
 *
 * Chaque action reçoit un brouillon d'état (`draft`, déjà copié par le store),
 * l'utilisateur connecté et les données du formulaire. Elle vérifie les
 * permissions et le périmètre AVANT de modifier quoi que ce soit, et lève une
 * erreur explicite sinon : c'est la seule porte d'entrée pour modifier les
 * données, quelle que soit la page.
 */
import {
  requirePermission,
  canAccessStudent,
  canTeach,
  messageContacts,
  ForbiddenError,
} from './permissions.js';
import { byId } from './compute.js';
import { toISODate } from './seed.js';

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function required(value, label) {
  if (value == null || String(value).trim() === '') throw new Error(`Le champ « ${label} » est obligatoire.`);
  return typeof value === 'string' ? value.trim() : value;
}

function slugEmail(firstName, lastName, suffix = '') {
  return (
    `${firstName}.${lastName}${suffix}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9.]/g, '') + '@n1.school'
  );
}

function uniqueEmail(draft, firstName, lastName) {
  let email = slugEmail(firstName, lastName);
  let n = 2;
  while (draft.users.some((u) => u.email === email)) email = slugEmail(firstName, lastName, String(n++));
  return email;
}

function parseScore(value) {
  if (value === '' || value == null) return null;
  const n = Number(String(value).replace(',', '.'));
  if (Number.isNaN(n) || n < 0 || n > 20) throw new Error('Une note doit être comprise entre 0 et 20.');
  return Math.round(n * 100) / 100;
}

// ================================================================ Notes

export function createEvaluation(draft, user, { classId, subjectId, title, type, date, coef, topic }) {
  requirePermission(user, 'grades:write');
  if (!canTeach(draft, user, classId, subjectId)) {
    throw new ForbiddenError('Vous ne pouvez saisir des notes que pour vos matières et vos classes.');
  }
  const subject = byId(draft.subjects, subjectId);
  const evaluation = {
    id: uid('ev'),
    classId,
    subjectId,
    teacherId: subject.teacherId,
    title: required(title, 'Intitulé'),
    type: type || 'Interrogation',
    topic: topic || '',
    date: date || toISODate(new Date()),
    termId: draft.school.currentTermId,
    coef: Number(coef) || 1,
    scores: {},
  };
  draft.evaluations.push(evaluation);
  return evaluation;
}

export function setScores(draft, user, { evaluationId, scores }) {
  requirePermission(user, 'grades:write');
  const evaluation = byId(draft.evaluations, evaluationId);
  if (!evaluation) throw new Error('Évaluation introuvable.');
  if (!canTeach(draft, user, evaluation.classId, evaluation.subjectId)) {
    throw new ForbiddenError('Vous ne pouvez modifier que les notes de vos classes.');
  }
  for (const [studentId, raw] of Object.entries(scores)) {
    const student = byId(draft.students, studentId);
    if (!student || student.classId !== evaluation.classId) continue;
    const value = parseScore(raw);
    if (value == null) delete evaluation.scores[studentId];
    else evaluation.scores[studentId] = value;
  }
  return evaluation;
}

export function deleteEvaluation(draft, user, { evaluationId }) {
  requirePermission(user, 'grades:write');
  const evaluation = byId(draft.evaluations, evaluationId);
  if (!evaluation) return;
  if (!canTeach(draft, user, evaluation.classId, evaluation.subjectId)) throw new ForbiddenError();
  draft.evaluations = draft.evaluations.filter((e) => e.id !== evaluationId);
}

// ================================================================ Devoirs

export function publishHomework(draft, user, { classId, subjectId, title, description, dueDate, attachment }) {
  requirePermission(user, 'homework:publish');
  if (!canTeach(draft, user, classId, subjectId)) {
    throw new ForbiddenError('Vous ne pouvez publier des devoirs que pour vos classes et vos matières.');
  }
  const hw = {
    id: uid('hw'),
    classId,
    subjectId,
    teacherId: byId(draft.subjects, subjectId).teacherId,
    title: required(title, 'Titre'),
    description: description || '',
    createdAt: toISODate(new Date()),
    dueDate: required(dueDate, 'Date limite'),
    attachments: attachment ? [attachment] : [],
  };
  draft.homework.push(hw);
  return hw;
}

export function submitHomework(draft, user, { homeworkId, content, fileName }) {
  requirePermission(user, 'homework:submit');
  const hw = byId(draft.homework, homeworkId);
  const student = byId(draft.students, user.personId);
  if (!hw || !student || hw.classId !== student.classId) throw new ForbiddenError('Ce devoir ne vous concerne pas.');
  if (!String(content || '').trim() && !fileName) throw new Error('Ajoutez un texte ou un fichier avant de remettre le devoir.');
  const existing = draft.submissions.find((s) => s.homeworkId === homeworkId && s.studentId === student.id);
  if (existing?.grade != null) throw new Error('Ce devoir a déjà été corrigé : il ne peut plus être modifié.');
  const submission = existing || { id: uid('sub'), homeworkId, studentId: student.id, grade: null, feedback: '' };
  Object.assign(submission, { content: content || '', fileName: fileName || null, submittedAt: toISODate(new Date()) });
  if (!existing) draft.submissions.push(submission);
  return submission;
}

export function gradeSubmission(draft, user, { submissionId, grade, feedback }) {
  requirePermission(user, 'homework:grade');
  const sub = byId(draft.submissions, submissionId);
  const hw = sub && byId(draft.homework, sub.homeworkId);
  if (!hw || !canTeach(draft, user, hw.classId, hw.subjectId)) throw new ForbiddenError();
  sub.grade = parseScore(grade);
  sub.feedback = feedback || '';
  return sub;
}

// ================================================================ Présences & sorties

export function saveAttendance(draft, user, { classId, date, entries }) {
  requirePermission(user, 'attendance:write');
  if (!canTeach(draft, user, classId, null)) throw new ForbiddenError('Vous ne pouvez faire l’appel que dans vos classes.');
  for (const [studentId, entry] of Object.entries(entries)) {
    const student = byId(draft.students, studentId);
    if (!student || student.classId !== classId) continue;
    if (!['present', 'absent', 'retard'].includes(entry.status)) throw new Error('Statut de présence invalide.');
    const id = `at-${date}-${studentId}`;
    const record = draft.attendance.find((a) => a.id === id);
    const data = {
      id,
      date,
      classId,
      studentId,
      status: entry.status,
      arrival: entry.status === 'absent' ? null : entry.arrival || null,
      justified: record?.justified ?? false,
      recordedBy: user.id,
    };
    if (record) Object.assign(record, data);
    else draft.attendance.push(data);
  }
}

export function justifyAbsence(draft, user, { attendanceId, justified }) {
  requirePermission(user, 'settings:manage');
  const record = byId(draft.attendance, attendanceId);
  if (record) record.justified = Boolean(justified);
}

export function recordExit(draft, user, { studentId, date, time, type, reason, accompaniedBy }) {
  requirePermission(user, 'exits:write');
  if (!byId(draft.students, studentId)) throw new Error('Élève introuvable.');
  const exit = {
    id: uid('ex'),
    studentId,
    date: date || toISODate(new Date()),
    time: required(time, 'Heure'),
    type: type || 'normale',
    reason: reason || 'Fin des cours',
    accompaniedBy: accompaniedBy || 'Seul(e)',
  };
  draft.exits.push(exit);
  return exit;
}

// ================================================================ Scolarité

export function recordPayment(draft, user, { studentId, amount, method, date }) {
  requirePermission(user, 'payments:manage');
  if (!byId(draft.students, studentId)) throw new Error('Élève introuvable.');
  const value = Math.round(Number(String(amount).replace(/\s/g, '')));
  if (!value || value <= 0) throw new Error('Le montant doit être supérieur à 0.');
  const year = draft.school.year.slice(0, 4);
  const receiptNo = `REC-${year}-${String(draft.payments.length + 1).padStart(4, '0')}`;
  const payment = {
    id: uid('pay'),
    studentId,
    amount: value,
    method: method || 'Espèces',
    date: date || toISODate(new Date()),
    receiptNo,
    recordedBy: user.id,
  };
  draft.payments.push(payment);
  return payment;
}

export function setLevelFee(draft, user, { levelId, annualFee }) {
  requirePermission(user, 'payments:manage');
  const level = byId(draft.levels, levelId);
  const fee = Math.round(Number(annualFee));
  if (!level || !fee || fee < 0) throw new Error('Montant invalide.');
  level.annualFee = fee;
}

// ================================================================ Communication

export function sendMessage(draft, user, { to, body }) {
  requirePermission(user, 'messages:use');
  const text = required(body, 'Message');
  if (!messageContacts(draft, user).some((c) => c.id === to)) {
    throw new ForbiddenError('Vous ne pouvez pas écrire à ce destinataire.');
  }
  const message = { id: uid('m'), from: user.id, to, body: text, at: new Date().toISOString(), read: false };
  draft.messages.push(message);
  return message;
}

export function markThreadRead(draft, user, { otherId }) {
  for (const m of draft.messages) if (m.to === user.id && m.from === otherId) m.read = true;
}

export function sendAnnouncement(draft, user, { target, title, body }) {
  if (target?.type === 'classe') {
    requirePermission(user, 'announcements:class');
    if (!canTeach(draft, user, target.classId, null)) throw new ForbiddenError('Vous ne pouvez écrire qu’à vos classes.');
  } else {
    requirePermission(user, 'announcements:all');
  }
  const announcement = {
    id: uid('a'),
    authorId: user.id,
    target,
    title: required(title, 'Titre'),
    body: required(body, 'Message'),
    at: new Date().toISOString(),
  };
  draft.announcements.push(announcement);
  return announcement;
}

export function markNotificationsRead(draft, user, { ids }) {
  draft.readNotifications = draft.readNotifications || {};
  const set = new Set(draft.readNotifications[user.id] || []);
  ids.forEach((id) => set.add(id));
  draft.readNotifications[user.id] = [...set];
}

// ================================================================ Entraînement

export function recordTraining(draft, user, { subjectId, topic, score, total }) {
  requirePermission(user, 'training:use');
  const attempt = {
    id: uid('ta'),
    studentId: user.personId,
    subjectId,
    topic: topic || 'Général',
    score,
    total,
    at: new Date().toISOString(),
  };
  draft.trainingAttempts.push(attempt);
  return attempt;
}

// ================================================================ Administration : élèves & parents

export function saveStudent(draft, user, data) {
  requirePermission(user, 'students:manage');
  const firstName = required(data.firstName, 'Prénom');
  const lastName = required(data.lastName, 'Nom');
  const classId = required(data.classId, 'Classe');
  if (!byId(draft.classes, classId)) throw new Error('Classe introuvable.');

  if (data.id) {
    const student = byId(draft.students, data.id);
    if (!student) throw new Error('Élève introuvable.');
    Object.assign(student, {
      firstName,
      lastName,
      classId,
      gender: data.gender || student.gender,
      birthDate: data.birthDate || student.birthDate,
      status: data.status || student.status,
    });
    const account = draft.users.find((u) => u.role === 'eleve' && u.personId === student.id);
    if (account) account.name = `${firstName} ${lastName}`;
    return student;
  }

  const n = draft.students.length + 1;
  const student = {
    id: uid('s'),
    matricule: `N1-${draft.school.year.slice(0, 4)}-${String(n).padStart(3, '0')}`,
    firstName,
    lastName,
    classId,
    gender: data.gender || 'M',
    birthDate: data.birthDate || '',
    status: 'inscrit',
    enrolledAt: toISODate(new Date()),
    parentIds: [],
  };
  draft.students.push(student);
  draft.users.push({
    id: `u-${student.id}`,
    role: 'eleve',
    email: uniqueEmail(draft, firstName, lastName),
    password: 'eleve123',
    name: `${firstName} ${lastName}`,
    personId: student.id,
  });

  if (data.parentId) {
    const parent = byId(draft.parents, data.parentId);
    if (parent) {
      parent.childrenIds.push(student.id);
      student.parentIds.push(parent.id);
    }
  } else if (data.parentFirstName && data.parentLastName) {
    const parent = {
      id: uid('p'),
      firstName: data.parentFirstName.trim(),
      lastName: data.parentLastName.trim(),
      title: data.parentTitle || 'M.',
      phone: data.parentPhone || '',
      relation: 'Père / Mère',
      childrenIds: [student.id],
    };
    draft.parents.push(parent);
    student.parentIds.push(parent.id);
    draft.users.push({
      id: `u-${parent.id}`,
      role: 'parent',
      email: uniqueEmail(draft, 'parent', parent.lastName),
      password: 'parent123',
      name: `${parent.title} ${parent.firstName} ${parent.lastName}`,
      personId: parent.id,
    });
  }
  return student;
}

export function deleteStudent(draft, user, { studentId }) {
  requirePermission(user, 'students:manage');
  draft.students = draft.students.filter((s) => s.id !== studentId);
  draft.users = draft.users.filter((u) => !(u.role === 'eleve' && u.personId === studentId));
  for (const p of draft.parents) p.childrenIds = p.childrenIds.filter((id) => id !== studentId);
  draft.attendance = draft.attendance.filter((a) => a.studentId !== studentId);
  draft.exits = draft.exits.filter((e) => e.studentId !== studentId);
  draft.submissions = draft.submissions.filter((s) => s.studentId !== studentId);
  draft.trainingAttempts = draft.trainingAttempts.filter((t) => t.studentId !== studentId);
  for (const e of draft.evaluations) delete e.scores[studentId];
  // L'historique des paiements est conservé (traçabilité comptable).
}

export function saveParent(draft, user, data) {
  requirePermission(user, 'parents:manage');
  const parent = byId(draft.parents, data.id);
  if (!parent) throw new Error('Parent introuvable.');
  Object.assign(parent, {
    firstName: required(data.firstName, 'Prénom'),
    lastName: required(data.lastName, 'Nom'),
    phone: data.phone || '',
    title: data.title || parent.title,
  });
  const account = draft.users.find((u) => u.role === 'parent' && u.personId === parent.id);
  if (account) account.name = `${parent.title} ${parent.firstName} ${parent.lastName}`;
}

// ================================================================ Administration : enseignants

export function saveTeacher(draft, user, data) {
  requirePermission(user, 'teachers:manage');
  const firstName = required(data.firstName, 'Prénom');
  const lastName = required(data.lastName, 'Nom');
  const subjectIds = data.subjectIds || [];
  const classIds = data.classIds || [];
  if (data.id) {
    const teacher = byId(draft.teachers, data.id);
    if (!teacher) throw new Error('Enseignant introuvable.');
    Object.assign(teacher, { firstName, lastName, gender: data.gender || teacher.gender, phone: data.phone || '', subjectIds, classIds });
    for (const s of draft.subjects) if (subjectIds.includes(s.id)) s.teacherId = teacher.id;
    const account = draft.users.find((u) => u.role === 'enseignant' && u.personId === teacher.id);
    if (account) account.name = `${teacher.gender === 'F' ? 'Mme' : 'M.'} ${firstName} ${lastName}`;
    return teacher;
  }
  const teacher = { id: uid('t'), firstName, lastName, gender: data.gender || 'M', phone: data.phone || '', subjectIds, classIds };
  draft.teachers.push(teacher);
  for (const s of draft.subjects) if (subjectIds.includes(s.id)) s.teacherId = teacher.id;
  draft.users.push({
    id: `u-${teacher.id}`,
    role: 'enseignant',
    email: uniqueEmail(draft, firstName[0], lastName),
    password: 'prof123',
    name: `${teacher.gender === 'F' ? 'Mme' : 'M.'} ${firstName} ${lastName}`,
    personId: teacher.id,
  });
  return teacher;
}

export function deleteTeacher(draft, user, { teacherId }) {
  requirePermission(user, 'teachers:manage');
  if (draft.subjects.some((s) => s.teacherId === teacherId)) {
    throw new Error('Réaffectez d’abord ses matières à un autre enseignant.');
  }
  draft.teachers = draft.teachers.filter((t) => t.id !== teacherId);
  draft.users = draft.users.filter((u) => !(u.role === 'enseignant' && u.personId === teacherId));
  draft.timetable = draft.timetable.filter((t) => t.teacherId !== teacherId);
}

// ================================================================ Administration : structure

export function saveClass(draft, user, data) {
  requirePermission(user, 'classes:manage');
  const name = required(data.name, 'Nom de la classe');
  const levelId = required(data.levelId, 'Niveau');
  if (data.id) {
    const cls = byId(draft.classes, data.id);
    Object.assign(cls, { name, levelId, room: data.room || '', headTeacherId: data.headTeacherId || null });
    return cls;
  }
  const cls = { id: uid('c'), name, levelId, room: data.room || '', headTeacherId: data.headTeacherId || null };
  draft.classes.push(cls);
  return cls;
}

export function deleteClass(draft, user, { classId }) {
  requirePermission(user, 'classes:manage');
  if (draft.students.some((s) => s.classId === classId)) throw new Error('Cette classe contient encore des élèves.');
  draft.classes = draft.classes.filter((c) => c.id !== classId);
  draft.timetable = draft.timetable.filter((t) => t.classId !== classId);
  for (const t of draft.teachers) t.classIds = t.classIds.filter((id) => id !== classId);
}

export function saveLevel(draft, user, data) {
  requirePermission(user, 'classes:manage');
  const name = required(data.name, 'Nom du niveau');
  const annualFee = Math.round(Number(data.annualFee) || 0);
  if (data.id) {
    Object.assign(byId(draft.levels, data.id), { name, annualFee });
    return;
  }
  draft.levels.push({ id: uid('n'), name, annualFee });
}

export function saveSubject(draft, user, data) {
  requirePermission(user, 'subjects:manage');
  const name = required(data.name, 'Nom de la matière');
  const payload = {
    name,
    short: data.short || name.slice(0, 8),
    coef: Number(data.coef) || 1,
    weeklyHours: Number(data.weeklyHours) || 1,
    teacherId: data.teacherId || null,
  };
  if (data.id) {
    Object.assign(byId(draft.subjects, data.id), payload);
  } else {
    draft.subjects.push({ id: uid('sub'), ...payload });
  }
  if (payload.teacherId) {
    const teacher = byId(draft.teachers, payload.teacherId);
    const id = data.id || draft.subjects[draft.subjects.length - 1].id;
    if (teacher && !teacher.subjectIds.includes(id)) teacher.subjectIds.push(id);
  }
}

export function deleteSubject(draft, user, { subjectId }) {
  requirePermission(user, 'subjects:manage');
  if (draft.evaluations.some((e) => e.subjectId === subjectId)) {
    throw new Error('Des notes existent pour cette matière : suppression impossible.');
  }
  draft.subjects = draft.subjects.filter((s) => s.id !== subjectId);
  draft.timetable = draft.timetable.filter((t) => t.subjectId !== subjectId);
  for (const t of draft.teachers) t.subjectIds = t.subjectIds.filter((id) => id !== subjectId);
}

/** Place (ou libère) un créneau d'emploi du temps, en refusant les conflits d'enseignant. */
export function setTimetableSlot(draft, user, { classId, day, slot, subjectId }) {
  requirePermission(user, 'timetable:manage');
  const id = `tt-${classId}-${day}-${slot}`;
  draft.timetable = draft.timetable.filter((t) => t.id !== id);
  if (!subjectId) return null;
  const subject = byId(draft.subjects, subjectId);
  if (!subject?.teacherId) throw new Error('Cette matière n’a pas d’enseignant affecté.');
  const conflict = draft.timetable.find((t) => t.teacherId === subject.teacherId && t.day === day && t.slot === slot);
  if (conflict) {
    const cls = byId(draft.classes, conflict.classId);
    throw new Error(`Conflit : l’enseignant a déjà cours en ${cls?.name || 'une autre classe'} sur ce créneau.`);
  }
  const cls = byId(draft.classes, classId);
  const entry = { id, classId, day, slot, subjectId, teacherId: subject.teacherId, room: cls?.room || '' };
  draft.timetable.push(entry);
  return entry;
}

export function updateSettings(draft, user, { name, city, year, currentTermId }) {
  requirePermission(user, 'settings:manage');
  Object.assign(draft.school, {
    name: required(name, 'Nom de l’établissement'),
    city: city || draft.school.city,
    year: required(year, 'Année scolaire'),
    currentTermId: currentTermId || draft.school.currentTermId,
  });
}

export function addCalendarEvent(draft, user, { date, title, type }) {
  requirePermission(user, 'settings:manage');
  draft.calendar.push({ id: uid('cal'), date: required(date, 'Date'), title: required(title, 'Intitulé'), type: type || 'evenement' });
}

export function deleteCalendarEvent(draft, user, { eventId }) {
  requirePermission(user, 'settings:manage');
  draft.calendar = draft.calendar.filter((e) => e.id !== eventId);
}

/** Pour les écrans qui listent les élèves consultables (contrôle défensif). */
export function assertStudentAccess(state, user, studentId) {
  if (!canAccessStudent(state, user, studentId)) throw new ForbiddenError('Vous n’avez pas accès à cet élève.');
}
