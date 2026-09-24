/**
 * Données de démonstration des modules ajoutés en v2 : sécurité des comptes,
 * fiche de vie scolaire, bibliothèque, autorisations de sortie, bulletins
 * publiés, alertes, objectifs d'entraînement.
 *
 * `extendSeed` complète un état existant sans rien écraser : il sert à la fois
 * à la génération d'une école neuve et à la migration des données déjà
 * enregistrées dans un navigateur (v1 → v2).
 */
import { hashPassword, makeSalt } from './crypto.js';

export const STATE_VERSION = 3;

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Remplace les mots de passe en clair par un sel + une empreinte. */
export function secureUsers(users) {
  const cache = new Map();
  for (const u of users) {
    if (u.passwordHash || u.password == null) {
      delete u.password;
      continue;
    }
    u.salt = u.salt || makeSalt(u.id);
    const key = `${u.salt}|${u.password}`;
    if (!cache.has(key)) cache.set(key, hashPassword(u.password, u.salt));
    u.passwordHash = cache.get(key);
    u.mustChangePassword = false;
    delete u.password;
  }
}

const LIBRARY_LINKS = {
  maths: [
    ['Fractions : cours et exercices', 'https://fr.khanacademy.org/math/arithmetic/fraction-arithmetic', 'lien', 'Fractions'],
    ['Résoudre une équation du 1er degré', 'https://fr.khanacademy.org/math/algebra', 'video', 'Équations'],
  ],
  francais: [['Conjugaison : tableaux des temps', '', 'pdf', 'Conjugaison']],
  anglais: [['Irregular verbs list', '', 'pdf', 'Tenses']],
  physique: [['Loi d’Ohm expliquée simplement', 'https://fr.khanacademy.org/science/physics', 'video', 'Électricité']],
  chimie: [['Tableau périodique illustré', '', 'pdf', 'Atomes et molécules']],
  svt: [['Schéma de la cellule animale', '', 'pdf', 'La cellule']],
  histgeo: [['Carte des régions naturelles de Guinée', '', 'pdf', 'Géographie de la Guinée']],
  info: [['Initiation à l’algorithmique (Scratch)', 'https://scratch.mit.edu/', 'lien', 'Algorithmique']],
};

export function extendSeed(state, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const s = state;

  secureUsers(s.users);

  s.school.alertChannels = s.school.alertChannels || { sms: true, whatsapp: true, app: true };
  s.school.alertRules = s.school.alertRules || {
    absence: true,
    retard: true,
    devoirNonRendu: true,
    baisseResultats: true,
    echeance: true,
    sortie: true,
  };
  s.school.exitRules = s.school.exitRules || {
    requireAuthorizationBeforeEnd: true,
    minAgeToLeaveAlone: 12,
  };

  // ---------- Fiche de vie : observations pédagogiques & activités ----------
  if (!s.observations) {
    const at = (days, h = 15) => {
      const d = addDays(today, -days);
      d.setHours(h, 0, 0, 0);
      return d.toISOString();
    };
    s.observations = [
      { id: 'ob1', studentId: 's1', authorId: 'u-t1', type: 'pedagogique', text: 'Bonne participation à l’oral. Difficultés persistantes sur l’addition de fractions de dénominateurs différents : exercices ciblés proposés.', at: at(12) },
      { id: 'ob2', studentId: 's1', authorId: 'u-t4', type: 'encouragement', text: 'Excellent travail en physique sur les circuits électriques. Félicitations.', at: at(8) },
      { id: 'ob3', studentId: 's1', authorId: 'u-admin', type: 'activite', text: 'Inscrit au club de robotique (mercredi après-midi).', at: at(15) },
      { id: 'ob4', studentId: 's1', authorId: 'u-t1', type: 'pedagogique', text: 'Progrès nets depuis l’entraînement régulier sur N°1 : 3/5 au dernier quiz de fractions.', at: at(2) },
      { id: 'ob5', studentId: 's9', authorId: 'u-t2', type: 'encouragement', text: 'Rédaction remarquable, vocabulaire riche. À encourager.', at: at(4) },
      { id: 'ob6', studentId: 's8', authorId: 'u-t1', type: 'avertissement', text: 'Travail personnel insuffisant, devoirs souvent incomplets. Rendez-vous proposé aux parents.', at: at(6) },
      { id: 'ob7', studentId: 's4', authorId: 'u-t2', type: 'pedagogique', text: 'Lecture hésitante : lecture quotidienne à la maison conseillée.', at: at(10) },
    ];
  }

  // ---------- Bibliothèque numérique ----------
  if (!s.library) {
    const res = [];
    let n = 1;
    for (const c of s.courses) {
      for (const r of c.resources) {
        res.push({
          id: `lib${n++}`,
          subjectId: c.subjectId,
          title: r.name,
          type: r.type,
          topic: c.title,
          url: '',
          description: `Support du chapitre « ${c.title} ».`,
          levelIds: [],
          addedBy: `u-${s.subjects.find((x) => x.id === c.subjectId)?.teacherId || 'admin'}`,
          at: new Date(today.getTime() - n * 3600000).toISOString(),
        });
      }
    }
    for (const [subjectId, links] of Object.entries(LIBRARY_LINKS)) {
      for (const [title, url, type, topic] of links) {
        res.push({
          id: `lib${n++}`,
          subjectId,
          title,
          type,
          topic,
          url,
          description: url ? 'Ressource externe recommandée par l’enseignant.' : 'Fiche de synthèse à imprimer.',
          levelIds: [],
          addedBy: `u-${s.subjects.find((x) => x.id === subjectId)?.teacherId || 'admin'}`,
          at: new Date(today.getTime() - n * 3600000).toISOString(),
        });
      }
    }
    s.library = res;
  }

  // ---------- Sorties : règles par élève et demandes d'autorisation ----------
  if (!s.exitRules) {
    s.exitRules = {
      s1: { canLeaveAlone: false, pickupPersons: ['M. Sékou Camara (père)', 'Mme Fanta Camara (mère)'], updatedBy: 'u-p1' },
      s9: { canLeaveAlone: true, pickupPersons: ['M. Sékou Camara (père)'], updatedBy: 'u-p1' },
    };
  }
  if (!s.exitAuthorizations) {
    s.exitAuthorizations = [
      {
        id: 'auth1',
        studentId: 's9',
        date: iso(addDays(today, 1)),
        time: '11:00',
        reason: 'Rendez-vous chez le dentiste',
        pickupBy: 'M. Sékou Camara (père)',
        status: 'en_attente',
        requestedBy: 'u-p1',
        at: addDays(today, -1).toISOString(),
      },
      {
        id: 'auth2',
        studentId: 's1',
        date: iso(addDays(today, -3)),
        time: '11:20',
        reason: 'Rendez-vous médical',
        pickupBy: 'M. Sékou Camara (père)',
        status: 'approuvee',
        requestedBy: 'u-p1',
        decidedBy: 'u-admin',
        decidedAt: addDays(today, -4).toISOString(),
        at: addDays(today, -5).toISOString(),
      },
    ];
  }

  // ---------- Paiements : canal et transactions en ligne ----------
  for (const p of s.payments) p.channel = p.channel || 'guichet';

  // ---------- Devoirs : date de correction ----------
  for (const sub of s.submissions) {
    if (sub.grade != null && !sub.gradedAt) {
      const d = new Date(`${sub.submittedAt}T12:00:00`);
      d.setDate(d.getDate() + 2);
      sub.gradedAt = iso(d > today ? today : d);
    }
    sub.history = sub.history || [{ at: sub.submittedAt, event: 'depot' }];
  }

  localizeGuinea(s);
  s.bulletinsPublished = s.bulletinsPublished || {};
  s.alertsOutbox = s.alertsOutbox || [];
  s.auditLog = s.auditLog || [];
  s.trainingGoals = s.trainingGoals || {};
  s.version = STATE_VERSION;
  return s;
}

// Noms du système français remplacés par ceux du collège guinéen
// (uniquement s'ils n'ont pas été personnalisés par l'établissement).
const GUINEA_LEVELS = { '6e': '7e année', '5e': '8e année', '4e': '9e année', '3e': '10e année' };
const GUINEA_CLASSES = { '6e A': '7e A', '5e A': '8e A', '4e A': '9e A', '3e A': '10e A' };

/** Identité guinéenne de l'établissement (v3). */
export function localizeGuinea(s) {
  for (const l of s.levels) if (GUINEA_LEVELS[l.name]) l.name = GUINEA_LEVELS[l.name];
  for (const c of s.classes) if (GUINEA_CLASSES[c.name]) c.name = GUINEA_CLASSES[c.name];
  s.school.country = s.school.country || 'République de Guinée';
  s.school.motto = s.school.motto || 'Travail – Justice – Solidarité';
  s.school.ministry = s.school.ministry || 'Ministère de l’Enseignement Pré-Universitaire et de l’Alphabétisation';
  s.school.region = s.school.region || 'IRE de Conakry';
  s.school.commune = s.school.commune || 'Ratoma';
  if (!s.calendar.some((e) => /BEPC/.test(e.title))) {
    const y = Number(String(s.school.year).slice(0, 4)) + 1;
    s.calendar.push({ id: 'cal-bepc', date: `${y}-06-16`, title: 'Examen du BEPC (10e année)', type: 'examen' });
  }
  return s;
}

/** Met à niveau des données enregistrées par une version précédente. */
export function migrateState(stored, now = new Date()) {
  if (!stored || typeof stored !== 'object') return null;
  if (stored.version === STATE_VERSION) return stored;
  if (stored.version === 1) return extendSeed(stored, now);
  if (stored.version === 2) {
    localizeGuinea(stored);
    stored.version = STATE_VERSION;
    return stored;
  }
  return null;
}
