'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import Icon from '@/components/Icon';

const DEMO = [
  { role: 'Élève', email: 'mohamed.camara@n1.school', password: 'eleve123', who: 'Mohamed Camara — 5e A' },
  { role: 'Parent', email: 'parent.camara@n1.school', password: 'parent123', who: 'M. Sékou Camara' },
  { role: 'Enseignant', email: 'k.diallo@n1.school', password: 'prof123', who: 'Mme Kadiatou Diallo — Maths' },
  { role: 'Administration', email: 'admin@n1.school', password: 'admin123', who: 'Direction des études' },
];

const SPACES = [
  { title: 'Élève', text: 'Notes, devoirs, cours, entraînement et progression.' },
  { title: 'Parent', text: 'Résultats, présences, sorties et paiements de vos enfants.' },
  { title: 'Enseignant', text: 'Classes, appel, notes, devoirs et suivi individuel.' },
  { title: 'Administration', text: 'Élèves, emplois du temps, scolarité et communication.' },
];

export default function LoginPage() {
  const { ready, user, login } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && user) router.replace(`/${user.role}`);
  }, [ready, user, router]);

  const submit = (e, creds) => {
    e?.preventDefault();
    const res = login(creds?.email ?? email, creds?.password ?? password);
    if (res.error) setError(res.error);
    else router.replace(res.user.mustChangePassword ? `/${res.user.role}/compte` : `/${res.user.role}`);
  };

  return (
    <div className="login">
      <aside className="login-side">
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">N°1</span>
          <div>
            <div className="brand-name">N°1</div>
            <div className="brand-sub">Gestion scolaire</div>
          </div>
        </div>
        <div>
          <h1>L’école connectée, au même endroit.</h1>
          <p>
            N°1 connecte élèves, parents, enseignants et administration : suivi pédagogique, présences, devoirs,
            résultats et scolarité, dans une seule plateforme.
          </p>
        </div>
        <div className="login-roles">
          {SPACES.map((s) => (
            <div className="login-role" key={s.title}>
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="login-main">
        <div className="login-box">
          <h2 style={{ fontSize: 24 }}>Connexion</h2>
          <p className="muted" style={{ marginTop: 4, marginBottom: 24 }}>
            Accédez à votre espace personnel.
          </p>
          <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
            <label className="field">
              <span className="field-label">Adresse e-mail</span>
              <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="field">
              <span className="field-label">Mot de passe</span>
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && (
              <div className="alert alert-red">
                <Icon name="alert" size={18} /> {error}
              </div>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={!ready}>
              Se connecter
            </button>
          </form>

          <div style={{ marginTop: 32 }}>
            <p className="small strong" style={{ marginBottom: 10 }}>
              Comptes de démonstration
            </p>
            <div className="demo-accounts">
              {DEMO.map((d) => (
                <button key={d.email} className="demo-account" disabled={!ready} onClick={() => submit(null, d)}>
                  <strong>{d.role}</strong>
                  <span>{d.who}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
