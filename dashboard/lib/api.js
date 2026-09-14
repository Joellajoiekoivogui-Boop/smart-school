export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const TOKEN_KEY = 'vc_token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Client HTTP minimal vers le backend Express : ajoute le token JWT,
 * serialise le corps en JSON et redirige vers /login en cas de session
 * expiree. Toutes les pages du dashboard passent par ici.
 */
export async function apiFetch(path, options = {}) {
  if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL n'est pas configuree.");
  }

  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Session expiree, reconnectez-vous.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.erreur || `Erreur ${res.status}`);
  }
  return data;
}
