# 🎓 N°1 — L’école connectée, au même endroit

N°1 est une plateforme numérique de gestion scolaire qui connecte **élèves,
parents, enseignants et administration** dans un environnement unique. Elle
centralise le suivi pédagogique, la communication, les présences, les devoirs,
les résultats et la gestion de la scolarité, pour rendre l’école plus
organisée, transparente et accessible.

Elle remplace les échanges dispersés (cahiers, feuilles, appels, messages
WhatsApp, tableaux Excel…) par un système numérique organisé.

## Lancer l’application

```bash
cd ecole
npm install
npm run dev        # http://localhost:3001
```

Production : `npm run build` génère un **site 100 % statique** dans `out/`
(aucune fonction serveur) ; `npm start` le sert en local.

**Vercel** : le fichier `vercel.json` à la racine du dépôt indique à Vercel de
construire `ecole/` et de publier `ecole/out`. Il suffit d’importer le dépôt,
sans rien régler. (Si le projet Vercel a `ecole` comme *Root Directory*, ce
fichier est ignoré et Vercel détecte Next.js tout seul : ça marche aussi.)

Tests de la logique métier (permissions, moyennes, paiements, appel,
sécurité, alertes, gamification, migration des données…) :

```bash
npm test
```

### Comptes de démonstration

La page de connexion propose un accès en un clic à chaque espace :

| Espace         | E-mail                      | Mot de passe |
| -------------- | --------------------------- | ------------ |
| Élève          | `mohamed.camara@n1.school`  | `eleve123`   |
| Parent         | `parent.camara@n1.school`   | `parent123`  |
| Enseignant     | `k.diallo@n1.school`        | `prof123`    |
| Administration | `admin@n1.school`           | `admin123`   |

Le parent (M. Sékou Camara) a deux enfants, Mohamed (5e A) et Aïssatou (3e A),
pour montrer le changement d’enfant. Tout compte créé par l’administration
(élève, parent, enseignant) peut aussi se connecter.

> **Données de démonstration.** L’école de démo (4 classes, 28 élèves,
> 6 enseignants, notes, présences, paiements…) est générée par
> `lib/seed.js`, calée sur la date du jour, et enregistrée dans le navigateur
> (`localStorage`). *Paramètres → Réinitialiser les données* la régénère.
> Pour une mise en production multi-utilisateurs, ces données doivent passer
> par une API et une base de données (voir la feuille de route).

## Les quatre espaces

**👨‍🎓 Élève** — tableau de bord avec priorités du jour, **assistant IA**
(expliquer une leçon, générer des exercices, poser une question, avec des
indices avant la réponse), résultats et relevés, devoirs remis en ligne avec
suivi de chaque étape, cours et **bibliothèque numérique**, **entraînement
personnalisé** (séances adaptées aux notions fragiles) avec **gamification**
(XP, niveaux, séries, objectif hebdomadaire, badges, sans classement entre
élèves), emploi du temps du jour, progression, messages, notifications.

**👨‍👩‍👦 Parent** — vue globale par enfant, **fiche de vie scolaire**, résultats,
bulletins publiés, devoirs, présences, **sorties et autorisations** (règles de
sortie, personnes autorisées, demandes de sortie exceptionnelle), **paiement
Mobile Money** (Orange Money, MTN MoMo) avec reçu, messagerie « à propos de »
chaque enfant, alertes intelligentes.

**👨‍🏫 Enseignant** — priorités (appels à faire, copies à corriger, élèves en
baisse), classes, fiche élève (synthèse + fiche de vie, observations
pédagogiques), devoirs (publication → dépôt → correction → note → historique),
saisie des notes, bibliothèque de sa matière, progression, appel, emploi du
temps du jour, messages, annonces à une classe.

**🏫 Administration** — priorités, élèves (inscription avec comptes et mots de
passe provisoires), enseignants, classes, matières, emplois du temps,
**génération et publication des bulletins** (impression de toute une classe),
présences, sorties (validation des demandes, contrôle des règles parentales),
scolarité (**tableau financier**, relances, reçus), communication (annonces +
**alertes SMS / WhatsApp**), bibliothèque, **sécurité & journal d’audit**,
**exports Excel** (élèves, résultats, paiements, présences, journal).

### Modules transverses

- **Alertes intelligentes** : absence, retard, devoir non rendu, baisse des
  résultats (−2 points sur les dernières notes), échéance de paiement, sortie,
  bulletin publié, décision d’autorisation. Chaque règle s’active ou se coupe
  dans *Communication → Alertes*.
- **Fiche de vie scolaire** : chronologie de l’élève sur l’année (notes,
  présences, devoirs, sorties exceptionnelles, entraînement, observations et
  activités), filtrable et imprimable.
- **Mode hors connexion** : application installable (PWA) ; les pages déjà
  chargées et toutes les données restent consultables sans Internet, un
  bandeau signale la perte de connexion.
- **Sécurité** : mots de passe hachés (sel + SHA-256 itéré), verrouillage 5 min
  après 5 échecs, déconnexion après 30 min d’inactivité, mot de passe
  provisoire à changer à la 1re connexion, journal des actions sensibles.

### Assistant IA (Claude)

La fonction serveur `api/assistant.js` (à la racine du dépôt) interroge Claude
(`claude-opus-5`, effort « low », repli automatique en cas de refus). Pour
l’activer sur Vercel : **Settings → Environment Variables →
`ANTHROPIC_API_KEY`**, puis redéployer. Sans clé ou sans connexion,
l’assistant bascule sur son moteur local (banque d’exercices, programme,
bibliothèque) : il reste utilisable, avec des réponses plus simples.

### Ce qui est simulé en démonstration

| Fonction | Démo | À brancher pour la production |
| --- | --- | --- |
| Données | Navigateur (localStorage) | API + base de données partagée |
| SMS / WhatsApp | File d’envoi visible dans *Communication* | Fournisseur SMS, numéro WhatsApp de l’école |
| Mobile Money | Code de confirmation affiché à l’écran | Compte marchand Orange Money / MTN MoMo |
| Assistant IA | Moteur local | Clé `ANTHROPIC_API_KEY` sur Vercel |
| Fichiers | 750 Ko max., stockés localement | Stockage de fichiers (ex. Vercel Blob, S3) |

## Rôles et permissions

Chaque utilisateur a un rôle et des permissions explicites
(`lib/permissions.js`). Toute écriture passe par `lib/actions.js`, qui
vérifie **la permission et le périmètre** avant de modifier quoi que ce soit :

- Élève → consulte ses notes, **ne peut pas** les modifier.
- Enseignant → saisit les notes **de ses matières et de ses classes**,
  **ne peut pas** toucher aux paiements.
- Parent → consulte les résultats **de ses enfants uniquement**, sans
  pouvoir les modifier.
- Administration → dispose des droits de gestion.

La messagerie suit la même logique : un élève écrit à ses enseignants, un
parent aux enseignants de ses enfants et à l’administration, etc.

## Charte graphique

| Couleur       | Code      | Utilisation                   |
| ------------- | --------- | ----------------------------- |
| Bleu principal| `#2563EB` | Boutons, éléments principaux  |
| Bleu nuit     | `#0F172A` | Titres, navigation            |
| Vert          | `#10B981` | Succès, présence, paiement    |
| Orange        | `#F59E0B` | Alertes, devoirs, attention   |
| Rouge         | `#EF4444` | Absence, dette, erreur        |
| Blanc         | `#FFFFFF` | Arrière-plan des cartes       |
| Gris clair    | `#F8FAFC` | Arrière-plan                  |

Typographie : **Plus Jakarta Sans** (titres) + **Inter** (texte). Cartes
arrondies à 14 px, boutons à 10 px, petits éléments à 8 px, ombre
`0 4px 20px rgba(15, 23, 42, 0.06)`. Interface responsive (mobile + ordinateur).
Tous les jetons sont dans `app/globals.css`.

### Tailwind CSS

Tailwind CSS v4 (`@tailwindcss/postcss`) est branché sur la charte : les
couleurs, polices et animations sont déclarées dans `@theme`
(`app/globals.css`) et utilisables en classes (`bg-brand`, `text-navy`,
`font-display`, `shadow-glow`, `animate-float`, `animate-gradient`,
`animate-shine`…). Les styles de l’application sont dans la couche
`components`, ce qui permet de les compléter avec des utilitaires Tailwind.
La page de connexion et les bandeaux d’accueil sont écrits en Tailwind.

### Animations (Motion, ex-Framer Motion)

L’interface est vivante mais reste lisible (`components/motion.jsx`) :

- **transitions de page** : entrée avec léger flou et sortie rapide
  (`AnimatePresence`), puis cascade à ressort des cartes et statistiques ;
- **compteurs animés** : moyennes, pourcentages et montants défilent jusqu’à
  leur valeur ;
- **révélation au défilement** des cartes, apparition progressive des listes,
  tableaux, notifications et chronologies ;
- **bandeaux d’accueil** avec dégradé qui ondule, halos flottants et main qui
  salue ; fond décoratif animé ;
- **menu** : entrée en cascade, icônes qui s’agitent au survol, indicateur
  glissant ; cloche qui sonne quand des notifications attendent ;
- **micro-interactions** : cartes qui se soulèvent, icônes qui pivotent,
  boutons avec reflet, badges d’entraînement qui flottent, niveau qui
  « pop » ; fenêtres qui s’ouvrent avec un ressort et fond flouté ;
- **connexion** : titre mot par mot, orbes lumineux en mouvement, carte qui
  tremble en cas d’erreur.
- **effets** (`components/fx.jsx`) : confettis sur les réussites (séance sans
  faute, paiement, devoir remis, bulletins publiés…), statistiques qui
  s’inclinent en 3D avec un halo qui suit la souris, onde au clic sur les
  boutons, barre de progression du défilement, écran de chargement animé,
  étincelles et parallaxe sur les bandeaux, réponses de l’assistant tapées en
  direct, point « en direct » qui pulse sur les courbes, priorités urgentes
  qui palpitent, notifications avec barre de temps.

Si l’utilisateur a activé « réduire les animations » dans son système, les
déplacements sont supprimés (`MotionConfig reducedMotion="user"` + règle CSS
`prefers-reduced-motion`).

## Structure

```
ecole/
├── app/
│   ├── login/page.jsx              # Connexion + comptes de démo
│   ├── [role]/[[...section]]/      # Un espace par rôle (eleve, parent, enseignant, admin)
│   └── globals.css                 # Charte graphique
├── components/
│   ├── Shell.jsx                   # Navigation, sélecteur d'enfant, notifications
│   ├── ui.jsx                      # Cartes, badges, graphiques, modales…
│   └── views/                      # Écrans par espace (+ vues partagées)
├── lib/
│   ├── seed.js, exercises.js       # École de démonstration, banque d'exercices
│   ├── permissions.js              # Rôles, permissions, périmètres
│   ├── actions.js                  # Toutes les écritures (contrôlées)
│   ├── compute.js                  # Moyennes, rangs, bulletins, présences, scolarité…
│   ├── navigation.js               # Architecture de navigation
│   └── store.jsx                   # État + session
└── tests/core.test.js              # Tests de la logique métier
```

## Feuille de route

1. **Backend et base de données** : exposer `lib/actions.js` derrière une API
   (Express/MongoDB, comme le backend existant du dépôt) avec authentification
   JWT et mots de passe hachés, pour partager les données entre appareils.
2. Envoi réel des notifications (SMS / WhatsApp / e-mail) aux parents lors
   d’une absence, d’une sortie ou d’une échéance.
3. Paiement Mobile Money en ligne (Orange Money, MTN MoMo).
4. Stockage des fichiers (devoirs remis, supports de cours).
5. Mode hors ligne (PWA) pour les connexions intermittentes.
