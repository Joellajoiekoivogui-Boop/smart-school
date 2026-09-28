'use client';
/** Fiche de vie scolaire : dossier longitudinal de l'élève. */
import { useState } from 'react';
import Icon from '../Icon';
import { photoOf, userPhoto } from '@/lib/avatars';
import { Avatar, Badge, Card, Empty, Field, PageHead, Select, Stat } from '../ui';
import { attendanceStats, byId, formatDate, formatNote, fullName, generalAverage, progressionPercent, studentClass, timeAgo } from '@/lib/compute';
import { can, canAccessStudent } from '@/lib/permissions';
import { LIFE_CATEGORIES, lifeEvents } from '@/lib/lifebook';
import * as A from '@/lib/actions';
import { todayISO } from './shared';

export function Lifebook({ state, user, run, studentId, embedded = false }) {
  const [cat, setCat] = useState('');
  const [limit, setLimit] = useState(40);
  if (!canAccessStudent(state, user, studentId) || !can(user, 'lifebook:read')) return <Empty>Accès refusé.</Empty>;
  const s = byId(state.students, studentId);
  const events = lifeEvents(state, studentId).filter((e) => !cat || e.cat === cat);
  const att = attendanceStats(state, studentId);
  const pct = progressionPercent(state, studentId);
  const due = state.homework.filter((h) => h.classId === s.classId && h.dueDate < todayISO());
  const done = due.filter((h) => state.submissions.some((x) => x.homeworkId === h.id && x.studentId === studentId)).length;
  const obs = (state.observations || []).filter((o) => o.studentId === studentId);
  const canWrite = can(user, 'observations:write');

  // Regroupe la chronologie par mois.
  const groups = [];
  for (const e of events.slice(0, limit)) {
    const key = e.at.slice(0, 7);
    if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, items: [] });
    groups[groups.length - 1].items.push(e);
  }

  return (
    <>
      {!embedded && (
        <PageHead title="Fiche de vie scolaire" subtitle="Le parcours de l’élève, au fil de l’année : résultats, présences, devoirs, observations et activités.">
          <button className="btn" onClick={() => window.print()}>
            <Icon name="printer" size={16} /> Imprimer
          </button>
        </PageHead>
      )}
      <div className="print-area">
        <div className="card row" style={{ marginBottom: 18 }}>
          <Avatar src={photoOf(s)} name={fullName(s)} size="lg" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2>{fullName(s)}</h2>
            <div className="small muted">
              {studentClass(state, s)?.name} · Matricule {s.matricule} · Inscrit(e) le {formatDate(s.enrolledAt, { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <Badge tone="blue">{state.school.year}</Badge>
        </div>
        <div className="grid g-4">
          <Stat label="Moyenne générale" value={formatNote(generalAverage(state, studentId))} unit="/ 20" icon="chart" tone="blue" sub={pct == null ? '' : `${pct >= 0 ? '+' : ''}${Math.round(pct)} % depuis la rentrée`} />
          <Stat label="Présence" value={att.rate == null ? '—' : `${Math.round(att.rate)} %`} icon="checkCircle" tone="green" sub={`${att.absent} absence(s) · ${att.late} retard(s)`} />
          <Stat label="Devoirs rendus" value={`${done}/${due.length}`} icon="edit" tone="orange" />
          <Stat label="Observations" value={obs.length} icon="message" tone="navy" sub={`${obs.filter((o) => o.type === 'encouragement').length} encouragement(s)`} />
        </div>

        <div className="grid g-main mt">
          <Card
            title="Chronologie"
            action={
              <Select
                className="select input-sm no-print"
                style={{ width: 210 }}
                value={cat}
                onChange={setCat}
                aria-label="Filtrer"
                options={[{ value: '', label: 'Tous les événements' }, ...Object.entries(LIFE_CATEGORIES).map(([v, c]) => ({ value: v, label: c.label }))]}
              />
            }
          >
            {groups.map((g) => (
              <div key={g.key} style={{ marginBottom: 12 }}>
                <div className="tiny strong muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0' }}>
                  {new Date(`${g.key}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </div>
                <div className="timeline">
                  {g.items.map((e) => {
                    const c = LIFE_CATEGORIES[e.cat];
                    return (
                      <div className="timeline-item" key={e.id}>
                        <span className={`timeline-dot tone-${e.tone || c.tone}`}>
                          <Icon name={c.icon} size={14} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row between" style={{ flexWrap: 'nowrap', gap: 8 }}>
                            <span className="strong small">{e.title}</span>
                            <span className="tiny muted nowrap">{formatDate(e.at.slice(0, 10))}</span>
                          </div>
                          {e.body && <p className="small muted">{e.body}</p>}
                          {e.author && <p className="tiny muted">— {e.author}</p>}
                          {e.observationId && (user.role === 'admin' || e.authorId === user.id) && (
                            <button className="btn btn-ghost btn-sm no-print" onClick={() => window.confirm('Supprimer cette observation ?') && run(A.deleteObservation, { observationId: e.observationId }, 'Observation supprimée.')}>
                              <Icon name="trash" size={12} /> Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {!events.length && <Empty>Aucun événement.</Empty>}
            {events.length > limit && (
              <button className="btn btn-block no-print" onClick={() => setLimit((l) => l + 40)}>
                Afficher plus ({events.length - limit} restants)
              </button>
            )}
          </Card>
          <div className="stack">
            {canWrite && <ObservationForm run={run} studentId={studentId} />}
            <Card title="Dernières observations">
              {obs
                .slice()
                .sort((a, b) => b.at.localeCompare(a.at))
                .slice(0, 5)
                .map((o) => (
                  <div className="list-item" key={o.id} style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <Badge tone={o.type === 'encouragement' ? 'green' : o.type === 'avertissement' ? 'red' : o.type === 'activite' ? 'gray' : 'blue'}>{A.OBSERVATION_TYPES[o.type]}</Badge>
                      <p className="small" style={{ marginTop: 6 }}>
                        {o.text}
                      </p>
                      <p className="tiny muted">
                        {byId(state.users, o.authorId)?.name} · {timeAgo(o.at)}
                      </p>
                    </div>
                  </div>
                ))}
              {!obs.length && <Empty>Aucune observation pour le moment.</Empty>}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function ObservationForm({ run, studentId }) {
  const [type, setType] = useState('pedagogique');
  const [text, setText] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (run(A.addObservation, { studentId, type, text }, 'Observation ajoutée à la fiche de vie.').ok) setText('');
  };
  return (
    <Card title="Ajouter une observation" className="no-print">
      <form className="stack" style={{ gap: 10 }} onSubmit={submit}>
        <Field label="Type">
          <Select value={type} onChange={setType} options={Object.entries(A.OBSERVATION_TYPES).map(([v, l]) => ({ value: v, label: l }))} />
        </Field>
        <Field label="Observation">
          <textarea className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Progrès, difficultés, comportement, activité…" required />
        </Field>
        <button className="btn btn-primary" type="submit">
          Ajouter
        </button>
      </form>
    </Card>
  );
}

export function LifebookView(props) {
  return <Lifebook {...props} />;
}
