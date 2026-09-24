'use client';
/** Assistant IA scolaire : expliquer une leçon, générer des exercices, poser une question. */
import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { Badge, Card, PageHead } from '../ui';
import { motion, EASE } from '../motion';
import { Typewriter } from '../fx';
import { byId, userForPerson } from '@/lib/compute';
import { assistantContext, localAnswer, remoteAnswer } from '@/lib/assistant';
import { recommendations } from '@/lib/gamification';

const MODES = [
  { id: 'expliquer', label: 'Expliquer une leçon', icon: 'book', placeholder: 'Ex. : Explique-moi les fractions' },
  { id: 'exercices', label: 'Générer des exercices', icon: 'edit', placeholder: 'Ex. : Des exercices sur la loi d’Ohm' },
  { id: 'question', label: 'Poser une question', icon: 'message', placeholder: 'Ex. : Combien vaut 1/2 + 1/4 ?' },
];

const storeKey = (id) => `n1_assistant_${id}`;

function loadHistory(id) {
  try {
    return JSON.parse(localStorage.getItem(storeKey(id)) || '[]');
  } catch {
    return [];
  }
}

export function AssistantView({ state, user, go }) {
  const studentId = user.personId;
  const student = byId(state.students, studentId);
  const [mode, setMode] = useState('expliquer');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(null); // null = inconnu, true = IA, false = local
  const endRef = useRef(null);
  const mountedAt = useRef(Date.now());

  useEffect(() => setMessages(loadHistory(studentId)), [studentId]);
  useEffect(() => {
    try {
      localStorage.setItem(storeKey(studentId), JSON.stringify(messages.slice(-30)));
    } catch {}
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, studentId]);

  const ask = async (text, m = mode) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: 'user', content: q, mode: m, at: Date.now() }];
    setMessages(next);
    setInput('');
    setBusy(true);
    const history = next.slice(-12).map(({ role, content }) => ({ role, content }));
    const remote = await remoteAnswer(history, assistantContext(state, studentId), m);
    if (remote) {
      setOnline(true);
      setMessages((cur) => [...cur, { role: 'assistant', content: remote, source: 'ia', at: Date.now() }]);
    } else {
      setOnline(false);
      const local = localAnswer(state, studentId, m, q);
      setMessages((cur) => [...cur, { role: 'assistant', content: local.text, source: 'local', quiz: local.quiz, solution: local.solution, resources: local.resources, suggestTeacher: local.suggestTeacher, at: Date.now() }]);
    }
    setBusy(false);
  };

  const recos = recommendations(state, studentId, 3);
  const current = MODES.find((x) => x.id === mode);
  const teacherOf = (subjectId) => {
    const s = byId(state.subjects, subjectId);
    return s?.teacherId ? userForPerson(state, 'enseignant', s.teacherId) : null;
  };

  return (
    <>
      <PageHead title="Assistant IA" subtitle={`Ton assistant pour comprendre tes leçons et t’entraîner, ${student.firstName}. Il te guide avec des indices avant de donner la réponse.`}>
        {online === true && <Badge tone="green" icon="sparkles">IA connectée</Badge>}
        {online === false && <Badge tone="orange" icon="phone">Mode hors ligne</Badge>}
        {messages.length > 0 && (
          <button className="btn btn-sm" onClick={() => setMessages([])}>
            Nouvelle conversation
          </button>
        )}
      </PageHead>
      <div className="grid g-main">
        <Card flush>
          <div className="assistant">
            <div className="assistant-modes">
              {MODES.map((m) => (
                <button key={m.id} className={`assistant-mode ${mode === m.id ? 'on' : ''}`} onClick={() => setMode(m.id)} aria-pressed={mode === m.id}>
                  <Icon name={m.icon} size={16} /> {m.label}
                </button>
              ))}
            </div>
            <div className="chat-messages assistant-thread" aria-live="polite">
              {!messages.length && (
                <div className="assistant-empty">
                  <span className="stat-icon tone-blue" style={{ width: 56, height: 56 }}>
                    <Icon name="sparkles" size={28} />
                  </span>
                  <h3 style={{ marginTop: 12 }}>Que veux-tu travailler aujourd’hui ?</h3>
                  <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                    {['Explique-moi les fractions', 'Des exercices sur la loi d’Ohm', 'Quand la Guinée est-elle devenue indépendante ?'].map((s, i) => (
                      <button key={s} className="btn btn-sm" onClick={() => ask(s, MODES[i].id)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={`${m.at}-${i}`}
                  className={`bubble ${m.role === 'user' ? 'mine' : 'assistant-bubble'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {m.role === 'assistant' && m.at > mountedAt.current ? (
                      <Typewriter text={m.content} onDone={() => endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })} />
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.solution && <Solution text={m.solution} />}
                  {m.quiz && <Quiz quiz={m.quiz} />}
                  {m.resources?.length > 0 && (
                    <div className="row" style={{ marginTop: 10, gap: 6 }}>
                      {m.resources.map((r) => (
                        <button key={r.id} className="btn btn-sm" onClick={() => go('bibliotheque')}>
                          <Icon name="library" size={14} /> {r.title}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.suggestTeacher && (
                    <button className="btn btn-sm mt" onClick={() => go('enseignants')}>
                      <Icon name="teacher" size={14} /> Poser la question à un enseignant
                    </button>
                  )}
                  {m.role === 'assistant' && <div className="bubble-time">{m.source === 'ia' ? 'Assistant IA' : 'Assistant N°1 (hors ligne)'}</div>}
                </motion.div>
              ))}
              {busy && (
                <div className="bubble assistant-bubble typing" aria-label="L’assistant réfléchit">
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <div ref={endRef} />
            </div>
            <form
              className="chat-compose"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <input className="input" placeholder={current.placeholder} value={input} onChange={(e) => setInput(e.target.value)} aria-label="Ta question" maxLength={2000} />
              <button className="btn btn-primary" type="submit" disabled={!input.trim() || busy}>
                <Icon name="send" size={16} /> Envoyer
              </button>
            </form>
          </div>
        </Card>
        <div className="stack">
          <Card title="Suggestions pour toi">
            {recos.map((r) => (
              <button key={`${r.subjectId}-${r.topic}`} className="list-item assistant-suggestion" onClick={() => ask(`Explique-moi : ${r.topic} (${byId(state.subjects, r.subjectId)?.name})`, 'expliquer')}>
                <span className="notif-icon tone-orange">
                  <Icon name="target" size={16} />
                </span>
                <div className="grow" style={{ textAlign: 'left' }}>
                  <div className="strong small">{r.topic}</div>
                  <div className="tiny muted">
                    {byId(state.subjects, r.subjectId)?.name} · {r.reason}
                  </div>
                </div>
              </button>
            ))}
          </Card>
          <Card title="Bon à savoir">
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>L’assistant t’aide à comprendre : il ne fait pas tes devoirs à ta place.</li>
              <li>Vérifie toujours avec ton cours et ton enseignant.</li>
              <li>Sans connexion, il répond avec les exercices et fiches de N°1.</li>
            </ul>
            {recos[0] && teacherOf(recos[0].subjectId) && (
              <button className="btn btn-block mt" onClick={() => go(`messages/${teacherOf(recos[0].subjectId).id}`)}>
                <Icon name="message" size={16} /> Écrire à mon enseignant
              </button>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Solution({ text }) {
  const [shown, setShown] = useState(false);
  return shown ? (
    <div className="alert alert-green small" style={{ marginTop: 10 }}>
      <Icon name="checkCircle" size={16} /> {text}
    </div>
  ) : (
    <button className="btn btn-sm mt" onClick={() => setShown(true)}>
      Voir la solution
    </button>
  );
}

function Quiz({ quiz }) {
  const [answers, setAnswers] = useState({});
  return (
    <div className="stack" style={{ gap: 12, marginTop: 12 }}>
      {quiz.map((q, n) => {
        const a = answers[q.id];
        return (
          <div key={q.id} className="assistant-quiz">
            <div className="strong small">
              {n + 1}. {q.question}
            </div>
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              {q.choices.map((c, i) => (
                <button
                  key={c}
                  className={`btn btn-sm ${a == null ? '' : i === q.answer ? 'btn-success' : i === a ? 'btn-danger' : ''}`}
                  disabled={a != null}
                  onClick={() => setAnswers((x) => ({ ...x, [q.id]: i }))}
                >
                  {c}
                </button>
              ))}
            </div>
            {a != null && (
              <p className="tiny" style={{ marginTop: 6 }}>
                {a === q.answer ? '✅ Bravo ! ' : '❌ Pas tout à fait. '}
                {q.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
