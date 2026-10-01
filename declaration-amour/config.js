/* ==========================================================================
   ✏️  PERSONNALISATION
   --------------------------------------------------------------------------
   Tout se règle dans ce fichier : modifie le texte entre les guillemets,
   enregistre, puis recharge la page. Rien d'autre à toucher.

   Règles simples pour ne rien casser :
   • garde les guillemets "..." autour de chaque texte ;
   • garde la virgule à la fin de chaque ligne de liste ;
   • les émojis sont permis (❤️ 💌 🌹 ✨…). Le ❤️ est remplacé à l'écran
     par un petit cœur animé aux couleurs du thème.

   Plus simple encore : ouvre « personnaliser.html » dans le navigateur,
   remplis le formulaire et copie le lien à envoyer (ou télécharge un
   nouveau config.js tout prêt).
   ========================================================================== */

window.DECLARATION = {

  /* 1. SON PRÉNOM — il s'écrit progressivement à l'écran.
        Exemple : "Aïcha", "Mariam", "Ibrahima"…                              */
  prenom: "Mata Bah",

  /* 2. L'ÉCRAN D'ACCUEIL                                                       */
  accueil: {
    titre: "J’ai quelque chose à te dire…",
    invitation: "Clique sur le cœur ❤️",
  },

  /* 3. LE GRAND MESSAGE qui apparaît après l'explosion de cœurs               */
  grandMessage: "JE T’AIME ❤️",

  /* Les mots écrits juste avant le prénom (« Je t'aime, Prénom ❤️ »)          */
  avantPrenom: "Je t’aime,",

  /* 4. LES PETITS MESSAGES, affichés l'un après l'autre.
        Ajoute ou retire autant de lignes que tu veux.
        Le dernier est mis en valeur (grand, écrit à la main).                 */
  messages: [
    "Depuis quelque temps, tu occupes une place particulière dans mes pensées.",
    "Et aujourd’hui, j’avais simplement envie de te le dire…",
    "Je t’aime ❤️",
  ],

  /* Le texte du bouton qui ouvre la lettre                                    */
  boutonLettre: "Découvrir mon message 💌",

  /* 5. LA LETTRE FINALE (ta déclaration personnelle)                          */
  lettre: {
    surEnveloppe: "Pour toi",   // écrit sur l'enveloppe
    titre: "",                  // vide = « Prénom, » automatiquement
    paragraphes: [
      "Je ne sais pas exactement quand c’est arrivé. Peut-être à travers un regard, un sourire, ou une conversation qui a duré bien plus longtemps que prévu.",
      "Mais un jour, j’ai compris que tu n’étais plus tout à fait une personne comme les autres pour moi.",
      "Depuis, je pense à toi plus souvent que je ne l’avoue. Un message de toi suffit à illuminer ma journée, et ta présence a quelque chose d’apaisant que je ne trouve nulle part ailleurs.",
      "J’aime ta façon de rire, ta façon de voir le monde, et cette lumière que tu portes sans même t’en rendre compte.",
      "Je ne t’écris pas pour te demander quoi que ce soit. Je voulais simplement que tu saches, avec sincérité, ce que tu représentes pour moi.",
      "Tu comptes énormément. Et je t’aime, tout simplement. ❤️",
    ],
    formule: "Avec tout mon cœur,",
    signature: "Moi",           // ← ton prénom
  },

  /* 6. LES PHOTOS (facultatif)
        Dépose tes photos dans le dossier « medias » puis ajoute une ligne
        par photo. Une adresse web (https://…) fonctionne aussi.
        Laisse la liste vide pour ne pas afficher de photos.                   */
  photos: {
    titre: "Quelques instants précieux",
    liste: [
      // { image: "medias/photo-1.jpg", legende: "Ce jour-là…" },
      // { image: "medias/photo-2.jpg", legende: "Ton sourire" },
    ],
  },

  /* 7. LA COULEUR DU THÈME
        Un nom : "rose", "passion", "lavande", "or", "aurore", "nuit"
        ou n'importe quelle couleur, par exemple "#e91e63" : tout le thème
        (dégradé, cœurs, lumières) est calculé à partir d'elle.                */
  couleur: "rose",

  /* 8. LA MUSIQUE (elle démarre au clic sur le cœur)
        fichier vide  = boîte à musique intégrée (Canon de Pachelbel).
        Pour ta chanson : mets le fichier dans « medias » et écris son nom,
        par exemple "medias/notre-chanson.mp3".                                */
  musique: {
    activee: true,              // false = aucun son
    fichier: "",
    volume: 0.7,                // de 0 à 1
    debut: 0,                   // démarrer la chanson à N secondes
  },

  /* 9. RÉGLAGES                                                               */
  options: {
    avancementAuto: true,       // les messages défilent seuls (un toucher accélère)
    vibration: true,            // petit battement de cœur sur les téléphones Android
    personnalisationParLien: true, // autorise les liens créés avec personnaliser.html
  },
};
