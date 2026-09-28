'use client';
import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { photoOf, userPhoto } from '@/lib/avatars';
import { Reveal } from '../motion';
import { Avatar, Badge, Bar, Card, Empty, Field, Grade, HBars, Modal, PageHead, Select, Stat, Tabs, Hero, Wave, PhotoPicker } from '../ui';
import {
  attendanceStats,
  byId,
  classAverages,
  formatDate,
  formatMoney,
  formatNote,
  fullName,
  generalAverage,
  paymentStatus,
  studentClass,
  subjectClassAverage,
  teacherName,
  timeAgo,
} from '@/lib/compute';
import { PERMISSIONS, ROLES } from '@/lib/permissions';
import { PAYMENT_METHODS } from '@/lib/seed';
import * as A from '@/lib/actions';
import { AnnouncementComposer, AttendanceBadge, BulletinModal, BulletinSheet, ReceiptModal, TimetableGrid, targetLabel, todayISO, PrioritiesCard } from './shared';
import { CredentialsModal } from './account';
import { downloadCSV } from '@/lib/csv';
import { GradesView, RollCallView, StudentFile } from './enseignant';

const nowTime = () => new Date().toTimeString().slice(0, 5);

function ConfirmButton({ onConfirm, children = 'Supprimer', message = 'Confirmer la suppression ?' }) {
  return (
    <button
      className="btn btn-sm btn-danger"
      onClick={(e) => {
        e.stopPropagation();
        if (window.confirm(message)) onConfirm();
      }}
    >
      <Icon name="trash" size={14} /> {children}
    </button>
  );
}

// ================================================================ Dashboard

export function AdminDashboard({ state, user, go }) {
  const today = todayISO();
  const todayAtt = state.attendance.filter((a) => a.date === today);
  const present = todayAtt.filter((a) => a.status !== 'absent').length;
  const pays = state.students.map((s) => paymentStatus(state, s.id, today));
  const totalFee = pays.reduce((a, p) => a + p.fee, 0);
  const totalPaid = pays.reduce((a, p) => a + p.paid, 0);
  const overdue = pays.reduce((a, p) => a + p.overdue, 0);
  const debtors = pays.filter((p) => p.overdue > 0).length;
  const avgs = state.classes.map((c) => {
    const r = classAverages(state, c.id);
    return { label: c.name, value: r.length ? r.reduce((a, x) => a + x.average, 0) / r.length : null };
  });
  const recentPayments = state.payments.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const absentsToday = todayAtt.filter((a) => a.status === 'absent');
  const callsDone = state.classes.filter((c) => todayAtt.some((a) => a.classId === c.id)).length;

  return (
    <>
      <Hero>
        <div>
          <h1>Tableau de bord de l’établissement</h1>
          <p>
            {state.school.name} · {state.school.year} · {byId(state.school.terms, state.school.currentTermId)?.name}
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => go('eleves')}>
            <Icon name="plus" size={16} /> Inscrire un élève
          </button>
          <button className="btn btn-primary" onClick={() => go('scolarite')}>
            <Icon name="wallet" size={16} /> Encaisser
          </button>
        </div>
      </Hero>
      <PrioritiesCard state={state} user={user} go={go} />
      <div className="grid g-4 mt">
        <Stat label="Élèves inscrits" value={state.students.length} icon="user" tone="blue" sub={`${state.classes.length} classes · ${state.teachers.length} enseignants`} />
        <Stat label="Présence aujourd’hui" value={todayAtt.length ? `${Math.round((present / todayAtt.length) * 100)} %` : '—'} icon="checkCircle" tone="green" sub={`Appel fait dans ${callsDone}/${state.classes.length} classes`} />
        <Stat label="Scolarité encaissée" value={`${Math.round((totalPaid / (totalFee || 1)) * 100)} %`} icon="wallet" tone="blue" sub={`${formatMoney(totalPaid)} / ${formatMoney(totalFee)}`}>
          <Bar value={totalPaid} max={totalFee || 1} tone="green" />
        </Stat>
        <Stat label="Impayés échus" value={formatMoney(overdue)} icon="alert" tone="red" sub={`${debtors} famille(s) concernée(s)`} />
      </div>
      <div className="grid g-main mt">
        <div className="stack">
          <Card title="Moyenne générale par classe" action={<button className="btn btn-sm" onClick={() => go('notes')}>Notes & bulletins</button>}>
            <HBars rows={avgs} />
          </Card>
          <Card title="Derniers paiements" action={<button className="btn btn-sm" onClick={() => go('scolarite')}>Scolarité</button>} flush>
            <table className="table">
              <tbody>
                {recentPayments.map((p) => {
                  const s = byId(state.students, p.studentId);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="strong small">{fullName(s)}</div>
                        <div className="tiny muted">
                          {studentClass(state, s)?.name} · {p.method}
                        </div>
                      </td>
                      <td className="muted small nowrap">{formatDate(p.date)}</td>
                      <td className="r num strong">{formatMoney(p.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
        <div className="stack">
          <Card title="Absents aujourd’hui" action={<button className="btn btn-sm" onClick={() => go('presences')}>Présences</button>}>
            {absentsToday.length ? (
              absentsToday.map((a) => {
                const s = byId(state.students, a.studentId);
                return (
                  <div className="list-item" key={a.id}>
                    <Avatar src={photoOf(s)} name={fullName(s)} />
                    <div className="grow">
                      <div className="strong small">{fullName(s)}</div>
                      <div className="tiny muted">{studentClass(state, s)?.name}</div>
                    </div>
                    {a.justified ? <Badge tone="green">Justifiée</Badge> : <Badge tone="red">Non justifiée</Badge>}
                  </div>
                );
              })
            ) : (
              <Empty>{todayAtt.length ? 'Aucun absent aujourd’hui.' : 'L’appel n’a pas encore été fait.'}</Empty>
            )}
          </Card>
          <Card title="Calendrier" action={<button className="btn btn-sm" onClick={() => go('parametres')}>Gérer</button>}>
            {state.calendar
              .filter((c) => c.date >= today)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map((c) => (
                <div className="list-item" key={c.id}>
                  <div className="num strong small" style={{ width: 60 }}>
                    {formatDate(c.date)}
                  </div>
                  <div className="grow small">{c.title}</div>
                </div>
              ))}
          </Card>
        </div>
      </div>
    </>
  );
}

// ================================================================ Élèves

export function AdminStudentsView({ state, user, run, params, go }) {
  const [classId, setClassId] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editingParent, setEditingParent] = useState(null);
  const [creds, setCreds] = useState(null);
  if (params[0]) return <StudentFile state={state} user={user} run={run} studentId={params[0]} go={go} onBack={() => go('eleves')} />;
  const students = state.students
    .filter((s) => (!classId || s.classId === classId) && `${fullName(s)} ${s.matricule}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  return (
    <>
      <PageHead title="Élèves" subtitle={`${state.students.length} élèves inscrits — inscriptions, affectations et dossiers.`}>
        <button
          className="btn"
          onClick={() =>
            downloadCSV('eleves-n1', [
              ['Matricule', 'Nom', 'Prénom', 'Classe', 'Sexe', 'Naissance', 'Parent', 'Téléphone parent', 'Moyenne', 'Scolarité payée (%)'],
              ...students.map((s) => {
                const parent = byId(state.parents, s.parentIds?.[0]);
                return [s.matricule, s.lastName, s.firstName, studentClass(state, s)?.name, s.gender, s.birthDate, parent ? `${parent.title} ${fullName(parent)}` : '', parent?.phone || '', Math.round((generalAverage(state, s.id) || 0) * 10) / 10, Math.round(paymentStatus(state, s.id).percent)];
              }),
            ])
          }
        >
          <Icon name="download" size={16} /> Excel
        </button>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> Inscrire un élève
        </button>
      </PageHead>
      <div className="row" style={{ marginBottom: 16 }}>
        <Select className="select input-sm" style={{ width: 180 }} value={classId} onChange={setClassId} options={[{ value: '', label: 'Toutes les classes' }, ...state.classes.map((c) => ({ value: c.id, label: c.name }))]} />
        <input className="input input-sm" style={{ maxWidth: 260 }} placeholder="Nom ou matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Élève</th>
                <th>Matricule</th>
                <th>Classe</th>
                <th>Parent / tuteur</th>
                <th className="r">Moyenne</th>
                <th className="r">Scolarité</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const parent = byId(state.parents, s.parentIds?.[0]);
                const pay = paymentStatus(state, s.id);
                return (
                  <tr key={s.id} className="clickable" onClick={() => go(`eleves/${s.id}`)}>
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <Avatar src={photoOf(s)} name={fullName(s)} />
                        <span className="strong">{fullName(s)}</span>
                      </div>
                    </td>
                    <td className="num small muted">{s.matricule}</td>
                    <td>{studentClass(state, s)?.name}</td>
                    <td className="small">
                      {parent ? (
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setEditingParent(parent); }}>
                          {parent.title} {fullName(parent)}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="r">
                      <Grade value={generalAverage(state, s.id)} />
                    </td>
                    <td className="r">
                      <Badge tone={pay.percent >= 100 ? 'green' : pay.overdue > 0 ? 'red' : 'orange'}>{Math.round(pay.percent)} %</Badge>
                    </td>
                    <td className="r nowrap">
                      <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setEditing(s); }}>
                        <Icon name="edit" size={14} />
                      </button>{' '}
                      <ConfirmButton message={`Supprimer ${fullName(s)} ? Ses notes et présences seront effacées.`} onConfirm={() => run(A.deleteStudent, { studentId: s.id }, 'Élève supprimé.')}>
                        {''}
                      </ConfirmButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!students.length && <Empty>Aucun élève trouvé.</Empty>}
        </div>
      </Card>
      {editing && <StudentModal state={state} run={run} student={editing} onClose={() => setEditing(null)} onCreated={setCreds} />}
      {creds && <CredentialsModal credentials={creds} onClose={() => setCreds(null)} />}
      {editingParent && <ParentModal run={run} parent={editingParent} onClose={() => setEditingParent(null)} />}
    </>
  );
}

function StudentModal({ state, run, student, onClose, onCreated }) {
  const isNew = !student.id;
  const [form, setForm] = useState({
    id: student.id,
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    classId: student.classId || state.classes[0]?.id,
    gender: student.gender || 'M',
    birthDate: student.birthDate || '',
    status: student.status || 'inscrit',
    parentMode: 'nouveau',
    parentId: state.parents[0]?.id,
    parentTitle: 'M.',
    parentFirstName: '',
    parentLastName: '',
    parentPhone: '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const submit = () => {
    const payload = { ...form };
    if (isNew && form.parentMode === 'existant') {
      delete payload.parentFirstName;
      delete payload.parentLastName;
    } else delete payload.parentId;
    const res = run(A.saveStudent, payload, isNew ? '🎉 Élève inscrit : identifiants créés.' : 'Dossier mis à jour.');
    if (res.ok) {
      onClose();
      if (res.result?.credentials?.length) onCreated?.(res.result.credentials);
    }
  };
  return (
    <Modal
      title={isNew ? 'Inscrire un élève' : `Modifier — ${fullName(student)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={submit}>
            {isNew ? 'Inscrire' : 'Enregistrer'}
          </button>
        </>
      }
    >
      {!isNew && (
        <div style={{ marginBottom: 16 }}>
          <PhotoPicker
            src={photoOf(state.students.find((x) => x.id === student.id))}
            name={fullName(student)}
            hasPhoto={Boolean(state.students.find((x) => x.id === student.id)?.photo)}
            onChange={(dataUrl) => run(A.setPhoto, { kind: 'student', id: student.id, dataUrl }, dataUrl ? '🎉 Photo enregistrée !' : 'Photo retirée.')}
          />
        </div>
      )}
      <div className="form-grid">
        <Field label="Prénom">
          <input className="input" value={form.firstName} onChange={set('firstName')} />
        </Field>
        <Field label="Nom">
          <input className="input" value={form.lastName} onChange={set('lastName')} />
        </Field>
        <Field label="Classe (affectation)">
          <Select value={form.classId} onChange={set('classId')} options={state.classes.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Sexe">
          <Select value={form.gender} onChange={set('gender')} options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} />
        </Field>
        <Field label="Date de naissance">
          <input className="input" type="date" value={form.birthDate} onChange={set('birthDate')} />
        </Field>
        {!isNew && (
          <Field label="Statut">
            <Select value={form.status} onChange={set('status')} options={[{ value: 'inscrit', label: 'Inscrit' }, { value: 'reinscrit', label: 'Réinscrit' }, { value: 'suspendu', label: 'Suspendu' }]} />
          </Field>
        )}
        {isNew && (
          <>
            <div className="full">
              <Tabs value={form.parentMode} onChange={set('parentMode')} tabs={[{ value: 'nouveau', label: 'Nouveau parent' }, { value: 'existant', label: 'Parent existant (fratrie)' }]} />
            </div>
            {form.parentMode === 'existant' ? (
              <Field label="Parent / tuteur" full>
                <Select value={form.parentId} onChange={set('parentId')} options={state.parents.map((p) => ({ value: p.id, label: `${p.title} ${fullName(p)} — ${p.childrenIds.map((id) => byId(state.students, id)?.firstName).join(', ')}` }))} />
              </Field>
            ) : (
              <>
                <Field label="Prénom du parent">
                  <input className="input" value={form.parentFirstName} onChange={set('parentFirstName')} />
                </Field>
                <Field label="Nom du parent">
                  <input className="input" value={form.parentLastName} onChange={set('parentLastName')} />
                </Field>
                <Field label="Civilité">
                  <Select value={form.parentTitle} onChange={set('parentTitle')} options={[{ value: 'M.', label: 'M.' }, { value: 'Mme', label: 'Mme' }]} />
                </Field>
                <Field label="Téléphone">
                  <input className="input" value={form.parentPhone} onChange={set('parentPhone')} placeholder="+224 6.. .. .. .." />
                </Field>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function ParentModal({ run, parent, onClose }) {
  const [form, setForm] = useState({ id: parent.id, title: parent.title, firstName: parent.firstName, lastName: parent.lastName, phone: parent.phone });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  return (
    <Modal
      title="Parent / tuteur"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={() => run(A.saveParent, form, 'Parent mis à jour.').ok && onClose()}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Civilité">
          <Select value={form.title} onChange={set('title')} options={[{ value: 'M.', label: 'M.' }, { value: 'Mme', label: 'Mme' }]} />
        </Field>
        <Field label="Téléphone">
          <input className="input" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label="Prénom">
          <input className="input" value={form.firstName} onChange={set('firstName')} />
        </Field>
        <Field label="Nom">
          <input className="input" value={form.lastName} onChange={set('lastName')} />
        </Field>
      </div>
    </Modal>
  );
}

// ================================================================ Enseignants

export function AdminTeachersView({ state, run }) {
  const [editing, setEditing] = useState(null);
  const [creds, setCreds] = useState(null);
  const today = todayISO();
  return (
    <>
      <PageHead title="Enseignants" subtitle="Matières enseignées, classes affectées et charge horaire.">
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> Ajouter un enseignant
        </button>
      </PageHead>
      <div className="grid g-3">
        {state.teachers.map((t) => {
          const hours = state.timetable.filter((x) => x.teacherId === t.id).length;
          const day = new Date().getDay() - 1;
          const todayCourses = state.timetable.filter((x) => x.teacherId === t.id && x.day === day).length;
          return (
            <Card key={t.id}>
              <div className="row">
                <Avatar src={photoOf(t, 'teacher')} name={fullName(t)} size="lg" />
                <div style={{ minWidth: 0 }}>
                  <h3>{teacherName(state, t.id)}</h3>
                  <div className="small muted num">{t.phone}</div>
                </div>
              </div>
              <dl className="kv mt">
                <dt>Matières</dt>
                <dd>{t.subjectIds.map((id) => byId(state.subjects, id)?.name).join(', ') || '—'}</dd>
                <dt>Classes</dt>
                <dd>{t.classIds.map((id) => byId(state.classes, id)?.name).join(', ') || '—'}</dd>
                <dt>Charge</dt>
                <dd>
                  {hours} h / semaine · {todayCourses} cours aujourd’hui
                </dd>
              </dl>
              <div className="row mt">
                <button className="btn btn-sm" onClick={() => setEditing(t)}>
                  <Icon name="edit" size={14} /> Modifier
                </button>
                <ConfirmButton message={`Supprimer ${fullName(t)} ?`} onConfirm={() => run(A.deleteTeacher, { teacherId: t.id }, 'Enseignant supprimé.')} />
              </div>
            </Card>
          );
        })}
      </div>
      {editing && <TeacherModal state={state} run={run} teacher={editing} onClose={() => setEditing(null)} onCreated={setCreds} />}
      {creds && <CredentialsModal credentials={creds} onClose={() => setCreds(null)} />}
      <p className="tiny muted mt">Mise à jour le {formatDate(today)}.</p>
    </>
  );
}

function TeacherModal({ state, run, teacher, onClose, onCreated }) {
  const [form, setForm] = useState({
    id: teacher.id,
    firstName: teacher.firstName || '',
    lastName: teacher.lastName || '',
    gender: teacher.gender || 'M',
    phone: teacher.phone || '',
    subjectIds: teacher.subjectIds || [],
    classIds: teacher.classIds || [],
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const toggle = (k, id) => setForm((f) => ({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] }));
  const submit = () => {
    const res = run(A.saveTeacher, form, teacher.id ? 'Enseignant mis à jour.' : 'Enseignant ajouté. Ses identifiants ont été créés.');
    if (res.ok) {
      onClose();
      if (res.result?.credentials?.length) onCreated?.(res.result.credentials);
    }
  };
  return (
    <Modal
      title={teacher.id ? `Modifier — ${fullName(teacher)}` : 'Ajouter un enseignant'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Enregistrer
          </button>
        </>
      }
    >
      {teacher.id && (
        <div style={{ marginBottom: 16 }}>
          <PhotoPicker
            src={photoOf(state.teachers.find((x) => x.id === teacher.id), 'teacher')}
            name={fullName(teacher)}
            hasPhoto={Boolean(state.teachers.find((x) => x.id === teacher.id)?.photo)}
            onChange={(dataUrl) => run(A.setPhoto, { kind: 'teacher', id: teacher.id, dataUrl }, dataUrl ? '🎉 Photo enregistrée !' : 'Photo retirée.')}
          />
        </div>
      )}
      <div className="form-grid">
        <Field label="Prénom">
          <input className="input" value={form.firstName} onChange={set('firstName')} />
        </Field>
        <Field label="Nom">
          <input className="input" value={form.lastName} onChange={set('lastName')} />
        </Field>
        <Field label="Civilité">
          <Select value={form.gender} onChange={set('gender')} options={[{ value: 'M', label: 'M.' }, { value: 'F', label: 'Mme' }]} />
        </Field>
        <Field label="Téléphone">
          <input className="input" value={form.phone} onChange={set('phone')} />
        </Field>
        <div className="field full">
          <span className="field-label">Matières enseignées</span>
          <div className="checks">
            {state.subjects.map((s) => (
              <label className="check" key={s.id}>
                <input type="checkbox" checked={form.subjectIds.includes(s.id)} onChange={() => toggle('subjectIds', s.id)} />
                {s.name}
                {s.teacherId && s.teacherId !== teacher.id && <span className="tiny muted">({teacherName(state, s.teacherId)})</span>}
              </label>
            ))}
          </div>
        </div>
        <div className="field full">
          <span className="field-label">Classes affectées</span>
          <div className="checks">
            {state.classes.map((c) => (
              <label className="check" key={c.id}>
                <input type="checkbox" checked={form.classIds.includes(c.id)} onChange={() => toggle('classIds', c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ================================================================ Classes & niveaux

export function AdminClassesView({ state, run }) {
  const [editing, setEditing] = useState(null);
  const [levelEdit, setLevelEdit] = useState(null);
  return (
    <>
      <PageHead title="Classes & niveaux" subtitle="Organisation pédagogique de l’établissement.">
        <button className="btn" onClick={() => setLevelEdit({})}>
          <Icon name="plus" size={16} /> Niveau
        </button>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> Classe
        </button>
      </PageHead>
      <div className="grid g-main">
        <Card title="Classes" flush>
          <table className="table">
            <thead>
              <tr>
                <th>Classe</th>
                <th>Niveau</th>
                <th>Salle</th>
                <th>Professeur principal</th>
                <th className="c">Effectif</th>
                <th className="r">Moyenne</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.classes.map((c) => {
                const r = classAverages(state, c.id);
                return (
                  <tr key={c.id}>
                    <td className="strong">{c.name}</td>
                    <td>{byId(state.levels, c.levelId)?.name}</td>
                    <td>{c.room}</td>
                    <td>{c.headTeacherId ? teacherName(state, c.headTeacherId) : '—'}</td>
                    <td className="c">{state.students.filter((s) => s.classId === c.id).length}</td>
                    <td className="r num">{formatNote(r.length ? r.reduce((a, x) => a + x.average, 0) / r.length : null)}</td>
                    <td className="r nowrap">
                      <button className="btn btn-sm" onClick={() => setEditing(c)}>
                        <Icon name="edit" size={14} />
                      </button>{' '}
                      <ConfirmButton message={`Supprimer la classe ${c.name} ?`} onConfirm={() => run(A.deleteClass, { classId: c.id }, 'Classe supprimée.')}>
                        {''}
                      </ConfirmButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        <Card title="Niveaux & frais annuels">
          {state.levels.map((l) => (
            <div className="list-item" key={l.id}>
              <div className="grow">
                <div className="strong">{l.name}</div>
                <div className="tiny muted">{state.classes.filter((c) => c.levelId === l.id).length} classe(s)</div>
              </div>
              <span className="num small">{formatMoney(l.annualFee)}</span>
              <button className="btn btn-sm" onClick={() => setLevelEdit(l)}>
                <Icon name="edit" size={14} />
              </button>
            </div>
          ))}
        </Card>
      </div>
      {editing && <ClassModal state={state} run={run} cls={editing} onClose={() => setEditing(null)} />}
      {levelEdit && <LevelModal run={run} level={levelEdit} onClose={() => setLevelEdit(null)} />}
    </>
  );
}

function ClassModal({ state, run, cls, onClose }) {
  const [form, setForm] = useState({ id: cls.id, name: cls.name || '', levelId: cls.levelId || state.levels[0]?.id, room: cls.room || '', headTeacherId: cls.headTeacherId || '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  return (
    <Modal
      title={cls.id ? `Modifier — ${cls.name}` : 'Nouvelle classe'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={() => run(A.saveClass, form, 'Classe enregistrée.').ok && onClose()}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nom">
          <input className="input" value={form.name} onChange={set('name')} placeholder="ex. 6e B" />
        </Field>
        <Field label="Niveau">
          <Select value={form.levelId} onChange={set('levelId')} options={state.levels.map((l) => ({ value: l.id, label: l.name }))} />
        </Field>
        <Field label="Salle">
          <input className="input" value={form.room} onChange={set('room')} />
        </Field>
        <Field label="Professeur principal">
          <Select value={form.headTeacherId} onChange={set('headTeacherId')} options={[{ value: '', label: '—' }, ...state.teachers.map((t) => ({ value: t.id, label: teacherName(state, t.id) }))]} />
        </Field>
      </div>
    </Modal>
  );
}

function LevelModal({ run, level, onClose }) {
  const [form, setForm] = useState({ id: level.id, name: level.name || '', annualFee: level.annualFee || '' });
  return (
    <Modal
      title={level.id ? `Niveau ${level.name}` : 'Nouveau niveau'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={() => run(A.saveLevel, form, 'Niveau enregistré.').ok && onClose()}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nom">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Frais de scolarité annuels (GNF)">
          <input className="input" inputMode="numeric" value={form.annualFee} onChange={(e) => setForm({ ...form, annualFee: e.target.value.replace(/\D/g, '') })} />
        </Field>
      </div>
    </Modal>
  );
}

// ================================================================ Matières

export function AdminSubjectsView({ state, run }) {
  const [editing, setEditing] = useState(null);
  return (
    <>
      <PageHead title="Matières" subtitle="Coefficients, volumes horaires et enseignants responsables.">
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> Ajouter une matière
        </button>
      </PageHead>
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Matière</th>
                <th className="c">Coefficient</th>
                <th className="c">Heures / semaine</th>
                <th>Enseignant</th>
                <th className="r">Moyenne établissement</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.subjects.map((s) => {
                const avgs = state.classes.map((c) => subjectClassAverage(state, c.id, s.id)).filter((x) => x != null);
                return (
                  <tr key={s.id}>
                    <td className="strong">{s.name}</td>
                    <td className="c">{s.coef}</td>
                    <td className="c">{s.weeklyHours}</td>
                    <td>{s.teacherId ? teacherName(state, s.teacherId) : <Badge tone="orange">Non affectée</Badge>}</td>
                    <td className="r">
                      <Grade value={avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null} />
                    </td>
                    <td className="r nowrap">
                      <button className="btn btn-sm" onClick={() => setEditing(s)}>
                        <Icon name="edit" size={14} />
                      </button>{' '}
                      <ConfirmButton message={`Supprimer ${s.name} ?`} onConfirm={() => run(A.deleteSubject, { subjectId: s.id }, 'Matière supprimée.')}>
                        {''}
                      </ConfirmButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && <SubjectModal state={state} run={run} subject={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function SubjectModal({ state, run, subject, onClose }) {
  const [form, setForm] = useState({ id: subject.id, name: subject.name || '', short: subject.short || '', coef: subject.coef || 1, weeklyHours: subject.weeklyHours || 2, teacherId: subject.teacherId || '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  return (
    <Modal
      title={subject.id ? `Modifier — ${subject.name}` : 'Nouvelle matière'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={() => run(A.saveSubject, form, 'Matière enregistrée.').ok && onClose()}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nom">
          <input className="input" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Abréviation">
          <input className="input" value={form.short} onChange={set('short')} />
        </Field>
        <Field label="Coefficient">
          <input className="input" type="number" min="1" max="10" value={form.coef} onChange={set('coef')} />
        </Field>
        <Field label="Heures par semaine">
          <input className="input" type="number" min="1" max="10" value={form.weeklyHours} onChange={set('weeklyHours')} />
        </Field>
        <Field label="Enseignant" full>
          <Select value={form.teacherId} onChange={set('teacherId')} options={[{ value: '', label: '— Non affectée —' }, ...state.teachers.map((t) => ({ value: t.id, label: teacherName(state, t.id) }))]} />
        </Field>
      </div>
    </Modal>
  );
}

// ================================================================ Emploi du temps

export function AdminTimetableView({ state, run }) {
  const [classId, setClassId] = useState(state.classes[0]?.id);
  const hours = state.timetable.filter((t) => t.classId === classId);
  const missing = state.subjects
    .map((s) => ({ s, planned: hours.filter((h) => h.subjectId === s.id).length }))
    .filter((x) => x.planned !== x.s.weeklyHours);
  return (
    <>
      <PageHead title="Emploi du temps" subtitle="Choisissez une matière par créneau : les conflits d’enseignant sont refusés automatiquement." />
      <div className="row" style={{ marginBottom: 16 }}>
        <Tabs value={classId} onChange={setClassId} tabs={state.classes.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      {missing.length > 0 && (
        <div className="alert alert-orange" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={18} />
          <div>
            Volume horaire à ajuster : {missing.map((m) => `${m.s.name} ${m.planned}/${m.s.weeklyHours} h`).join(' · ')}
          </div>
        </div>
      )}
      <Card>
        <TimetableGrid
          state={state}
          classId={classId}
          editable
          onChange={(day, slot, subjectId) => run(A.setTimetableSlot, { classId, day, slot, subjectId }, 'Emploi du temps mis à jour.')}
        />
      </Card>
    </>
  );
}

// ================================================================ Notes & bulletins

export function AdminGradesView(props) {
  const { state, run } = props;
  const [tab, setTab] = useState('resultats');
  const [classId, setClassId] = useState(state.classes[0]?.id);
  const [bulletin, setBulletin] = useState(null);
  const [batch, setBatch] = useState(false);
  const termId = state.school.currentTermId;
  const ranking = classAverages(state, classId, { termId });
  const published = state.bulletinsPublished?.[`${classId}-${termId}`];
  const cls = byId(state.classes, classId);
  const subjectAvg = (sid, subjectId) => {
    const evs = state.evaluations.filter((e) => e.subjectId === subjectId && e.termId === termId && e.scores[sid] != null);
    const co = evs.reduce((a, e) => a + e.coef, 0);
    return co ? evs.reduce((a, e) => a + e.scores[sid] * e.coef, 0) / co : null;
  };
  const exportCSV = () =>
    downloadCSV(`resultats-${cls?.name}-${termId}`, [
      ['Rang', 'Élève', ...state.subjects.map((s) => `${s.name} (coef ${s.coef})`), 'Moyenne générale'],
      ...ranking.map((r, i) => [i + 1, fullName(r.student), ...state.subjects.map((s) => (subjectAvg(r.student.id, s.id) == null ? '' : Math.round(subjectAvg(r.student.id, s.id) * 100) / 100)), Math.round(r.average * 100) / 100]),
    ]);
  return (
    <>
      <PageHead title="Notes & bulletins" subtitle={`${byId(state.school.terms, termId)?.name} — résultats par classe, saisie et édition des bulletins.`} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'resultats', label: 'Résultats & bulletins' }, { value: 'saisie', label: 'Saisie des notes' }]} />
      <div className="mt">
        {tab === 'saisie' ? (
          <GradesView {...props} />
        ) : (
          <>
            <div className="row" style={{ marginBottom: 16 }}>
              <Tabs value={classId} onChange={setClassId} tabs={state.classes.map((c) => ({ value: c.id, label: c.name }))} />
            </div>
            <div className={`alert ${published ? 'alert-green' : 'alert-orange'}`} style={{ marginBottom: 16, alignItems: 'center' }}>
              <Icon name={published ? 'checkCircle' : 'file'} size={18} />
              <div style={{ flex: 1 }}>
                {published ? (
                  <>
                    Bulletins de la {cls?.name} publiés le {formatDate(published.at, { day: 'numeric', month: 'long' })} : visibles par les élèves et les parents, qui ont été alertés.
                  </>
                ) : (
                  <>Les bulletins de la {cls?.name} sont générés automatiquement à partir des notes. Vérifiez-les puis publiez-les pour les rendre disponibles aux familles.</>
                )}
              </div>
              <div className="row">
                <button className="btn btn-sm" onClick={exportCSV}>
                  <Icon name="download" size={14} /> Excel
                </button>
                <button className="btn btn-sm" onClick={() => setBatch(true)} disabled={!ranking.length}>
                  <Icon name="printer" size={14} /> Imprimer toute la classe
                </button>
                {published ? (
                  <button className="btn btn-sm" onClick={() => run(A.publishBulletins, { classId, termId, publish: false }, 'Publication retirée.')}>
                    Retirer
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-success"
                    disabled={!ranking.length}
                    onClick={() => window.confirm(`Publier les ${ranking.length} bulletins de la ${cls?.name} ?`) && run(A.publishBulletins, { classId, termId }, '🎉 Bulletins publiés : familles alertées.')}
                  >
                    <Icon name="send" size={14} /> Publier
                  </button>
                )}
              </div>
            </div>
            <Card flush>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="c">Rang</th>
                      <th>Élève</th>
                      {state.subjects.map((s) => (
                        <th key={s.id} className="r">
                          {s.short}
                        </th>
                      ))}
                      <th className="r">Moy.</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r, i) => (
                      <tr key={r.student.id}>
                        <td className="c strong">{i + 1}</td>
                        <td className="strong nowrap">{fullName(r.student)}</td>
                        {state.subjects.map((s) => {
                          const evs = state.evaluations.filter((e) => e.subjectId === s.id && e.termId === termId && e.scores[r.student.id] != null);
                          const tot = evs.reduce((a, e) => a + e.scores[r.student.id] * e.coef, 0);
                          const co = evs.reduce((a, e) => a + e.coef, 0);
                          return (
                            <td key={s.id} className="r num small">
                              {co ? formatNote(tot / co) : '—'}
                            </td>
                          );
                        })}
                        <td className="r">
                          <Grade value={r.average} />
                        </td>
                        <td className="r">
                          <button className="btn btn-sm" onClick={() => setBulletin(r.student.id)}>
                            <Icon name="file" size={14} /> Bulletin
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!ranking.length && <Empty>Aucune note pour cette classe.</Empty>}
              </div>
            </Card>
          </>
        )}
      </div>
      {bulletin && <BulletinModal state={state} studentId={bulletin} termId={termId} onClose={() => setBulletin(null)} />}
      {batch && (
        <Modal
          title={`Bulletins — ${cls?.name} (${ranking.length})`}
          wide
          onClose={() => setBatch(false)}
          footer={
            <>
              <button className="btn" onClick={() => setBatch(false)}>
                Fermer
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Icon name="printer" size={16} /> Imprimer / PDF
              </button>
            </>
          }
        >
          <div className="print-area">
            {ranking.map((r) => (
              <div className="page-break" key={r.student.id}>
                <BulletinSheet state={state} studentId={r.student.id} termId={termId} />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

// ================================================================ Présences

export function AdminAttendanceView(props) {
  const { state, run } = props;
  const [tab, setTab] = useState('suivi');
  const [date, setDate] = useState(todayISO());
  const [filter, setFilter] = useState('anomalies');
  const records = state.attendance
    .filter((a) => a.date === date && (filter === 'tous' || a.status !== 'present'))
    .sort((a, b) => a.classId.localeCompare(b.classId));
  const dayRecords = state.attendance.filter((a) => a.date === date);
  const byClass = state.classes.map((c) => {
    const r = dayRecords.filter((a) => a.classId === c.id);
    return { c, total: r.length, absent: r.filter((a) => a.status === 'absent').length, late: r.filter((a) => a.status === 'retard').length };
  });
  const ranking = state.students
    .map((s) => ({ s, st: attendanceStats(state, s.id) }))
    .filter((x) => x.st.absent + x.st.late > 0)
    .sort((a, b) => b.st.absent - a.st.absent || b.st.late - a.st.late)
    .slice(0, 8);
  return (
    <>
      <PageHead title="Présences" subtitle="Présences, absences, retards et historique de l’établissement." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'suivi', label: 'Suivi' }, { value: 'appel', label: 'Faire l’appel' }]} />
      <div className="mt">
        {tab === 'appel' ? (
          <RollCallView {...props} />
        ) : (
          <>
            <div className="row" style={{ marginBottom: 16 }}>
              <input className="input input-sm" type="date" style={{ width: 170 }} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
              <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'anomalies', label: 'Absences & retards' }, { value: 'tous', label: 'Tous' }]} />
              <button
                className="btn btn-sm"
                onClick={() =>
                  downloadCSV(`presences-${date}`, [
                    ['Date', 'Classe', 'Élève', 'Statut', 'Arrivée', 'Justifiée'],
                    ...dayRecords.map((a) => [a.date, byId(state.classes, a.classId)?.name, fullName(byId(state.students, a.studentId)), a.status, a.arrival || '', a.status === 'absent' ? (a.justified ? 'oui' : 'non') : '']),
                  ])
                }
                disabled={!dayRecords.length}
              >
                <Icon name="download" size={14} /> Excel
              </button>
            </div>
            <div className="grid g-4" style={{ marginBottom: 16 }}>
              {byClass.map(({ c, total, absent, late }) => (
                <Stat key={c.id} label={c.name} value={total ? `${Math.round(((total - absent) / total) * 100)} %` : '—'} icon="users" tone={total ? (absent ? 'orange' : 'green') : 'navy'} sub={total ? `${absent} absent(s) · ${late} retard(s)` : 'Appel non fait'} />
              ))}
            </div>
            <div className="grid g-main">
              <Card title={`Détail du ${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}`} flush>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Statut</th>
                        <th>Arrivée</th>
                        <th>Justification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((a) => (
                        <tr key={a.id}>
                          <td className="strong">{fullName(byId(state.students, a.studentId))}</td>
                          <td>{byId(state.classes, a.classId)?.name}</td>
                          <td>
                            <AttendanceBadge status={a.status} />
                          </td>
                          <td className="num">{a.arrival || '—'}</td>
                          <td>
                            {a.status === 'absent' ? (
                              <label className="check">
                                <input type="checkbox" checked={a.justified} onChange={(e) => run(A.justifyAbsence, { attendanceId: a.id, justified: e.target.checked }, e.target.checked ? 'Absence justifiée.' : 'Justification retirée.')} />
                                Justifiée
                              </label>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!records.length && <Empty>{dayRecords.length ? 'Aucune absence ni retard ce jour-là.' : 'Aucun appel enregistré ce jour-là.'}</Empty>}
                </div>
              </Card>
              <Card title="Élèves les plus absents">
                {ranking.map(({ s, st }) => (
                  <div className="list-item" key={s.id}>
                    <div className="grow">
                      <div className="strong small">{fullName(s)}</div>
                      <div className="tiny muted">{studentClass(state, s)?.name}</div>
                    </div>
                    <Badge tone="red">{st.absent} abs.</Badge>
                    <Badge tone="orange">{st.late} ret.</Badge>
                  </div>
                ))}
                {!ranking.length && <Empty />}
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ================================================================ Sorties

export function AdminExitsView({ state, run }) {
  const [form, setForm] = useState({ studentId: state.students[0]?.id, date: todayISO(), time: nowTime(), type: 'normale', reason: 'Fin des cours', accompaniedBy: 'Seul(e)' });
  const [search, setSearch] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const exits = state.exits
    .filter((e) => fullName(byId(state.students, e.studentId)).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 60);
  const submit = (e) => {
    e.preventDefault();
    const res = run(A.recordExit, form, 'Sortie enregistrée : le parent est informé.');
    if (res.ok) setForm((f) => ({ ...f, time: nowTime() }));
  };
  return (
    <>
      <PageHead title="Sorties" subtitle="Enregistrez les sorties des élèves : les parents les voient en temps réel." />
      <PendingAuthorizations state={state} run={run} />
      <div className="grid g-main">
        <Card title="Dernières sorties" flush action={<input className="input input-sm" style={{ width: 200, marginRight: 20 }} placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Type</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {exits.map((e) => {
                  const s = byId(state.students, e.studentId);
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="strong small">{fullName(s)}</div>
                        <div className="tiny muted">{studentClass(state, s)?.name}</div>
                      </td>
                      <td className="nowrap small">{formatDate(e.date)}</td>
                      <td className="num strong">{e.time}</td>
                      <td>{e.type === 'exceptionnelle' ? <Badge tone="orange">Exceptionnelle</Badge> : <Badge>Normale</Badge>}</td>
                      <td className="small">
                        {e.reason}
                        <div className="tiny muted">{e.accompaniedBy}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Enregistrer une sortie">
          <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
            <Field label="Élève">
              <Select value={form.studentId} onChange={set('studentId')} options={state.students.slice().sort((a, b) => a.lastName.localeCompare(b.lastName)).map((s) => ({ value: s.id, label: `${fullName(s)} — ${studentClass(state, s)?.name}` }))} />
            </Field>
            <div className="form-grid">
              <Field label="Date">
                <input className="input" type="date" value={form.date} onChange={set('date')} />
              </Field>
              <Field label="Heure">
                <input className="input" type="time" value={form.time} onChange={set('time')} />
              </Field>
            </div>
            <Field label="Type">
              <Select value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v, reason: v === 'normale' ? 'Fin des cours' : '' }))} options={[{ value: 'normale', label: 'Normale (fin des cours)' }, { value: 'exceptionnelle', label: 'Exceptionnelle (avant la fin)' }]} />
            </Field>
            <Field label="Motif">
              <input className="input" value={form.reason} onChange={set('reason')} required />
            </Field>
            <Field label="Accompagné par">
              <input className="input" value={form.accompaniedBy} onChange={set('accompaniedBy')} list="pickup-persons" />
              <datalist id="pickup-persons">
                {(state.exitRules?.[form.studentId]?.pickupPersons || []).map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
            <ExitCheck state={state} studentId={form.studentId} date={form.date} type={form.type} accompaniedBy={form.accompaniedBy} />
            <button className="btn btn-primary" type="submit">
              <Icon name="door" size={16} /> Enregistrer la sortie
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}

/** Rappelle au surveillant les règles fixées par les parents et les autorisations du jour. */
function ExitCheck({ state, studentId, date, type, accompaniedBy }) {
  const rules = state.exitRules?.[studentId];
  const auths = (state.exitAuthorizations || []).filter((a) => a.studentId === studentId && a.date === date && a.status === 'approuvee');
  const alone = /seul/i.test(accompaniedBy || '');
  const problems = [];
  if (rules && !rules.canLeaveAlone && alone) problems.push('Les parents n’autorisent pas une sortie seul(e).');
  if (type === 'exceptionnelle' && !auths.length && state.school.exitRules?.requireAuthorizationBeforeEnd) problems.push('Aucune autorisation parentale approuvée pour aujourd’hui.');
  return (
    <div className={`alert ${problems.length ? 'alert-red' : 'alert-blue'} small`}>
      <Icon name={problems.length ? 'alert' : 'shield'} size={16} />
      <div>
        {problems.map((p) => (
          <div key={p} className="strong">
            {p}
          </div>
        ))}
        <div>
          {rules ? (rules.canLeaveAlone ? 'Peut sortir seul(e).' : 'Ne peut pas sortir seul(e).') : 'Aucune règle renseignée par les parents.'}
          {rules?.pickupPersons?.length ? ` Personnes autorisées : ${rules.pickupPersons.join(', ')}.` : ''}
        </div>
        {auths.map((a) => (
          <div key={a.id}>
            ✅ Autorisation du jour : {a.time} — {a.reason}
            {a.pickupBy ? ` (${a.pickupBy})` : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingAuthorizations({ state, run }) {
  const pending = (state.exitAuthorizations || []).filter((a) => a.status === 'en_attente').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (!pending.length) return null;
  return (
    <Card title={`Demandes d’autorisation de sortie (${pending.length})`} className="priorities" >
      {pending.map((a) => {
        const s = byId(state.students, a.studentId);
        return (
          <div className="list-item" key={a.id}>
            <Avatar src={photoOf(s)} name={fullName(s)} />
            <div className="grow">
              <div className="strong small">
                {fullName(s)} · {studentClass(state, s)?.name}
              </div>
              <div className="tiny muted">
                {formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })} à {a.time} — {a.reason}
                {a.pickupBy ? ` · récupéré(e) par ${a.pickupBy}` : ''} · demandé par {byId(state.users, a.requestedBy)?.name}
              </div>
            </div>
            <button className="btn btn-sm btn-success" onClick={() => run(A.decideExitAuthorization, { authorizationId: a.id, approve: true }, 'Sortie autorisée : parent alerté.')}>
              Autoriser
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => {
                const comment = window.prompt('Motif du refus (facultatif) :') ?? null;
                if (comment !== null) run(A.decideExitAuthorization, { authorizationId: a.id, approve: false, comment }, 'Demande refusée : parent alerté.');
              }}
            >
              Refuser
            </button>
          </div>
        );
      })}
    </Card>
  );
}

// ================================================================ Scolarité

export function AdminFeesView({ state, run }) {
  const [tab, setTab] = useState('situation');
  const [classId, setClassId] = useState('');
  const [paying, setPaying] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const today = todayISO();
  const rows = state.students
    .filter((s) => !classId || s.classId === classId)
    .map((s) => ({ s, p: paymentStatus(state, s.id, today) }))
    .filter((r) => tab !== 'impayes' || r.p.overdue > 0)
    .sort((a, b) => b.p.overdue - a.p.overdue || a.s.lastName.localeCompare(b.s.lastName));
  const totals = state.students.reduce(
    (acc, s) => {
      const p = paymentStatus(state, s.id, today);
      return { fee: acc.fee + p.fee, paid: acc.paid + p.paid, overdue: acc.overdue + p.overdue, balance: acc.balance + p.balance };
    },
    { fee: 0, paid: 0, overdue: 0, balance: 0 },
  );
  const byMethod = PAYMENT_METHODS.map((m) => ({ label: m, value: state.payments.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0) }));
  const maxMethod = Math.max(...byMethod.map((m) => m.value), 1);
  const history = state.payments.slice().sort((a, b) => b.date.localeCompare(a.date) || b.receiptNo.localeCompare(a.receiptNo));
  // Encaissements par mois (tableau de bord financier).
  const months = {};
  for (const p of state.payments) months[p.date.slice(0, 7)] = (months[p.date.slice(0, 7)] || 0) + p.amount;
  const monthRows = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, v]) => ({ label: new Date(`${m}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), value: v }));
  const online = state.payments.filter((p) => p.channel === 'en_ligne');
  const onlineTotal = online.reduce((a, p) => a + p.amount, 0);
  const upcoming = state.school.installments
    .filter((i) => i.dueDate >= today)
    .map((i) => ({
      ...i,
      due: state.students.reduce((a, s) => {
        const inst = paymentStatus(state, s.id, today).installments.find((x) => x.id === i.id);
        return a + (inst ? inst.amount - inst.covered : 0);
      }, 0),
    }));
  const kFormat = (v) => `${Math.round(v / 1000).toLocaleString('fr-FR')} k`;

  return (
    <>
      <PageHead title="Scolarité" subtitle="Frais, paiements, échéances, impayés et reçus.">
        <button className="btn btn-primary" onClick={() => setPaying({})}>
          <Icon name="plus" size={16} /> Enregistrer un paiement
        </button>
      </PageHead>
      <div className="grid g-4">
        <Stat label="Attendu (année)" value={formatMoney(totals.fee)} icon="wallet" tone="navy" />
        <Stat label="Encaissé" value={formatMoney(totals.paid)} icon="check" tone="green" sub={`${Math.round((totals.paid / (totals.fee || 1)) * 100)} % du total`} />
        <Stat label="Reste à encaisser" value={formatMoney(totals.balance)} icon="clock" tone="orange" />
        <Stat label="Impayés échus" value={formatMoney(totals.overdue)} icon="alert" tone="red" />
      </div>
      <div className="row mt" style={{ marginBottom: 16 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'situation', label: 'Situation par élève' },
            { value: 'impayes', label: 'Impayés' },
            { value: 'finances', label: 'Tableau financier' },
            { value: 'historique', label: 'Historique & reçus' },
          ]}
        />
        {(tab === 'situation' || tab === 'impayes') && (
          <Select className="select input-sm" style={{ width: 180 }} value={classId} onChange={setClassId} options={[{ value: '', label: 'Toutes les classes' }, ...state.classes.map((c) => ({ value: c.id, label: c.name }))]} />
        )}
      </div>
      {tab === 'finances' ? (
        <div className="grid g-2">
          <Card title="Encaissements par mois">
            <HBars rows={monthRows} max={Math.max(...monthRows.map((m) => m.value), 1)} format={kFormat} />
            <p className="tiny muted mt">Montants en milliers de GNF.</p>
          </Card>
          <div className="stack">
            <Card title="Canaux de paiement">
              <dl className="kv">
                <dt>Au guichet</dt>
                <dd className="num">{formatMoney(totals.paid - onlineTotal)}</dd>
                <dt>En ligne (Mobile Money)</dt>
                <dd className="num">
                  {formatMoney(onlineTotal)} · {online.length} transaction(s)
                </dd>
              </dl>
              <div className="mt">
                <HBars rows={byMethod} max={maxMethod} format={kFormat} />
              </div>
            </Card>
            <Card title="Prochaines échéances">
              {upcoming.map((i) => (
                <div className="list-item" key={i.id}>
                  <div className="grow">
                    <div className="strong small">{i.label}</div>
                    <div className="tiny muted">Avant le {formatDate(i.dueDate, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <span className="num small strong">{formatMoney(i.due)}</span>
                </div>
              ))}
              {!upcoming.length && <Empty>Aucune échéance à venir.</Empty>}
            </Card>
          </div>
        </div>
      ) : tab === 'historique' ? (
        <div className="grid g-main">
          <Card
            flush
            title="Transactions"
            action={
              <button
                className="btn btn-sm"
                style={{ marginRight: 20 }}
                onClick={() =>
                  downloadCSV('paiements-n1', [
                    ['Reçu', 'Date', 'Élève', 'Classe', 'Mode', 'Canal', 'Référence', 'Montant (GNF)'],
                    ...history.map((p) => {
                      const st = byId(state.students, p.studentId);
                      return [p.receiptNo, p.date, st ? fullName(st) : p.studentId, studentClass(state, st)?.name || '', p.method, p.channel === 'en_ligne' ? 'En ligne' : 'Guichet', p.reference || '', p.amount];
                    }),
                  ])
                }
              >
                <Icon name="download" size={14} /> Excel
              </button>
            }
          >
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reçu</th>
                    <th>Date</th>
                    <th>Élève</th>
                    <th>Mode</th>
                    <th className="r">Montant</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.id}>
                      <td className="num small">{p.receiptNo}</td>
                      <td className="nowrap small">{formatDate(p.date)}</td>
                      <td className="strong small">{fullName(byId(state.students, p.studentId))}</td>
                      <td className="small">{p.method}</td>
                      <td className="r num strong">{formatMoney(p.amount)}</td>
                      <td className="r">
                        <button className="btn btn-sm" onClick={() => setReceipt(p)}>
                          <Icon name="receipt" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Encaissements par mode de paiement">
            <HBars rows={byMethod} max={maxMethod} format={(v) => `${Math.round(v / 1000).toLocaleString('fr-FR')} k`} />
          </Card>
        </div>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Classe</th>
                  <th className="r">Frais</th>
                  <th className="r">Payé</th>
                  <th style={{ width: 160 }}>Progression</th>
                  <th className="r">Reste</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, p }) => (
                  <tr key={s.id}>
                    <td className="strong">{fullName(s)}</td>
                    <td>{studentClass(state, s)?.name}</td>
                    <td className="r num small">{formatMoney(p.fee)}</td>
                    <td className="r num small">{formatMoney(p.paid)}</td>
                    <td>
                      <Bar value={p.percent} tone={p.percent >= 100 ? 'green' : p.overdue > 0 ? 'red' : 'orange'} />
                      <div className="tiny muted">{Math.round(p.percent)} %</div>
                    </td>
                    <td className="r num small">{formatMoney(p.balance)}</td>
                    <td>
                      {p.percent >= 100 ? <Badge tone="green">Soldé</Badge> : p.overdue > 0 ? <Badge tone="red">{formatMoney(p.overdue)} en retard</Badge> : <Badge tone="blue">À jour</Badge>}
                    </td>
                    <td className="r nowrap">
                      {p.balance > 0 && (
                        <button className="btn btn-sm btn-ghost" title="Envoyer un rappel SMS / WhatsApp au parent" onClick={() => run(A.sendPaymentReminder, { studentId: s.id }, 'Rappel envoyé au parent.')}>
                          Relancer
                        </button>
                      )}{' '}
                      {p.balance > 0 && (
                        <button className="btn btn-sm" onClick={() => setPaying({ studentId: s.id, amount: p.overdue || p.installments.find((i) => i.status !== 'payee')?.amount - (p.installments.find((i) => i.status !== 'payee')?.covered || 0) })}>
                          Encaisser
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <Empty>Aucun élève dans cette catégorie.</Empty>}
          </div>
        </Card>
      )}
      {paying && <PaymentModal state={state} run={run} initial={paying} onClose={() => setPaying(null)} onDone={(p) => setReceipt(p)} />}
      {receipt && <ReceiptModal state={state} payment={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}

function PaymentModal({ state, run, initial, onClose, onDone }) {
  const [form, setForm] = useState({ studentId: initial.studentId || state.students[0]?.id, amount: initial.amount ? String(initial.amount) : '', method: 'Espèces', date: todayISO() });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const status = paymentStatus(state, form.studentId);
  const submit = () => {
    const res = run(A.recordPayment, form, 'Paiement enregistré.');
    if (res.ok) {
      onClose();
      onDone(res.result);
    }
  };
  return (
    <Modal
      title="Enregistrer un paiement"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Valider et éditer le reçu
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Élève" full>
          <Select value={form.studentId} onChange={set('studentId')} options={state.students.slice().sort((a, b) => a.lastName.localeCompare(b.lastName)).map((s) => ({ value: s.id, label: `${fullName(s)} — ${studentClass(state, s)?.name}` }))} />
        </Field>
        <div className="full alert alert-blue small">
          Frais : {formatMoney(status.fee)} · Payé : {formatMoney(status.paid)} · Reste : <strong>{formatMoney(status.balance)}</strong>
        </div>
        <Field label="Montant (GNF)">
          <input className="input num" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d]/g, '') })} />
        </Field>
        <Field label="Mode de paiement">
          <Select value={form.method} onChange={set('method')} options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} />
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={form.date} onChange={set('date')} />
        </Field>
      </div>
    </Modal>
  );
}

// ================================================================ Communication

export function AdminCommunicationView(props) {
  const [tab, setTab] = useState('annonces');
  return (
    <>
      <PageHead title="Communication" subtitle="Annonces ciblées et alertes automatiques par SMS / WhatsApp aux familles.">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'annonces', label: 'Annonces' }, { value: 'alertes', label: 'Alertes SMS & WhatsApp' }]} />
      </PageHead>
      {tab === 'annonces' ? <AnnouncementsPanel {...props} /> : <AlertsPanel {...props} />}
    </>
  );
}

const RULE_LABELS = {
  absence: 'Absence',
  retard: 'Retard',
  devoirNonRendu: 'Devoir non rendu',
  baisseResultats: 'Baisse des résultats',
  echeance: 'Échéance de paiement',
  sortie: 'Sortie de l’établissement',
};

function AlertsPanel({ state, run }) {
  const channels = state.school.alertChannels || {};
  const rules = state.school.alertRules || {};
  const [filter, setFilter] = useState('');
  const out = (state.alertsOutbox || []).filter((o) => !filter || o.channel === filter);
  return (
    <div className="grid g-main">
      <Card
        title={`File d’envoi (${state.alertsOutbox?.length || 0})`}
        flush
        action={<Select className="select input-sm" style={{ width: 150, marginRight: 20 }} value={filter} onChange={setFilter} options={[{ value: '', label: 'Tous canaux' }, { value: 'sms', label: 'SMS' }, { value: 'whatsapp', label: 'WhatsApp' }]} />}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Quand</th>
                <th>Canal</th>
                <th>Destinataire</th>
                <th>Message</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {out.slice(0, 100).map((o) => (
                <tr key={o.id}>
                  <td className="nowrap small muted">{timeAgo(o.at)}</td>
                  <td>
                    <Badge tone={o.channel === 'sms' ? 'blue' : 'green'}>{o.channel === 'sms' ? 'SMS' : 'WhatsApp'}</Badge>
                  </td>
                  <td className="small">
                    <div className="strong">{o.toName}</div>
                    <div className="tiny muted num">{o.to}</div>
                  </td>
                  <td className="small">{o.message}</td>
                  <td>
                    <Badge tone="orange">Simulé</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!out.length && <Empty>Aucune alerte pour le moment. Faites l’appel, enregistrez une sortie ou un paiement pour en générer.</Empty>}
        </div>
      </Card>
      <div className="stack">
        <Card title="Canaux d’envoi">
          {[
            ['sms', 'SMS'],
            ['whatsapp', 'WhatsApp'],
          ].map(([k, l]) => (
            <label className="check" key={k} style={{ marginRight: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={Boolean(channels[k])} onChange={(e) => run(A.updateAlertSettings, { channels: { [k]: e.target.checked } }, 'Réglage enregistré.')} />
              {l}
            </label>
          ))}
          <p className="tiny muted mt">
            Démonstration : les messages sont préparés et journalisés mais pas envoyés. Pour l’envoi réel, il suffit de brancher un fournisseur SMS et le numéro WhatsApp de l’école.
          </p>
        </Card>
        <Card title="Alertes automatiques">
          {Object.entries(RULE_LABELS).map(([k, l]) => (
            <label className="check" key={k} style={{ display: 'flex', marginBottom: 8 }}>
              <input type="checkbox" checked={rules[k] !== false} onChange={(e) => run(A.updateAlertSettings, { rules: { [k]: e.target.checked } }, 'Réglage enregistré.')} />
              {l}
            </label>
          ))}
          <p className="tiny muted">Ces alertes apparaissent aussi dans les notifications de l’application des parents et des élèves.</p>
        </Card>
      </div>
    </div>
  );
}

function AnnouncementsPanel({ state, user, run }) {
  const list = state.announcements.slice().sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <div className="grid g-main">
        <Card title="Annonces publiées">
          {list.map((a) => (
            <div className="notif" key={a.id}>
              <span className="notif-icon tone-blue">
                <Icon name="megaphone" size={18} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="row between">
                  <span className="strong">{a.title}</span>
                  <Badge tone="blue">{targetLabel(state, a.target)}</Badge>
                </div>
                <p className="small" style={{ marginTop: 4 }}>
                  {a.body}
                </p>
                <p className="tiny muted" style={{ marginTop: 4 }}>
                  {byId(state.users, a.authorId)?.name} · {timeAgo(a.at)}
                </p>
              </div>
            </div>
          ))}
        </Card>
        <Card title="Nouvelle annonce">
          <AnnouncementComposer state={state} user={user} run={run} classes={state.classes} allowAll />
        </Card>
      </div>
    </>
  );
}

// ================================================================ Paramètres

const PERM_LABELS = {
  'results:read': 'Consulter les résultats',
  'grades:write': 'Saisir / modifier les notes',
  'homework:submit': 'Remettre des devoirs',
  'homework:publish': 'Publier des devoirs',
  'attendance:write': 'Faire l’appel',
  'payments:read': 'Consulter les paiements',
  'payments:manage': 'Encaisser / gérer les paiements',
  'students:manage': 'Gérer les élèves',
  'announcements:all': 'Annonces à tout l’établissement',
  'settings:manage': 'Paramètres de l’établissement',
};

export function AdminSettingsView({ state, run, resetDemo }) {
  const [form, setForm] = useState({ name: state.school.name, city: state.school.city, year: state.school.year, currentTermId: state.school.currentTermId });
  const [ev, setEv] = useState({ date: todayISO(), title: '', type: 'evenement' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const events = state.calendar.slice().sort((a, b) => a.date.localeCompare(b.date));
  const accounts = useMemo(() => {
    const out = {};
    for (const u of state.users) out[u.role] = (out[u.role] || 0) + 1;
    return out;
  }, [state.users]);
  return (
    <>
      <PageHead title="Paramètres" subtitle="Établissement, année scolaire, calendrier et rôles." />
      <div className="grid g-2">
        <Card title="Établissement & année scolaire">
          <div className="form-grid">
            <Field label="Nom de l’établissement" full>
              <input className="input" value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Ville">
              <input className="input" value={form.city} onChange={set('city')} />
            </Field>
            <Field label="Année scolaire">
              <input className="input" value={form.year} onChange={set('year')} />
            </Field>
            <Field label="Trimestre en cours" full>
              <Select value={form.currentTermId} onChange={set('currentTermId')} options={state.school.terms.map((t) => ({ value: t.id, label: `${t.name} (${formatDate(t.start)} → ${formatDate(t.end)})` }))} />
            </Field>
          </div>
          <button className="btn btn-primary mt" onClick={() => run(A.updateSettings, form, 'Paramètres enregistrés.')}>
            Enregistrer
          </button>
        </Card>
        <Card title="Calendrier scolaire">
          {events.map((e) => (
            <div className="list-item" key={e.id}>
              <div className="num strong small" style={{ width: 70 }}>
                {formatDate(e.date)}
              </div>
              <div className="grow small">{e.title}</div>
              <Badge tone={{ examen: 'orange', ferie: 'red', reunion: 'blue' }[e.type] || 'gray'}>{{ examen: 'Examen', ferie: 'Férié', reunion: 'Réunion' }[e.type] || 'Événement'}</Badge>
              <button className="btn btn-ghost btn-sm" aria-label="Supprimer" onClick={() => run(A.deleteCalendarEvent, { eventId: e.id })}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
          <div className="row mt">
            <input className="input input-sm" type="date" style={{ width: 150 }} value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} />
            <input className="input input-sm" style={{ flex: 1, minWidth: 140 }} placeholder="Intitulé" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} />
            <Select className="select input-sm" style={{ width: 120 }} value={ev.type} onChange={(v) => setEv({ ...ev, type: v })} options={[{ value: 'evenement', label: 'Événement' }, { value: 'examen', label: 'Examen' }, { value: 'reunion', label: 'Réunion' }, { value: 'ferie', label: 'Férié' }]} />
            <button className="btn btn-sm btn-primary" onClick={() => run(A.addCalendarEvent, ev, 'Événement ajouté.').ok && setEv({ ...ev, title: '' })}>
              Ajouter
            </button>
          </div>
        </Card>
      </div>
      <Card className="mt" title="Rôles & permissions" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Permission</th>
                {Object.values(ROLES).map((r) => (
                  <th key={r.slug} className="c">
                    {r.label}
                    <div className="tiny" style={{ textTransform: 'none', letterSpacing: 0 }}>
                      {accounts[r.slug] || 0} compte(s)
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERM_LABELS).map(([perm, label]) => (
                <tr key={perm}>
                  <td>{label}</td>
                  {Object.keys(ROLES).map((r) => (
                    <td key={r} className="c">
                      {PERMISSIONS[r].includes(perm) ? (
                        <span style={{ color: 'var(--green-700)' }} aria-label="Autorisé">
                          <Icon name="check" size={18} />
                        </span>
                      ) : (
                        <span style={{ color: 'var(--gray-300)' }} aria-label="Interdit">
                          <Icon name="x" size={18} />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ padding: '12px 20px' }}>
          Chaque action vérifie aussi le périmètre : un enseignant ne note que ses matières et ses classes, un parent ne voit que ses enfants.
        </p>
      </Card>
      <Card className="mt" title="Données de démonstration">
        <p className="small muted">Réinitialise toutes les données (élèves, notes, paiements…) avec le jeu de démonstration, recalé sur la date du jour.</p>
        <button className="btn btn-danger mt" onClick={() => window.confirm('Réinitialiser toutes les données de démonstration ?') && resetDemo()}>
          Réinitialiser les données
        </button>
      </Card>
    </>
  );
}
