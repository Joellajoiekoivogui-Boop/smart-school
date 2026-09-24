'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useStore } from '@/lib/store';
import Icon from '@/components/Icon';

const DEMO = [
  { role: 'Élève', email: 'mohamed.camara@n1.school', password: 'eleve123', who: 'Mohamed Camara — 5e A', icon: 'user', tint: 'from-amber-400 to-orange-500' },
  { role: 'Parent', email: 'parent.camara@n1.school', password: 'parent123', who: 'M. Sékou Camara', icon: 'child', tint: 'from-emerald-400 to-teal-500' },
  { role: 'Enseignant', email: 'k.diallo@n1.school', password: 'prof123', who: 'Mme Kadiatou Diallo — Maths', icon: 'teacher', tint: 'from-sky-400 to-blue-600' },
  { role: 'Administration', email: 'admin@n1.school', password: 'admin123', who: 'Direction des études', icon: 'school', tint: 'from-indigo-400 to-violet-600' },
];

const SPACES = [
  { title: 'Élève', text: 'Notes, devoirs, assistant IA, entraînement et progression.', icon: 'brain' },
  { title: 'Parent', text: 'Présences, sorties, résultats et paiements Mobile Money.', icon: 'child' },
  { title: 'Enseignant', text: 'Appel, notes, devoirs et fiche de vie de chaque élève.', icon: 'teacher' },
  { title: 'Administration', text: 'Scolarité, bulletins, alertes et emplois du temps.', icon: 'school' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 24, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 240, damping: 22 } } };

export default function LoginPage() {
  const { ready, user, login } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (ready && user) router.replace(`/${user.role}`);
  }, [ready, user, router]);

  const submit = (e, creds) => {
    e?.preventDefault();
    const res = login(creds?.email ?? email, creds?.password ?? password);
    if (res.error) {
      setError(res.error);
      setShake((n) => n + 1);
    } else router.replace(res.user.mustChangePassword ? `/${res.user.role}/compte` : `/${res.user.role}`);
  };

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-slate-950 lg:grid-cols-[1.15fr_1fr]">
      {/* Fond animé */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_40%,#2563eb_70%,#4f46e5_100%)] bg-[length:220%_220%] animate-gradient" />
        <motion.div
          className="absolute -left-24 top-[-10%] h-[32rem] w-[32rem] rounded-full bg-sky-400/30 blur-3xl"
          animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0], scale: [1, 1.15, 0.95, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-20%] left-[35%] h-[28rem] w-[28rem] rounded-full bg-indigo-500/40 blur-3xl"
          animate={{ x: [0, -70, 30, 0], y: [0, -50, 20, 0], scale: [1, 0.9, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[-8%] top-[30%] h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_70%)]" />
      </div>

      {/* Présentation */}
      <aside className="relative z-10 flex flex-col justify-between gap-10 px-6 py-8 text-white sm:px-12 sm:py-12">
        <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <motion.span
            className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 font-display text-lg font-extrabold shadow-[0_10px_30px_-10px_rgba(59,130,246,0.9)] ring-1 ring-white/25 backdrop-blur"
            initial={{ rotate: -120, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
          >
            N°1
          </motion.span>
          <div>
            <div className="font-display text-lg font-bold leading-tight">N°1</div>
            <div className="text-xs text-blue-100/80">Gestion scolaire · Guinée</div>
          </div>
        </motion.div>

        <div className="max-w-xl">
          <motion.p
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100 ring-1 ring-white/20 backdrop-blur"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Élèves · Parents · Enseignants · Administration
          </motion.p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            {['L’école', 'connectée,', 'au', 'même', 'endroit.'].map((w, i) => (
              <motion.span
                key={w}
                className={`mr-3 inline-block ${i === 1 ? 'bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent' : ''}`}
                initial={{ opacity: 0, y: 30, rotateX: -60 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.25 + i * 0.08 }}
              >
                {w}
              </motion.span>
            ))}
          </h1>
          <motion.p className="mt-5 max-w-md text-base text-blue-100/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            Suivi pédagogique, présences, devoirs, résultats et scolarité réunis dans une seule plateforme, pensée pour les écoles guinéennes.
          </motion.p>
        </div>

        <motion.div className="hidden max-w-2xl grid-cols-2 gap-3 lg:grid" variants={container} initial="hidden" animate="show">
          {SPACES.map((s) => (
            <motion.div
              key={s.title}
              variants={item}
              whileHover={{ y: -4, scale: 1.02 }}
              className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/15"
            >
              <div className="mb-2 flex items-center gap-2 font-display font-bold">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
                  <Icon name={s.icon} size={16} />
                </span>
                {s.title}
              </div>
              <p className="text-sm text-blue-100/80">{s.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </aside>

      {/* Connexion */}
      <main className="relative z-10 grid place-items-center px-4 py-10 sm:px-8">
        <motion.div
          key={shake}
          className="w-full max-w-md rounded-3xl bg-white/95 p-7 shadow-[0_30px_80px_-20px_rgba(2,6,23,0.6)] ring-1 ring-white/60 backdrop-blur-xl sm:p-9"
          initial={shake ? { x: 0 } : { opacity: 0, y: 40, scale: 0.95 }}
          animate={shake ? { x: [0, -12, 12, -8, 8, 0] } : { opacity: 1, y: 0, scale: 1 }}
          transition={shake ? { duration: 0.45 } : { type: 'spring', stiffness: 180, damping: 20, delay: 0.2 }}
        >
          <h2 className="font-display text-2xl font-bold text-slate-900">Bon retour 👋</h2>
          <p className="mb-7 mt-1 text-sm text-slate-500">Connectez-vous à votre espace N°1.</p>
          <form className="space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Adresse e-mail</span>
              <input
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Mot de passe</span>
              <input
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/15"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <motion.div
                className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Icon name="alert" size={16} /> {error}
              </motion.div>
            )}
            <motion.button
              className="group relative h-12 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 via-brand to-indigo-600 font-semibold text-white shadow-glow disabled:opacity-50"
              type="submit"
              disabled={!ready}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">Se connecter</span>
              <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-full skew-x-[-20deg] bg-white/30 group-hover:animate-shine" />
            </motion.button>
          </form>

          <div className="mt-8">
            <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              Comptes de démonstration
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <motion.div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" variants={container} initial="hidden" animate="show">
              {DEMO.map((d) => (
                <motion.button
                  key={d.email}
                  variants={item}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:border-brand/40 hover:shadow-lg disabled:opacity-50"
                  disabled={!ready}
                  onClick={() => submit(null, d)}
                >
                  <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl bg-gradient-to-br ${d.tint} text-white shadow-md transition-transform group-hover:rotate-6`}>
                    <Icon name={d.icon} size={18} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm text-slate-900">{d.role}</strong>
                    <span className="block truncate text-xs text-slate-500">{d.who}</span>
                  </span>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
