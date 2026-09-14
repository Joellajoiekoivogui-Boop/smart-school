# 🤖 Agent commercial IA autonome — un commercial disponible 24h/24

Ce projet n'est **pas un chatbot WhatsApp**. C'est une infrastructure d'agent
commercial IA : un système capable de converser naturellement avec les
prospects et clients d'une entreprise, connecté directement à son numéro
WhatsApp existant, disponible en continu, et connecté aux données réelles de
l'entreprise (catalogue, prix, stock, promotions).

Le système ne fonctionne pas comme :

```
Client → question → bot → réponse
```

mais comme :

```
Client → compréhension → analyse du besoin → questions intelligentes
       → recommandation → gestion des objections → relance
       → qualification → conversion → suivi
```

> « Un commercial IA disponible 24h/24, connecté aux données réelles de
> l'entreprise, capable de converser naturellement avec les clients, de
> détecter les opportunités, de relancer les prospects et de savoir quand
> passer le relais à un humain. »

## Ce que fait l'agent

- **Accueille** automatiquement chaque nouveau prospect et **comprend** le
  langage naturel sur plusieurs échanges (mémoire de conversation).
- **Répond** avec des données réelles (jamais inventées) : catalogue, prix,
  promotions, disponibilité en stock — via des outils connectés à la base de
  données de l'entreprise, pas via des réponses générées « à l'aveugle ».
- **Pose des questions** pour cerner un besoin ambigu, **recommande**,
  **gère les objections**.
- **Prend l'initiative** : détecte une conversation laissée en suspens
  (ex. un client a demandé un prix puis n'a pas répondu) et **relance**
  intelligemment via un job planifié, avec un message généré pour cette
  conversation précise — jamais un message générique.
- **Ne devine jamais** : quand il ne sait pas, il enregistre la question
  comme information manquante (`KnowledgeGap`) et le dit honnêtement au
  client, ou transfère à un humain.
- **Qualifie** chaque prospect (niveau d'intérêt, intention, objections,
  besoin) pour donner au responsable commercial un résumé exploitable sans
  qu'il ait à relire tout l'historique.
- **Retient** ce qu'un client a déjà dit (mémoire par client) pour ne jamais
  le faire répéter inutilement lors d'un contact ultérieur.

## L'humain reste aux commandes

Depuis le tableau de bord (API `/api/*`), le responsable peut :

- Activer/désactiver l'agent globalement ou reprendre une conversation
  précise à tout moment.
- Définir ce que l'agent est autorisé à promettre (remise max, délais de
  livraison, recherche externe autorisée ou non).
- Gérer le catalogue, les prix, le stock et les promotions.
- Consulter les conversations, les leads qualifiés, et les questions sans
  réponse à valider pour enrichir la base de connaissances.
- Recevoir une alerte dès qu'une intervention humaine est nécessaire
  (réclamation, demande explicite, négociation hors marges autorisées).

## Architecture

```
WhatsApp (numéro existant, Baileys)
        │  messages entrants/sortants
        ▼
conversationService  ──────────────►  MongoDB (multi-tenant par boutique)
        │                                 Boutique, Product, Customer,
        ▼                                 Conversation, Message, Lead,
     agent.js                             KnowledgeGap, Order, AgentSettings
  (selectionne le moteur
   via AGENT_PROVIDER)
        │
        ├── openaiAgent.js  (OpenAI/Codex, function calling)  ← par defaut
        └── claudeAgent.js  (Claude, tool-calling + cache)
        │
        ▼
   Outils de l'agent (src/services/tools) — identiques pour les deux moteurs
   - search_catalog / get_product_details / check_active_promotions
   - qualify_lead
   - log_knowledge_gap
   - escalate_to_human
   - create_quote_or_order
   - remember_customer_fact
   - search_web (Exa, seulement si peutRechercherSurInternet est autorise)

followupJob (cron) ──► relances proactives via conversationService
Tableau de bord API (src/routes) ──► contrôle humain (auth JWT)
```

### Pourquoi Baileys plutôt que l'API WhatsApp Business officielle

L'objectif exprimé est de connecter l'agent **au numéro WhatsApp déjà
utilisé** par l'entreprise, sans processus d'approbation Meta ni migration
vers un numéro Business dédié. [Baileys](https://github.com/WhiskeySockets/Baileys)
se connecte au protocole WhatsApp Web via un simple scan de QR code (comme
« Appareils liés »). Pour un canal officiel à plus grande échelle, la même
architecture applicative (agent, outils, données) est réutilisable derrière
l'API WhatsApp Business Cloud — seul `src/services/whatsapp/client.js`
changerait.

### Pourquoi un tool-calling plutôt qu'un chatbot à réponses fixes

Le modèle ne répond jamais « de mémoire » sur un prix, un stock ou une
promotion : il appelle systématiquement les outils connectés à MongoDB pour
lire les données réelles avant de répondre (voir `src/prompts/salesAgentSystemPrompt.js`,
règle absolue n°1). Ce comportement est indépendant du moteur choisi.

### Deux moteurs interchangeables (`AGENT_PROVIDER`)

`src/services/agent.js` sélectionne le moteur au démarrage selon la variable
d'environnement `AGENT_PROVIDER` :

| `AGENT_PROVIDER` | Fichier | Fournisseur | Variables requises |
|---|---|---|---|
| `openai` (par défaut) | `src/services/openaiAgent.js` | OpenAI / Codex, function calling via `chat.completions` | `OPENAI_API_KEY`, `CODEX_MODEL` |
| `claude` | `src/services/claudeAgent.js` | Claude (Anthropic), tool-calling + prompt caching (`cache_control: ephemeral`) | `ANTHROPIC_API_KEY`, `AGENT_MODEL` |

Les deux fichiers exposent exactement la même interface
(`respond(context, texte)`, `generateFollowup(context)`) et partagent les
mêmes outils (`src/services/tools/`) — basculer de l'un à l'autre ne
touche à rien d'autre dans le projet.

> ⚠️ **`CODEX_MODEL`** : vérifiez sur
> [platform.openai.com/docs/models](https://platform.openai.com/docs/models)
> le nom exact du modèle fourni par votre accès Codex avant de déployer —
> les anciens modèles Codex (`code-davinci-002`, etc.) sont retirés de l'API.
> `gpt-4.1` est laissé comme valeur de repli fonctionnelle.

### Recherche web (Exa)

L'outil `search_web` (`src/services/tools/webSearchTools.js`) interroge
[Exa](https://exa.ai) quand le catalogue et la FAQ internes ne suffisent
pas. Il vérifie toujours `AgentSettings.peutRechercherSurInternet` côté
serveur avant d'appeler l'API — même si le modèle tente de l'utiliser sans
autorisation, l'outil refuse et redirige vers `log_knowledge_gap` ou
`escalate_to_human`. Renseignez `EXA_API_KEY` dans `.env` pour l'activer.

## Structure du projet

```
src/
  config/         connexion MongoDB, variables d'environnement
  models/         schémas Mongoose multi-tenant (boutiqueId partout)
  services/
    claudeAgent.js         boucle agentique (Claude + tool use)
    conversationService.js orchestration message entrant / relance
    tools/                 implémentation des outils de l'agent
    whatsapp/client.js     connexion Baileys au numéro existant
    notificationService.js alerte humaine
  jobs/followupJob.js       relances proactives planifiées (node-cron)
  prompts/                  prompt système commercial
  routes/                   API du tableau de bord (auth JWT)
scripts/seed.js              données de démonstration en GNF
```

## Lancer en local (sur votre ordinateur)

C'est le chemin le plus rapide pour tester l'agent sans créer de compte
cloud. Il faut Node.js 18+ et une base MongoDB accessible.

> ⚠️ **Ce n'est pas la même chose qu'un déploiement 24h/24.** L'agent ne
> répond que tant que le processus tourne — si vous fermez le terminal ou
> éteignez l'ordinateur, il s'arrête. Pour un canal commercial vraiment
> disponible en continu, il faut soit laisser une machine allumée en
> permanence, soit passer à un déploiement Railway/Render (voir plus bas)
> une fois que vous avez validé que tout fonctionne en local.

### 1. Prérequis

- **Node.js 18+** : [nodejs.org](https://nodejs.org) (installeur pour
  Windows/Mac, ou `nvm install 18` sur Linux/Mac).
- **MongoDB** : le plus simple si vous avez déjà Docker installé :
  ```bash
  docker run -d --name mongo-agent -p 27017:27017 mongo:7
  ```
  Sans Docker : installez [MongoDB Community Server](https://www.mongodb.com/try/download/community)
  (Windows/Mac/Linux), ou utilisez un cluster gratuit
  [MongoDB Atlas](https://www.mongodb.com/atlas) si vous préférez ne rien
  installer localement (nécessite un compte, mais aucune carte bancaire pour
  l'offre gratuite M0).
- Une clé API pour le moteur choisi : `OPENAI_API_KEY` sur
  [platform.openai.com](https://platform.openai.com) (par défaut,
  `AGENT_PROVIDER=openai`), ou `ANTHROPIC_API_KEY` sur
  [console.anthropic.com](https://console.anthropic.com) si vous passez
  `AGENT_PROVIDER=claude` — liée à votre compte et votre facturation, je ne
  peux pas la générer à votre place.
- (Optionnel) `EXA_API_KEY` sur [exa.ai](https://exa.ai) pour activer la
  recherche web de l'agent.

### 2. Cloner et configurer

```bash
git clone <url-du-depot>
cd smart-school
cp .env.example .env
```

Éditez `.env` :

| Variable | À renseigner |
|---|---|
| `AGENT_PROVIDER` | `openai` (défaut, Codex) ou `claude` |
| `OPENAI_API_KEY` / `CODEX_MODEL` | si `AGENT_PROVIDER=openai` — voir la mise en garde sur le nom du modèle plus haut |
| `ANTHROPIC_API_KEY` / `AGENT_MODEL` | si `AGENT_PROVIDER=claude` |
| `EXA_API_KEY` | optionnel — active l'outil `search_web` |
| `MONGODB_URI` | une instance MongoDB accessible (locale ou Atlas) |
| `SEED_WHATSAPP_NUMBER` | votre numéro WhatsApp, format international **sans** `+` (Guinée : préfixe `224` + les 9 chiffres, ex. `224XXXXXXXXX`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | identifiants du compte admin du tableau de bord |

### 3. Installer et lancer

```bash
npm install
npm run seed   # cree la boutique (avec SEED_WHATSAPP_NUMBER), le catalogue de demo et le compte admin
npm run dev
```

Un QR code s'affiche dans le terminal : scannez-le avec le WhatsApp
correspondant à `SEED_WHATSAPP_NUMBER` (Réglages → Appareils liés) pour
connecter l'agent à ce numéro. La session WhatsApp est ensuite conservée
dans `WHATSAPP_SESSION_DIR` (par défaut `./whatsapp-session`, exclu du dépôt
git) — pas besoin de rescanner tant que ce dossier persiste et que vous
relancez `npm run dev` depuis le même endroit.

### 4. Tester

- Envoyez un message WhatsApp depuis un autre téléphone vers le numéro
  connecté : l'agent doit répondre en utilisant le catalogue de démo créé
  par le seed (`Smartphone Tecno Spark 20`, `Climatiseur split 1.5CV`, ...).
- Tableau de bord API : `POST http://localhost:3000/api/auth/login` avec
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` pour récupérer un token, puis
  `GET /api/conversations`, `GET /api/leads`, etc. (voir `src/routes/`).

## Déploiement en production (Railway ou Render)

**Pourquoi pas Vercel :** Vercel exécute des fonctions serverless sans état
et sans disque persistant, incompatibles avec ce projet qui a besoin (1) d'une
connexion WhatsApp permanente (Baileys garde un socket ouvert en continu),
(2) d'une session WhatsApp persistée sur disque pour ne pas rescanner le QR
code a chaque redemarrage, et (3) d'un job planifie qui tourne en continu
(les relances). Railway et Render offrent tous les deux un process
persistant + un disque persistant, ce qui correspond exactement au besoin.
Un `Dockerfile`, `railway.json` et `render.yaml` sont deja fournis a la
racine du projet.

### Prérequis communs

- Une base MongoDB accessible depuis internet — le plus simple est
  [MongoDB Atlas](https://www.mongodb.com/atlas) (offre gratuite M0
  suffisante pour demarrer).
- Votre `ANTHROPIC_API_KEY`.
- Votre numero WhatsApp au format international sans `+` (Guinee : `224` +
  9 chiffres).

### Option A — Railway

1. Créez un projet sur [railway.app](https://railway.app), connectez ce
   dépôt GitHub (branche à déployer).
2. Railway détecte automatiquement le `Dockerfile` (config `railway.json`
   fournie).
3. Ajoutez un **volume** monté sur `/data/whatsapp-session` (Settings →
   Volumes) — sinon la session WhatsApp est perdue à chaque redéploiement.
4. Renseignez les variables d'environnement (`MONGODB_URI`,
   `ANTHROPIC_API_KEY`, `JWT_SECRET`, `SEED_WHATSAPP_NUMBER`,
   `WHATSAPP_SESSION_DIR=/data/whatsapp-session`, etc. — voir `.env.example`).
5. Déployez, puis ouvrez les **logs** du service : le QR code s'y affiche en
   texte. Scannez-le avec le WhatsApp du numéro configuré.
6. Une fois connecté, lancez `npm run seed` via un shell Railway (`railway run npm run seed`) pour créer la boutique et le compte admin.

### Option B — Render

1. Sur [render.com](https://render.com), **New → Blueprint**, pointez vers
   ce dépôt : `render.yaml` est détecté automatiquement (disque persistant
   `/data/whatsapp-session` déjà déclaré).
2. Render vous demandera de renseigner les variables marquées `sync: false`
   dans `render.yaml` (`MONGODB_URI`, `ANTHROPIC_API_KEY`, `JWT_SECRET`,
   `SEED_WHATSAPP_NUMBER`).
3. Déployez, puis consultez les **logs** du service pour scanner le QR code.
4. Lancez le seed une fois via le **Shell** intégré de Render :
   `npm run seed`.

### Après le premier déploiement

- Le tableau de bord API est disponible sur `https://<votre-service>/api/*`
  (voir `src/routes/`). Testez avec `POST /api/auth/login` (identifiants
  créés par le seed).
- `GET /health` sert de endpoint de health check pour la plateforme.
- Tant que le disque/volume persiste, un redéploiement ne casse pas la
  connexion WhatsApp (pas besoin de rescanner).
- Notez l'URL publique du service (ex. `https://mon-agent.up.railway.app`) :
  c'est elle qu'il faut renseigner dans `NEXT_PUBLIC_API_BASE_URL` pour le
  tableau de bord (voir section suivante).

## Tableau de bord (dashboard/, déployable sur Vercel)

`dashboard/` est une application Next.js **séparée** du backend — elle ne
fait qu'appeler l'API `/api/*` déjà exposée par le backend (Railway/Render).
C'est le seul morceau du projet adapté à Vercel : pas de connexion WhatsApp
permanente ni de cron à faire tourner ici, juste des pages React qui
consomment une API distante.

```
dashboard/
  app/login/page.jsx        formulaire de connexion (POST /api/auth/login)
  app/dashboard/page.jsx     vue d'ensemble, conversations, leads, produits, parametres
  lib/api.js                 client HTTP (JWT en localStorage, redirection si session expiree)
```

### Déployer sur Vercel

1. Sur [vercel.com](https://vercel.com), **New Project**, importez ce dépôt
   GitHub et réglez **Root Directory** sur `dashboard` (Vercel détecte
   Next.js automatiquement — build/start commands par défaut).
2. Ajoutez la variable d'environnement `NEXT_PUBLIC_API_BASE_URL` = l'URL
   publique de votre backend (Railway/Render), **sans** slash final.
3. Déployez. Le CORS est déjà ouvert côté backend (`app.use(cors())` dans
   `src/app.js`) — aucune configuration supplémentaire n'est nécessaire.
4. Connectez-vous avec les identifiants créés par `npm run seed`
   (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

Sans backend public à interroger, le formulaire de connexion affiche un
message clair au lieu d'échouer silencieusement — le dashboard peut donc
être déployé avant même que le backend le soit.

### Tester en local

```bash
cd dashboard
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```

## Feuille de route

- [x] Tableau de bord front-end (Next.js, `dashboard/`) au-dessus de l'API
      `/api/*` existante — voir section dédiée ci-dessus.
- [x] Recherche externe outillée (web, via Exa) quand
      `peutRechercherSurInternet` est activé, pour les questions hors catalogue.
- [ ] Intégration paiement Mobile Money (Orange Money / MTN MoMo) sur les
      commandes confirmées (`Order.paiement`).
- [ ] Ingestion de documents commerciaux (FAQ, brochures) comme source
      supplémentaire pour `search_catalog`.
- [ ] Tableau de bord temps réel (WebSocket) pour le suivi des conversations
      en direct côté responsable commercial.
