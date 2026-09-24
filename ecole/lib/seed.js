/**
 * Données de démonstration de N°1.
 *
 * Tout est généré relativement à la date du jour (`buildSeed(now)`) et avec un
 * générateur pseudo-aléatoire à graine fixe : chaque réinitialisation produit
 * la même école, avec des dates toujours cohérentes (présences de la semaine,
 * devoirs à rendre dans les prochains jours, échéances de paiement…).
 */
import { EXERCISES } from './exercises.js';

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

export const TIME_SLOTS = [
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:15', end: '11:15' },
  { start: '11:15', end: '12:15' },
  { start: '14:00', end: '15:00' },
];

export const PAYMENT_METHODS = ['Espèces', 'Orange Money', 'MTN MoMo', 'Virement bancaire'];

function makeRng(seed) {
  let s = seed % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function round2(n) {
  return Math.round(n * 4) / 4; // notes au quart de point
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Les `count` derniers jours de classe (lundi–vendredi), du plus ancien au plus récent. */
function lastSchoolDays(now, count) {
  const days = [];
  let d = new Date(now);
  while (days.length < count) {
    const wd = d.getDay();
    if (wd >= 1 && wd <= 5) days.unshift(new Date(d));
    d = addDays(d, -1);
  }
  return days;
}

function timeStr(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const SUBJECTS = [
  { id: 'maths', name: 'Mathématiques', short: 'Maths', coef: 4, weeklyHours: 5, teacherId: 't1' },
  { id: 'francais', name: 'Français', short: 'Français', coef: 4, weeklyHours: 5, teacherId: 't2' },
  { id: 'anglais', name: 'Anglais', short: 'Anglais', coef: 2, weeklyHours: 3, teacherId: 't3' },
  { id: 'physique', name: 'Physique', short: 'Physique', coef: 3, weeklyHours: 3, teacherId: 't4' },
  { id: 'chimie', name: 'Chimie', short: 'Chimie', coef: 2, weeklyHours: 2, teacherId: 't4' },
  { id: 'svt', name: 'SVT', short: 'SVT', coef: 2, weeklyHours: 2, teacherId: 't5' },
  { id: 'histgeo', name: 'Histoire-Géographie', short: 'Hist-Géo', coef: 2, weeklyHours: 2, teacherId: 't3' },
  { id: 'info', name: 'Informatique', short: 'Info', coef: 1, weeklyHours: 2, teacherId: 't6' },
];

const TOPICS = {
  maths: ['Fractions', 'Équations', 'Géométrie', 'Puissances', 'Statistiques'],
  francais: ['Grammaire', 'Conjugaison', 'Orthographe', 'Expression écrite', 'Lecture'],
  anglais: ['Vocabulary', 'Grammar', 'Reading', 'Tenses'],
  physique: ['Électricité', 'Mécanique', 'Optique', 'Énergie'],
  chimie: ['Atomes et molécules', 'Mélanges', 'Réactions chimiques'],
  svt: ['La cellule', 'Nutrition', 'Écosystèmes', 'Reproduction'],
  histgeo: ['Afrique précoloniale', 'Colonisation', 'Indépendances', 'Géographie de la Guinée'],
  info: ['Algorithmique', 'Bureautique', 'Internet et sécurité', 'Programmation'],
};

const LEVELS = [
  { id: 'n6', name: '6e', annualFee: 1500000 },
  { id: 'n5', name: '5e', annualFee: 1600000 },
  { id: 'n4', name: '4e', annualFee: 1750000 },
  { id: 'n3', name: '3e', annualFee: 1900000 },
];

const CLASSES = [
  { id: 'c6a', name: '6e A', levelId: 'n6', room: 'Salle 1', headTeacherId: 't5' },
  { id: 'c5a', name: '5e A', levelId: 'n5', room: 'Salle 2', headTeacherId: 't1' },
  { id: 'c4a', name: '4e A', levelId: 'n4', room: 'Salle 3', headTeacherId: 't2' },
  { id: 'c3a', name: '3e A', levelId: 'n3', room: 'Salle 4', headTeacherId: 't4' },
];

const TEACHERS = [
  { id: 't1', firstName: 'Kadiatou', lastName: 'Diallo', gender: 'F', phone: '+224 620 11 22 33' },
  { id: 't2', firstName: 'Ibrahima', lastName: 'Sow', gender: 'M', phone: '+224 621 45 67 89' },
  { id: 't3', firstName: 'Fatoumata', lastName: 'Bah', gender: 'F', phone: '+224 622 98 76 54' },
  { id: 't4', firstName: 'Sékou', lastName: 'Condé', gender: 'M', phone: '+224 623 14 25 36' },
  { id: 't5', firstName: 'Mariama', lastName: 'Sylla', gender: 'F', phone: '+224 624 36 25 14' },
  { id: 't6', firstName: 'Alpha', lastName: 'Barry', gender: 'M', phone: '+224 625 74 85 96' },
];

// [prénom, nom, classe, niveau de base /20, tendance (points gagnés sur la période)]
const STUDENTS = [
  ['Mohamed', 'Camara', 'c5a', 13.2, 2.2],
  ['Paul', 'Haba', 'c5a', 13.8, 0.8],
  ['Aminata', 'Touré', 'c5a', 15.5, 0.4],
  ['Ousmane', 'Keïta', 'c5a', 10.5, 1.5],
  ['Hawa', 'Soumah', 'c5a', 12.4, -0.6],
  ['Moussa', 'Kourouma', 'c5a', 11.0, 1.0],
  ['Fanta', 'Cissé', 'c5a', 16.2, 0.2],
  ['Lamine', 'Bangoura', 'c5a', 9.4, 1.8],
  ['Aïssatou', 'Camara', 'c3a', 14.6, 0.9],
  ['Thierno', 'Baldé', 'c3a', 12.0, 0.5],
  ['Kadija', 'Fofana', 'c3a', 15.0, -0.3],
  ['Mamadou', 'Doumbouya', 'c3a', 11.6, 1.2],
  ['Nènè', 'Kaba', 'c3a', 13.3, 0.6],
  ['Sory', 'Traoré', 'c3a', 10.2, 1.4],
  ['Djénabou', 'Barry', 'c3a', 14.1, 0.0],
  ['Abdoulaye', 'Sylla', 'c3a', 12.7, 0.7],
  ['Mariame', 'Kanté', 'c6a', 13.0, 1.1],
  ['Ibrahim', 'Condé', 'c6a', 11.8, 0.9],
  ['Salématou', 'Diakité', 'c6a', 15.4, 0.3],
  ['Alseny', 'Camara', 'c6a', 10.8, 1.6],
  ['Oumou', 'Sow', 'c6a', 14.2, 0.5],
  ['Boubacar', 'Diallo', 'c6a', 12.5, -0.4],
  ['Kadiatou', 'Bah', 'c4a', 13.9, 0.8],
  ['Souleymane', 'Kéita', 'c4a', 11.2, 1.3],
  ['Mafoudia', 'Soumah', 'c4a', 16.0, 0.1],
  ['Elhadj', 'Touré', 'c4a', 12.1, 0.6],
  ['Fatima', 'Bangoura', 'c4a', 14.7, 0.4],
  ['Yaya', 'Fofana', 'c4a', 10.1, 1.7],
];

const PROGRAM = {
  maths: ['Nombres relatifs', 'Fractions', 'Puissances', 'Équations du 1er degré', 'Géométrie plane', 'Statistiques'],
  francais: ['Le récit', 'Grammaire de la phrase', 'Conjugaison des temps simples', 'La poésie', 'Le théâtre', 'Argumentation'],
  anglais: ['Greetings & introductions', 'Present simple', 'Daily routine', 'Past simple', 'Describing places', 'Future plans'],
  physique: ['Grandeurs et mesures', 'Circuits électriques', 'Loi d’Ohm', 'Forces et mouvements', 'Lumière et optique', 'Énergie'],
  chimie: ['La matière', 'Mélanges et corps purs', 'Atomes et molécules', 'Réactions chimiques', 'Solutions aqueuses'],
  svt: ['La cellule', 'Nutrition chez l’homme', 'Respiration', 'Écosystèmes de Guinée', 'Reproduction'],
  histgeo: ['L’Afrique précoloniale', 'Les grands empires (Ghana, Mali)', 'La colonisation', 'Les indépendances', 'Géographie physique de la Guinée', 'Population et économie'],
  info: ['Découverte de l’ordinateur', 'Traitement de texte', 'Tableur', 'Internet et sécurité', 'Initiation à l’algorithmique', 'Premiers programmes'],
};

/** Répartit les heures de chaque matière sur la semaine sans conflit d'enseignant. */
function buildTimetable(rand) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const busy = new Set(); // `${teacherId}-${day}-${slot}`
    const slots = [];
    let ok = true;
    for (const cls of CLASSES) {
      const remaining = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.weeklyHours]));
      for (let day = 0; day < DAYS.length && ok; day++) {
        const perDay = {};
        for (let slot = 0; slot < TIME_SLOTS.length; slot++) {
          const candidates = SUBJECTS.filter(
            (s) =>
              remaining[s.id] > 0 &&
              (perDay[s.id] || 0) < 2 &&
              !busy.has(`${s.teacherId}-${day}-${slot}`),
          ).sort((a, b) => remaining[b.id] - remaining[a.id] + (rand() - 0.5) * 3);
          const subject = candidates[0];
          if (!subject) continue; // créneau libre (étude)
          remaining[subject.id] -= 1;
          perDay[subject.id] = (perDay[subject.id] || 0) + 1;
          busy.add(`${subject.teacherId}-${day}-${slot}`);
          slots.push({
            id: `tt-${cls.id}-${day}-${slot}`,
            classId: cls.id,
            day,
            slot,
            subjectId: subject.id,
            teacherId: subject.teacherId,
            room: cls.room,
          });
        }
      }
      if (Object.values(remaining).some((h) => h > 0)) ok = false;
      if (!ok) break;
    }
    if (ok) return slots;
  }
  throw new Error('Impossible de générer un emploi du temps sans conflit.');
}

export function buildSeed(now = new Date()) {
  const rand = makeRng(20262027);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const schoolYearStart = new Date(today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1, 8, 1);
  const yearLabel = `${schoolYearStart.getFullYear()}-${schoolYearStart.getFullYear() + 1}`;
  // Nombre de jours écoulés depuis la rentrée : toutes les données passées
  // sont placées entre la rentrée et aujourd'hui.
  const span = Math.max(8, Math.round((today - schoolYearStart) / 86400000));
  const inYear = (fraction) => addDays(schoolYearStart, Math.round(fraction * span));

  // ---------- Personnes ----------
  const students = STUDENTS.map(([firstName, lastName, classId, base, trend], i) => ({
    id: `s${i + 1}`,
    matricule: `N1-${schoolYearStart.getFullYear()}-${String(i + 1).padStart(3, '0')}`,
    firstName,
    lastName,
    classId,
    birthDate: toISODate(new Date(2010 + (classId === 'c6a' ? 3 : classId === 'c5a' ? 2 : classId === 'c4a' ? 1 : 0), Math.floor(rand() * 12), 1 + Math.floor(rand() * 27))),
    gender: ['Aminata', 'Hawa', 'Fanta', 'Aïssatou', 'Kadija', 'Nènè', 'Djénabou', 'Mariame', 'Salématou', 'Oumou', 'Kadiatou', 'Mafoudia', 'Fatima'].includes(firstName) ? 'F' : 'M',
    status: 'inscrit',
    enrolledAt: toISODate(addDays(schoolYearStart, -20 + Math.floor(rand() * 15))),
    _base: base,
    _trend: trend,
  }));

  // Parents : un tuteur par famille (les deux Camara partagent le même parent).
  const parents = [];
  const byLastName = {};
  for (const s of students) {
    const key = s.id === 's1' || s.id === 's9' ? 'camara-famille' : s.id;
    if (!byLastName[key]) {
      const p = {
        id: `p${parents.length + 1}`,
        firstName: key === 'camara-famille' ? 'Sékou' : ['Mamadou', 'Fodé', 'Aïssata', 'Mariam', 'Ibrahima', 'Hadja Fatou', 'Kerfalla', 'Sidiki'][parents.length % 8],
        lastName: s.lastName,
        title: key === 'camara-famille' ? 'M.' : parents.length % 3 === 2 ? 'Mme' : 'M.',
        phone: `+224 6${20 + (parents.length % 9)} ${String(10 + parents.length).padStart(2, '0')} ${String(30 + parents.length * 2).slice(-2)} ${String(40 + parents.length * 3).slice(-2)}`,
        relation: 'Père / Mère',
        childrenIds: [],
      };
      parents.push(p);
      byLastName[key] = p;
    }
    byLastName[key].childrenIds.push(s.id);
    s.parentIds = [byLastName[key].id];
  }

  const teachers = TEACHERS.map((t) => ({
    ...t,
    subjectIds: SUBJECTS.filter((s) => s.teacherId === t.id).map((s) => s.id),
    classIds: CLASSES.map((c) => c.id),
  }));

  // ---------- Comptes (démo) ----------
  const users = [
    { id: 'u-admin', role: 'admin', email: 'admin@n1.school', password: 'admin123', name: 'Mme Hadja Bah', personId: null, title: 'Directrice des études' },
    ...students.map((s) => ({
      id: `u-${s.id}`,
      role: 'eleve',
      email: `${s.firstName}.${s.lastName}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@n1.school',
      password: 'eleve123',
      name: `${s.firstName} ${s.lastName}`,
      personId: s.id,
    })),
    ...parents.map((p) => ({
      id: `u-${p.id}`,
      role: 'parent',
      email: p.id === byLastName['camara-famille'].id ? 'parent.camara@n1.school' : `parent.${p.id}@n1.school`,
      password: 'parent123',
      name: `${p.title} ${p.firstName} ${p.lastName}`,
      personId: p.id,
    })),
    ...teachers.map((t) => ({
      id: `u-${t.id}`,
      role: 'enseignant',
      email: `${t.firstName[0]}.${t.lastName}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@n1.school',
      password: 'prof123',
      name: `${t.gender === 'F' ? 'Mme' : 'M.'} ${t.firstName} ${t.lastName}`,
      personId: t.id,
    })),
  ];

  // ---------- Calendrier & trimestres ----------
  const terms = [
    { id: 'T1', name: '1er trimestre', start: toISODate(schoolYearStart), end: toISODate(new Date(schoolYearStart.getFullYear(), 11, 20)) },
    { id: 'T2', name: '2e trimestre', start: toISODate(new Date(schoolYearStart.getFullYear() + 1, 0, 5)), end: toISODate(new Date(schoolYearStart.getFullYear() + 1, 3, 3)) },
    { id: 'T3', name: '3e trimestre', start: toISODate(new Date(schoolYearStart.getFullYear() + 1, 3, 20)), end: toISODate(new Date(schoolYearStart.getFullYear() + 1, 5, 30)) },
  ];

  const termOf = (iso) => (terms.find((t) => iso <= t.end) || terms[terms.length - 1]).id;

  const calendar = [
    { id: 'cal1', date: toISODate(schoolYearStart), title: 'Rentrée scolaire', type: 'evenement' },
    { id: 'cal2', date: toISODate(addDays(today, 9)), title: 'Réunion parents-enseignants', type: 'reunion' },
    { id: 'cal3', date: toISODate(addDays(today, 23)), title: 'Compositions du 1er trimestre (début)', type: 'examen' },
    { id: 'cal4', date: toISODate(new Date(schoolYearStart.getFullYear(), 9, 2)), title: 'Fête de l’Indépendance (férié)', type: 'ferie' },
    { id: 'cal5', date: terms[0].end, title: 'Fin du 1er trimestre', type: 'evenement' },
  ];

  // ---------- Évaluations & notes ----------
  // Six évaluations par matière réparties sur les 12 dernières semaines, pour
  // tracer une vraie courbe de progression.
  const evaluations = [];
  const evalOffsets = [0.12, 0.28, 0.44, 0.6, 0.76, 0.92];
  const types = ['Interrogation', 'Devoir surveillé', 'Interrogation', 'Devoir surveillé', 'Interrogation', 'Devoir surveillé'];
  for (const cls of CLASSES) {
    const classStudents = students.filter((s) => s.classId === cls.id);
    for (const subject of SUBJECTS) {
      evalOffsets.forEach((offset, k) => {
        const date = addDays(inYear(offset), -Math.floor(rand() * 2));
        const topic = TOPICS[subject.id][k % TOPICS[subject.id].length];
        const scores = {};
        for (const s of classStudents) {
          const progress = (k / (evalOffsets.length - 1)) * s._trend;
          let subjectBias = (rand() - 0.5) * 3;
          // Mohamed : fort en physique, en difficulté sur les fractions.
          if (s.id === 's1' && subject.id === 'physique') subjectBias += 1.5;
          if (s.id === 's1' && subject.id === 'maths') subjectBias += topic === 'Fractions' ? -4 : 1.8;
          scores[s.id] = round2(clamp(s._base + progress + subjectBias + (rand() - 0.5) * 2.5, 3, 19.5));
        }
        evaluations.push({
          id: `ev-${cls.id}-${subject.id}-${k}`,
          classId: cls.id,
          subjectId: subject.id,
          teacherId: subject.teacherId,
          title: `${types[k]} — ${topic}`,
          type: types[k],
          topic,
          date: toISODate(date),
          termId: termOf(toISODate(date)),
          coef: types[k] === 'Devoir surveillé' ? 2 : 1,
          scores,
        });
      });
    }
  }

  // ---------- Emploi du temps ----------
  const timetable = buildTimetable(rand);

  // ---------- Présences & sorties ----------
  const attendance = [];
  const exits = [];
  const schoolDays = lastSchoolDays(today, 20).filter((d) => d >= schoolYearStart);
  schoolDays.forEach((day, di) => {
    const iso = toISODate(day);
    const isToday = iso === toISODate(today);
    for (const s of students) {
      let status = 'present';
      const r = rand();
      if (s.id === 's1') {
        status = di === schoolDays.length - 12 || di === schoolDays.length - 4 ? 'absent' : di === schoolDays.length - 8 ? 'retard' : 'present';
      } else if (r < 0.035) status = 'absent';
      else if (r < 0.08) status = 'retard';
      const arrival = status === 'retard' ? timeStr(8, 10 + Math.floor(rand() * 35)) : timeStr(7, 30 + Math.floor(rand() * 28));
      attendance.push({
        id: `at-${iso}-${s.id}`,
        date: iso,
        classId: s.classId,
        studentId: s.id,
        status,
        arrival: status === 'absent' ? null : arrival,
        justified: status === 'absent' ? rand() < 0.5 : false,
        recordedBy: 'u-admin',
      });
      if (status !== 'absent' && !isToday && di >= schoolDays.length - 10) {
        const minutes = 16 * 60 + 5 + Math.floor(rand() * 55);
        exits.push({
          id: `ex-${iso}-${s.id}`,
          studentId: s.id,
          date: iso,
          time: s.id === 's2' && di === schoolDays.length - 2 ? '16:42' : timeStr(Math.floor(minutes / 60), minutes % 60),
          type: 'normale',
          reason: 'Fin des cours',
          accompaniedBy: rand() < 0.3 ? 'Parent' : 'Seul(e)',
        });
      }
    }
  });
  // Une sortie exceptionnelle pour illustrer le suivi.
  exits.push({
    id: 'ex-special-1',
    studentId: 's1',
    date: toISODate(schoolDays[schoolDays.length - 3]),
    time: '11:20',
    type: 'exceptionnelle',
    reason: 'Rendez-vous médical',
    accompaniedBy: 'M. Sékou Camara (père)',
  });

  // ---------- Scolarité ----------
  const installments = [
    { id: 'e1', label: '1re tranche', share: 0.4, dueDate: toISODate(new Date(schoolYearStart.getFullYear(), 8, 15)) },
    { id: 'e2', label: '2e tranche', share: 0.3, dueDate: toISODate(new Date(schoolYearStart.getFullYear(), 11, 15)) },
    { id: 'e3', label: '3e tranche', share: 0.3, dueDate: toISODate(new Date(schoolYearStart.getFullYear() + 1, 2, 15)) },
  ];
  const payments = [];
  let receipt = 1;
  const paidShare = { s1: 0.7, s2: 0.8, s9: 0.4, s4: 0.25, s8: 0.2, s14: 0.3, s20: 0 };
  for (const s of students) {
    const level = LEVELS.find((l) => l.id === CLASSES.find((c) => c.id === s.classId).levelId);
    const share = paidShare[s.id] ?? [0.4, 0.4, 0.7, 1, 0.55, 0.4][Math.floor(rand() * 6)];
    let toPay = Math.round((level.annualFee * share) / 5000) * 5000;
    const chunks = toPay > level.annualFee * 0.45 ? 2 : 1;
    for (let k = 0; k < chunks && toPay > 0; k++) {
      const amount = k === chunks - 1 ? toPay : Math.round(level.annualFee * 0.4);
      toPay -= amount;
      payments.push({
        id: `pay-${receipt}`,
        studentId: s.id,
        amount,
        date: toISODate(k === 0 ? addDays(schoolYearStart, Math.floor(rand() * 10) - 12) : inYear(0.5 + rand() * 0.4)),
        method: PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)],
        receiptNo: `REC-${schoolYearStart.getFullYear()}-${String(receipt).padStart(4, '0')}`,
        recordedBy: 'u-admin',
      });
      receipt++;
    }
  }

  // ---------- Devoirs ----------
  const homework = [];
  const submissions = [];
  const hwTemplates = {
    maths: [['Exercices sur les fractions', 'Faire les exercices 4, 5 et 7 page 32. Simplifiez chaque résultat.'], ['Résolution d’équations', 'Résoudre les 6 équations de la fiche distribuée en classe.']],
    francais: [['Rédaction : un souvenir marquant', 'Racontez en 20 lignes un souvenir marquant à l’imparfait et au passé simple.'], ['Conjugaison', 'Conjuguer les verbes de la fiche au passé composé.']],
    anglais: [['My daily routine', 'Write 10 sentences about your daily routine using the present simple.']],
    physique: [['Circuit en série', 'Schématiser un circuit en série avec deux lampes et expliquer ce qui se passe si l’une grille.']],
    chimie: [['Mélanges homogènes', 'Donner 5 exemples de mélanges homogènes et 5 hétérogènes de la vie quotidienne.']],
    svt: [['Schéma de la cellule', 'Dessiner et légender une cellule animale.']],
    histgeo: [['L’empire du Mali', 'Lire le chapitre 3 et répondre aux questions 1 à 5.']],
    info: [['Mon premier tableau', 'Créer un tableau de notes dans un tableur et calculer la moyenne.']],
  };
  let hwn = 1;
  for (const cls of CLASSES) {
    const classStudents = students.filter((s) => s.classId === cls.id);
    const plan = [
      ['maths', 0, -12], ['francais', 0, -9], ['physique', 0, -6], ['anglais', 0, -3],
      ['maths', 1, 2], ['francais', 1, 3], ['svt', 0, 5], ['info', 0, 7], ['chimie', 0, 9], ['histgeo', 0, 11],
    ];
    for (const [subjectId, variant, dueOffset] of plan) {
      const [title, description] = hwTemplates[subjectId][variant] || hwTemplates[subjectId][0];
      const subject = SUBJECTS.find((s) => s.id === subjectId);
      const hw = {
        id: `hw${hwn++}`,
        classId: cls.id,
        subjectId,
        teacherId: subject.teacherId,
        title,
        description,
        // Publié une semaine avant l'échéance, jamais dans le futur ni avant la rentrée.
        createdAt: toISODate(
          new Date(Math.max(Math.min(addDays(today, dueOffset - 7), addDays(today, -(hwn % 4))), addDays(schoolYearStart, 2))),
        ),
        dueDate: toISODate(addDays(today, dueOffset)),
        attachments: dueOffset < 0 ? [] : [`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`],
      };
      homework.push(hw);
      if (dueOffset < 0) {
        for (const s of classStudents) {
          if (rand() < 0.85 || s.id === 's1') {
            const graded = dueOffset < -5 && rand() < 0.9;
            submissions.push({
              id: `sub-${hw.id}-${s.id}`,
              homeworkId: hw.id,
              studentId: s.id,
              content: 'Travail rendu en ligne.',
              fileName: `${s.lastName.toLowerCase()}-${hw.id}.pdf`,
              submittedAt: toISODate(addDays(today, dueOffset - 1)),
              grade: graded ? round2(clamp(s._base + (rand() - 0.3) * 4, 5, 20)) : null,
              feedback: graded ? (rand() < 0.5 ? 'Bon travail, continue ainsi.' : 'Attention aux détails de rédaction.') : '',
            });
          }
        }
      }
    }
  }

  // ---------- Cours & supports ----------
  const courses = [];
  for (const subject of SUBJECTS) {
    PROGRAM[subject.id].forEach((title, k) => {
      courses.push({
        id: `co-${subject.id}-${k}`,
        subjectId: subject.id,
        order: k + 1,
        title,
        term: k < 2 ? 'T1' : k < 4 ? 'T2' : 'T3',
        resources: [
          { type: 'pdf', name: `Cours — ${title}.pdf` },
          ...(k % 2 === 0 ? [{ type: 'video', name: `Vidéo explicative — ${title}` }] : []),
          ...(k % 3 === 1 ? [{ type: 'exercices', name: `Fiche d’exercices — ${title}` }] : []),
        ],
      });
    });
  }
  // Avancement du programme par classe et matière (nombre de chapitres terminés).
  const courseProgress = {};
  for (const cls of CLASSES) {
    for (const subject of SUBJECTS) courseProgress[`${cls.id}-${subject.id}`] = 1 + Math.floor(rand() * 2);
  }

  // ---------- Entraînement ----------
  const trainingAttempts = [];
  const attemptPlan = [
    ['maths', 'Fractions', 2, 5, -30], ['maths', 'Fractions', 3, 5, -14], ['maths', 'Équations', 4, 5, -20],
    ['francais', 'Conjugaison', 4, 5, -18], ['anglais', 'Grammar', 3, 5, -10], ['physique', 'Électricité', 5, 5, -6],
    ['maths', 'Fractions', 3, 5, -3], ['informatique', 'Algorithmique', 4, 5, -2],
  ];
  attemptPlan.forEach(([subjectId, topic, score, total], k) => {
    trainingAttempts.push({
      id: `ta${k + 1}`,
      studentId: 's1',
      subjectId: subjectId === 'informatique' ? 'info' : subjectId,
      topic,
      score,
      total,
      at: inYear(0.3 + (k / attemptPlan.length) * 0.65).toISOString(),
    });
  });

  // ---------- Messages ----------
  const ago = (days, h = 10, m = 0) => {
    const d = addDays(today, -days);
    d.setHours(h, m);
    return d.toISOString();
  };
  const messages = [
    { id: 'm1', from: 'u-s1', to: 'u-t1', body: 'Bonjour Madame, je n’ai pas compris comment additionner deux fractions qui n’ont pas le même dénominateur.', at: ago(3, 18, 12), read: true },
    { id: 'm2', from: 'u-t1', to: 'u-s1', body: 'Bonjour Mohamed. Il faut d’abord les mettre au même dénominateur : cherche le plus petit multiple commun. Essaie les exercices de fractions dans l’espace Entraînement, puis on revoit ensemble jeudi.', at: ago(3, 19, 40), read: true },
    { id: 'm3', from: 'u-s1', to: 'u-t1', body: 'Merci Madame, je vais m’entraîner.', at: ago(2, 17, 5), read: true },
    { id: 'm4', from: `u-${byLastName['camara-famille'].id}`, to: 'u-t1', body: 'Bonjour Madame Diallo, comment se comporte Mohamed en classe ces derniers temps ?', at: ago(1, 20, 30), read: false },
    { id: 'm5', from: 'u-t2', to: `u-${byLastName['camara-famille'].id}`, body: 'Bonjour M. Camara, Aïssatou a rendu une très belle rédaction cette semaine. Félicitations !', at: ago(4, 12, 15), read: true },
    { id: 'm6', from: 'u-s2', to: 'u-t4', body: 'Monsieur, est-ce qu’on doit dessiner le schéma du circuit à la règle ?', at: ago(0, 7, 50), read: false },
  ];

  // ---------- Annonces ----------
  const announcements = [
    { id: 'a1', authorId: 'u-admin', target: { type: 'tous' }, title: 'Réunion parents-enseignants', body: `Une réunion parents-enseignants se tiendra le ${toISODate(addDays(today, 9))} à 15h dans la grande salle. Votre présence est vivement souhaitée.`, at: ago(2, 9) },
    { id: 'a2', authorId: 'u-admin', target: { type: 'parents' }, title: 'Rappel : 2e tranche de scolarité', body: 'La 2e tranche de la scolarité est à régler avant le 15 décembre. Paiement possible en espèces, Orange Money ou MTN MoMo.', at: ago(5, 11) },
    { id: 'a3', authorId: 'u-t1', target: { type: 'classe', classId: 'c5a' }, title: 'Interrogation de mathématiques', body: 'Interrogation sur les fractions la semaine prochaine. Révisez les exercices de la fiche et entraînez-vous sur N°1.', at: ago(1, 16) },
    { id: 'a4', authorId: 'u-admin', target: { type: 'enseignants' }, title: 'Saisie des notes', body: 'Merci de saisir toutes les notes du trimestre avant les compositions.', at: ago(6, 8) },
  ];

  // Nettoyage des champs internes de génération.
  for (const s of students) {
    delete s._base;
    delete s._trend;
  }

  return {
    version: 1,
    generatedAt: now.toISOString(),
    school: {
      name: 'Groupe Scolaire N°1',
      city: 'Conakry',
      year: yearLabel,
      currentTermId: termOf(toISODate(today)),
      currency: 'GNF',
      terms,
      installments,
    },
    levels: LEVELS,
    classes: CLASSES,
    subjects: SUBJECTS.map(({ weeklyHours, ...s }) => ({ ...s, weeklyHours })),
    teachers,
    students,
    parents,
    users,
    evaluations,
    timetable,
    attendance,
    exits,
    payments,
    homework,
    submissions,
    courses,
    courseProgress,
    exercises: EXERCISES,
    trainingAttempts,
    messages,
    announcements,
    calendar,
    readNotifications: {},
  };
}
