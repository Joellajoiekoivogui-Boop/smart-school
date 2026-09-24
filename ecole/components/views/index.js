/** Registre des vues : rôle → section de navigation → composant. */
import * as S from './shared';
import * as E from './eleve';
import * as P from './parent';
import * as T from './enseignant';
import * as AD from './admin';

export const VIEWS = {
  eleve: {
    '': E.EleveDashboard,
    resultats: S.ResultsView,
    devoirs: S.HomeworkView,
    cours: E.CoursView,
    entrainement: E.TrainingView,
    enseignants: S.TeachersView,
    'emploi-du-temps': S.TimetableView,
    progression: S.ProgressionView,
    messages: S.MessagesView,
    notifications: S.NotificationsView,
  },
  parent: {
    '': P.ParentDashboard,
    enfants: P.ChildrenView,
    resultats: S.ResultsView,
    bulletins: S.BulletinsView,
    devoirs: S.HomeworkView,
    presences: S.AttendanceView,
    sorties: S.ExitsView,
    paiements: S.PaymentsView,
    'emploi-du-temps': S.TimetableView,
    enseignants: S.TeachersView,
    messages: S.MessagesView,
    notifications: S.NotificationsView,
  },
  enseignant: {
    '': T.EnseignantDashboard,
    classes: T.ClassesView,
    eleves: T.StudentsView,
    devoirs: T.TeacherHomeworkView,
    notes: T.GradesView,
    progression: T.TeacherProgressionView,
    presences: T.RollCallView,
    'emploi-du-temps': S.TimetableView,
    messages: S.MessagesView,
    notifications: S.NotificationsView,
  },
  admin: {
    '': AD.AdminDashboard,
    eleves: AD.AdminStudentsView,
    enseignants: AD.AdminTeachersView,
    classes: AD.AdminClassesView,
    matieres: AD.AdminSubjectsView,
    'emploi-du-temps': AD.AdminTimetableView,
    notes: AD.AdminGradesView,
    presences: AD.AdminAttendanceView,
    sorties: AD.AdminExitsView,
    scolarite: AD.AdminFeesView,
    communication: AD.AdminCommunicationView,
    messages: S.MessagesView,
    parametres: AD.AdminSettingsView,
  },
};
