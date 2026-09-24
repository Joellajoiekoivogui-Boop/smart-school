'use client';
/**
 * Store de l'application : état de l'école persistant (localStorage) + session.
 *
 * `run(action, payload)` applique une action de lib/actions.js sur une copie de
 * l'état au nom de l'utilisateur connecté ; si l'action lève une erreur
 * (permission, validation), l'état n'est pas modifié et l'erreur est remontée.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildSeed } from './seed.js';

const STATE_KEY = 'n1_state_v1';
const SESSION_KEY = 'n1_session_v1';

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
    const stored = load(STATE_KEY);
    const initial = stored?.version === 1 ? stored : buildSeed(new Date());
    stateRef.current = initial;
    setState(initial);
    setUserId(load(SESSION_KEY)?.userId || null);
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

  const login = useCallback((email, password) => {
    const u = stateRef.current.users.find(
      (x) => x.email.toLowerCase() === String(email).trim().toLowerCase() && x.password === password,
    );
    if (!u) return null;
    setUserId(u.id);
    save(SESSION_KEY, { userId: u.id });
    return u;
  }, []);

  const logout = useCallback(() => {
    setUserId(null);
    save(SESSION_KEY, null);
  }, []);

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
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status" key={toast.id}>
          {toast.message}
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>.');
  return ctx;
}
