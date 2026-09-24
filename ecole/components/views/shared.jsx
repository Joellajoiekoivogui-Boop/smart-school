'use client';
/**
 * Vues partagées entre plusieurs espaces (élève, parent, enseignant, admin).
 * Toutes reçoivent les props du Shell : state, user, run, role, studentId, params, go.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../Icon';
import { Avatar, Badge, Bar, Card, Empty, Field, Grade, HBars, LineChart, Modal, PageHead, Ring, Select, Stat, Tabs } from '../ui';
import {
  attendanceStats,
  byId,
  difficulties,
  formatDate,
  formatMoney,
  formatNote,
  fullName,
  lastExit,
  notificationsFor,
  paymentStatus,
  progressionPercent,
  progressionSeries,
  reportCard,
  round1,
  studentClass,
  studentHomework,
  subjectAverage,
  subjectClassAverage,
  teacherName,
  timeAgo,
  classRank,
  generalAverage,
  userForPerson,
} from '@/lib/compute';
import { canAccessStudent, messageContacts, can } from '@/lib/permissions';
import { DAYS, TIME_SLOTS, toISODate } from '@/lib/seed';
import * as A from '@/lib/actions';

export const todayISO = () => toISODate(new Date());

function StudentGuard({ state, user, studentId, children }) {
  if (!studentId || !canAccessStudent(state, user, studentId)) {
    return <Empty>Vous n’avez pas accès à cet élève.</Empty>;
  }
  return children;
}

// ================================================================ Emploi du temps

export function TimetableGrid({ state, classId, teacherId, editable, onChange }) {
  const slots = state.timetable.filter((t) => (classId ? t.classId === classId : t.teacherId === teacherId));
  const now = new Date();
  const today = now.getDay() - 1;
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="table-wrap">
      <div className="tt">
        <div />
        {DAYS.map((d, i) => (
          <div className="tt-h" key={d} style={i === today ? { color: 'var(--blue)' } : undefined}>
            {d}
          </div>
        ))}
        {TIME_SLOTS.map((ts, slot) => (
          <Row key={slot}>
            <div className="tt-time">
              {ts.start}
              <br />
              <span className="muted">{ts.end}</span>
            </div>
            {DAYS.map((_, day) => {
              const entry = slots.find((s) => s.day === day && s.slot === slot);
              const subject = entry && byId(state.subjects, entry.subjectId);
              const isNow = day === today && hm >= ts.start && hm < ts.end;
              if (editable) {
                return (
                  <div key={day} className={`tt-cell ${entry ? '' : 'empty-cell'}`}>
                    <select
                      aria-label={`${DAYS[day]} ${ts.start}`}
                      value={entry?.subjectId || ''}
                      onChange={(e) => onChange(day, slot, e.target.value)}
                    >
                      <option value="">— Libre —</option>
                      {state.subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {entry && <div className="tiny muted">{teacherName(state, entry.teacherId)}</div>}
                  </div>
                );
              }
              return entry ? (
                <div key={day} className={`tt-cell ${isNow ? 'now' : ''}`}>
                  <div className="strong">{subject?.name}</div>
                  <div className="tiny muted">
                    {classId ? teacherName(state, entry.teacherId) : byId(state.classes, entry.classId)?.name} · {entry.room}
                  </div>
                </div>
              ) : (
                <div key={day} className="tt-cell empty-cell" />
              );
            })}
          </Row>
        ))}
      </div>
    </div>
  );
}

function Row({ children }) {
  return <>{children}</>;
}

export function TimetableView({ state, user, role, studentId }) {
  const student = studentId && byId(state.students, studentId);
  const teacherId = role === 'enseignant' ? user.personId : null;
  return (
    <>
      <PageHead
        title="Emploi du temps"
        subtitle={student ? `${fullName(student)} — ${studentClass(state, student)?.name}` : 'Vos cours de la semaine'}
      />
      <Card>
        <TimetableGrid state={state} classId={student?.classId} teacherId={teacherId} />
      </Card>
    </>
  );
}

// ================================================================ Messagerie

export function MessagesView({ state, user, run, params, go }) {
  const contacts = messageContacts(state, user);
  const threads = useMemo(() => {
    const map = new Map();
    for (const m of state.messages) {
      if (m.from !== user.id && m.to !== user.id) continue;
      const other = m.from === user.id ? m.to : m.from;
      const cur = map.get(other);
      if (!cur || cur.at < m.at) map.set(other, m);
    }
    return map;
  }, [state.messages, user.id]);

  const people = useMemo(() => {
    const ids = new Set([...threads.keys(), ...contacts.map((c) => c.id)]);
    return [...ids]
      .map((id) => byId(state.users, id))
      .filter(Boolean)
      .sort((a, b) => (threads.get(b.id)?.at || '').localeCompare(threads.get(a.id)?.at || '') || a.name.localeCompare(b.name));
  }, [threads, contacts, state.users]);

  const [query, setQuery] = useState('');
  const activeId = params[0] || people[0]?.id;
  const active = byId(state.users, activeId);
  const canWrite = contacts.some((c) => c.id === activeId);
  const conversation = state.messages
    .filter((m) => (m.from === user.id && m.to === activeId) || (m.to === user.id && m.from === activeId))
    .sort((a, b) => a.at.localeCompare(b.at));
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  const hasUnread = conversation.some((m) => m.to === user.id && !m.read);
  useEffect(() => {
    if (activeId && hasUnread) run(A.markThreadRead, { otherId: activeId });
  }, [activeId, hasUnread, run]);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [conversation.length, activeId]);

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const res = run(A.sendMessage, { to: activeId, body: draft });
    if (res.ok) setDraft('');
  };

  const roleLabel = (u) => {
    if (u.role === 'enseignant') {
      const t = byId(state.teachers, u.personId);
      return `Enseignant · ${t?.subjectIds.map((id) => byId(state.subjects, id)?.name).join(', ')}`;
    }
    if (u.role === 'eleve') return `Élève · ${studentClass(state, byId(state.students, u.personId))?.name || ''}`;
    if (u.role === 'parent') {
      const p = byId(state.parents, u.personId);
      return `Parent de ${p?.childrenIds.map((id) => byId(state.students, id)?.firstName).join(', ')}`;
    }
    return 'Administration';
  };

  const filtered = people.filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <PageHead title="Messages" subtitle="Échangez directement avec les membres de l’établissement." />
      <Card flush>
        <div className="chat">
          <div className="chat-list">
            <div style={{ padding: 12, borderBottom: '1px solid var(--gray-100)' }}>
              <input className="input input-sm" placeholder="Rechercher un contact…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {filtered.map((p) => {
              const last = threads.get(p.id);
              const unread = state.messages.filter((m) => m.from === p.id && m.to === user.id && !m.read).length;
              return (
                <button key={p.id} className={`chat-contact ${p.id === activeId ? 'active' : ''}`} onClick={() => go(`messages/${p.id}`)}>
                  <Avatar name={p.name} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row between" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <span className="strong ellipsis small">{p.name}</span>
                      {unread > 0 && <span className="badge badge-red">{unread}</span>}
                    </div>
                    <div className="tiny muted ellipsis">{last ? last.body : roleLabel(p)}</div>
                  </div>
                </button>
              );
            })}
            {!filtered.length && <Empty>Aucun contact.</Empty>}
          </div>
          <div className="chat-thread">
            {active ? (
              <>
                <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                  <Avatar name={active.name} />
                  <div>
                    <div className="strong">{active.name}</div>
                    <div className="tiny muted">{roleLabel(active)}</div>
                  </div>
                </div>
                <div className="chat-messages">
                  {conversation.map((m) => (
                    <div key={m.id} className={`bubble ${m.from === user.id ? 'mine' : ''}`}>
                      {m.body}
                      <div className="bubble-time">{timeAgo(m.at)}</div>
                    </div>
                  ))}
                  {!conversation.length && <Empty>Démarrez la conversation avec {active.name}.</Empty>}
                  <div ref={endRef} />
                </div>
                {canWrite ? (
                  <form className="chat-compose" onSubmit={send}>
                    <input className="input" placeholder="Écrire un message…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Message" />
                    <button className="btn btn-primary" type="submit" disabled={!draft.trim()}>
                      <Icon name="send" size={16} /> Envoyer
                    </button>
                  </form>
                ) : (
                  <div className="chat-compose small muted">Vous ne pouvez plus écrire à ce contact.</div>
                )}
              </>
            ) : (
              <Empty>Sélectionnez un contact.</Empty>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

// ================================================================ Notifications & annonces

const NOTIF_STYLE = {
  annonce: ['megaphone', 'blue'],
  message: ['message', 'navy'],
  note: ['chart', 'green'],
  devoir: ['edit', 'orange'],
  absence: ['alert', 'red'],
  retard: ['clock', 'orange'],
  paiement: ['wallet', 'red'],
};

export function AnnouncementComposer({ state, user, run, classes, allowAll }) {
  const [target, setTarget] = useState(allowAll ? 'tous' : `classe:${classes[0]?.id}`);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const options = [
    ...(allowAll
      ? [
          { value: 'tous', label: 'Tout l’établissement' },
          { value: 'eleves', label: 'Tous les élèves' },
          { value: 'parents', label: 'Tous les parents' },
          { value: 'enseignants', label: 'Tous les enseignants' },
        ]
      : []),
    ...classes.map((c) => ({ value: `classe:${c.id}`, label: `Classe ${c.name}` })),
    ...(allowAll ? classes.map((c) => ({ value: `parents-classe:${c.id}`, label: `Parents de la ${c.name}` })) : []),
  ];
  const submit = (e) => {
    e.preventDefault();
    let t;
    if (target.startsWith('classe:')) t = { type: 'classe', classId: target.slice(7) };
    else if (target.startsWith('parents-classe:')) {
      const classId = target.slice(15);
      const parentIds = new Set(state.students.filter((s) => s.classId === classId).flatMap((s) => s.parentIds || []));
      t = {
        type: 'groupe',
        label: `Parents de la ${byId(state.classes, classId)?.name}`,
        userIds: [...parentIds].map((id) => userForPerson(state, 'parent', id)?.id).filter(Boolean),
      };
    } else t = { type: target };
    const res = run(A.sendAnnouncement, { target: t, title, body }, 'Annonce envoyée.');
    if (res.ok) {
      setTitle('');
      setBody('');
    }
  };
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
      <Field label="Destinataires">
        <Select value={target} onChange={setTarget} options={options} />
      </Field>
      <Field label="Titre">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="Message">
        <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} required />
      </Field>
      <button className="btn btn-primary" type="submit">
        <Icon name="megaphone" size={16} /> Envoyer l’annonce
      </button>
    </form>
  );
}

export function targetLabel(state, t) {
  if (t.type === 'tous') return 'Tout l’établissement';
  if (t.type === 'eleves') return 'Tous les élèves';
  if (t.type === 'parents') return 'Tous les parents';
  if (t.type === 'enseignants') return 'Tous les enseignants';
  if (t.type === 'classe') return `Classe ${byId(state.classes, t.classId)?.name || ''}`;
  return t.label || 'Groupe';
}

export function NotificationsView({ state, user, run, role }) {
  const items = notificationsFor(state, user);
  const unread = items.filter((n) => !n.read);
  const teacher = role === 'enseignant' ? byId(state.teachers, user.personId) : null;
  const list = (
    <Card
      title={`Notifications${unread.length ? ` (${unread.length} non lue${unread.length > 1 ? 's' : ''})` : ''}`}
      action={
        unread.length > 0 && (
          <button className="btn btn-sm" onClick={() => run(A.markNotificationsRead, { ids: unread.map((n) => n.id) })}>
            <Icon name="check" size={14} /> Tout marquer comme lu
          </button>
        )
      }
    >
      {items.length ? (
        items.map((n) => {
          const [icon, tone] = NOTIF_STYLE[n.kind] || ['bell', 'blue'];
          return (
            <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
              <span className={`notif-icon tone-${tone}`}>
                <Icon name={icon} size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ flexWrap: 'nowrap' }}>
                  <span className="notif-title">{n.title}</span>
                  {!n.read && <span className="dot" style={{ background: 'var(--blue)' }} aria-label="non lue" />}
                </div>
                <p className="small muted">{n.body}</p>
                <p className="tiny muted">{timeAgo(n.at)}</p>
              </div>
            </div>
          );
        })
      ) : (
        <Empty>Aucune notification.</Empty>
      )}
    </Card>
  );
  if (!teacher) {
    return (
      <>
        <PageHead title="Notifications" subtitle="Les informations importantes de l’école et de votre scolarité." />
        {list}
      </>
    );
  }
  const sent = state.announcements.filter((a) => a.authorId === user.id).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <PageHead title="Annonces & notifications" subtitle="Envoyez une annonce à une classe et suivez vos notifications." />
      <div className="grid g-main">
        {list}
        <div className="stack">
          <Card title="Nouvelle annonce à une classe">
            <AnnouncementComposer state={state} user={user} run={run} classes={state.classes.filter((c) => teacher.classIds.includes(c.id))} />
          </Card>
          <Card title="Mes annonces envoyées">
            {sent.length ? (
              sent.map((a) => (
                <div key={a.id} className="list-item">
                  <div className="grow">
                    <div className="strong small">{a.title}</div>
                    <div className="tiny muted">
                      {targetLabel(state, a.target)} · {timeAgo(a.at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Empty>Aucune annonce envoyée.</Empty>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// ================================================================ Résultats & bulletins

export function BulletinModal({ state, studentId, termId, onClose }) {
  const rc = reportCard(state, studentId, termId);
  const head = rc.cls && byId(state.teachers, rc.cls.headTeacherId);
  return (
    <Modal
      title={`Bulletin — ${rc.term?.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Icon name="download" size={16} /> Télécharger / imprimer (PDF)
          </button>
        </>
      }
    >
      <div className="bulletin print-area">
        <div className="bulletin-head">
          <div>
            <h2>{state.school.name}</h2>
            <div className="small">
              {state.school.city} · Année scolaire {state.school.year}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="strong">BULLETIN DE NOTES</div>
            <div className="small">{rc.term?.name}</div>
          </div>
        </div>
        <div className="row between mt">
          <div>
            <div className="strong" style={{ fontSize: 16 }}>
              {fullName(rc.student)}
            </div>
            <div className="small">
              Matricule {rc.student.matricule} · Né(e) le {formatDate(rc.student.birthDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="small" style={{ textAlign: 'right' }}>
            Classe : <strong>{rc.cls.name}</strong>
            <br />
            Professeur principal : {head ? `${head.gender === 'F' ? 'Mme' : 'M.'} ${fullName(head)}` : '—'}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Matière</th>
              <th>Coef.</th>
              <th>Moyenne</th>
              <th>Moy. classe</th>
              <th>Points</th>
              <th>Enseignant</th>
              <th>Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {rc.lines.map((l) => (
              <tr key={l.subject.id}>
                <td>{l.subject.name}</td>
                <td>{l.subject.coef}</td>
                <td className="strong">{formatNote(l.average)}</td>
                <td>{formatNote(l.classAverage)}</td>
                <td>{l.points == null ? '—' : formatNote(l.points)}</td>
                <td>{l.teacher}</td>
                <td>{l.appreciation}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bulletin-summary">
          <div>
            <div className="tiny">Moyenne générale</div>
            <div className="strong" style={{ fontSize: 18 }}>
              {formatNote(rc.average)}/20
            </div>
          </div>
          <div>
            <div className="tiny">Rang</div>
            <div className="strong" style={{ fontSize: 18 }}>
              {rc.rank ? `${rc.rank.rank}${rc.rank.rank === 1 ? 'er' : 'e'} / ${rc.rank.size}` : '—'}
            </div>
          </div>
          <div>
            <div className="tiny">Moyenne de la classe</div>
            <div className="strong" style={{ fontSize: 18 }}>
              {formatNote(rc.classAverage)}
            </div>
          </div>
          <div>
            <div className="tiny">Absences / retards</div>
            <div className="strong" style={{ fontSize: 18 }}>
              {rc.attendance.absent} / {rc.attendance.late}
            </div>
          </div>
        </div>
        <p className="mt small">
          <strong>Appréciation générale :</strong> {rc.appreciation}.{' '}
          {rc.average >= 12 ? 'Travail sérieux, à poursuivre.' : rc.average >= 10 ? 'Des efforts à fournir pour progresser.' : 'Travail insuffisant, un suivi est nécessaire.'}
        </p>
        <div className="row between mt small" style={{ marginTop: 32 }}>
          <span>Le professeur principal</span>
          <span>La direction</span>
        </div>
      </div>
    </Modal>
  );
}

export function ResultsView({ state, user, studentId }) {
  const [subjectId, setSubjectId] = useState(null);
  const [bulletin, setBulletin] = useState(false);
  if (!canAccessStudent(state, user, studentId)) return <Empty>Accès refusé.</Empty>;
  const student = byId(state.students, studentId);
  const cls = studentClass(state, student);
  const termId = state.school.currentTermId;
  const avg = generalAverage(state, studentId, { termId });
  const rank = classRank(state, studentId, { termId });
  const rows = state.subjects.map((s) => ({
    subject: s,
    avg: subjectAverage(state, studentId, s.id, { termId }),
    classAvg: subjectClassAverage(state, cls.id, s.id, { termId }),
  }));
  const selected = subjectId && byId(state.subjects, subjectId);
  const evals = state.evaluations
    .filter((e) => e.scores[studentId] != null && (!subjectId || e.subjectId === subjectId))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHead title="Résultats" subtitle={`${fullName(student)} — ${cls.name} · ${byId(state.school.terms, termId)?.name}`}>
        <button className="btn btn-primary" onClick={() => setBulletin(true)}>
          <Icon name="file" size={16} /> Voir le bulletin
        </button>
      </PageHead>
      <div className="grid g-3">
        <Stat label="Moyenne générale" value={formatNote(avg)} unit="/ 20" icon="chart" tone="blue" sub={`Moyenne de la classe : ${formatNote(classRankAvg(state, cls.id, termId))}`} />
        <Stat label="Rang dans la classe" value={rank ? `${rank.rank}${rank.rank === 1 ? 'er' : 'e'}` : '—'} unit={rank ? `/ ${rank.size}` : ''} icon="target" tone="green" />
        <Stat label="Évaluations notées" value={evals.length} icon="file" tone="navy" sub={selected ? selected.name : 'Toutes matières'} />
      </div>
      <div className="grid g-2 mt">
        <Card title="Moyennes par matière">
          <HBars rows={rows.map((r) => ({ label: r.subject.name, value: r.avg, mark: r.classAvg }))} />
        </Card>
        <Card flush title="Détail par matière">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th className="c">Coef.</th>
                  <th className="r">Moyenne</th>
                  <th className="r">Classe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.subject.id} className="clickable" onClick={() => setSubjectId(r.subject.id === subjectId ? null : r.subject.id)}>
                    <td className={r.subject.id === subjectId ? 'strong' : ''}>{r.subject.name}</td>
                    <td className="c">{r.subject.coef}</td>
                    <td className="r">
                      <Grade value={r.avg} />
                    </td>
                    <td className="r muted num">{formatNote(r.classAvg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <Card
        className="mt"
        title={selected ? `Notes — ${selected.name}` : 'Toutes les notes'}
        action={selected && <button className="btn btn-sm" onClick={() => setSubjectId(null)}>Toutes les matières</button>}
        flush
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Matière</th>
                <th>Évaluation</th>
                <th className="c">Coef.</th>
                <th className="r">Note</th>
              </tr>
            </thead>
            <tbody>
              {evals.map((e) => (
                <tr key={e.id}>
                  <td className="nowrap muted">{formatDate(e.date)}</td>
                  <td>{byId(state.subjects, e.subjectId)?.name}</td>
                  <td>{e.title}</td>
                  <td className="c">{e.coef}</td>
                  <td className="r">
                    <Grade value={e.scores[studentId]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!evals.length && <Empty>Aucune note pour le moment.</Empty>}
        </div>
      </Card>
      {bulletin && <BulletinModal state={state} studentId={studentId} termId={termId} onClose={() => setBulletin(false)} />}
    </>
  );
}

function classRankAvg(state, classId, termId) {
  const avgs = state.students
    .filter((s) => s.classId === classId)
    .map((s) => generalAverage(state, s.id, { termId }))
    .filter((a) => a != null);
  return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
}

export function BulletinsView({ state, user, studentId }) {
  const [termId, setTermId] = useState(null);
  const student = byId(state.students, studentId);
  return (
    <StudentGuard state={state} user={user} studentId={studentId}>
      <PageHead title="Bulletins" subtitle={`${fullName(student)} — année ${state.school.year}`} />
      <div className="grid g-3">
        {state.school.terms.map((t) => {
          const avg = generalAverage(state, studentId, { termId: t.id });
          const available = avg != null;
          return (
            <Card key={t.id}>
              <div className="row between">
                <h3>{t.name}</h3>
                {available ? (
                  <Badge tone={t.id === state.school.currentTermId ? 'orange' : 'green'}>{t.id === state.school.currentTermId ? 'En cours' : 'Disponible'}</Badge>
                ) : (
                  <Badge>À venir</Badge>
                )}
              </div>
              <p className="small muted mt">
                Du {formatDate(t.start)} au {formatDate(t.end)}
              </p>
              <div className="stat-value mt">{available ? formatNote(avg) : '—'}<small> / 20</small></div>
              <button className="btn btn-block mt" disabled={!available} onClick={() => setTermId(t.id)}>
                <Icon name="download" size={16} /> Consulter / télécharger
              </button>
            </Card>
          );
        })}
      </div>
      {termId && <BulletinModal state={state} studentId={studentId} termId={termId} onClose={() => setTermId(null)} />}
    </StudentGuard>
  );
}

// ================================================================ Devoirs

export function homeworkStatus(h, today = todayISO()) {
  if (h.submission?.grade != null) return { label: `Corrigé · ${formatNote(h.submission.grade)}/20`, tone: 'green' };
  if (h.submission) return { label: 'Remis', tone: 'blue' };
  if (h.dueDate < today) return { label: 'Non rendu', tone: 'red' };
  const days = Math.round((new Date(`${h.dueDate}T12:00`) - new Date(`${today}T12:00`)) / 86400000);
  return { label: days === 0 ? 'Pour aujourd’hui' : days === 1 ? 'Pour demain' : `Dans ${days} jours`, tone: days <= 1 ? 'orange' : 'gray' };
}

export function HomeworkView({ state, user, run, studentId, role }) {
  const [tab, setTab] = useState('a_faire');
  const [open, setOpen] = useState(null);
  const today = todayISO();
  if (!canAccessStudent(state, user, studentId)) return <Empty>Accès refusé.</Empty>;
  const student = byId(state.students, studentId);
  const all = studentHomework(state, studentId);
  const lists = {
    a_faire: all.filter((h) => !h.submission && h.dueDate >= today),
    rendus: all.filter((h) => h.submission).reverse(),
    retard: all.filter((h) => !h.submission && h.dueDate < today),
  };
  const canSubmit = can(user, 'homework:submit');
  return (
    <>
      <PageHead title="Devoirs" subtitle={role === 'parent' ? `Devoirs de ${student.firstName}` : 'Vos devoirs à faire et à remettre en ligne.'} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'a_faire', label: `À faire (${lists.a_faire.length})` },
          { value: 'rendus', label: `Rendus (${lists.rendus.length})` },
          { value: 'retard', label: `Non rendus (${lists.retard.length})` },
        ]}
      />
      <div className="stack mt">
        {lists[tab].map((h) => {
          const st = homeworkStatus(h, today);
          const subject = byId(state.subjects, h.subjectId);
          return (
            <Card key={h.id}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="row">
                    <Badge tone="blue">{subject?.name}</Badge>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <h3 style={{ marginTop: 10 }}>{h.title}</h3>
                  <p className="small muted" style={{ marginTop: 4 }}>
                    {h.description}
                  </p>
                  <p className="tiny muted" style={{ marginTop: 8 }}>
                    Donné le {formatDate(h.createdAt)} par {teacherName(state, h.teacherId)} · À rendre le{' '}
                    <strong>{formatDate(h.dueDate, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                  </p>
                  {h.attachments?.length > 0 && (
                    <div className="row tiny" style={{ marginTop: 8 }}>
                      {h.attachments.map((a) => (
                        <Badge key={a} icon="file">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {h.submission?.feedback && (
                    <div className="alert alert-green small" style={{ marginTop: 10 }}>
                      <Icon name="message" size={16} /> {h.submission.feedback}
                    </div>
                  )}
                </div>
                {canSubmit && h.submission?.grade == null && (
                  <button className={`btn ${h.submission ? '' : 'btn-primary'}`} onClick={() => setOpen(h)}>
                    <Icon name="upload" size={16} /> {h.submission ? 'Modifier ma remise' : 'Remettre en ligne'}
                  </button>
                )}
              </div>
            </Card>
          );
        })}
        {!lists[tab].length && (
          <Card>
            <Empty>{tab === 'a_faire' ? 'Aucun devoir à faire. 🎉' : 'Aucun devoir dans cette catégorie.'}</Empty>
          </Card>
        )}
      </div>
      {open && <SubmitModal homework={open} run={run} onClose={() => setOpen(null)} />}
    </>
  );
}

function SubmitModal({ homework, run, onClose }) {
  const [content, setContent] = useState(homework.submission?.content || '');
  const [fileName, setFileName] = useState(homework.submission?.fileName || '');
  const submit = () => {
    const res = run(A.submitHomework, { homeworkId: homework.id, content, fileName }, 'Devoir remis avec succès.');
    if (res.ok) onClose();
  };
  return (
    <Modal
      title={`Remettre : ${homework.title}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={submit}>
            <Icon name="send" size={16} /> Remettre le devoir
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <Field label="Votre réponse">
          <textarea className="textarea" rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Rédigez votre réponse ici…" />
        </Field>
        <Field label="Fichier joint (photo, PDF…)">
          <input className="input" type="file" style={{ paddingTop: 8 }} onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
        </Field>
        {fileName && (
          <p className="small">
            <Icon name="file" size={14} /> {fileName}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ================================================================ Présences & sorties

const ATT = {
  present: { label: 'Présent', tone: 'green', icon: 'check' },
  absent: { label: 'Absent', tone: 'red', icon: 'x' },
  retard: { label: 'Retard', tone: 'orange', icon: 'clock' },
};

export function AttendanceBadge({ status }) {
  const a = ATT[status];
  return a ? <Badge tone={a.tone} icon={a.icon}>{a.label}</Badge> : <Badge>Non renseigné</Badge>;
}

export function AttendanceView({ state, user, studentId }) {
  if (!canAccessStudent(state, user, studentId)) return <Empty>Accès refusé.</Empty>;
  const student = byId(state.students, studentId);
  const stats = attendanceStats(state, studentId);
  const records = state.attendance.filter((a) => a.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
  const today = records.find((r) => r.date === todayISO());
  return (
    <>
      <PageHead title="Présences" subtitle={`${fullName(student)} — ${studentClass(state, student)?.name}`} />
      <div className="grid g-4">
        <Stat label="Aujourd’hui" value={today ? ATT[today.status].label : '—'} icon="checkCircle" tone={today ? (today.status === 'present' ? 'green' : today.status === 'absent' ? 'red' : 'orange') : 'navy'} sub={today?.arrival ? `Arrivée à ${today.arrival}` : 'Appel non encore fait'} />
        <Stat label="Taux de présence" value={stats.rate == null ? '—' : `${Math.round(stats.rate)} %`} icon="chart" tone="blue" sub={`${stats.total} jours enregistrés`} />
        <Stat label="Absences" value={stats.absent} icon="x" tone="red" sub={`${stats.unjustified} non justifiée(s)`} />
        <Stat label="Retards" value={stats.late} icon="clock" tone="orange" />
      </div>
      <Card className="mt" title="Historique" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Statut</th>
                <th>Heure d’arrivée</th>
                <th>Justification</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{formatDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' })}</td>
                  <td>
                    <AttendanceBadge status={r.status} />
                  </td>
                  <td className="num">{r.arrival || '—'}</td>
                  <td>{r.status === 'absent' ? r.justified ? <Badge tone="green">Justifiée</Badge> : <Badge tone="red">Non justifiée</Badge> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function ExitsView({ state, user, studentId }) {
  if (!canAccessStudent(state, user, studentId)) return <Empty>Accès refusé.</Empty>;
  const student = byId(state.students, studentId);
  const exits = state.exits.filter((e) => e.studentId === studentId).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const last = lastExit(state, studentId);
  return (
    <>
      <PageHead title="Sorties" subtitle={`Suivi des sorties de ${student.firstName}`} />
      <div className="grid g-3">
        <Stat label="Dernière sortie" value={last ? last.time.replace(':', 'h') : '—'} icon="door" tone="blue" sub={last ? formatDate(last.date, { weekday: 'long', day: 'numeric', month: 'long' }) : ''} />
        <Stat label="Sorties exceptionnelles" value={exits.filter((e) => e.type === 'exceptionnelle').length} icon="alert" tone="orange" sub="Avant la fin des cours" />
        <Stat label="Sorties enregistrées" value={exits.length} icon="clock" tone="navy" />
      </div>
      <Card className="mt" title="Historique des sorties" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Heure</th>
                <th>Type</th>
                <th>Motif</th>
                <th>Accompagnement</th>
              </tr>
            </thead>
            <tbody>
              {exits.map((e) => (
                <tr key={e.id}>
                  <td className="nowrap">{formatDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="num strong">{e.time}</td>
                  <td>{e.type === 'exceptionnelle' ? <Badge tone="orange">Exceptionnelle</Badge> : <Badge>Normale</Badge>}</td>
                  <td>{e.reason}</td>
                  <td>{e.accompaniedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!exits.length && <Empty>Aucune sortie enregistrée.</Empty>}
        </div>
      </Card>
    </>
  );
}

// ================================================================ Paiements

const INST = {
  payee: { label: 'Payée', tone: 'green' },
  partielle: { label: 'Partielle', tone: 'orange' },
  en_retard: { label: 'En retard', tone: 'red' },
  a_venir: { label: 'À venir', tone: 'gray' },
};

export function ReceiptModal({ state, payment, onClose }) {
  const student = byId(state.students, payment.studentId);
  const pay = paymentStatus(state, student.id);
  return (
    <Modal
      title={`Reçu ${payment.receiptNo}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Icon name="printer" size={16} /> Imprimer
          </button>
        </>
      }
    >
      <div className="bulletin print-area">
        <div className="bulletin-head">
          <div>
            <h2>{state.school.name}</h2>
            <div className="small">{state.school.city}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="strong">REÇU DE PAIEMENT</div>
            <div className="small">N° {payment.receiptNo}</div>
          </div>
        </div>
        <dl className="kv mt">
          <dt>Élève</dt>
          <dd>
            {fullName(student)} ({student.matricule})
          </dd>
          <dt>Classe</dt>
          <dd>{studentClass(state, student)?.name}</dd>
          <dt>Date</dt>
          <dd>{formatDate(payment.date, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          <dt>Mode de paiement</dt>
          <dd>{payment.method}</dd>
          <dt>Montant reçu</dt>
          <dd className="strong" style={{ fontSize: 18 }}>
            {formatMoney(payment.amount)}
          </dd>
          <dt>Total versé à ce jour</dt>
          <dd>{formatMoney(pay.paid)}</dd>
          <dt>Reste à payer</dt>
          <dd>{formatMoney(pay.balance)}</dd>
        </dl>
        <p className="small mt" style={{ marginTop: 32 }}>
          Cachet et signature de l’économat
        </p>
      </div>
    </Modal>
  );
}

export function PaymentsView({ state, user, studentId }) {
  const [receipt, setReceipt] = useState(null);
  if (!canAccessStudent(state, user, studentId) || !can(user, 'payments:read')) return <Empty>Accès refusé.</Empty>;
  const student = byId(state.students, studentId);
  const pay = paymentStatus(state, studentId);
  return (
    <>
      <PageHead title="Paiements de scolarité" subtitle={`${fullName(student)} — ${studentClass(state, student)?.name} · ${state.school.year}`} />
      {pay.overdue > 0 && (
        <div className="alert alert-red" style={{ marginBottom: 18 }}>
          <Icon name="alert" size={18} />
          <div>
            <strong>Échéance dépassée :</strong> {formatMoney(pay.overdue)} restent à régler sur les tranches échues. Paiement possible en espèces, Orange Money ou MTN MoMo à l’économat.
          </div>
        </div>
      )}
      <div className="grid g-main">
        <Card title="Situation">
          <div className="row" style={{ gap: 28 }}>
            <Ring value={pay.percent} size={120} color={pay.percent >= 100 ? 'var(--green)' : 'var(--blue)'} />
            <dl className="kv">
              <dt>Frais annuels</dt>
              <dd>{formatMoney(pay.fee)}</dd>
              <dt>Déjà payé</dt>
              <dd style={{ color: 'var(--green-700)' }}>{formatMoney(pay.paid)}</dd>
              <dt>Reste à payer</dt>
              <dd style={{ color: pay.balance ? 'var(--red-700)' : undefined }}>{formatMoney(pay.balance)}</dd>
            </dl>
          </div>
        </Card>
        <Card title="Échéances">
          {pay.installments.map((i) => (
            <div className="list-item" key={i.id}>
              <div className="grow">
                <div className="strong small">{i.label}</div>
                <div className="tiny muted">Avant le {formatDate(i.dueDate, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num small strong">{formatMoney(i.amount)}</div>
                <Badge tone={INST[i.status].tone}>{INST[i.status].label}</Badge>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <Card className="mt" title="Historique des paiements" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reçu</th>
                <th>Mode</th>
                <th className="r">Montant</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pay.payments
                .slice()
                .reverse()
                .map((p) => (
                  <tr key={p.id}>
                    <td className="nowrap">{formatDate(p.date, { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                    <td className="num">{p.receiptNo}</td>
                    <td>{p.method}</td>
                    <td className="r num strong">{formatMoney(p.amount)}</td>
                    <td className="r">
                      <button className="btn btn-sm" onClick={() => setReceipt(p)}>
                        <Icon name="receipt" size={14} /> Reçu
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!pay.payments.length && <Empty>Aucun paiement enregistré.</Empty>}
        </div>
      </Card>
      {receipt && <ReceiptModal state={state} payment={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}

// ================================================================ Enseignants (vue élève / parent)

export function TeachersView({ state, user, studentId, go }) {
  if (!canAccessStudent(state, user, studentId)) return <Empty>Accès refusé.</Empty>;
  const student = byId(state.students, studentId);
  const cls = studentClass(state, student);
  const teachers = state.teachers.filter((t) => t.classIds.includes(cls.id));
  const contacts = new Set(messageContacts(state, user).map((c) => c.id));
  return (
    <>
      <PageHead title="Enseignants" subtitle={`L’équipe pédagogique de la ${cls.name}`} />
      <div className="grid g-3">
        {teachers.map((t) => {
          const u = userForPerson(state, 'enseignant', t.id);
          return (
            <Card key={t.id}>
              <div className="row">
                <Avatar name={fullName(t)} size="lg" />
                <div>
                  <h3>{teacherName(state, t.id)}</h3>
                  <div className="small muted">{t.subjectIds.map((id) => byId(state.subjects, id)?.name).join(' · ')}</div>
                  {cls.headTeacherId === t.id && <Badge tone="blue">Professeur principal</Badge>}
                </div>
              </div>
              {u && contacts.has(u.id) && (
                <button className="btn btn-block mt" onClick={() => go(`messages/${u.id}`)}>
                  <Icon name="message" size={16} /> {user.role === 'eleve' ? 'Poser une question' : 'Écrire'}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ================================================================ Progression

export function ProgressionView({ state, user, studentId }) {
  const [subjectId, setSubjectId] = useState('');
  if (!canAccessStudent(state, user, studentId)) return <Empty>Accès refusé.</Empty>;
  const student = byId(state.students, studentId);
  const series = progressionSeries(state, studentId, subjectId || null);
  const pct = progressionPercent(state, studentId);
  const diffs = difficulties(state, studentId);
  const attempts = state.trainingAttempts.filter((a) => a.studentId === studentId);
  const trainingRate = attempts.length ? (attempts.reduce((a, t) => a + t.score / t.total, 0) / attempts.length) * 100 : null;
  const bySubject = state.subjects
    .map((s) => {
      const pts = progressionSeries(state, studentId, s.id);
      return { s, delta: pts.length > 1 ? pts[pts.length - 1].value - pts[0].value : null, avg: subjectAverage(state, studentId, s.id) };
    })
    .filter((x) => x.avg != null);
  return (
    <>
      <PageHead title="Progression" subtitle={`Évolution de ${student.firstName} depuis la rentrée`} />
      <div className="grid g-3">
        <Stat label="Évolution des notes" value={pct == null ? '—' : `${pct >= 0 ? '+' : ''}${Math.round(pct)} %`} icon="trend" tone={pct >= 0 ? 'green' : 'red'} sub="2de moitié vs 1re moitié des évaluations" />
        <Stat label="Réussite à l’entraînement" value={trainingRate == null ? '—' : `${Math.round(trainingRate)} %`} icon="brain" tone="blue" sub={`${attempts.length} séance(s) réalisée(s)`} />
        <Stat label="Points à travailler" value={diffs.length} icon="target" tone={diffs.length ? 'orange' : 'green'} sub={diffs.map((d) => d.topic).slice(0, 3).join(', ') || 'Aucune difficulté détectée'} />
      </div>
      <Card
        className="mt"
        title={subjectId ? `Moyenne en ${byId(state.subjects, subjectId)?.name}` : 'Moyenne générale'}
        action={
          <Select
            className="select input-sm"
            style={{ width: 200 }}
            value={subjectId}
            onChange={setSubjectId}
            aria-label="Matière"
            options={[{ value: '', label: 'Moyenne générale' }, ...state.subjects.map((s) => ({ value: s.id, label: s.name }))]}
          />
        }
      >
        <LineChart points={series} height={220} />
      </Card>
      <div className="grid g-2 mt">
        <Card title="Évolution par matière" flush>
          <table className="table">
            <tbody>
              {bySubject.map(({ s, delta, avg }) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="r">
                    <Grade value={avg} />
                  </td>
                  <td className="r num nowrap" style={{ color: delta == null ? undefined : delta >= 0 ? 'var(--green-700)' : 'var(--red-700)' }}>
                    {delta == null ? '—' : `${delta >= 0 ? '▲ +' : '▼ '}${formatNote(delta)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Difficultés identifiées">
          {diffs.length ? (
            diffs.map((d) => (
              <div className="list-item" key={`${d.subjectId}-${d.topic}`}>
                <span className="notif-icon tone-orange">
                  <Icon name="target" size={16} />
                </span>
                <div className="grow">
                  <div className="strong small">{d.topic}</div>
                  <div className="tiny muted">{byId(state.subjects, d.subjectId)?.name}</div>
                </div>
                <div style={{ width: 90 }}>
                  <Bar value={d.ratio * 100} tone="orange" />
                  <div className="tiny muted" style={{ textAlign: 'right' }}>
                    {Math.round(d.ratio * 100)} % de réussite
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Empty>Aucune difficulté particulière détectée. Bravo !</Empty>
          )}
        </Card>
      </div>
    </>
  );
}

export { StudentGuard, round1 };
