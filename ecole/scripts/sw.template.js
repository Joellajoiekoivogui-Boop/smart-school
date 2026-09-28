/**
 * Service worker de N°1 : mode hors connexion.
 *
 * - Pages : réseau d’abord, copie en cache en secours (les données restent
 *   dans le navigateur, donc les pages déjà chargées fonctionnent sans Internet).
 * - Fichiers statiques (_next/static, icônes) : cache d’abord (noms versionnés).
 * - /api/* (assistant IA) : jamais mis en cache.
 * Généré par scripts/build-sw.mjs à partir de lib/navigation.js.
 */
const CACHE = "n1-__VERSION__";
const PAGES = [
  "/",
  "/login",
  "/eleve",
  "/eleve/assistant",
  "/eleve/resultats",
  "/eleve/devoirs",
  "/eleve/cours",
  "/eleve/bibliotheque",
  "/eleve/entrainement",
  "/eleve/enseignants",
  "/eleve/emploi-du-temps",
  "/eleve/progression",
  "/eleve/messages",
  "/eleve/notifications",
  "/eleve/compte",
  "/parent",
  "/parent/enfants",
  "/parent/fiche",
  "/parent/resultats",
  "/parent/bulletins",
  "/parent/devoirs",
  "/parent/presences",
  "/parent/sorties",
  "/parent/paiements",
  "/parent/emploi-du-temps",
  "/parent/enseignants",
  "/parent/messages",
  "/parent/notifications",
  "/parent/compte",
  "/enseignant",
  "/enseignant/classes",
  "/enseignant/eleves",
  "/enseignant/devoirs",
  "/enseignant/bibliotheque",
  "/enseignant/notes",
  "/enseignant/progression",
  "/enseignant/presences",
  "/enseignant/emploi-du-temps",
  "/enseignant/messages",
  "/enseignant/notifications",
  "/enseignant/compte",
  "/admin",
  "/admin/eleves",
  "/admin/enseignants",
  "/admin/classes",
  "/admin/matieres",
  "/admin/emploi-du-temps",
  "/admin/notes",
  "/admin/presences",
  "/admin/sorties",
  "/admin/scolarite",
  "/admin/communication",
  "/admin/bibliotheque",
  "/admin/messages",
  "/admin/parametres",
  "/admin/journal",
  "/admin/compte"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Précharge toutes les pages ; une page en échec n’empêche pas l’installation.
      Promise.all(PAGES.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => null))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("n1-") && k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match(url.pathname, { ignoreSearch: true })) || caches.match("/login")),
    );
    return;
  }

  const immutable = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return immutable && hit ? hit : hit || network;
    }),
  );
});
