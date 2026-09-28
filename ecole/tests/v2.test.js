import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../lib/seed.js';
import { migrateState, STATE_VERSION } from '../lib/seed-extra.js';
import * as A from '../lib/actions.js';
import { verifyPassword } from '../lib/crypto.js';
import { notificationsFor, paymentStatus } from '../lib/compute.js';
import { smartAlerts, resultDrops, priorities } from '../lib/alerts.js';
import { gamification, recommendations, adaptiveQuestions } from '../lib/gamification.js';
import { toCSV } from '../lib/csv.js';

const NOW = new Date('2026-09-24T10:00:00');
const SEED = buildSeed(NOW);
const fresh = () => structuredClone(SEED);
const userBy = (s, email) => s.users.find((u) => u.email === email);

test('les mots de passe ne sont plus stockés en clair', () => {
  const s = fresh();
  assert.ok(s.users.every((u) => !('password' in u) && u.passwordHash && u.salt));
  assert.ok(verifyPassword(userBy(s, 'admin@n1.school'), 'admin123'));
  assert.ok(!verifyPassword(userBy(s, 'admin@n1.school'), 'mauvais'));
});

test('migration v1 → v2 : données conservées, mots de passe hachés', () => {
  const v1 = fresh();
  for (const k of ['observations', 'library', 'exitRules', 'exitAuthorizations', 'bulletinsPublished', 'alertsOutbox', 'auditLog', 'trainingGoals']) delete v1[k];
  v1.version = 1;
  for (const u of v1.users) {
    u.password = 'secret99';
    delete u.passwordHash;
    delete u.salt;
  }
  v1.students[0].firstName = 'Modifié';
  const v2 = migrateState(v1, NOW);
  assert.equal(v2.version, STATE_VERSION);
  assert.equal(v2.students[0].firstName, 'Modifié');
  assert.ok(Array.isArray(v2.library) && v2.library.length > 10);
  assert.ok(verifyPassword(v2.users[0], 'secret99'));
  assert.equal(migrateState({ version: 99 }), null);
});

test('changement et réinitialisation de mot de passe', () => {
  const s = fresh();
  const eleve = userBy(s, 'mohamed.camara@n1.school');
  assert.throws(() => A.changePassword(s, eleve, { current: 'faux', next: 'Nouveau2026' }), /incorrect/);
  assert.throws(() => A.changePassword(s, eleve, { current: 'eleve123', next: 'court' }), /8 caractères/);
  A.changePassword(s, eleve, { current: 'eleve123', next: 'Nouveau2026' });
  assert.ok(verifyPassword(userBy(s, 'mohamed.camara@n1.school'), 'Nouveau2026'));
  const admin = userBy(s, 'admin@n1.school');
  assert.throws(() => A.resetPassword(s, eleve, { userId: admin.id }), /non autorisée/);
  const { temp } = A.resetPassword(s, admin, { userId: eleve.id });
  const acc = userBy(s, 'mohamed.camara@n1.school');
  assert.ok(verifyPassword(acc, temp) && acc.mustChangePassword);
});

test('inscription : comptes créés avec mot de passe provisoire', () => {
  const s = fresh();
  const admin = userBy(s, 'admin@n1.school');
  const st = A.saveStudent(s, admin, { firstName: 'Awa', lastName: 'Diallo', classId: 'c6a', parentFirstName: 'Oumar', parentLastName: 'Diallo' });
  assert.equal(st.credentials.length, 2);
  const acc = s.users.find((u) => u.email === st.credentials[0].email);
  assert.ok(verifyPassword(acc, st.credentials[0].password) && acc.mustChangePassword);
  assert.ok(!('credentials' in s.students.find((x) => x.id === st.id)), 'les identifiants ne sont pas stockés');
});

test('autorisations de sortie : parent demande, administration décide, parent alerté', () => {
  const s = fresh();
  const parent = userBy(s, 'parent.camara@n1.school');
  const admin = userBy(s, 'admin@n1.school');
  const prof = userBy(s, 'k.diallo@n1.school');
  assert.throws(() => A.requestExitAuthorization(s, parent, { studentId: 's2', date: '2026-09-30', time: '10:00', reason: 'X' }), /parent/);
  const auth = A.requestExitAuthorization(s, parent, { studentId: 's1', date: '2026-09-30', time: '10:00', reason: 'Médecin' });
  assert.throws(() => A.decideExitAuthorization(s, prof, { authorizationId: auth.id, approve: true }));
  const before = s.alertsOutbox.length;
  A.decideExitAuthorization(s, admin, { authorizationId: auth.id, approve: true });
  assert.equal(s.exitAuthorizations.find((a) => a.id === auth.id).status, 'approuvee');
  assert.ok(s.alertsOutbox.length > before);
  A.saveExitRules(s, parent, { studentId: 's1', canLeaveAlone: true, pickupPersons: ['Tante Awa', ''] });
  assert.deepEqual(s.exitRules.s1.pickupPersons, ['Tante Awa']);
});

test('paiement en ligne : périmètre, montant et reçu', () => {
  const s = fresh();
  const parent = userBy(s, 'parent.camara@n1.school');
  const balance = paymentStatus(s, 's1').balance;
  assert.throws(() => A.payOnline(s, parent, { studentId: 's2', amount: 10000, method: 'Orange Money', phone: '620000000' }));
  assert.throws(() => A.payOnline(s, parent, { studentId: 's1', amount: balance + 1, method: 'Orange Money', phone: '620000000' }), /dépasse/);
  assert.throws(() => A.payOnline(s, parent, { studentId: 's1', amount: 10000, method: 'Orange Money', phone: '12' }), /invalide/);
  assert.throws(() => A.payOnline(s, parent, { studentId: 's1', amount: 10000, method: 'Orange Money', phone: '+33 6 12 34 56 78' }), /guinéen/);
  const p = A.payOnline(s, parent, { studentId: 's1', amount: 100000, method: 'MTN MoMo', phone: '+224 664 12 34 56' });
  assert.equal(p.channel, 'en_ligne');
  assert.match(p.receiptNo, /^REC-/);
  assert.equal(paymentStatus(s, 's1').balance, balance - 100000);
});

test('absence et sortie → alertes SMS/WhatsApp aux parents (selon réglages)', () => {
  const s = fresh();
  const prof = userBy(s, 'k.diallo@n1.school');
  const admin = userBy(s, 'admin@n1.school');
  A.saveAttendance(s, prof, { classId: 'c5a', date: '2026-09-25', entries: { s1: { status: 'absent' } } });
  const out = s.alertsOutbox.filter((o) => o.studentId === 's1' && o.rule === 'absence');
  assert.deepEqual(out.map((o) => o.channel).sort(), ['sms', 'whatsapp']);
  A.updateAlertSettings(s, admin, { rules: { sortie: false } });
  const n = s.alertsOutbox.length;
  A.recordExit(s, admin, { studentId: 's1', time: '12:00' });
  assert.equal(s.alertsOutbox.length, n, 'règle sortie désactivée');
});

test('observations et bibliothèque : périmètre des enseignants', () => {
  const s = fresh();
  const prof = userBy(s, 'k.diallo@n1.school');
  const parent = userBy(s, 'parent.camara@n1.school');
  A.addObservation(s, prof, { studentId: 's1', type: 'encouragement', text: 'Bravo' });
  assert.throws(() => A.addObservation(s, parent, { studentId: 's1', type: 'encouragement', text: 'X' }));
  assert.throws(() => A.addResource(s, prof, { subjectId: 'francais', title: 'X' }), /vos matières/);
  assert.throws(() => A.addResource(s, prof, { subjectId: 'maths', title: 'X', url: 'http://x' }), /https/);
  const r = A.addResource(s, prof, { subjectId: 'maths', title: 'Fiche fractions', url: 'https://exemple.org' });
  assert.equal(s.library[0].id, r.id);
});

test('bulletins publiés : visibles dans les notifications des familles', () => {
  const s = fresh();
  const admin = userBy(s, 'admin@n1.school');
  const parent = userBy(s, 'parent.camara@n1.school');
  A.publishBulletins(s, admin, { classId: 'c5a', termId: 'T1' });
  assert.ok(s.bulletinsPublished['c5a-T1']);
  assert.ok(notificationsFor(s, parent, NOW).some((n) => n.kind === 'bulletin'));
});

test('journal d’audit : actions sensibles tracées', () => {
  const s = fresh();
  const admin = userBy(s, 'admin@n1.school');
  A.appendAudit(s, admin, A.recordPayment, { studentId: 's1', amount: 1000 });
  A.appendAudit(s, admin, A.markNotificationsRead, {});
  assert.equal(s.auditLog.length, 1);
  assert.equal(s.auditLog[0].label, 'Paiement encaissé');
});

test('alertes intelligentes et priorités', () => {
  const s = fresh();
  // Provoque une baisse nette en maths pour Mohamed.
  for (const e of s.evaluations.filter((e) => e.subjectId === 'maths' && e.classId === 'c5a').slice(-2)) e.scores.s1 = 6;
  assert.ok(resultDrops(s, 's1').some((d) => d.subject.id === 'maths'));
  const parent = userBy(s, 'parent.camara@n1.school');
  const alerts = smartAlerts(s, parent, NOW);
  assert.ok(alerts.some((a) => a.kind === 'baisse'));
  const prof = userBy(s, 'k.diallo@n1.school');
  assert.ok(smartAlerts(s, prof, NOW).some((a) => a.kind === 'baisse'));
  const admin = userBy(s, 'admin@n1.school');
  assert.ok(priorities(s, admin, notificationsFor(s, admin, NOW), NOW).length > 0);
});

test('gamification et entraînement personnalisé', () => {
  const s = fresh();
  const g = gamification(s, 's1', NOW);
  assert.ok(g.xp > 0 && g.level.name && g.badges.some((b) => b.earned));
  const recos = recommendations(s, 's1');
  assert.equal(recos[0].topic, 'Fractions');
  let i = 0;
  const qs = adaptiveQuestions(s, 's1', 'maths', 5, () => ((i = (i * 7 + 3) % 11) / 11));
  assert.equal(qs.length, 5);
  assert.ok(qs.filter((q) => q.topic === 'Fractions').length >= 3);
});

test('export CSV compatible Excel', () => {
  assert.equal(toCSV([['Nom', 'Note'], ['Camara; M.', 14.5]]), 'Nom;Note\r\n"Camara; M.";14,5');
});

test('Guinée : classes 7e–10e année, migration v2 → v3, numéros +224', () => {
  const s = fresh();
  assert.deepEqual(s.classes.map((c) => c.name), ['7e A', '8e A', '9e A', '10e A']);
  assert.equal(s.levels.find((l) => l.id === 'n3').name, '10e année');
  assert.match(s.school.country, /Guinée/);
  assert.ok(s.calendar.some((e) => /BEPC/.test(e.title)));
  // Données enregistrées avec l'ancienne nomenclature (v2)
  const v2 = fresh();
  v2.version = 2;
  v2.classes[1].name = '5e A';
  v2.levels[1].name = '5e';
  v2.classes[2].name = 'Classe perso';
  delete v2.school.country;
  const v3 = migrateState(v2, NOW);
  assert.equal(v3.version, STATE_VERSION);
  assert.equal(v3.classes[1].name, '8e A');
  assert.equal(v3.levels[1].name, '8e année');
  assert.equal(v3.classes[2].name, 'Classe perso', 'nom personnalisé conservé');
  assert.match(v3.school.country, /Guinée/);
  assert.equal(A.normalizeGuineaMobile('+224 620 12 34 56'), '620123456');
  assert.equal(A.normalizeGuineaMobile('00224664123456'), '664123456');
  assert.equal(A.normalizeGuineaMobile('0612345678'), null);
  assert.equal(A.formatGuineaPhone('620123456'), '620 12 34 56');
});

test('photos de profil : élève, parent, enseignant, administration', () => {
  const s = fresh();
  const img = 'data:image/jpeg;base64,' + 'A'.repeat(200);
  const eleve = userBy(s, 'mohamed.camara@n1.school');
  const parent = userBy(s, 'parent.camara@n1.school');
  const prof = userBy(s, 'k.diallo@n1.school');
  const admin = userBy(s, 'admin@n1.school');
  A.setPhoto(s, eleve, { kind: 'student', id: 's1', dataUrl: img });
  assert.equal(s.students.find((x) => x.id === 's1').photo, img);
  assert.throws(() => A.setPhoto(s, eleve, { kind: 'student', id: 's2', dataUrl: img }), /ne pouvez pas/);
  A.setPhoto(s, parent, { kind: 'student', id: 's9', dataUrl: img });
  assert.throws(() => A.setPhoto(s, parent, { kind: 'student', id: 's2', dataUrl: img }));
  A.setPhoto(s, prof, { kind: 'teacher', id: 't1', dataUrl: img });
  assert.throws(() => A.setPhoto(s, prof, { kind: 'student', id: 's1', dataUrl: img }));
  assert.throws(() => A.setPhoto(s, admin, { kind: 'teacher', id: 't2', dataUrl: 'data:text/html;base64,xx' }), /Format/);
  A.setPhoto(s, admin, { kind: 'student', id: 's1', dataUrl: null });
  assert.equal(s.students.find((x) => x.id === 's1').photo, undefined);
});

test('portraits illustrés : valides pour tous les élèves et enseignants', async () => {
  const { illustratedAvatar, photoOf } = await import('../lib/avatars.js');
  const s = fresh();
  for (const st of s.students) assert.match(photoOf(st), /^data:image\/svg\+xml/);
  for (const t of s.teachers) assert.ok(!photoOf(t, 'teacher').includes('undefined'));
  for (let i = 0; i < 300; i++) assert.ok(!illustratedAvatar(`x${i}`, i % 2 ? 'F' : 'M').includes('undefined'));
});
