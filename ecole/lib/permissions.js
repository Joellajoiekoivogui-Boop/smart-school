/**
 * Rôles et permissions de N°1.
 *
 * Chaque rôle reçoit une liste explicite de permissions. Les actions
 * (lib/actions.js) vérifient la permission ET le périmètre : un enseignant peut
 * saisir des notes, mais uniquement pour ses matières et ses classes ; un parent
 * peut consulter des résultats, mais uniquement ceux de ses enfants.
 */

export const ROLES = {
  eleve: { label: 'Élève', slug: 'eleve' },
  parent: { label: 'Parent', slug: 'parent' },
  enseignant: { label: 'Enseignant', slug: 'enseignant' },
  admin: { label: 'Administration', slug: 'admin' },
};

export const PERMISSIONS = {
  eleve: [
    'results:read',
    'bulletins:read',
    'homework:read',
    'homework:submit',
    'courses:read',
    'training:use',
    'timetable:read',
    'teachers:read',
    'messages:use',
    'notifications:read',
  ],
  parent: [
    'results:read',
    'bulletins:read',
    'homework:read',
    'attendance:read',
    'exits:read',
    'payments:read',
    'timetable:read',
    'teachers:read',
    'messages:use',
    'notifications:read',
  ],
  enseignant: [
    'classes:read',
    'students:read',
    'results:read',
    'grades:write',
    'homework:read',
    'homework:publish',
    'homework:grade',
    'attendance:read',
    'attendance:write',
    'timetable:read',
    'messages:use',
    'announcements:class',
    'notifications:read',
  ],
  admin: [
    'classes:read',
    'students:read',
    'students:manage',
    'parents:manage',
    'teachers:read',
    'teachers:manage',
    'classes:manage',
    'subjects:manage',
    'timetable:read',
    'timetable:manage',
    'results:read',
    'grades:write',
    'bulletins:read',
    'homework:read',
    'attendance:read',
    'attendance:write',
    'exits:read',
    'exits:write',
    'payments:read',
    'payments:manage',
    'messages:use',
    'announcements:class',
    'announcements:all',
    'notifications:read',
    'settings:manage',
  ],
};

export function can(user, permission) {
  if (!user) return false;
  return (PERMISSIONS[user.role] || []).includes(permission);
}

export class ForbiddenError extends Error {
  constructor(message = 'Action non autorisée pour votre rôle.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function requirePermission(user, permission) {
  if (!can(user, permission)) throw new ForbiddenError();
}

/** L'utilisateur peut-il voir les données de cet élève ? */
export function canAccessStudent(state, user, studentId) {
  if (!user) return false;
  const student = state.students.find((s) => s.id === studentId);
  if (!student) return false;
  switch (user.role) {
    case 'admin':
      return true;
    case 'eleve':
      return user.personId === studentId;
    case 'parent': {
      const parent = state.parents.find((p) => p.id === user.personId);
      return Boolean(parent && parent.childrenIds.includes(studentId));
    }
    case 'enseignant': {
      const teacher = state.teachers.find((t) => t.id === user.personId);
      return Boolean(teacher && teacher.classIds.includes(student.classId));
    }
    default:
      return false;
  }
}

/** Un enseignant ne gère que ses matières dans ses classes ; l'administration gère tout. */
export function canTeach(state, user, classId, subjectId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'enseignant') return false;
  const teacher = state.teachers.find((t) => t.id === user.personId);
  return Boolean(
    teacher && teacher.classIds.includes(classId) && (subjectId == null || teacher.subjectIds.includes(subjectId)),
  );
}

/** Élèves visibles par l'utilisateur. */
export function visibleStudents(state, user) {
  return state.students.filter((s) => canAccessStudent(state, user, s.id));
}

/** Liste des utilisateurs à qui `user` peut écrire. */
export function messageContacts(state, user) {
  if (!user) return [];
  const byPerson = (role, personId) => state.users.find((u) => u.role === role && u.personId === personId);
  const admins = state.users.filter((u) => u.role === 'admin');
  const teachersOfClass = (classId) =>
    state.teachers
      .filter((t) => t.classIds.includes(classId))
      .map((t) => byPerson('enseignant', t.id))
      .filter(Boolean);

  let contacts = [];
  if (user.role === 'eleve') {
    const student = state.students.find((s) => s.id === user.personId);
    contacts = student ? teachersOfClass(student.classId) : [];
  } else if (user.role === 'parent') {
    const parent = state.parents.find((p) => p.id === user.personId);
    const classIds = new Set(
      (parent?.childrenIds || []).map((id) => state.students.find((s) => s.id === id)?.classId).filter(Boolean),
    );
    contacts = [...new Set([...classIds].flatMap(teachersOfClass))].concat(admins);
  } else if (user.role === 'enseignant') {
    const teacher = state.teachers.find((t) => t.id === user.personId);
    const students = state.students.filter((s) => teacher?.classIds.includes(s.classId));
    const parentIds = new Set(students.flatMap((s) => s.parentIds || []));
    contacts = [
      ...students.map((s) => byPerson('eleve', s.id)),
      ...[...parentIds].map((id) => byPerson('parent', id)),
      ...admins,
    ].filter(Boolean);
  } else if (user.role === 'admin') {
    contacts = state.users.filter((u) => u.id !== user.id);
  }
  const seen = new Set();
  return contacts.filter((u) => u && u.id !== user.id && !seen.has(u.id) && seen.add(u.id));
}
