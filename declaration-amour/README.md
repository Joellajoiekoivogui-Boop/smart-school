# 💌 Déclaration d’amour — une petite histoire interactive

Un site romantique, animé et immersif, pensé d’abord pour le téléphone :
chaque toucher révèle un peu plus les sentiments, jusqu’à une lettre
personnelle cachée dans une enveloppe scellée.

Site **100 % statique** (HTML, CSS, JavaScript) : aucune installation, aucun
serveur, aucune dépendance. Il s’ouvre d’un double-clic et se met en ligne
gratuitement en une minute.

## Le parcours

1. **L’accueil** : ciel étoilé, cœurs qui montent, pétales qui tombent,
   poussières de lumière, étoiles filantes. Au centre, un grand cœur bat
   doucement : *« J’ai quelque chose à te dire… »* — *« Clique sur le cœur ❤️ »*.
2. **Le clic** : le cœur éclate en dizaines de petits cœurs, confettis et
   étincelles, une onde lumineuse en forme de cœur traverse l’écran, le
   téléphone bat comme un cœur (Android) et la musique démarre en douceur.
3. **« JE T’AIME ❤️ »** apparaît lettre par lettre, puis scintille.
4. **« Je t’aime, Prénom ❤️ »** : le prénom s’écrit à la main, tracé par une
   plume lumineuse qui sème des paillettes.
5. **Les petits messages** apparaissent un à un, mot par mot. Ils défilent
   seuls ; un toucher accélère. Le dernier, *« Je t’aime ❤️ »*, est mis en
   valeur.
6. **« Découvrir mon message 💌 »** fait arriver une enveloppe scellée d’un
   cachet en cœur. On la touche : le sceau saute, le rabat s’ouvre, la lettre
   sort et se déplie. Le texte se révèle au rythme de la lecture, la
   signature s’écrit à la main, un cœur se dessine, puis une pluie de cœurs
   tombe.
7. **Les photos** (facultatives) s’affichent en polaroïds, agrandissables
   d’un toucher. *« Revivre ce moment »* relance l’histoire.

## Personnaliser

### Option 1 — L’atelier, sans toucher au code

Ouvre **`personnaliser.html`** : un formulaire pour tout régler (prénom,
messages, lettre, couleur, musique, photos), avec un **aperçu en direct**.

- **« Obtenir le lien »** fabrique un lien à envoyer (WhatsApp, SMS…). Le
  message est rangé dans le lien lui-même : pas de compte, pas de serveur.
  Un seul site en ligne peut ainsi servir pour plusieurs déclarations.
- **« Télécharger config.js »** crée le fichier de réglages prêt à l’emploi :
  remplace celui du site pour que la version de base soit la tienne.
- Le brouillon est gardé sur ton appareil : rien n’est perdu si la page se
  recharge.

Raccourci pour juste changer le prénom ou la couleur :
`index.html?prenom=Aïcha&couleur=lavande`

### Option 2 — Le fichier `config.js`

Tout est rassemblé et commenté dans [`config.js`](config.js). Modifie le texte
entre les guillemets, enregistre, recharge la page.

| Réglage | Ce qu’il change |
| --- | --- |
| `prenom` | Le prénom écrit à la main (« Je t’aime, Prénom ❤️ ») |
| `accueil.titre`, `accueil.invitation` | Les deux phrases de l’écran d’accueil |
| `grandMessage` | Le message après l’explosion (« JE T’AIME ❤️ ») |
| `avantPrenom` | Les mots avant le prénom (« Je t’aime, ») |
| `messages` | Les petits messages, dans l’ordre — autant que tu veux |
| `boutonLettre` | Le texte du bouton (« Découvrir mon message 💌 ») |
| `lettre` | La déclaration finale : texte sur l’enveloppe, paragraphes, formule, signature |
| `photos` | Le titre de la galerie et la liste des photos avec leurs légendes |
| `couleur` | Le thème : un nom ou n’importe quelle couleur `#rrggbb` |
| `musique` | Boîte à musique intégrée, ta chanson, ou aucun son |
| `options` | Défilement automatique, vibration, liens de l’atelier |

Si `config.js` contient une faute de frappe (guillemet ou virgule oubliés),
la page l’indique en bas de l’écran au lieu de rester muette.

Dans tous les textes, **❤️ devient un petit cœur animé** aux couleurs du thème.

### Les couleurs

| Nom | Ambiance |
| --- | --- |
| `rose` | Rose tendre sur nuit prune (par défaut) |
| `passion` | Rouge passion |
| `lavande` | Violet doux |
| `or` | Or champagne |
| `aurore` | Coucher de soleil |
| `nuit` | Nuit étoilée bleue, cœurs roses |
| `#e91e63` | N’importe quelle couleur : le thème entier (dégradé, cœurs, lumières) est calculé à partir d’elle |

### Les photos

Dépose tes photos dans le dossier [`medias/`](medias/) puis ajoute-les :

```js
photos: {
  titre: "Quelques instants précieux",
  liste: [
    { image: "medias/photo-1.jpg", legende: "Ce jour-là…" },
    { image: "medias/photo-2.jpg", legende: "Ton sourire" },
  ],
},
```

Une adresse web (`https://…`) fonctionne aussi. Conseil : réduis les photos à
environ 1200 pixels de large pour qu’elles s’affichent vite sur téléphone.
Une photo introuvable est simplement masquée.

### La musique

- **Par défaut** : une boîte à musique jouée en direct par le navigateur
  (Canon de Pachelbel, œuvre du domaine public) : 0 Ko à télécharger, aucun
  droit d’auteur.
- **Ta chanson** : copie le fichier dans `medias/` et indique
  `fichier: "medias/notre-chanson.mp3"`. Il faut un vrai fichier audio
  (mp3, m4a…) : un lien YouTube ne fonctionne pas. `debut` permet de démarrer
  la chanson au bon moment (en secondes).
- Les navigateurs interdisent le son avant un geste : la musique démarre donc
  au clic sur le cœur. Le bouton en haut à droite la coupe ou la relance.

## Mettre en ligne (gratuit)

Le dossier `declaration-amour/` se suffit à lui-même.

- **Netlify Drop**, le plus simple : glisse le dossier `declaration-amour`
  sur <https://app.netlify.com/drop> ; un lien est créé aussitôt.
- **Vercel** : *Add New → Project*, importe ce dépôt, règle *Root Directory*
  sur `declaration-amour`, *Framework Preset* sur *Other*, sans commande de
  build. (Le `vercel.json` de la racine concerne `ecole/` ; il est ignoré
  quand *Root Directory* est défini.)
- N’importe quel hébergement de fichiers statiques convient.

Une fois en ligne, remplace dans `index.html` la valeur `apercu.jpg` de la
balise `og:image` par l’adresse complète (`https://ton-site…/apercu.jpg`) :
WhatsApp affichera alors une jolie image quand tu partageras le lien, sans
dévoiler la surprise.

Pour essayer sur ton ordinateur, un double-clic sur `index.html` suffit. Pour
tester les liens de l’atelier, sers le dossier : `npx serve declaration-amour`
ou `python3 -m http.server` dans le dossier.

## Pensé pour les téléphones

- **Fluide** : les effets sont dessinés sur `<canvas>` avec des formes
  préparées une seule fois ; l’animation se met en pause quand l’onglet est
  caché (batterie).
- **Mode léger automatique** : si le téléphone peine (images par seconde
  mesurées au démarrage), s’il a peu de mémoire ou si l’économie de données
  est activée, les effets s’allègent tout seuls.
- **Tous les téléphones** : code compatible iOS 12+ et Android 7+
  (Chrome 64+), encoches et barres système respectées, aucun zoom ni
  défilement parasite, écrans de 320 px à l’ordinateur.
- **Léger** : environ 160 Ko transférés au premier affichage, polices
  comprises (hébergées avec le site), aucune bibliothèque externe.
- **Accessible** : textes lus par les lecteurs d’écran, navigation au clavier
  (Entrée, Espace ou → pour avancer, Échap pour fermer une photo), réglage
  « réduire les animations » respecté.

## Structure

```
declaration-amour/
  index.html           l’expérience
  config.js            ✏️ textes, couleur, musique, photos
  personnaliser.html   l’atelier : formulaire, aperçu, lien, config.js
  css/style.css        styles de l’expérience
  css/editeur.css      styles de l’atelier
  css/polices.css      polices (partagées)
  js/outils.js         thèmes, lecture de la configuration, liens
  js/effets.js         ciel, cœurs, explosion, confettis, plume (canvas)
  js/musique.js        boîte à musique (Web Audio) ou ta chanson, petits sons
  js/app.js            le scénario, scène par scène
  js/editeur.js        l’atelier
  tests/               tests de la configuration (node --test declaration-amour/tests/*.test.js)
  fonts/               Cormorant Garamond et Great Vibes (licence SIL OFL)
  medias/              tes photos et ta musique
  apercu.jpg           image affichée quand le lien est partagé
  icone.png            icône sur l’écran d’accueil du téléphone
```

## Vie privée

La page n’envoie rien : ni statistiques, ni cookies, ni service externe.
Le lien de l’atelier contient le message **encodé mais pas chiffré** :
comme une lettre, toute personne qui a le lien peut la lire. La balise
`noindex` demande aux moteurs de recherche de ne pas référencer la page.
