'use client';
/**
 * Vues partagées entre plusieurs espaces (élève, parent, enseignant, admin).
 * Toutes reçoivent les props du Shell : state, user, run, role, studentId, params, go.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../Icon';
import { Avatar, Badge, Bar, Card, Empty, Field, Grade, HBars, LineChart, Modal, PageHead, Ring, Select, Stagger, StaggerItem, Stat, Tabs } from '../ui';
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
import { priorities } from '@/lib/alerts';
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
  const [view, setView] = useState('jour');
  return (
    <>
      <PageHead
        title="Emploi du temps"
        subtitle={student ? `${fullName(student)} — ${studentClass(state, student)?.name}` : 'Vos cours, salles et échéances'}
      >
        <Tabs value={view} onChange={setView} tabs={[{ value: 'jour', label: 'Ma journée' }, { value: 'semaine', label: 'Semaine' }]} />
      </PageHead>
      {view === 'jour' ? (
        <DayAgenda state={state} user={user} student={student} teacherId={teacherId} />
      ) : (
        <Card>
          <TimetableGrid state={state} classId={student?.classId} teacherId={teacherId} />
        </Card>
      )}
    </>
  );
}

/**
 * Emploi du temps intelligent : la journée (ou la prochaine journée de cours)
 * avec cours, salles, enseignants, devoirs à rendre et événements.
 */
export function DayAgenda({ state, student, teacherId }) {
  const now = new Date();
  // Le week-end, on affiche le lundi suivant.
  const target = new Date(now);
  while (target.getDay() === 0 || target.getDay() === 6) target.setDate(target.getDate() + 1);
  const iso = toISODate(target);
  const isToday = iso === toISODate(now);
  const day = target.getDay() - 1;
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const slots = state.timetable
    .filter((t) => t.day === day && (student ? t.classId === student.classId : t.teacherId === teacherId))
    .sort((a, b) => a.slot - b.slot);
  const dueHw = state.homework.filter((h) =>
    student ? h.classId === student.classId && h.dueDate === iso : h.teacherId === teacherId && h.dueDate === iso,
  );
  const upcoming = state.homework
    .filter((h) => (student ? h.classId === student.classId : h.teacherId === teacherId) && h.dueDate > iso)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  const events = state.calendar.filter((e) => e.date >= iso).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  return (
    <div className="grid g-main">
      <Card title={`${isToday ? 'Aujourd’hui' : 'Prochain jour de cours'} — ${formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long' })}`}>
        {slots.length ? (
          <div className="timeline">
            {slots.map((t) => {
              const ts = TIME_SLOTS[t.slot];
              const subject = byId(state.subjects, t.subjectId);
              const state_ = !isToday ? 'avenir' : hm >= ts.end ? 'passe' : hm >= ts.start ? 'encours' : 'avenir';
              const hw = dueHw.filter((h) => h.subjectId === t.subjectId);
              return (
                <div key={t.id} className={`timeline-item agenda-${state_}`}>
                  <span className={`timeline-dot tone-${state_ === 'encours' ? 'blue' : state_ === 'passe' ? 'navy' : 'green'}`}>
                    <Icon name={state_ === 'passe' ? 'check' : 'clock'} size={14} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="row between" style={{ flexWrap: 'nowrap' }}>
                      <span className="strong">{subject?.name}</span>
                      <span className="num small muted">
                        {ts.start} – {ts.end}
                      </span>
                    </div>
                    <div className="small muted">
                      {student ? teacherName(state, t.teacherId) : byId(state.classes, t.classId)?.name} · {t.room}
                    </div>
                    {state_ === 'encours' && <Badge tone="blue">En cours</Badge>}
                    {hw.map((h) => (
                      <div key={h.id} style={{ marginTop: 6 }}>
                        <Badge tone="orange" icon="edit">
                          Devoir à rendre : {h.title}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty>Pas de cours ce jour-là.</Empty>
        )}
      </Card>
      <div className="stack">
        <Card title="Devoirs à venir">
          {upcoming.map((h) => (
            <div className="list-item" key={h.id}>
              <div className="grow">
                <div className="strong small ellipsis">{h.title}</div>
                <div className="tiny muted">
                  {byId(state.subjects, h.subjectId)?.name}
                  {!student && ` · ${byId(state.classes, h.classId)?.name}`}
                </div>
              </div>
              <Badge>{formatDate(h.dueDate, { weekday: 'short', day: 'numeric' })}</Badge>
            </div>
          ))}
          {!upcoming.length && <Empty>Aucun devoir à venir.</Empty>}
        </Card>
        <Card title="Événements">
          {events.map((e) => (
            <div className="list-item" key={e.id}>
              <div className="num strong small" style={{ width: 64 }}>
                {formatDate(e.date)}
              </div>
              <div className="grow small">{e.title}</div>
            </div>
          ))}
          {!events.length && <Empty>Aucun événement prévu.</Empty>}
        </Card>
      </div>
    </div>
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
  const [about, setAbout] = useState('');
  const endRef = useRef(null);

  // Élèves auxquels la conversation peut être rattachée (« à propos de … »).
  const linked = useMemo(() => {
    if (!active || user.role === 'eleve') return [];
    let ids = [];
    if (active.role === 'parent') ids = byId(state.parents, active.personId)?.childrenIds || [];
    else if (active.role === 'eleve') ids = [active.personId];
    else if (user.role === 'parent') ids = byId(state.parents, user.personId)?.childrenIds || [];
    return ids.filter((id) => canAccessStudent(state, user, id)).map((id) => byId(state.students, id)).filter(Boolean);
  }, [active, user, state]);
  useEffect(() => setAbout(''), [activeId]);
  const shown = about ? conversation.filter((m) => m.studentId === about) : conversation;

  const hasUnread = conversation.some((m) => m.to === user.id && !m.read);
  useEffect(() => {
    if (activeId && hasUnread) run(A.markThreadRead, { otherId: activeId });
  }, [activeId, hasUnread, run]);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [conversation.length, activeId]);

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const res = run(A.sendMessage, { to: activeId, body: draft, studentId: about || undefined });
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
                <div className="row between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div className="row">
                    <Avatar name={active.name} />
                    <div>
                      <div className="strong">{active.name}</div>
                      <div className="tiny muted">{roleLabel(active)}</div>
                    </div>
                  </div>
                  {linked.length > 0 && (
                    <Select
                      className="select input-sm"
                      style={{ width: 210 }}
                      value={about}
                      onChange={setAbout}
                      aria-label="À propos de"
                      options={[{ value: '', label: 'Tous les sujets' }, ...linked.map((st) => ({ value: st.id, label: `À propos de ${st.firstName}` }))]}
                    />
                  )}
                </div>
                <div className="chat-messages">
                  {shown.map((m) => (
                    <div key={m.id} className={`bubble ${m.from === user.id ? 'mine' : ''}`}>
                      {m.studentId && (
                        <div className="bubble-tag">
                          <Icon name="child" size={12} /> {byId(state.students, m.studentId)?.firstName}
                        </div>
                      )}
                      {m.body}
                      <div className="bubble-time">{timeAgo(m.at)}</div>
                    </div>
                  ))}
                  {!shown.length && <Empty>{about ? 'Aucun message sur ce sujet.' : `Démarrez la conversation avec ${active.name}.`}</Empty>}
                  <div ref={endRef} />
                </div>
                {canWrite ? (
                  <form className="chat-compose" onSubmit={send}>
                    <input
                      className="input"
                      placeholder={about ? `Message à propos de ${byId(state.students, about)?.firstName}…` : 'Écrire un message…'}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      aria-label="Message"
                      maxLength={2000}
                    />
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
  baisse: ['trend', 'orange'],
  sortie: ['door', 'blue'],
  bulletin: ['file', 'green'],
};

const SEVERITY = { critique: ['Urgent', 'red'], attention: ['À suivre', 'orange'] };

/** Priorités du jour (tableaux de bord de chaque rôle). */
export function PrioritiesCard({ state, user, go }) {
  const list = priorities(state, user, notificationsFor(state, user));
  if (!list.length) {
    return (
      <div className="alert alert-green" style={{ marginTop: 18 }}>
        <Icon name="checkCircle" size={18} /> Rien d’urgent : tout est à jour.
      </div>
    );
  }
  return (
    <Card title="À traiter en priorité" className="mt priorities">
      <Stagger className="priority-grid">
        {list.map((p) => {
          const [label, tone] = SEVERITY[p.severity] || ['Info', 'blue'];
          return (
            <StaggerItem
              as="button"
              key={p.id}
              className={`priority priority-${tone}`}
              onClick={() => p.link && go(p.link)}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Badge tone={tone}>{label}</Badge>
              <span className="strong small">{p.title}</span>
              {p.body && <span className="tiny muted ellipsis">{p.body}</span>}
            </StaggerItem>
          );
        })}
      </Stagger>
    </Card>
  );
}

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

export function NotificationsView({ state, user, run, role, go }) {
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
                <div className="row" style={{ gap: 8 }}>
                  <span className="tiny muted">{timeAgo(n.at)}</span>
                  {SEVERITY[n.severity] && <Badge tone={SEVERITY[n.severity][1]}>{SEVERITY[n.severity][0]}</Badge>}
                  {n.link && (
                    <button className="btn btn-ghost btn-sm" onClick={() => go(n.link)}>
                      Voir <Icon name="chevronRight" size={14} />
                    </button>
                  )}
                </div>
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
  const published = state.bulletinsPublished?.[`${rc.cls.id}-${termId}`];
  return (
    <Modal
      title={`${published ? 'Bulletin' : 'Relevé provisoire'} — ${rc.term?.name}`}
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
      <div className="print-area">
        <BulletinSheet state={state} studentId={studentId} termId={termId} />
      </div>
    </Modal>
  );
}

/** En-tête officiel des documents scolaires guinéens (bulletins, reçus). */
export function OfficialHeader({ school }) {
  return (
    <div className="official-head">
      <div>
        <div className="strong">{(school.ministry || '').toUpperCase()}</div>
        <div className="tiny">{school.region}</div>
      </div>
      <div className="official-flag" aria-label="Drapeau de la Guinée">
        <span style={{ background: '#CE1126' }} />
        <span style={{ background: '#FCD116' }} />
        <span style={{ background: '#009460' }} />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="strong">{(school.country || 'République de Guinée').toUpperCase()}</div>
        <div className="tiny">{school.motto}</div>
      </div>
    </div>
  );
}

/** Contenu imprimable d'un bulletin (utilisé seul ou en lot pour toute une classe). */
export function BulletinSheet({ state, studentId, termId }) {
  const rc = reportCard(state, studentId, termId);
  const head = rc.cls && byId(state.teachers, rc.cls.headTeacherId);
  const published = state.bulletinsPublished?.[`${rc.cls.id}-${termId}`];
  return (
    <div className="bulletin">
      <OfficialHeader school={state.school} />
      <div className="bulletin-head">
        <div>
          <h2>{state.school.name}</h2>
          <div className="small">
            {[state.school.commune, state.school.city].filter(Boolean).join(', ')} · Année scolaire {state.school.year}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="strong">{published ? 'BULLETIN DE NOTES' : 'RELEVÉ PROVISOIRE'}</div>
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
          <Icon name="file" size={16} /> {state.bulletinsPublished?.[`${cls.id}-${termId}`] ? 'Voir le bulletin' : 'Relevé provisoire'}
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
          const published = state.bulletinsPublished?.[`${student.classId}-${t.id}`];
          const available = avg != null && Boolean(published);
          return (
            <Card key={t.id}>
              <div className="row between">
                <h3>{t.name}</h3>
                {published ? (
                  <Badge tone="green" icon="check">Publié le {formatDate(published.at)}</Badge>
                ) : avg != null ? (
                  <Badge tone="orange">En préparation</Badge>
                ) : (
                  <Badge>À venir</Badge>
                )}
              </div>
              <p className="small muted mt">
                Du {formatDate(t.start)} au {formatDate(t.end)}
              </p>
              <div className="stat-value mt">{available ? formatNote(avg) : '—'}<small> / 20</small></div>
              {!published && avg != null && <p className="tiny muted">Le bulletin sera disponible dès sa publication par l’administration.</p>}
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
                  <HomeworkCycle h={h} />
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

/** Cycle complet d'un devoir : publication → notification → dépôt → correction → note. */
export function HomeworkCycle({ h }) {
  const sub = h.submission;
  const steps = [
    { label: 'Publié', date: h.createdAt, done: true },
    { label: 'Notifié', date: h.createdAt, done: true },
    { label: sub?.history?.length > 1 ? `Déposé (${sub.history.filter((x) => x.event !== 'correction').length}×)` : 'Déposé', date: sub?.submittedAt, done: Boolean(sub) },
    { label: 'Corrigé', date: sub?.gradedAt, done: sub?.grade != null },
    { label: sub?.grade != null ? `Note ${formatNote(sub.grade)}/20` : 'Note', date: sub?.gradedAt, done: sub?.grade != null },
  ];
  return (
    <ol className="cycle" aria-label="Suivi du devoir">
      {steps.map((st) => (
        <li key={st.label} className={st.done ? 'done' : ''}>
          <span className="cycle-dot">{st.done ? <Icon name="check" size={10} strokeWidth={3} /> : null}</span>
          <span className="tiny strong">{st.label}</span>
          <span className="tiny muted">{st.done && st.date ? formatDate(st.date) : '—'}</span>
        </li>
      ))}
    </ol>
  );
}

function SubmitModal({ homework, run, onClose }) {
  const [content, setContent] = useState(homework.submission?.content || '');
  const [fileName, setFileName] = useState(homework.submission?.fileName || '');
  const submit = () => {
    const res = run(A.submitHomework, { homeworkId: homework.id, content, fileName }, '🎉 Devoir remis avec succès !');
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

export function ExitsView({ state, user, run, studentId }) {
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
      {can(user, 'exits:authorize') && <ExitAuthorizations state={state} user={user} run={run} studentId={studentId} />}
    </>
  );
}

const AUTH_STATUS = {
  en_attente: ['En attente', 'orange'],
  approuvee: ['Autorisée', 'green'],
  refusee: ['Refusée', 'red'],
  annulee: ['Annulée', 'gray'],
};

/** Parent : règles de sortie de l'enfant et demandes d'autorisation exceptionnelle. */
function ExitAuthorizations({ state, user, run, studentId }) {
  const student = byId(state.students, studentId);
  const rules = state.exitRules?.[studentId] || { canLeaveAlone: false, pickupPersons: [] };
  const [alone, setAlone] = useState(rules.canLeaveAlone);
  const [persons, setPersons] = useState(rules.pickupPersons.join('\n'));
  const [req, setReq] = useState({ date: todayISO(), time: '11:00', reason: '', pickupBy: rules.pickupPersons[0] || '' });
  useEffect(() => {
    setAlone(rules.canLeaveAlone);
    setPersons(rules.pickupPersons.join('\n'));
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = (state.exitAuthorizations || []).filter((a) => a.studentId === studentId).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="grid g-2 mt">
      <Card title={`Règles de sortie de ${student.firstName}`}>
        <label className="check" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={alone} onChange={(e) => setAlone(e.target.checked)} />
          {student.firstName} peut quitter l’établissement seul(e) à la fin des cours
        </label>
        <Field label="Personnes autorisées à venir le/la chercher (une par ligne)">
          <textarea className="textarea" rows={3} value={persons} onChange={(e) => setPersons(e.target.value)} />
        </Field>
        <button
          className="btn btn-primary mt"
          onClick={() => run(A.saveExitRules, { studentId, canLeaveAlone: alone, pickupPersons: persons.split('\n') }, 'Règles de sortie enregistrées.')}
        >
          Enregistrer les règles
        </button>
        <p className="tiny muted mt">Le surveillant voit ces règles au moment d’enregistrer une sortie. Vous êtes alerté(e) à chaque sortie.</p>
      </Card>
      <Card title="Demander une sortie exceptionnelle">
        <form
          className="stack"
          style={{ gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (run(A.requestExitAuthorization, { ...req, studentId }, 'Demande envoyée à l’administration.').ok) setReq((r) => ({ ...r, reason: '' }));
          }}
        >
          <div className="form-grid">
            <Field label="Date">
              <input className="input" type="date" min={todayISO()} value={req.date} onChange={(e) => setReq({ ...req, date: e.target.value })} required />
            </Field>
            <Field label="Heure de sortie">
              <input className="input" type="time" value={req.time} onChange={(e) => setReq({ ...req, time: e.target.value })} required />
            </Field>
          </div>
          <Field label="Motif">
            <input className="input" value={req.reason} onChange={(e) => setReq({ ...req, reason: e.target.value })} placeholder="Rendez-vous médical, famille…" required />
          </Field>
          <Field label="Personne qui vient le/la chercher">
            <input className="input" value={req.pickupBy} onChange={(e) => setReq({ ...req, pickupBy: e.target.value })} />
          </Field>
          <button className="btn btn-primary" type="submit">
            <Icon name="send" size={16} /> Envoyer la demande
          </button>
        </form>
        {list.length > 0 && (
          <div className="mt">
            {list.slice(0, 6).map((a) => (
              <div className="list-item" key={a.id}>
                <div className="grow">
                  <div className="small strong">
                    {formatDate(a.date, { weekday: 'short', day: 'numeric', month: 'short' })} à {a.time}
                  </div>
                  <div className="tiny muted">
                    {a.reason}
                    {a.comment ? ` — « ${a.comment} »` : ''}
                  </div>
                </div>
                <Badge tone={AUTH_STATUS[a.status][1]}>{AUTH_STATUS[a.status][0]}</Badge>
                {a.status === 'en_attente' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => run(A.cancelExitAuthorization, { authorizationId: a.id }, 'Demande annulée.')}>
                    Annuler
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
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
        <OfficialHeader school={state.school} />
        <div className="bulletin-head">
          <div>
            <h2>{state.school.name}</h2>
            <div className="small">{[state.school.commune, state.school.city].filter(Boolean).join(', ')} — Guinée</div>
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

export function PaymentsView({ state, user, run, studentId }) {
  const [receipt, setReceipt] = useState(null);
  const [paying, setPaying] = useState(false);
  if (!canAccessStudent(state, user, studentId) || !can(user, 'payments:read')) return <Empty>Accès refusé.</Empty>;
  const student = byId(state.students, studentId);
  const pay = paymentStatus(state, studentId);
  return (
    <>
      <PageHead title="Paiements de scolarité" subtitle={`${fullName(student)} — ${studentClass(state, student)?.name} · ${state.school.year}`}>
        {can(user, 'payments:online') && pay.balance > 0 && (
          <button className="btn btn-primary" onClick={() => setPaying(true)}>
            <Icon name="phone" size={16} /> Payer en ligne
          </button>
        )}
      </PageHead>
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
                    <td>
                      {p.method}
                      {p.channel === 'en_ligne' && (
                        <div className="tiny muted">
                          En ligne · {p.phone} · réf. {p.reference}
                        </div>
                      )}
                    </td>
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
      {paying && (
        <OnlinePaymentModal
          state={state}
          run={run}
          studentId={studentId}
          onClose={() => setPaying(false)}
          onPaid={(p) => {
            setPaying(false);
            setReceipt(p);
          }}
        />
      )}
    </>
  );
}

/**
 * Paiement Mobile Money en 3 étapes : montant et opérateur → code de
 * confirmation → reçu. En démonstration, la confirmation de l'opérateur est
 * simulée (le code s'affiche à l'écran).
 */
function OnlinePaymentModal({ state, run, studentId, onClose, onPaid }) {
  const pay = paymentStatus(state, studentId);
  const next = pay.installments.find((i) => i.status !== 'payee');
  const suggested = pay.overdue || (next ? next.amount - next.covered : pay.balance);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ amount: String(suggested), method: 'Orange Money', phone: '' });
  const [code] = useState(() => String(1000 + Math.floor(Math.random() * 9000)));
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const amount = Number(form.amount || 0);
  const confirm = () => {
    if (typed.trim() !== code) {
      setError('Code incorrect.');
      return;
    }
    const res = run(A.payOnline, { studentId, ...form }, '🎉 Paiement confirmé : reçu disponible.');
    if (res.ok) onPaid(res.result);
  };
  return (
    <Modal
      title="Payer la scolarité en ligne"
      onClose={onClose}
      footer={
        step === 1 ? (
          <>
            <button className="btn" onClick={onClose}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              disabled={!amount || !A.normalizeGuineaMobile(form.phone) || amount > pay.balance}
              onClick={() => {
                setError('');
                setStep(2);
              }}
            >
              Continuer
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => setStep(1)}>
              Retour
            </button>
            <button className="btn btn-success" onClick={confirm}>
              <Icon name="lock" size={16} /> Confirmer le paiement
            </button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="stack" style={{ gap: 14 }}>
          <div className="alert alert-blue small">
            Reste à payer : <strong>{formatMoney(pay.balance)}</strong>
            {next && ` · prochaine échéance : ${next.label} (${formatDate(next.dueDate)})`}
          </div>
          <div className="pay-methods">
            {A.ONLINE_METHODS.map((m) => (
              <button key={m} type="button" className={`pay-method ${form.method === m ? 'on' : ''}`} onClick={() => setForm({ ...form, method: m })} aria-pressed={form.method === m}>
                <span className={`pay-logo ${m === 'Orange Money' ? 'om' : 'momo'}`}>{m === 'Orange Money' ? 'OM' : 'MoMo'}</span>
                {m}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <Field label="Montant (GNF)">
              <input className="input num" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label={`Numéro ${form.method} (Guinée)`}>
              <div className="phone-field">
                <span className="phone-prefix">🇬🇳 +224</span>
                <input
                  className="input"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="6xx xx xx xx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: A.formatGuineaPhone(e.target.value.replace(/^\+?224\s*/, '')) })}
                />
              </div>
            </Field>
          </div>
          {amount > pay.balance && <p className="small" style={{ color: 'var(--red-700)' }}>Le montant dépasse le reste à payer.</p>}
          <div className="row" style={{ gap: 6 }}>
            {[pay.overdue, next && next.amount - next.covered, pay.balance]
              .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
              .map((v) => (
                <button key={v} type="button" className="btn btn-sm" onClick={() => setForm({ ...form, amount: String(v) })}>
                  {formatMoney(v)}
                </button>
              ))}
          </div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 14 }}>
          <div className="alert alert-orange small">
            <Icon name="phone" size={16} />
            <div>
              Un code de confirmation a été envoyé au <strong>+224 {form.phone}</strong> pour un paiement de <strong>{formatMoney(amount)}</strong> via {form.method}.
              <div className="tiny" style={{ marginTop: 4 }}>
                Démonstration : le code est <strong className="num">{code}</strong>.
              </div>
            </div>
          </div>
          <Field label="Code de confirmation">
            <input className="input num" inputMode="numeric" maxLength={6} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </Field>
          {error && <p className="small" style={{ color: 'var(--red-700)' }}>{error}</p>}
        </div>
      )}
    </Modal>
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
