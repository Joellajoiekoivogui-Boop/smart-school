import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../lib/seed.js';
import * as A from '../lib/actions.js';
import { can, canAccessStudent, messageContacts, visibleStudents } from '../lib/permissions.js';
import {
  generalAverage,
  paymentStatus,
  attendanceStats,
  reportCard,
  difficulties,
  notificationsFor,
  progressionSeries,
} from '../lib/compute.js';

const NOW = new Date('2026-09-24T10:00:00');
const fresh = () => structuredClone(buildSeed(NOW));
const userBy = (s, email) => s.users.find((u) => u.email === email);

test('les comptes de démonstration existent pour chaque rôle', () => {
  const s = fresh();
  for (const email of ['admin@n1.school', 'mohamed.camara@n1.school', 'parent.camara@n1.school', 'k.diallo@n1.school']) {
    assert.ok(userBy(s, email), email);
  }
  assert.equal(new Set(s.users.map((u) => u.email)).size, s.users.length, 'emails uniques');
});

test('emploi du temps sans conflit d’enseignant', () => {
  const s = fresh();
  const seen = new Set();
  for (const t of s.timetable) {
    const k = `${t.teacherId}-${t.day}-${t.slot}`;
    assert.ok(!seen.has(k), `conflit ${k}`);
    seen.add(k);
  }
});

test('un élève ne voit que lui-même, un parent ses enfants, un enseignant ses classes', () => {
  const s = fresh();
  const eleve = userBy(s, 'mohamed.camara@n1.school');
  const parent = userBy(s, 'parent.camara@n1.school');
  assert.deepEqual(visibleStudents(s, eleve).map((x) => x.id), ['s1']);
  assert.deepEqual(visibleStudents(s, parent).map((x) => x.firstName).sort(), ['Aïssatou', 'Mohamed']);
  assert.equal(canAccessStudent(s, parent, 's2'), false);
});

test('un élève ne peut pas modifier ses notes', () => {
  const s = fresh();
  const eleve = userBy(s, 'mohamed.camara@n1.school');
  const ev = s.evaluations.find((e) => e.classId === 'c5a');
  assert.equal(can(eleve, 'grades:write'), false);
  assert.throws(() => A.setScores(s, eleve, { evaluationId: ev.id, scores: { s1: 20 } }), /non autorisée/);
});

test('un enseignant saisit ses notes mais pas celles d’une autre matière, ni les paiements', () => {
  const s = fresh();
  const prof = userBy(s, 'k.diallo@n1.school'); // Mathématiques
  const ev = A.createEvaluation(s, prof, { classId: 'c5a', subjectId: 'maths', title: 'Interro', coef: 1 });
  A.setScores(s, prof, { evaluationId: ev.id, scores: { s1: '15,5' } });
  assert.equal(s.evaluations.find((e) => e.id === ev.id).scores.s1, 15.5);
  assert.throws(() => A.createEvaluation(s, prof, { classId: 'c5a', subjectId: 'francais', title: 'X' }), /vos matières/);
  assert.throws(() => A.recordPayment(s, prof, { studentId: 's1', amount: 1000 }), /non autorisée/);
  assert.throws(() => A.setScores(s, prof, { evaluationId: ev.id, scores: { s1: 25 } }), /entre 0 et 20/);
});

test('un parent ne peut pas modifier les résultats', () => {
  const s = fresh();
  const parent = userBy(s, 'parent.camara@n1.school');
  assert.throws(() => A.createEvaluation(s, parent, { classId: 'c5a', subjectId: 'maths', title: 'X' }));
});

test('paiement : reçu, pourcentage et échéances', () => {
  const s = fresh();
  const admin = userBy(s, 'admin@n1.school');
  const before = paymentStatus(s, 's2', '2026-09-24');
  assert.equal(Math.round(before.percent), 80);
  const p = A.recordPayment(s, admin, { studentId: 's2', amount: '320 000', method: 'Orange Money' });
  assert.match(p.receiptNo, /^REC-2026-/);
  const after = paymentStatus(s, 's2', '2026-09-24');
  assert.equal(after.percent, 100);
  assert.ok(after.installments.every((i) => i.status === 'payee'));
});

test('moyennes, bulletin, présences et difficultés de Mohamed', () => {
  const s = fresh();
  const avg = generalAverage(s, 's1');
  assert.ok(avg > 10 && avg < 18, `moyenne ${avg}`);
  const rc = reportCard(s, 's1', 'T1');
  assert.equal(rc.lines.length, s.subjects.length);
  assert.ok(rc.rank.rank >= 1 && rc.rank.size === 8);
  assert.equal(attendanceStats(s, 's1').absent, 2);
  assert.ok(difficulties(s, 's1').some((d) => d.topic === 'Fractions'));
  assert.ok(progressionSeries(s, 's1').length >= 4);
});

test('appel : enseignant limité à ses classes', () => {
  const s = fresh();
  const prof = userBy(s, 'k.diallo@n1.school');
  A.saveAttendance(s, prof, { classId: 'c5a', date: '2026-09-25', entries: { s1: { status: 'absent' } } });
  assert.equal(s.attendance.find((a) => a.id === 'at-2026-09-25-s1').status, 'absent');
  const eleve = userBy(s, 'mohamed.camara@n1.school');
  assert.throws(() => A.saveAttendance(s, eleve, { classId: 'c5a', date: '2026-09-25', entries: {} }));
});

test('devoir : remise par l’élève puis correction', () => {
  const s = fresh();
  const eleve = userBy(s, 'mohamed.camara@n1.school');
  const prof = userBy(s, 'k.diallo@n1.school');
  const hw = A.publishHomework(s, prof, { classId: 'c5a', subjectId: 'maths', title: 'Fractions', dueDate: '2026-09-30' });
  const sub = A.submitHomework(s, eleve, { homeworkId: hw.id, content: 'Mes réponses' });
  A.gradeSubmission(s, prof, { submissionId: sub.id, grade: '14', feedback: 'Bien' });
  assert.equal(s.submissions.find((x) => x.id === sub.id).grade, 14);
  assert.throws(() => A.submitHomework(s, eleve, { homeworkId: hw.id, content: 'modif' }), /déjà été corrigé/);
});

test('messagerie : destinataires autorisés uniquement', () => {
  const s = fresh();
  const eleve = userBy(s, 'mohamed.camara@n1.school');
  const contacts = messageContacts(s, eleve);
  assert.ok(contacts.every((c) => c.role === 'enseignant'));
  A.sendMessage(s, eleve, { to: 'u-t1', body: 'Question' });
  assert.throws(() => A.sendMessage(s, eleve, { to: 'u-s2', body: 'Salut' }), /destinataire/);
});

test('annonces : l’enseignant cible seulement une classe, l’admin tout le monde', () => {
  const s = fresh();
  const prof = userBy(s, 'k.diallo@n1.school');
  const admin = userBy(s, 'admin@n1.school');
  const parent = userBy(s, 'parent.camara@n1.school');
  assert.throws(() => A.sendAnnouncement(s, prof, { target: { type: 'parents' }, title: 'X', body: 'Y' }));
  A.sendAnnouncement(s, admin, { target: { type: 'parents' }, title: 'Info parents', body: 'Y' });
  assert.ok(notificationsFor(s, parent, NOW).some((n) => n.title === 'Info parents'));
});

test('administration : inscription avec création de compte élève et parent', () => {
  const s = fresh();
  const admin = userBy(s, 'admin@n1.school');
  const st = A.saveStudent(s, admin, { firstName: 'Awa', lastName: 'Diallo', classId: 'c6a', parentFirstName: 'Oumar', parentLastName: 'Diallo' });
  assert.ok(s.users.some((u) => u.role === 'eleve' && u.personId === st.id));
  assert.ok(s.parents.some((p) => p.childrenIds.includes(st.id)));
  assert.throws(() => A.deleteClass(s, admin, { classId: 'c6a' }), /encore des élèves/);
});

test('emploi du temps : conflit d’enseignant refusé', () => {
  const s = fresh();
  const admin = userBy(s, 'admin@n1.school');
  const busy = s.timetable.find((t) => t.teacherId === 't1');
  const other = s.classes.find((c) => c.id !== busy.classId);
  assert.throws(() => A.setTimetableSlot(s, admin, { classId: other.id, day: busy.day, slot: busy.slot, subjectId: 'maths' }), /Conflit/);
});
