'use client';
import Icon from '../Icon';
import { Avatar, Badge, Bar, Card, Empty, LineChart, PageHead, Stat } from '../ui';
import {
  attendanceStats,
  byId,
  childrenOf,
  classRank,
  formatDate,
  formatMoney,
  formatNote,
  fullName,
  generalAverage,
  lastExit,
  notificationsFor,
  paymentStatus,
  pendingHomework,
  progressionSeries,
  studentClass,
  timeAgo,
  todayAttendance,
} from '@/lib/compute';
import { AttendanceBadge, todayISO } from './shared';

function childSummary(state, childId) {
  const att = todayAttendance(state, childId, todayISO());
  const exit = lastExit(state, childId);
  return {
    child: byId(state.students, childId),
    average: generalAverage(state, childId),
    rank: classRank(state, childId),
    attendance: attendanceStats(state, childId),
    today: att,
    exit,
    pending: pendingHomework(state, childId),
    pay: paymentStatus(state, childId),
  };
}

export function ParentDashboard({ state, user, studentId, go }) {
  const parent = byId(state.parents, user.personId);
  const s = childSummary(state, studentId);
  const cls = studentClass(state, s.child);
  const notifs = notificationsFor(state, user).slice(0, 6);
  return (
    <>
      <div className="hero">
        <div>
          <h1>
            Bonjour, {parent.title} {parent.lastName} 👋
          </h1>
          <p>Voici la situation scolaire de {childrenOf(state, user).length > 1 ? 'vos enfants' : 'votre enfant'}.</p>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <Avatar name={fullName(s.child)} dark />
          <div>
            <div className="strong">{fullName(s.child)}</div>
            <div className="small" style={{ color: '#cbd5e1' }}>
              {cls.name}
            </div>
          </div>
        </div>
      </div>

      <div className="grid g-4 mt">
        <Stat label="Moyenne" value={formatNote(s.average)} unit="/ 20" icon="chart" tone="blue" sub={s.rank ? `${s.rank.rank}${s.rank.rank === 1 ? 'er' : 'e'} sur ${s.rank.size} élèves` : ''} />
        <Stat label="Présence" value={s.attendance.rate == null ? '—' : `${Math.round(s.attendance.rate)} %`} icon="checkCircle" tone="green" sub={`${s.attendance.absent} absence(s) · ${s.attendance.late} retard(s)`} />
        <Stat label="Scolarité" value={`${Math.round(s.pay.percent)} %`} unit="payé" icon="wallet" tone={s.pay.overdue > 0 ? 'red' : 'green'} sub={s.pay.balance ? `Reste ${formatMoney(s.pay.balance)}` : 'Soldée'}>
          <Bar value={s.pay.percent} tone={s.pay.overdue > 0 ? 'red' : 'green'} />
        </Stat>
        <Stat label="Devoirs" value={s.pending.length} unit="à faire" icon="edit" tone="orange" sub={s.pending[0] ? `Prochain le ${formatDate(s.pending[0].dueDate)}` : 'Rien en attente'} />
      </div>

      <div className="grid g-main mt">
        <div className="stack">
          <Card title="Progression scolaire" action={<button className="btn btn-sm" onClick={() => go('resultats')}>Résultats</button>}>
            <LineChart points={progressionSeries(state, studentId)} height={200} />
          </Card>
          <Card title="Dernières activités">
            {notifs.length ? (
              notifs.map((n) => (
                <div className="list-item" key={n.id}>
                  <span className="dot" style={{ background: n.read ? 'var(--gray-300)' : 'var(--blue)' }} />
                  <div className="grow">
                    <div className="small strong">{n.title}</div>
                    <div className="tiny muted ellipsis">{n.body}</div>
                  </div>
                  <span className="tiny muted nowrap">{timeAgo(n.at)}</span>
                </div>
              ))
            ) : (
              <Empty />
            )}
          </Card>
        </div>
        <div className="stack">
          <Card title="Aujourd’hui">
            <dl className="kv">
              <dt>Présence</dt>
              <dd>{s.today ? <AttendanceBadge status={s.today.status} /> : <Badge>Appel non fait</Badge>}</dd>
              <dt>Arrivée</dt>
              <dd className="num">{s.today?.arrival || '—'}</dd>
              <dt>Dernière sortie</dt>
              <dd className="num">
                {s.exit ? `${s.exit.time.replace(':', 'h')} · ${formatDate(s.exit.date, { weekday: 'short', day: 'numeric', month: 'short' })}` : '—'}
              </dd>
            </dl>
            <button className="btn btn-block mt" onClick={() => go('presences')}>
              Historique des présences
            </button>
          </Card>
          <Card title="Scolarité">
            {s.pay.overdue > 0 ? (
              <div className="alert alert-red small">
                <Icon name="alert" size={16} /> {formatMoney(s.pay.overdue)} en retard
              </div>
            ) : (
              <div className="alert alert-green small">
                <Icon name="checkCircle" size={16} /> Aucun impayé échu
              </div>
            )}
            {s.pay.installments.map((i) => (
              <div className="list-item" key={i.id}>
                <div className="grow small">{i.label}</div>
                <span className="small num">{formatMoney(i.amount)}</span>
                <Badge tone={{ payee: 'green', partielle: 'orange', en_retard: 'red', a_venir: 'gray' }[i.status]}>
                  {{ payee: 'Payée', partielle: 'Partielle', en_retard: 'En retard', a_venir: 'À venir' }[i.status]}
                </Badge>
              </div>
            ))}
            <button className="btn btn-block mt" onClick={() => go('paiements')}>
              Détail des paiements
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}

export function ChildrenView({ state, user, go }) {
  const kids = childrenOf(state, user);
  return (
    <>
      <PageHead title="Mes enfants" subtitle="Une vision globale de la situation scolaire de chacun." />
      <div className="grid g-2">
        {kids.map((k) => {
          const s = childSummary(state, k.id);
          const cls = studentClass(state, k);
          return (
            <Card key={k.id}>
              <div className="row">
                <Avatar name={fullName(k)} size="lg" />
                <div>
                  <h2>{fullName(k)}</h2>
                  <div className="small muted">
                    {cls.name} · Matricule {k.matricule}
                  </div>
                </div>
              </div>
              <dl className="kv mt">
                <dt>Présence</dt>
                <dd>
                  {s.today ? <AttendanceBadge status={s.today.status} /> : <Badge>Appel non fait</Badge>}
                </dd>
                <dt>Dernière sortie</dt>
                <dd className="num">{s.exit ? s.exit.time.replace(':', 'h') : '—'}</dd>
                <dt>Moyenne générale</dt>
                <dd className="num">{formatNote(s.average)}/20</dd>
                <dt>Devoirs en attente</dt>
                <dd>{s.pending.length}</dd>
                <dt>Scolarité</dt>
                <dd>
                  {Math.round(s.pay.percent)} % payée
                  <Bar value={s.pay.percent} tone={s.pay.overdue > 0 ? 'red' : 'green'} />
                </dd>
              </dl>
            </Card>
          );
        })}
      </div>
      {!kids.length && <Empty>Aucun enfant rattaché.</Empty>}
      <p className="small muted mt">Utilisez le sélecteur en haut de page pour changer d’enfant dans les autres rubriques.</p>
    </>
  );
}
