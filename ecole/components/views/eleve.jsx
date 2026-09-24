'use client';
import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { Reveal, motion, EASE } from '../motion';
import { Badge, Bar, Card, Empty, LineChart, PageHead, Stat } from '../ui';
import {
  attendanceStats,
  byId,
  classRank,
  formatDate,
  formatNote,
  generalAverage,
  notificationsFor,
  pendingHomework,
  progressionPercent,
  progressionSeries,
  studentClass,
  teacherName,
  timeAgo,
} from '@/lib/compute';
import { TIME_SLOTS } from '@/lib/seed';
import * as A from '@/lib/actions';
import { homeworkStatus, todayISO } from './shared';

export function TodayCourses({ state, classId, teacherId }) {
  const day = new Date().getDay() - 1;
  const slots = state.timetable
    .filter((t) => t.day === day && (classId ? t.classId === classId : t.teacherId === teacherId))
    .sort((a, b) => a.slot - b.slot);
  if (day < 0 || day > 4) return <Empty>Pas de cours aujourd’hui. Bon week-end !</Empty>;
  if (!slots.length) return <Empty>Aucun cours aujourd’hui.</Empty>;
  return (
    <div className="list">
      {slots.map((t) => (
        <div className="list-item" key={t.id}>
          <div className="num small strong" style={{ width: 52 }}>
            {TIME_SLOTS[t.slot].start}
          </div>
          <div className="grow">
            <div className="strong small">{byId(state.subjects, t.subjectId)?.name}</div>
            <div className="tiny muted">
              {classId ? teacherName(state, t.teacherId) : byId(state.classes, t.classId)?.name} · {t.room}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EleveDashboard({ state, user, go }) {
  const studentId = user.personId;
  const student = byId(state.students, studentId);
  const cls = studentClass(state, student);
  const avg = generalAverage(state, studentId);
  const rank = classRank(state, studentId);
  const att = attendanceStats(state, studentId);
  const pending = pendingHomework(state, studentId);
  const pct = progressionPercent(state, studentId);
  const notifs = notificationsFor(state, user).slice(0, 5);
  const lastNotes = state.evaluations
    .filter((e) => e.scores[studentId] != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <>
      <Reveal className="hero">
        <div>
          <h1>Bonjour {student.firstName} 👋</h1>
          <p>
            Voici votre résumé scolaire — {cls.name} · {formatDate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => go('entrainement')}>
          <Icon name="brain" size={16} /> S’entraîner
        </button>
      </Reveal>
      <div className="grid g-4 mt">
        <Stat label="Moyenne générale" value={formatNote(avg)} unit="/ 20" icon="chart" tone="blue" sub={rank ? `${rank.rank}${rank.rank === 1 ? 'er' : 'e'} sur ${rank.size}` : ''} />
        <Stat label="Présence" value={att.rate == null ? '—' : `${Math.round(att.rate)} %`} icon="checkCircle" tone="green" sub={`${att.absent} absence(s) · ${att.late} retard(s)`} />
        <Stat label="Devoirs à faire" value={pending.length} icon="edit" tone="orange" sub={pending[0] ? `Prochain : ${formatDate(pending[0].dueDate)}` : 'Tout est à jour'} />
        <Stat label="Progression" value={pct == null ? '—' : `${pct >= 0 ? '+' : ''}${Math.round(pct)} %`} icon="trend" tone={pct >= 0 ? 'green' : 'red'} sub="Depuis la rentrée" />
      </div>
      <div className="grid g-main mt">
        <div className="stack">
          <Card title="Progression scolaire" action={<button className="btn btn-sm" onClick={() => go('progression')}>Détails</button>}>
            <LineChart points={progressionSeries(state, studentId)} height={200} />
          </Card>
          <Card title="Devoirs à venir" action={<button className="btn btn-sm" onClick={() => go('devoirs')}>Tous les devoirs</button>}>
            {pending.length ? (
              pending.slice(0, 4).map((h) => {
                const st = homeworkStatus(h);
                return (
                  <div className="list-item" key={h.id}>
                    <span className="notif-icon tone-orange">
                      <Icon name="edit" size={16} />
                    </span>
                    <div className="grow">
                      <div className="strong small ellipsis">{h.title}</div>
                      <div className="tiny muted">{byId(state.subjects, h.subjectId)?.name}</div>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                );
              })
            ) : (
              <Empty>Aucun devoir en attente.</Empty>
            )}
          </Card>
        </div>
        <div className="stack">
          <Card title="Cours du jour">
            <TodayCourses state={state} classId={cls.id} />
          </Card>
          <Card title="Dernières notes" action={<button className="btn btn-sm" onClick={() => go('resultats')}>Résultats</button>}>
            {lastNotes.map((e) => (
              <div className="list-item" key={e.id}>
                <div className="grow">
                  <div className="strong small">{byId(state.subjects, e.subjectId)?.name}</div>
                  <div className="tiny muted ellipsis">{e.title}</div>
                </div>
                <span className="strong num">{formatNote(e.scores[studentId])}/20</span>
              </div>
            ))}
          </Card>
          <Card title="Notifications" action={<button className="btn btn-sm" onClick={() => go('notifications')}>Tout voir</button>}>
            {notifs.map((n) => (
              <div className="list-item" key={n.id}>
                <div className="grow">
                  <div className="small strong ellipsis">{n.title}</div>
                  <div className="tiny muted">{timeAgo(n.at)}</div>
                </div>
              </div>
            ))}
            {!notifs.length && <Empty />}
          </Card>
        </div>
      </div>
    </>
  );
}

// ================================================================ Cours & supports

export function CoursView({ state, user, notify }) {
  const student = byId(state.students, user.personId);
  const cls = studentClass(state, student);
  const [subjectId, setSubjectId] = useState(state.subjects[0]?.id);
  const courses = state.courses.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const done = state.courseProgress[`${cls.id}-${subjectId}`] ?? 0;
  const subject = byId(state.subjects, subjectId);
  const icon = { pdf: 'file', video: 'video', exercices: 'edit' };
  return (
    <>
      <PageHead title="Cours" subtitle={`Programme et supports pédagogiques — ${cls.name}`} />
      <div className="pill-select" style={{ marginBottom: 18 }}>
        {state.subjects.map((s) => (
          <button key={s.id} className={s.id === subjectId ? 'on' : ''} onClick={() => setSubjectId(s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      <Card
        title={`Programme de ${subject?.name}`}
        action={
          <span className="small muted">
            {teacherName(state, subject?.teacherId)} · {Math.min(done, courses.length)}/{courses.length} chapitres vus
          </span>
        }
      >
        <Bar value={Math.min(done, courses.length)} max={courses.length || 1} tone="green" />
        <div className="stack mt" style={{ gap: 0 }}>
          {courses.map((c, i) => {
            const status = i < done ? 'fait' : i === done ? 'en_cours' : 'a_venir';
            return (
              <div className="list-item" key={c.id} style={{ alignItems: 'flex-start' }}>
                <span className={`notif-icon tone-${status === 'fait' ? 'green' : status === 'en_cours' ? 'blue' : 'navy'}`}>
                  {status === 'fait' ? <Icon name="check" size={16} /> : <span className="strong small">{c.order}</span>}
                </span>
                <div className="grow">
                  <div className="row">
                    <span className="strong">{c.title}</span>
                    {status === 'en_cours' && <Badge tone="blue">En cours</Badge>}
                    {status === 'fait' && <Badge tone="green">Vu en classe</Badge>}
                    <span className="tiny muted">{c.term}</span>
                  </div>
                  {status !== 'a_venir' ? (
                    <div className="row" style={{ marginTop: 8 }}>
                      {c.resources.map((r) => (
                        <button
                          key={r.name}
                          className="btn btn-sm"
                          onClick={() => notify(`Ouverture du support « ${r.name} » (démonstration).`)}
                        >
                          <Icon name={icon[r.type] || 'file'} size={14} /> {r.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      Supports disponibles lorsque le chapitre sera abordé.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

// ================================================================ Entraînement

function shuffle(list, seed) {
  const out = [...list];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function TrainingView({ state, user, run }) {
  const [session, setSession] = useState(null); // { subjectId, topic, questions, index, answers, checked }
  const studentId = user.personId;
  const attempts = state.trainingAttempts.filter((a) => a.studentId === studentId).sort((a, b) => b.at.localeCompare(a.at));
  const subjects = state.subjects.filter((s) => state.exercises.some((x) => x.subjectId === s.id));

  const stats = useMemo(() => {
    const out = {};
    for (const a of attempts) {
      out[a.subjectId] = out[a.subjectId] || { score: 0, total: 0, n: 0 };
      out[a.subjectId].score += a.score;
      out[a.subjectId].total += a.total;
      out[a.subjectId].n += 1;
    }
    return out;
  }, [attempts]);

  const start = (subjectId, topic = null) => {
    const pool = state.exercises.filter((x) => x.subjectId === subjectId && (!topic || x.topic === topic));
    const questions = shuffle(pool, Date.now() % 1000).slice(0, 5);
    setSession({ subjectId, topic, questions, index: 0, selected: null, checked: false, correct: 0 });
  };

  if (session) {
    const q = session.questions[session.index];
    const finished = session.index >= session.questions.length;
    const subject = byId(state.subjects, session.subjectId);
    if (finished) {
      const pct = (session.correct / session.questions.length) * 100;
      return (
        <>
          <PageHead title={`Entraînement — ${subject.name}`} subtitle={session.topic || 'Toutes notions'} />
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <motion.div
                style={{ fontSize: 48, display: 'inline-block' }}
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
              >
                {pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}
              </motion.div>
              <h2 style={{ marginTop: 8 }}>
                {session.correct} / {session.questions.length} bonnes réponses
              </h2>
              <p className="muted mt">
                {pct >= 80 ? 'Excellent travail !' : pct >= 50 ? 'C’est bien, continue à t’entraîner.' : 'Revois la correction et réessaie : c’est comme ça qu’on progresse.'}
              </p>
              <div className="row mt" style={{ justifyContent: 'center' }}>
                <button className="btn" onClick={() => setSession(null)}>
                  Retour aux matières
                </button>
                <button className="btn btn-primary" onClick={() => start(session.subjectId, session.topic)}>
                  Recommencer
                </button>
              </div>
            </div>
          </Card>
        </>
      );
    }
    const check = () => {
      const ok = session.selected === q.answer;
      const next = { ...session, checked: true, correct: session.correct + (ok ? 1 : 0) };
      setSession(next);
    };
    const advance = () => {
      const nextIndex = session.index + 1;
      if (nextIndex >= session.questions.length) {
        // Thème dominant de la série (pour le suivi des difficultés).
        const topics = session.questions.map((x) => x.topic);
        const topic = session.topic || topics.sort((a, b) => topics.filter((t) => t === b).length - topics.filter((t) => t === a).length)[0];
        run(A.recordTraining, { subjectId: session.subjectId, topic, score: session.correct, total: session.questions.length });
      }
      setSession({ ...session, index: nextIndex, selected: null, checked: false });
    };
    return (
      <>
        <PageHead title={`Entraînement — ${subject.name}`} subtitle={`Question ${session.index + 1} sur ${session.questions.length} · ${q.topic}`}>
          <button className="btn" onClick={() => setSession(null)}>
            Quitter
          </button>
        </PageHead>
        <Bar value={session.index} max={session.questions.length} />
        <Card className="mt">
          <motion.div
            key={session.index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <h2 style={{ marginBottom: 18 }}>{q.question}</h2>
            {q.choices.map((c, i) => {
              let cls = '';
              if (session.checked) cls = i === q.answer ? 'correct' : i === session.selected ? 'wrong' : '';
              else if (i === session.selected) cls = 'selected';
              return (
                <motion.button
                  key={c}
                  className={`choice ${cls}`}
                  disabled={session.checked}
                  onClick={() => setSession({ ...session, selected: i })}
                  whileHover={session.checked ? undefined : { x: 3 }}
                  whileTap={session.checked ? undefined : { scale: 0.99 }}
                  animate={
                    cls === 'wrong'
                      ? { x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.4 } }
                      : cls === 'correct'
                        ? { scale: [1, 1.025, 1], transition: { duration: 0.35 } }
                        : { x: 0, scale: 1 }
                  }
                >
                  <span className="choice-key">{String.fromCharCode(65 + i)}</span>
                  {c}
                </motion.button>
              );
            })}
            {session.checked && (
              <motion.div
                className={`alert ${session.selected === q.answer ? 'alert-green' : 'alert-red'}`}
                style={{ marginTop: 6 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <Icon name={session.selected === q.answer ? 'checkCircle' : 'alert'} size={18} />
                <div>
                  <strong>{session.selected === q.answer ? 'Bonne réponse !' : `Réponse attendue : ${q.choices[q.answer]}`}</strong>
                  <div>{q.explanation}</div>
                </div>
              </motion.div>
            )}
            <div className="row mt" style={{ justifyContent: 'flex-end' }}>
              {!session.checked ? (
                <button className="btn btn-primary" disabled={session.selected == null} onClick={check}>
                  Valider
                </button>
              ) : (
                <button className="btn btn-primary" onClick={advance}>
                  {session.index + 1 < session.questions.length ? 'Question suivante' : 'Voir mon score'} <Icon name="chevronRight" size={16} />
                </button>
              )}
            </div>
          </motion.div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead title="Espace d’entraînement" subtitle="Faites des exercices, recevez la correction et suivez votre évolution." />
      <div className="grid g-3">
        {subjects.map((s) => {
          const st = stats[s.id];
          const topics = [...new Set(state.exercises.filter((x) => x.subjectId === s.id).map((x) => x.topic))];
          return (
            <Reveal key={s.id} className="card subject-tile" whileHover={{ y: -3 }}>
              <div className="row between">
                <h3>{s.name}</h3>
                {st ? <Badge tone={st.score / st.total >= 0.7 ? 'green' : st.score / st.total >= 0.5 ? 'orange' : 'red'}>{Math.round((st.score / st.total) * 100)} %</Badge> : <Badge>Nouveau</Badge>}
              </div>
              <p className="tiny muted" style={{ marginTop: 4 }}>
                {state.exercises.filter((x) => x.subjectId === s.id).length} exercices · {st ? `${st.n} séance(s)` : 'aucune séance'}
              </p>
              <div className="row" style={{ marginTop: 12, gap: 6 }}>
                {topics.map((t) => (
                  <button key={t} className="btn btn-sm" onClick={() => start(s.id, t)}>
                    {t}
                  </button>
                ))}
              </div>
              <button className="btn btn-primary btn-block mt" onClick={() => start(s.id)}>
                <Icon name="target" size={16} /> S’entraîner
              </button>
            </Reveal>
          );
        })}
      </div>
      <Card className="mt" title="Mes dernières séances" flush>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Matière</th>
              <th>Notion</th>
              <th className="r">Score</th>
            </tr>
          </thead>
          <tbody>
            {attempts.slice(0, 10).map((a) => (
              <tr key={a.id}>
                <td className="muted nowrap">{timeAgo(a.at)}</td>
                <td>{byId(state.subjects, a.subjectId)?.name}</td>
                <td>{a.topic}</td>
                <td className="r">
                  <Badge tone={a.score / a.total >= 0.7 ? 'green' : a.score / a.total >= 0.5 ? 'orange' : 'red'}>
                    {a.score}/{a.total}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!attempts.length && <Empty>Aucune séance pour le moment.</Empty>}
      </Card>
    </>
  );
}

