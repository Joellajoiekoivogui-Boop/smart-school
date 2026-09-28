'use client';
/** Compte (mot de passe) pour tous les rôles, et Sécurité & journal pour l'administration. */
import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { Badge, Card, Empty, Field, Modal, PageHead, PhotoPicker, Select, Stat, Tabs } from '../ui';
import { photoOf } from '@/lib/avatars';
import { byId, formatDate, timeAgo } from '@/lib/compute';
import { PERMISSIONS, ROLES } from '@/lib/permissions';
import { downloadCSV } from '@/lib/csv';
import * as A from '@/lib/actions';

export function AccountView({ state, user, run, go, role }) {
  const person = role === 'eleve' ? byId(state.students, user.personId) : role === 'enseignant' ? byId(state.teachers, user.personId) : null;
  const kind = role === 'eleve' ? 'student' : 'teacher';
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      run(() => {
        throw new Error('Les deux nouveaux mots de passe ne correspondent pas.');
      });
      return;
    }
    const res = run(A.changePassword, { current: form.current, next: form.next }, '🎉 Mot de passe modifié.');
    if (res.ok) {
      setForm({ current: '', next: '', confirm: '' });
      if (user.mustChangePassword) go('');
    }
  };
  return (
    <>
      <PageHead title="Mon compte" subtitle="Identifiants et sécurité de votre accès à N°1." />
      {user.mustChangePassword && (
        <div className="alert alert-orange" style={{ marginBottom: 18 }}>
          <Icon name="lock" size={18} />
          <div>
            <strong>Mot de passe provisoire.</strong> Choisissez votre propre mot de passe pour continuer à utiliser N°1 en toute sécurité.
          </div>
        </div>
      )}
      {person && (
        <Card title="Ma photo de profil" className="mb-card">
          <PhotoPicker
            src={photoOf(person, kind)}
            name={user.name}
            hasPhoto={Boolean(person.photo)}
            onChange={(dataUrl) => run(A.setPhoto, { kind, id: person.id, dataUrl }, dataUrl ? '🎉 Photo de profil enregistrée !' : 'Photo retirée.')}
          />
          <p className="tiny muted mt">Visible par tes enseignants, l’administration et ta famille. Choisis une photo nette, de face, sur fond clair.</p>
        </Card>
      )}
      <div className="grid g-2">
        <Card title="Changer mon mot de passe">
          <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
            <Field label="Mot de passe actuel">
              <input className="input" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} required />
            </Field>
            <Field label="Nouveau mot de passe">
              <input className="input" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} required />
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
            </Field>
            <p className="tiny muted">8 caractères minimum, avec au moins une lettre et un chiffre.</p>
            <button className="btn btn-primary" type="submit">
              <Icon name="lock" size={16} /> Enregistrer
            </button>
          </form>
        </Card>
        <Card title="Mon accès">
          <dl className="kv">
            <dt>Nom</dt>
            <dd>{user.name}</dd>
            <dt>Identifiant</dt>
            <dd>{user.email}</dd>
            <dt>Rôle</dt>
            <dd>{ROLES[role].label}</dd>
            <dt>Mot de passe</dt>
            <dd>{user.passwordChangedAt ? `modifié ${timeAgo(user.passwordChangedAt)}` : 'initial'}</dd>
          </dl>
          <div className="alert alert-blue small mt">
            <Icon name="shield" size={16} />
            <div>
              Votre mot de passe n’est jamais conservé en clair. Après 5 essais erronés, l’accès est bloqué 5 minutes, et la session se ferme après
              30 minutes d’inactivité.
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

const ROLE_TONE = { admin: 'navy', enseignant: 'blue', parent: 'green', eleve: 'orange' };

export function AuditView({ state, run }) {
  const [tab, setTab] = useState('journal');
  const [who, setWho] = useState('');
  const [query, setQuery] = useState('');
  const [reset, setReset] = useState(null);
  const log = state.auditLog.filter((l) => (!who || l.userId === who) && (!query || l.label.toLowerCase().includes(query.toLowerCase())));
  const actors = useMemo(() => [...new Set(state.auditLog.map((l) => l.userId))].map((id) => byId(state.users, id)).filter(Boolean), [state.auditLog, state.users]);
  const accounts = state.users.filter((u) => !query || `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()));
  const describe = (d) =>
    Object.entries(d || {})
      .map(([k, v]) => {
        if (k === 'studentId') return byId(state.students, v) ? `${byId(state.students, v).firstName} ${byId(state.students, v).lastName}` : v;
        if (k === 'classId') return byId(state.classes, v)?.name || v;
        if (k === 'subjectId') return byId(state.subjects, v)?.name || v;
        if (k === 'userId') return byId(state.users, v)?.name || v;
        return String(v);
      })
      .join(' · ');
  return (
    <>
      <PageHead title="Sécurité & journal" subtitle="Qui a fait quoi, quand — et gestion des accès.">
        {tab === 'journal' && (
          <button
            className="btn"
            onClick={() =>
              downloadCSV('journal-n1', [
                ['Date', 'Utilisateur', 'Action', 'Détail'],
                ...log.map((l) => [new Date(l.at).toLocaleString('fr-FR'), byId(state.users, l.userId)?.name || l.userId, l.label, describe(l.detail)]),
              ])
            }
          >
            <Icon name="download" size={16} /> Exporter (Excel)
          </button>
        )}
      </PageHead>
      <div className="grid g-3" style={{ marginBottom: 18 }}>
        <Stat label="Actions tracées" value={state.auditLog.length} icon="shield" tone="blue" sub="Notes, paiements, dossiers, accès…" />
        <Stat label="Comptes" value={state.users.length} icon="users" tone="navy" sub={`${state.users.filter((u) => u.mustChangePassword).length} mot(s) de passe provisoire(s)`} />
        <Stat label="Rôles" value={Object.keys(PERMISSIONS).length} icon="lock" tone="green" sub="Permissions et périmètres contrôlés" />
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'journal', label: 'Journal des actions' }, { value: 'comptes', label: 'Comptes & accès' }]} />
        {tab === 'journal' && (
          <Select className="select input-sm" style={{ width: 220 }} value={who} onChange={setWho} options={[{ value: '', label: 'Tous les utilisateurs' }, ...actors.map((u) => ({ value: u.id, label: u.name }))]} />
        )}
        <input className="input input-sm" style={{ maxWidth: 240 }} placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {tab === 'journal' ? (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Quand</th>
                  <th>Qui</th>
                  <th>Action</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, 200).map((l) => {
                  const u = byId(state.users, l.userId);
                  return (
                    <tr key={l.id}>
                      <td className="nowrap small muted" title={new Date(l.at).toLocaleString('fr-FR')}>
                        {timeAgo(l.at)}
                      </td>
                      <td className="small">
                        <span className="strong">{u?.name || l.userId}</span> <Badge tone={ROLE_TONE[u?.role] || 'gray'}>{ROLES[u?.role]?.label || '—'}</Badge>
                      </td>
                      <td className="small">{l.label}</td>
                      <td className="small muted">{describe(l.detail)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!log.length && <Empty>Aucune action enregistrée pour le moment. Les prochaines modifications apparaîtront ici.</Empty>}
          </div>
        </Card>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Compte</th>
                  <th>Identifiant</th>
                  <th>Rôle</th>
                  <th>Mot de passe</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {accounts.slice(0, 150).map((u) => (
                  <tr key={u.id}>
                    <td className="strong small">{u.name}</td>
                    <td className="small muted">{u.email}</td>
                    <td>
                      <Badge tone={ROLE_TONE[u.role]}>{ROLES[u.role].label}</Badge>
                    </td>
                    <td className="small">{u.mustChangePassword ? <Badge tone="orange">Provisoire</Badge> : u.passwordChangedAt ? `modifié le ${formatDate(u.passwordChangedAt)}` : 'initial'}</td>
                    <td className="r">
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          if (!window.confirm(`Réinitialiser le mot de passe de ${u.name} ?`)) return;
                          const res = run(A.resetPassword, { userId: u.id }, 'Mot de passe réinitialisé.');
                          if (res.ok) setReset({ ...res.result, name: u.name });
                        }}
                      >
                        Réinitialiser
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {reset && <CredentialsModal title="Mot de passe provisoire" credentials={[{ name: reset.name, email: reset.email, password: reset.temp }]} onClose={() => setReset(null)} />}
    </>
  );
}

/** Affiche une seule fois des identifiants provisoires à transmettre. */
export function CredentialsModal({ title = 'Identifiants créés', credentials, onClose }) {
  return (
    <Modal title={title} onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>J’ai noté les identifiants</button>}>
      <div className="alert alert-orange small" style={{ marginBottom: 14 }}>
        <Icon name="lock" size={16} />
        <div>Ces mots de passe provisoires ne seront plus affichés. Transmettez-les aux personnes concernées : ils devront les changer à la première connexion.</div>
      </div>
      {credentials.map((c) => (
        <dl className="kv" key={c.email} style={{ marginBottom: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 10 }}>
          <dt>Nom</dt>
          <dd>{c.name}</dd>
          <dt>Identifiant</dt>
          <dd>{c.email}</dd>
          <dt>Mot de passe</dt>
          <dd className="num strong" style={{ fontSize: 16 }}>
            {c.password}
          </dd>
        </dl>
      ))}
    </Modal>
  );
}
