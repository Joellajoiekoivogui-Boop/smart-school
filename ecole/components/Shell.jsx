'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { NAVIGATION, sectionLabel } from '@/lib/navigation';
import { ROLES } from '@/lib/permissions';
import { childrenOf, notificationsFor, studentClass } from '@/lib/compute';
import { motion } from 'motion/react';
import Icon from './Icon';
import { Page } from './motion';
import { RippleLayer, ScrollProgress, Splash } from './fx';
import { Avatar } from './ui';
import { VIEWS } from './views';

const CHILD_KEY = 'n1_child';

export default function Shell({ role, segments }) {
  const store = useStore();
  const { ready, user, state, logout } = store;
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [childId, setChildId] = useState(null);

  const searchParams = useSearchParams();
  const section = segments[0] || '';
  // Le site est exporté en statique : les identifiants (élève, contact…) passent
  // en paramètre `?id=` plutôt que dans le chemin, pour que chaque page existe
  // en fichier HTML.
  const id = searchParams.get('id');
  const params = id ? [id] : [];

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (user.role !== role) router.replace(`/${user.role}`);
    // Mot de passe provisoire : changement obligatoire avant d'aller plus loin.
    else if (user.mustChangePassword && section !== 'compte') router.replace(`/${role}/compte`);
  }, [ready, user, role, router, section]);

  const children = useMemo(() => (user && state ? childrenOf(state, user) : []), [state, user]);

  useEffect(() => {
    if (!children.length) return;
    let stored = null;
    try {
      stored = localStorage.getItem(CHILD_KEY);
    } catch {}
    setChildId((cur) => {
      if (cur && children.some((c) => c.id === cur)) return cur;
      return children.some((c) => c.id === stored) ? stored : children[0].id;
    });
  }, [children]);

  useEffect(() => setMenuOpen(false), [section]);

  if (!ready || !user || user.role !== role) return <Splash />;

  const nav = NAVIGATION[role];
  const item = nav.find((i) => i.key === section);
  const View = VIEWS[role]?.[section];

  const unreadMessages = state.messages.filter((m) => m.to === user.id && !m.read).length;
  const unreadNotifs = notificationsFor(state, user).filter((n) => !n.read).length;
  const counts = { messages: unreadMessages, notifications: unreadNotifs };

  const studentId = role === 'eleve' ? user.personId : role === 'parent' ? childId : null;
  const go = (path) => {
    const [sec, ...rest] = (path || '').split('/');
    const query = rest.length ? `?id=${encodeURIComponent(rest.join('/'))}` : '';
    router.push(`/${role}${sec ? `/${sec}` : ''}${query}`);
  };

  const selectChild = (id) => {
    setChildId(id);
    try {
      localStorage.setItem(CHILD_KEY, id);
    } catch {}
  };

  return (
    <div className={`app ${menuOpen ? 'menu-open' : ''}`}>
      <ScrollProgress />
      <RippleLayer />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <span className="absolute -top-40 right-[-10%] h-[28rem] w-[28rem] rounded-full bg-blue-400/15 blur-3xl animate-float-slow" />
        <span className="absolute bottom-[-12rem] left-[20%] h-[26rem] w-[26rem] rounded-full bg-indigo-400/10 blur-3xl animate-float" />
        <span className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl animate-float-slow" />
      </div>
      <aside className="sidebar" aria-label="Navigation principale">
        <div className="brand">
          <motion.span className="brand-mark" whileHover={{ rotate: 360, scale: 1.1 }} transition={{ type: 'spring', stiffness: 120, damping: 10 }}>
            N°1
          </motion.span>
          <div>
            <div className="brand-name">{state.school.name}</div>
            <div className="brand-sub">
              {ROLES[role].label} · {state.school.year}
            </div>
          </div>
        </div>
        <nav className="nav">
          {nav.map((n, i) => (
            <motion.div
              key={n.key}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.05 + i * 0.03 }}
            >
            <Link href={`/${role}${n.key ? `/${n.key}` : ''}`} className={`nav-link ${n.key === section ? 'active' : ''}`}>
              {n.key === section && (
                <motion.span
                  className="nav-indicator"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                />
              )}
              <motion.span className="nav-icon" whileHover={{ rotate: [0, -14, 10, 0], scale: 1.15 }} transition={{ duration: 0.45 }}>
                <Icon name={n.icon} size={18} />
              </motion.span>
              <span className="nav-label-text">{n.label}</span>
              {counts[n.key] > 0 && (
                <motion.span className="count" key={counts[n.key]} initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                  {counts[n.key]}
                </motion.span>
              )}
            </Link>
            </motion.div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <Avatar name={user.name} dark />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="who-name ellipsis">{user.name}</div>
              <div className="who-role">{user.title || ROLES[role].label}</div>
            </div>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: '#cbd5e1' }}
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="scrim" onClick={() => setMenuOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" />
          </button>
          <span className="topbar-title">{item ? sectionLabel(role, section) : 'Page introuvable'}</span>
          <span className="spacer" />
          {role === 'parent' && children.length > 1 && (
            <div className="pill-select" role="group" aria-label="Choisir un enfant">
              {children.map((c) => (
                <button key={c.id} className={c.id === childId ? 'on' : ''} onClick={() => selectChild(c.id)}>
                  {c.firstName} · {studentClass(state, c)?.name}
                </button>
              ))}
            </div>
          )}
          {NAVIGATION[role].some((n) => n.key === 'notifications') && (
            <Link href={`/${role}/notifications`} className="btn btn-ghost btn-icon" aria-label="Notifications" style={{ position: 'relative' }}>
              <motion.span
                style={{ display: 'inline-flex', transformOrigin: '50% 10%' }}
                animate={unreadNotifs > 0 ? { rotate: [0, -16, 14, -10, 8, -4, 0] } : { rotate: 0 }}
                transition={unreadNotifs > 0 ? { duration: 0.9, repeat: Infinity, repeatDelay: 5, delay: 1 } : undefined}
              >
                <Icon name="bell" />
              </motion.span>
              {unreadNotifs > 0 && (
                <span style={{ position: 'absolute', top: 9, right: 9 }} className="flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
              )}
            </Link>
          )}
        </header>

        <main className="content">
          {View && (role !== 'parent' || studentId) ? (
            <Page pageKey={`${section}/${params.join('/')}/${studentId || ''}`}>
              <View {...store} role={role} studentId={studentId} params={params} go={go} />
            </Page>
          ) : !View ? (
            <div className="card empty">
              <h2>Page introuvable</h2>
              <p className="mt">Cette section n’existe pas ou n’est pas accessible avec votre rôle.</p>
              <button className="btn btn-primary mt" onClick={() => go('')}>
                Retour au tableau de bord
              </button>
            </div>
          ) : (
            <div className="card empty">Aucun enfant n’est rattaché à votre compte. Contactez l’administration.</div>
          )}
        </main>
      </div>
    </div>
  );
}
