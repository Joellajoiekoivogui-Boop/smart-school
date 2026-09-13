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
   claudeAgent                            KnowledgeGap, Order, AgentSettings
   (boucle d'appels Claude
    avec tool-calling)
        │
        ▼
   Outils de l'agent (src/services/tools)
   - search_catalog / get_product_details / check_active_promotions
   - qualify_lead
   - log_knowledge_gap
   - escalate_to_human
   - create_quote_or_order
   - remember_customer_fact

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

### Pourquoi Claude avec tool-calling plutôt qu'un chatbot à réponses fixes

Le modèle ne répond jamais « de mémoire » sur un prix, un stock ou une
promotion : il appelle systématiquement les outils connectés à MongoDB pour
lire les données réelles avant de répondre (voir `src/prompts/salesAgentSystemPrompt.js`,
règle absolue n°1). Le prompt système et les définitions d'outils sont mis
en cache (`cache_control: ephemeral`) pour limiter le coût par message sur un
usage WhatsApp à fort volume.

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

## Installation

Ce projet tourne sur votre propre machine ou serveur (Node.js + MongoDB) —
il ne peut pas rester dans cette session cloud éphémère : le fichier `.env`
et la session WhatsApp doivent vivre là où le processus reste actif.

```bash
git clone <url-du-depot>
cd smart-school
cp .env.example .env
```

Éditez `.env` :

| Variable | À renseigner |
|---|---|
| `ANTHROPIC_API_KEY` | votre clé API Anthropic |
| `MONGODB_URI` | une instance MongoDB accessible (locale ou Atlas) |
| `SEED_WHATSAPP_NUMBER` | votre numéro WhatsApp, format international **sans** `+` (Guinée : préfixe `224` + les 9 chiffres, ex. `224XXXXXXXXX`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | identifiants du compte admin du tableau de bord |

Puis :

```bash
npm install
npm run seed   # cree la boutique (avec SEED_WHATSAPP_NUMBER), le catalogue de demo et le compte admin
npm run dev
```

Un QR code s'affiche dans le terminal : scannez-le avec le WhatsApp
correspondant à `SEED_WHATSAPP_NUMBER` (Réglages → Appareils liés) pour
connecter l'agent à ce numéro. La session WhatsApp est ensuite conservée
dans `WHATSAPP_SESSION_DIR` (par défaut `./whatsapp-session`, exclu du dépôt
git) — pas besoin de rescanner à chaque redémarrage tant que ce dossier
persiste.

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

## Feuille de route

- [ ] Tableau de bord front-end (React) au-dessus de l'API `/api/*`
      existante.
- [ ] Recherche externe outillée (web) quand `peutRechercherSurInternet`
      est activé, pour les questions hors catalogue.
- [ ] Intégration paiement Mobile Money (Orange Money / MTN MoMo) sur les
      commandes confirmées (`Order.paiement`).
- [ ] Ingestion de documents commerciaux (FAQ, brochures) comme source
      supplémentaire pour `search_catalog`.
- [ ] Tableau de bord temps réel (WebSocket) pour le suivi des conversations
      en direct côté responsable commercial.
