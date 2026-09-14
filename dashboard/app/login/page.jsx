'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken, API_BASE } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, motDePasse } });
      setToken(data.token);
      router.replace('/dashboard');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="brand-mark">V</div>
          <div>
            <div className="brand-name">Vigie Commerciale</div>
            <div className="brand-tag">Console agent IA</div>
          </div>
        </div>

        {!API_BASE && (
          <p className="login-warning">
            Backend non configuré : ajoutez <code>NEXT_PUBLIC_API_BASE_URL</code> dans les
            variables d&apos;environnement Vercel, puis redéployez.
          </p>
        )}

        <label htmlFor="email">
          Email
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label htmlFor="motDePasse">
          Mot de passe
          <input
            id="motDePasse"
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {erreur && <p className="login-error">{erreur}</p>}

        <button type="submit" className="btn btn-accent" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
