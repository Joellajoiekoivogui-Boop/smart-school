'use client';
import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { Reveal } from '../motion';
import { Avatar, Badge, Card, Empty, Field, Grade, HBars, LineChart, Modal, PageHead, Select, Stat, Tabs } from '../ui';
import {
  attendanceStats,
  byId,
  classAverages,
  difficulties,
  formatDate,
  formatNote,
  fullName,
  generalAverage,
  progressionPercent,
  progressionSeries,
  studentClass,
  subjectAverage,
  subjectClassAverage,
  teacherOf,
  userForPerson,
} from '@/lib/compute';
import { canAccessStudent, canTeach, messageContacts } from '@/lib/permissions';
import * as A from '@/lib/actions';
import { AttendanceBadge, todayISO, PrioritiesCard } from './shared';
import { TodayCourses } from './eleve';
import { Lifebook } from './lifebook';

/** Classes et matières de l'enseignant connecté. */
function teacherScope(state, user) {
  const teacher = teacherOf(state, user);
  const classes = state.classes.filter((c) => teacher?.classIds.includes(c.id));
  const subjects = state.subjects.filter((s) => teacher?.subjectIds.includes(s.id));
  return { teacher, classes, subjects };
}

// ================================================================ Tableau de bord

export function EnseignantDashboard({ state, user, go }) {
  const { teacher, classes, subjects } = teacherScope(state, user);
  const students = state.students.filter((s) => teacher.classIds.includes(s.classId));
  const hwIds = new Set(state.homework.filter((h) => h.teacherId === teacher.id).map((h) => h.id));
  const toGrade = state.submissions.filter((s) => hwIds.has(s.homeworkId) && s.grade == null);
  const unread = state.messages.filter((m) => m.to === user.id && !m.read);
  const today = todayISO();
  const callsDone = classes.filter((c) => state.attendance.some((a) => a.classId === c.id && a.date === today)).length;
  const weak = students
    .map((s) => ({ s, avg: subjects.length ? subjectAverage(state, s.id, subjects[0].id) : null }))
    .filter((x) => x.avg != null && x.avg < 10)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  return (
    <>
      <Reveal className="hero">
        <div>
          <h1>Bonjour {user.name} 👋</h1>
          <p>
            {subjects.map((s) => s.name).join(' · ')} — {classes.length} classe(s), {students.length} élèves
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => go('presences')}>
          <Icon name="checkCircle" size={16} /> Faire l’appel
        </button>
      </Reveal>
      <PrioritiesCard state={state} user={user} go={go} />
      <div className="grid g-4 mt">
        <Stat label="Mes classes" value={classes.length} icon="users" tone="blue" sub={`${students.length} élèves suivis`} />
        <Stat label="Appels du jour" value={`${callsDone}/${classes.length}`} icon="checkCircle" tone={callsDone === classes.length ? 'green' : 'orange'} sub="Classes dont l’appel est fait" />
        <Stat label="Copies à corriger" value={toGrade.length} icon="edit" tone="orange" sub="Devoirs remis en ligne" />
        <Stat label="Messages non lus" value={unread.length} icon="message" tone={unread.length ? 'red' : 'navy'} />
      </div>
      <div className="grid g-main mt">
        <div className="stack">
          <Card title={`Moyenne par classe — ${subjects[0]?.name || ''}`}>
            <HBars
              rows={classes.map((c) => ({ label: c.name, value: subjectClassAverage(state, c.id, subjects[0]?.id) }))}
            />
          </Card>
          <Card title="Élèves à accompagner" action={<button className="btn btn-sm" onClick={() => go('eleves')}>Mes élèves</button>}>
            {weak.length ? (
              weak.map(({ s, avg }) => (
                <div className="list-item clickable" key={s.id} style={{ cursor: 'pointer' }} onClick={() => go(`eleves/${s.id}`)}>
                  <Avatar name={fullName(s)} />
                  <div className="grow">
                    <div className="strong small">{fullName(s)}</div>
                    <div className="tiny muted">
                      {studentClass(state, s)?.name} · {difficulties(state, s.id).map((d) => d.topic).slice(0, 2).join(', ') || 'Résultats fragiles'}
                    </div>
                  </div>
                  <Grade value={avg} />
                </div>
              ))
            ) : (
              <Empty>Aucun élève sous la moyenne dans votre matière. 👏</Empty>
            )}
          </Card>
        </div>
        <div className="stack">
          <Card title="Mes cours aujourd’hui">
            <TodayCourses state={state} teacherId={teacher.id} />
          </Card>
          <Card title="Messages récents" action={<button className="btn btn-sm" onClick={() => go('messages')}>Messagerie</button>}>
            {unread.length ? (
              unread.slice(0, 4).map((m) => (
                <div className="list-item" key={m.id} style={{ cursor: 'pointer' }} onClick={() => go(`messages/${m.from}`)}>
                  <Avatar name={byId(state.users, m.from)?.name} />
                  <div className="grow">
                    <div className="strong small">{byId(state.users, m.from)?.name}</div>
                    <div className="tiny muted ellipsis">{m.body}</div>
                  </div>
                </div>
              ))
            ) : (
              <Empty>Aucun nouveau message.</Empty>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// ================================================================ Classes

export function ClassesView({ state, user, go }) {
  const { teacher, classes, subjects } = teacherScope(state, user);
  return (
    <>
      <PageHead title="Mes classes" subtitle={`${classes.length} classe(s) · ${subjects.map((s) => s.name).join(', ')}`} />
      <div className="grid g-2">
        {classes.map((c) => {
          const students = state.students.filter((s) => s.classId === c.id);
          const ranking = classAverages(state, c.id);
          const today = state.attendance.filter((a) => a.classId === c.id && a.date === todayISO());
          return (
            <Card key={c.id}>
              <div className="row between">
                <div>
                  <h2>{c.name}</h2>
                  <div className="small muted">
                    {students.length} élèves · {c.room}
                    {c.headTeacherId === teacher.id && ' · Professeur principal'}
                  </div>
                </div>
                <Badge tone={today.length ? 'green' : 'orange'}>{today.length ? 'Appel fait' : 'Appel à faire'}</Badge>
              </div>
              <dl className="kv mt">
                {subjects.map((s) => (
                  <Row key={s.id}>
                    <dt>Moyenne {s.name}</dt>
                    <dd className="num">{formatNote(subjectClassAverage(state, c.id, s.id))}/20</dd>
                  </Row>
                ))}
                <dt>Tête de classe</dt>
                <dd>{ranking[0] ? `${fullName(ranking[0].student)} (${formatNote(ranking[0].average)})` : '—'}</dd>
              </dl>
              <div className="row mt">
                <button className="btn btn-sm" onClick={() => go(`eleves?classe=${c.id}`)}>
                  <Icon name="users" size={14} /> Élèves
                </button>
                <button className="btn btn-sm" onClick={() => go('notes')}>
                  <Icon name="chart" size={14} /> Notes
                </button>
                <button className="btn btn-sm" onClick={() => go('presences')}>
                  <Icon name="checkCircle" size={14} /> Appel
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Row({ children }) {
  return <>{children}</>;
}

// ================================================================ Élèves & fiche individuelle

export function StudentFile(props) {
  const [tab, setTab] = useState('synthese');
  const { state, user, run, studentId, onBack, backLabel = 'Retour à la liste' } = props;
  if (!canAccessStudent(state, user, studentId)) return <Empty>Accès refusé.</Empty>;
  const header = (
    <div className="row between" style={{ marginBottom: 14 }}>
      <button className="btn btn-sm btn-ghost" onClick={onBack}>
        <Icon name="chevronLeft" size={16} /> {backLabel}
      </button>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'synthese', label: 'Synthèse' }, { value: 'fiche', label: 'Fiche de vie scolaire' }]} />
    </div>
  );
  if (tab === 'fiche') {
    return (
      <>
        {header}
        <Lifebook state={state} user={user} run={run} studentId={studentId} />
      </>
    );
  }
  return <StudentSummary {...props} header={header} />;
}

function StudentSummary({ state, user, studentId, go, header }) {
  const s = byId(state.students, studentId);
  const cls = studentClass(state, s);
  const att = attendanceStats(state, studentId);
  const hws = state.homework.filter((h) => h.classId === s.classId && h.dueDate < todayISO());
  const rendered = hws.filter((h) => state.submissions.some((x) => x.homeworkId === h.id && x.studentId === studentId)).length;
  const pct = progressionPercent(state, studentId);
  const diffs = difficulties(state, studentId);
  const parents = (s.parentIds || []).map((id) => byId(state.parents, id)).filter(Boolean);
  const contacts = new Set(messageContacts(state, user).map((c) => c.id));
  const studentUser = userForPerson(state, 'eleve', s.id);
  return (
    <>
      {header}
      <Reveal className="card row between" style={{ alignItems: 'center' }}>
        <div className="row">
          <Avatar name={fullName(s)} size="lg" />
          <div>
            <h1 style={{ fontSize: 22 }}>{fullName(s)}</h1>
            <div className="small muted">
              {cls.name} · Matricule {s.matricule}
            </div>
          </div>
        </div>
        <div className="row">
          {studentUser && contacts.has(studentUser.id) && (
            <button className="btn btn-sm" onClick={() => go(`messages/${studentUser.id}`)}>
              <Icon name="message" size={14} /> Écrire à l’élève
            </button>
          )}
          {parents.map((p) => {
            const pu = userForPerson(state, 'parent', p.id);
            return pu && contacts.has(pu.id) ? (
              <button key={p.id} className="btn btn-sm" onClick={() => go(`messages/${pu.id}`)}>
                <Icon name="message" size={14} /> Écrire au parent
              </button>
            ) : null;
          })}
        </div>
      </Reveal>
      <div className="grid g-4 mt">
        <Stat label="Moyenne générale" value={formatNote(generalAverage(state, studentId))} unit="/ 20" icon="chart" tone="blue" />
        <Stat label="Absences" value={att.absent} icon="x" tone={att.absent ? 'red' : 'green'} sub={`${att.late} retard(s)`} />
        <Stat label="Devoirs rendus" value={`${rendered}/${hws.length}`} icon="edit" tone="orange" />
        <Stat label="Progression" value={pct == null ? '—' : `${pct >= 0 ? '+' : ''}${Math.round(pct)} %`} icon="trend" tone={pct >= 0 ? 'green' : 'red'} />
      </div>
      <div className="grid g-2 mt">
        <Card title="Notes par matière">
          <HBars
            rows={state.subjects.map((sub) => ({
              label: sub.name,
              value: subjectAverage(state, studentId, sub.id),
              mark: subjectClassAverage(state, cls.id, sub.id),
            }))}
          />
        </Card>
        <div className="stack">
          <Card title="Difficultés identifiées">
            {diffs.length ? (
              <div className="row">
                {diffs.map((d) => (
                  <Badge key={d.topic} tone="orange" icon="target">
                    {d.topic} ({byId(state.subjects, d.subjectId)?.short})
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="small muted">Aucune difficulté particulière détectée.</p>
            )}
          </Card>
          <Card title="Évolution">
            <LineChart points={progressionSeries(state, studentId)} height={160} />
          </Card>
          <Card title="Contacts">
            {parents.map((p) => (
              <dl className="kv" key={p.id}>
                <dt>Parent / tuteur</dt>
                <dd>
                  {p.title} {fullName(p)}
                </dd>
                <dt>Téléphone</dt>
                <dd className="num">{p.phone || '—'}</dd>
              </dl>
            ))}
            {!parents.length && <p className="small muted">Aucun parent renseigné.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

export function StudentsView({ state, user, run, params, go }) {
  const { classes, subjects } = teacherScope(state, user);
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [classId, setClassId] = useState(query?.get('classe') || classes[0]?.id);
  const [search, setSearch] = useState('');
  if (params[0]) {
    return <StudentFile state={state} user={user} run={run} studentId={params[0]} go={go} onBack={() => go('eleves')} />;
  }
  const students = state.students
    .filter((s) => s.classId === classId && fullName(s).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  return (
    <>
      <PageHead title="Mes élèves" subtitle="Cliquez sur un élève pour ouvrir sa fiche de suivi individuel." />
      <div className="row" style={{ marginBottom: 16 }}>
        <Tabs value={classId} onChange={setClassId} tabs={classes.map((c) => ({ value: c.id, label: c.name }))} />
        <input className="input input-sm" style={{ maxWidth: 240 }} placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Élève</th>
                {subjects.map((s) => (
                  <th key={s.id} className="r">
                    {s.short}
                  </th>
                ))}
                <th className="r">Moy. gén.</th>
                <th className="c">Absences</th>
                <th>Difficultés</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const att = attendanceStats(state, s.id);
                const diffs = difficulties(state, s.id);
                return (
                  <tr key={s.id} className="clickable" onClick={() => go(`eleves/${s.id}`)}>
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <Avatar name={fullName(s)} />
                        <span className="strong">{fullName(s)}</span>
                      </div>
                    </td>
                    {subjects.map((sub) => (
                      <td key={sub.id} className="r">
                        <Grade value={subjectAverage(state, s.id, sub.id)} />
                      </td>
                    ))}
                    <td className="r num strong">{formatNote(generalAverage(state, s.id))}</td>
                    <td className="c">{att.absent ? <Badge tone="red">{att.absent}</Badge> : <Badge tone="green">0</Badge>}</td>
                    <td className="small muted">{diffs.map((d) => d.topic).slice(0, 2).join(', ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!students.length && <Empty>Aucun élève.</Empty>}
        </div>
      </Card>
    </>
  );
}

// ================================================================ Devoirs : publication & correction

export function TeacherHomeworkView({ state, user, run }) {
  const { teacher, classes, subjects } = teacherScope(state, user);
  const [creating, setCreating] = useState(false);
  const [grading, setGrading] = useState(null);
  const list = state.homework
    .filter((h) => h.teacherId === teacher.id && canTeach(state, user, h.classId, h.subjectId))
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  return (
    <>
      <PageHead title="Devoirs" subtitle="Publiez des devoirs et corrigez les copies remises en ligne.">
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> Publier un devoir
        </button>
      </PageHead>
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Devoir</th>
                <th>Classe</th>
                <th>À rendre le</th>
                <th className="c">Remis</th>
                <th className="c">À corriger</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((h) => {
                const subs = state.submissions.filter((s) => s.homeworkId === h.id);
                const total = state.students.filter((s) => s.classId === h.classId).length;
                const toGrade = subs.filter((s) => s.grade == null).length;
                return (
                  <tr key={h.id}>
                    <td>
                      <div className="strong">{h.title}</div>
                      <div className="tiny muted">{byId(state.subjects, h.subjectId)?.name}</div>
                    </td>
                    <td>{byId(state.classes, h.classId)?.name}</td>
                    <td className="nowrap">
                      {formatDate(h.dueDate)} {h.dueDate < todayISO() ? <Badge>Échu</Badge> : <Badge tone="blue">En cours</Badge>}
                    </td>
                    <td className="c num">
                      {subs.length}/{total}
                    </td>
                    <td className="c">{toGrade ? <Badge tone="orange">{toGrade}</Badge> : <Badge tone="green">0</Badge>}</td>
                    <td className="r">
                      <button className="btn btn-sm" onClick={() => setGrading(h)} disabled={!subs.length}>
                        Corriger
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!list.length && <Empty>Aucun devoir publié.</Empty>}
        </div>
      </Card>
      {creating && <PublishModal state={state} run={run} classes={classes} subjects={subjects} onClose={() => setCreating(false)} />}
      {grading && <GradeModal state={state} run={run} homework={grading} onClose={() => setGrading(null)} />}
    </>
  );
}

function PublishModal({ run, classes, subjects, onClose }) {
  const [form, setForm] = useState({ classId: classes[0]?.id, subjectId: subjects[0]?.id, title: '', description: '', dueDate: '', attachment: '' });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const submit = () => {
    const res = run(A.publishHomework, form, 'Devoir publié : les élèves et parents sont notifiés.');
    if (res.ok) onClose();
  };
  return (
    <Modal
      title="Publier un devoir"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Publier
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Classe">
          <Select value={form.classId} onChange={set('classId')} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Matière">
          <Select value={form.subjectId} onChange={set('subjectId')} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        </Field>
        <Field label="Titre" full>
          <input className="input" value={form.title} onChange={set('title')} />
        </Field>
        <Field label="Consignes" full>
          <textarea className="textarea" value={form.description} onChange={set('description')} />
        </Field>
        <Field label="Date limite">
          <input className="input" type="date" min={todayISO()} value={form.dueDate} onChange={set('dueDate')} />
        </Field>
        <Field label="Pièce jointe">
          <input className="input" type="file" style={{ paddingTop: 8 }} onChange={(e) => set('attachment')(e.target.files?.[0]?.name || '')} />
        </Field>
      </div>
    </Modal>
  );
}

function GradeModal({ state, run, homework, onClose }) {
  const subs = state.submissions.filter((s) => s.homeworkId === homework.id);
  const [values, setValues] = useState(Object.fromEntries(subs.map((s) => [s.id, { grade: s.grade ?? '', feedback: s.feedback || '' }])));
  const save = (subId) => run(A.gradeSubmission, { submissionId: subId, ...values[subId] }, 'Correction enregistrée.');
  return (
    <Modal title={`Correction — ${homework.title}`} onClose={onClose} wide footer={<button className="btn btn-primary" onClick={onClose}>Terminer</button>}>
      <div className="stack" style={{ gap: 0 }}>
        {subs.map((s) => {
          const st = byId(state.students, s.studentId);
          return (
            <div key={s.id} className="list-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px' }}>
                <div className="strong">{fullName(st)}</div>
                <div className="tiny muted">
                  Remis le {formatDate(s.submittedAt)}
                  {s.history?.length > 1 && ` · ${s.history.length} événements (${s.history.map((h) => (h.event === 'correction' ? 'corrigé' : h.event === 'modification' ? 'modifié' : 'déposé')).join(' → ')})`}
                </div>
                <p className="small" style={{ marginTop: 6 }}>
                  {s.content}
                </p>
                {s.fileName && (
                  <Badge icon="file">{s.fileName}</Badge>
                )}
              </div>
              <div className="row" style={{ flex: '1 1 320px', alignItems: 'flex-end' }}>
                <Field label="Note /20">
                  <input
                    className="input input-sm grade-input"
                    inputMode="decimal"
                    value={values[s.id].grade}
                    onChange={(e) => setValues((v) => ({ ...v, [s.id]: { ...v[s.id], grade: e.target.value } }))}
                  />
                </Field>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <Field label="Commentaire">
                    <input
                      className="input input-sm"
                      value={values[s.id].feedback}
                      onChange={(e) => setValues((v) => ({ ...v, [s.id]: { ...v[s.id], feedback: e.target.value } }))}
                    />
                  </Field>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => save(s.id)}>
                  {s.grade != null ? 'Mettre à jour' : 'Valider'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ================================================================ Notes : saisie

export function GradesView({ state, user, run, notify }) {
  const allowedClasses = user.role === 'admin' ? state.classes : teacherScope(state, user).classes;
  const allowedSubjects = user.role === 'admin' ? state.subjects : teacherScope(state, user).subjects;
  const [classId, setClassId] = useState(allowedClasses[0]?.id);
  const [subjectId, setSubjectId] = useState(allowedSubjects[0]?.id);
  const [creating, setCreating] = useState(false);
  const [edits, setEdits] = useState({});

  const evals = state.evaluations
    .filter((e) => e.classId === classId && e.subjectId === subjectId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const students = state.students.filter((s) => s.classId === classId).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const dirty = Object.keys(edits).length > 0;

  const valueOf = (ev, sid) =>
    edits[ev.id]?.[sid] !== undefined ? edits[ev.id][sid] : ev.scores[sid] == null ? '' : String(ev.scores[sid]).replace('.', ',');
  const setValue = (evId, sid, v) => setEdits((e) => ({ ...e, [evId]: { ...(e[evId] || {}), [sid]: v } }));
  const saveAll = () => {
    for (const [evaluationId, scores] of Object.entries(edits)) {
      const res = run(A.setScores, { evaluationId, scores });
      if (!res.ok) return;
    }
    setEdits({});
    notify('Notes enregistrées.');
  };

  return (
    <>
      <PageHead title="Notes" subtitle="Saisissez et modifiez les notes de vos évaluations.">
        {dirty && (
          <button className="btn" onClick={() => setEdits({})}>
            Annuler
          </button>
        )}
        <button className="btn btn-success" onClick={saveAll} disabled={!dirty}>
          <Icon name="check" size={16} /> Enregistrer
        </button>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={16} /> Nouvelle évaluation
        </button>
      </PageHead>
      <div className="row" style={{ marginBottom: 16 }}>
        <Tabs value={classId} onChange={(v) => { setClassId(v); setEdits({}); }} tabs={allowedClasses.map((c) => ({ value: c.id, label: c.name }))} />
        {allowedSubjects.length > 1 && (
          <Select className="select input-sm" style={{ width: 200 }} value={subjectId} onChange={(v) => { setSubjectId(v); setEdits({}); }} options={allowedSubjects.map((s) => ({ value: s.id, label: s.name }))} />
        )}
      </div>
      <Card flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="sticky">Élève</th>
                {evals.map((e) => (
                  <th key={e.id} className="c" title={e.title}>
                    {formatDate(e.date)}
                    <div className="tiny" style={{ textTransform: 'none', letterSpacing: 0 }}>
                      {e.topic || e.type} · coef {e.coef}
                    </div>
                  </th>
                ))}
                <th className="r">Moyenne</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="strong nowrap sticky">{fullName(s)}</td>
                  {evals.map((e) => (
                    <td key={e.id} className="c">
                      <input
                        className="input input-sm grade-input num"
                        inputMode="decimal"
                        aria-label={`Note de ${fullName(s)} — ${e.title}`}
                        value={valueOf(e, s.id)}
                        onChange={(ev) => setValue(e.id, s.id, ev.target.value)}
                        style={edits[e.id]?.[s.id] !== undefined ? { borderColor: 'var(--orange)' } : undefined}
                      />
                    </td>
                  ))}
                  <td className="r">
                    <Grade value={subjectAverage(state, s.id, subjectId)} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="muted small sticky">Moyenne de la classe</td>
                {evals.map((e) => {
                  const vals = Object.values(e.scores);
                  return (
                    <td key={e.id} className="c num small muted">
                      {vals.length ? formatNote(vals.reduce((a, b) => a + b, 0) / vals.length) : '—'}
                    </td>
                  );
                })}
                <td className="r num strong">{formatNote(subjectClassAverage(state, classId, subjectId))}</td>
              </tr>
            </tbody>
          </table>
          {!evals.length && <Empty>Aucune évaluation. Créez-en une pour saisir des notes.</Empty>}
        </div>
      </Card>
      <p className="tiny muted mt">Les notes vont de 0 à 20 (décimales acceptées, ex. 14,5). Laissez vide pour « non noté ».</p>
      {creating && (
        <NewEvaluationModal
          run={run}
          classId={classId}
          subjectId={subjectId}
          className={byId(state.classes, classId)?.name}
          subjectName={byId(state.subjects, subjectId)?.name}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

function NewEvaluationModal({ run, classId, subjectId, className, subjectName, onClose }) {
  const [form, setForm] = useState({ title: '', type: 'Interrogation', topic: '', coef: 1, date: todayISO() });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const submit = () => {
    const res = run(A.createEvaluation, { ...form, classId, subjectId, title: form.title || `${form.type} — ${form.topic || subjectName}` }, 'Évaluation créée.');
    if (res.ok) onClose();
  };
  return (
    <Modal
      title={`Nouvelle évaluation — ${subjectName} · ${className}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Créer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Type">
          <Select value={form.type} onChange={set('type')} options={['Interrogation', 'Devoir surveillé', 'Composition', 'Exposé'].map((v) => ({ value: v, label: v }))} />
        </Field>
        <Field label="Notion évaluée">
          <input className="input" value={form.topic} onChange={set('topic')} placeholder="ex. Fractions" />
        </Field>
        <Field label="Intitulé (optionnel)" full>
          <input className="input" value={form.title} onChange={set('title')} />
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={form.date} onChange={set('date')} />
        </Field>
        <Field label="Coefficient">
          <Select value={String(form.coef)} onChange={set('coef')} options={[1, 2, 3].map((v) => ({ value: String(v), label: String(v) }))} />
        </Field>
      </div>
    </Modal>
  );
}

// ================================================================ Progression / performances

export function TeacherProgressionView({ state, user, go }) {
  const { classes, subjects } = teacherScope(state, user);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id);
  const [classId, setClassId] = useState(classes[0]?.id);
  const students = state.students.filter((s) => s.classId === classId);
  const series = useMemo(() => {
    // Moyenne de la classe dans la matière, évaluation après évaluation.
    return state.evaluations
      .filter((e) => e.classId === classId && e.subjectId === subjectId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => {
        const v = Object.values(e.scores);
        return { date: e.date, value: v.reduce((a, b) => a + b, 0) / (v.length || 1) };
      });
  }, [state.evaluations, classId, subjectId]);
  const topics = useMemo(() => {
    const out = {};
    for (const e of state.evaluations.filter((e) => e.classId === classId && e.subjectId === subjectId)) {
      const v = Object.values(e.scores);
      out[e.topic] = out[e.topic] || [];
      out[e.topic].push(...v);
    }
    return Object.entries(out)
      .map(([topic, v]) => ({ label: topic || 'Autre', value: v.reduce((a, b) => a + b, 0) / v.length }))
      .sort((a, b) => a.value - b.value);
  }, [state.evaluations, classId, subjectId]);
  const rows = students
    .map((s) => {
      const pts = progressionSeries(state, s.id, subjectId);
      return { s, avg: subjectAverage(state, s.id, subjectId), delta: pts.length > 1 ? pts[pts.length - 1].value - pts[0].value : null };
    })
    .sort((a, b) => (b.delta ?? -99) - (a.delta ?? -99));

  return (
    <>
      <PageHead title="Progression & performances" subtitle="Suivez l’évolution de vos classes et repérez les notions à retravailler." />
      <div className="row" style={{ marginBottom: 16 }}>
        <Tabs value={classId} onChange={setClassId} tabs={classes.map((c) => ({ value: c.id, label: c.name }))} />
        {subjects.length > 1 && (
          <Select className="select input-sm" style={{ width: 200 }} value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        )}
      </div>
      <div className="grid g-2">
        <Card title="Moyenne de la classe par évaluation">
          <LineChart points={series} height={200} />
        </Card>
        <Card title="Réussite par notion">
          <HBars rows={topics} />
        </Card>
      </div>
      <Card className="mt" title="Évolution individuelle" flush>
        <table className="table">
          <thead>
            <tr>
              <th>Élève</th>
              <th className="r">Moyenne</th>
              <th className="r">Évolution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, avg, delta }) => (
              <tr key={s.id} className="clickable" onClick={() => go(`eleves/${s.id}`)}>
                <td className="strong">{fullName(s)}</td>
                <td className="r">
                  <Grade value={avg} />
                </td>
                <td className="r num" style={{ color: delta == null ? undefined : delta >= 0 ? 'var(--green-700)' : 'var(--red-700)' }}>
                  {delta == null ? '—' : `${delta >= 0 ? '▲ +' : '▼ '}${formatNote(delta)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ================================================================ Présences : faire l'appel

export function RollCallView({ state, user, run }) {
  const classes = user.role === 'admin' ? state.classes : teacherScope(state, user).classes;
  const [classId, setClassId] = useState(classes[0]?.id);
  const [date, setDate] = useState(todayISO());
  const students = state.students.filter((s) => s.classId === classId).sort((a, b) => a.lastName.localeCompare(b.lastName));
  const existing = Object.fromEntries(
    state.attendance.filter((a) => a.classId === classId && a.date === date).map((a) => [a.studentId, a]),
  );
  const [entries, setEntries] = useState({});
  const key = `${classId}-${date}`;
  const [loadedKey, setLoadedKey] = useState(null);
  if (loadedKey !== key) {
    setLoadedKey(key);
    setEntries(
      Object.fromEntries(
        students.map((s) => [s.id, { status: existing[s.id]?.status || 'present', arrival: existing[s.id]?.arrival || '' }]),
      ),
    );
  }
  const counts = Object.values(entries).reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + 1 }), {});
  const setStatus = (sid, status) =>
    setEntries((e) => ({ ...e, [sid]: { ...e[sid], status, arrival: status === 'retard' && !e[sid].arrival ? new Date().toTimeString().slice(0, 5) : e[sid].arrival } }));
  const save = () =>
    run(A.saveAttendance, { classId, date, entries }, `Appel enregistré : ${counts.present || 0} présent(s), ${counts.absent || 0} absent(s), ${counts.retard || 0} retard(s).`);
  const done = Object.keys(existing).length > 0;

  return (
    <>
      <PageHead title="Présences" subtitle="Faites l’appel : les parents sont informés des absences et retards.">
        <button className="btn btn-success" onClick={save}>
          <Icon name="check" size={16} /> {done ? 'Mettre à jour l’appel' : 'Valider l’appel'}
        </button>
      </PageHead>
      <div className="row" style={{ marginBottom: 16 }}>
        <Tabs value={classId} onChange={setClassId} tabs={classes.map((c) => ({ value: c.id, label: c.name }))} />
        <input className="input input-sm" type="date" style={{ width: 170 }} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        {done ? <Badge tone="green" icon="check">Appel déjà enregistré</Badge> : <Badge tone="orange">Appel non fait</Badge>}
      </div>
      <div className="grid g-3" style={{ marginBottom: 16 }}>
        <Stat label="Présents" value={counts.present || 0} icon="check" tone="green" />
        <Stat label="Absents" value={counts.absent || 0} icon="x" tone="red" />
        <Stat label="Retards" value={counts.retard || 0} icon="clock" tone="orange" />
      </div>
      <Card flush>
        <div className="row between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)' }}>
          <span className="small muted">{students.length} élèves</span>
          <button className="btn btn-sm" onClick={() => setEntries(Object.fromEntries(students.map((s) => [s.id, { status: 'present', arrival: '' }])))}>
            Tous présents
          </button>
        </div>
        <table className="table">
          <tbody>
            {students.map((s) => {
              const e = entries[s.id] || { status: 'present' };
              return (
                <tr key={s.id}>
                  <td>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <Avatar name={fullName(s)} />
                      <span className="strong">{fullName(s)}</span>
                    </div>
                  </td>
                  <td className="r">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      {e.status === 'retard' && (
                        <input
                          className="input input-sm"
                          type="time"
                          style={{ width: 110 }}
                          value={e.arrival || ''}
                          aria-label="Heure d’arrivée"
                          onChange={(ev) => setEntries((x) => ({ ...x, [s.id]: { ...x[s.id], arrival: ev.target.value } }))}
                        />
                      )}
                      <div className="att-btns" role="group" aria-label={`Présence de ${fullName(s)}`}>
                        {[
                          ['present', 'Présent'],
                          ['absent', 'Absent'],
                          ['retard', 'Retard'],
                        ].map(([k, label]) => (
                          <button key={k} className={e.status === k ? `on-${k}` : ''} onClick={() => setStatus(s.id, k)} aria-pressed={e.status === k}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="tiny muted mt">
        Historique : <AttendanceBadge status="present" /> <AttendanceBadge status="absent" /> <AttendanceBadge status="retard" /> — consultable par les parents dans leur espace.
      </p>
    </>
  );
}

export { teacherScope };
