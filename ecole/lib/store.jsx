'use client';
/**
 * Store de l'application : état de l'école persistant (localStorage) + session.
 *
 * `run(action, payload)` applique une action de lib/actions.js sur une copie de
 * l'état au nom de l'utilisateur connecté ; si l'action lève une erreur
 * (permission, validation), l'état n'est pas modifié et l'erreur est remontée.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { buildSeed } from './seed.js';
import { migrateState } from './seed-extra.js';
import { verifyPassword } from './crypto.js';
import { appendAudit } from './actions.js';

const STATE_KEY = 'n1_state_v1';
const SESSION_KEY = 'n1_session_v1';
const LOCK_KEY = 'n1_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;

const StoreContext = createContext(null);

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible (navigation privée…) : l'app fonctionne en mémoire.
  }
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(null);
  const [userId, setUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const stateRef = useRef(null);

  useEffect(() => {
    // Les données d'une version précédente sont mises à niveau, jamais effacées.
    const initial = migrateState(load(STATE_KEY)) || buildSeed(new Date());
    stateRef.current = initial;
    setState(initial);
    const session = load(SESSION_KEY);
    if (session?.userId && Date.now() - (session.lastActive || 0) < IDLE_MS) setUserId(session.userId);
    else save(SESSION_KEY, null);
  }, []);

  useEffect(() => {
    if (state) save(STATE_KEY, state);
  }, [state]);

  const user = useMemo(() => state?.users.find((u) => u.id === userId) || null, [state, userId]);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const run = useCallback(
    (action, payload = {}, successMessage) => {
      const current = stateRef.current;
      const actor = current.users.find((u) => u.id === userId);
      const draft = structuredClone(current);
      try {
        const result = action(draft, actor, payload);
        appendAudit(draft, actor, action, payload);
        stateRef.current = draft;
        setState(draft);
        if (successMessage) notify(successMessage);
        return { ok: true, result };
      } catch (err) {
        notify(err.message, 'error');
        return { ok: false, error: err.message };
      }
    },
    [userId, notify],
  );

  /**
   * Connexion : vérification de l'empreinte du mot de passe, verrouillage
   * temporaire après 5 échecs sur un même identifiant.
   * Renvoie { user } ou { error }.
   */
  const login = useCallback((email, password) => {
    const key = String(email).trim().toLowerCase();
    const attempts = load(LOCK_KEY) || {};
    const entry = attempts[key] || { count: 0, until: 0 };
    if (entry.until > Date.now()) {
      const min = Math.ceil((entry.until - Date.now()) / 60000);
      return { error: `Trop de tentatives. Réessayez dans ${min} min.` };
    }
    const u = stateRef.current.users.find((x) => x.email.toLowerCase() === key);
    if (!u || !verifyPassword(u, password)) {
      entry.count += 1;
      if (entry.count >= MAX_ATTEMPTS) {
        entry.until = Date.now() + LOCK_MS;
        entry.count = 0;
      }
      attempts[key] = entry;
      save(LOCK_KEY, attempts);
      return { error: 'Adresse e-mail ou mot de passe incorrect.' };
    }
    delete attempts[key];
    save(LOCK_KEY, attempts);
    setUserId(u.id);
    save(SESSION_KEY, { userId: u.id, lastActive: Date.now() });
    return { user: u };
  }, []);

  const logout = useCallback(() => {
    setUserId(null);
    save(SESSION_KEY, null);
  }, []);

  // Déconnexion automatique après 30 minutes d'inactivité.
  useEffect(() => {
    if (!userId) return undefined;
    let last = Date.now();
    const touch = () => {
      last = Date.now();
    };
    const persist = setInterval(() => {
      if (Date.now() - last > IDLE_MS) {
        setUserId(null);
        save(SESSION_KEY, null);
        setToast({ message: 'Session expirée après 30 minutes d’inactivité.', type: 'error', id: Date.now() });
      } else save(SESSION_KEY, { userId, lastActive: last });
    }, 30000);
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    return () => {
      clearInterval(persist);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, [userId]);

  const resetDemo = useCallback(() => {
    const fresh = buildSeed(new Date());
    stateRef.current = fresh;
    setState(fresh);
    notify('Données de démonstration réinitialisées.');
  }, [notify]);

  const value = useMemo(
    () => ({ state, user, ready: state != null, run, login, logout, resetDemo, notify }),
    [state, user, run, login, logout, resetDemo, notify],
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast-${toast.type}`}
            role="status"
            key={toast.id}
            initial={{ opacity: 0, y: 24, x: '-50%', scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 12, x: '-50%', scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>.');
  return ctx;
}
