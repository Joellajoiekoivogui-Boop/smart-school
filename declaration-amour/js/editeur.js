/*
 * L'atelier (personnaliser.html) : un formulaire qui fabrique un lien
 * personnalisé (…/index.html#d=…) ou un nouveau fichier config.js.
 * Le lien contient seulement ce qui diffère de config.js.
 */
(function () {
  'use strict';

  var O = window.Amour.outils;
  var base = O.normaliser(window.DECLARATION, O.DEFAUTS);   // config.js seul
  var CLE_BROUILLON = 'declaration-amour:brouillon';
  var LARGE = window.matchMedia ? window.matchMedia('(min-width: 1080px)') : { matches: false };

  function $(id) { return document.getElementById(id); }

  var champs = {
    prenom: $('f-prenom'),
    signature: $('f-signature'),
    accueilTitre: $('f-accueil-titre'),
    invitation: $('f-invitation'),
    grandMessage: $('f-grand-message'),
    avantPrenom: $('f-avant-prenom'),
    messages: $('f-messages'),
    bouton: $('f-bouton'),
    surEnveloppe: $('f-enveloppe'),
    lettreTitre: $('f-lettre-titre'),
    lettre: $('f-lettre'),
    formule: $('f-formule'),
    musiqueFichier: $('f-musique-fichier'),
    photosTitre: $('f-photos-titre'),
    auto: $('f-auto')
  };

  var couleur = base.couleur;
  var photos = [];
  var dernierLien = '';

  /* ------------------------------------------------------------------ */
  /* Formulaire ⇄ configuration                                          */
  /* ------------------------------------------------------------------ */

  function modeMusique() {
    var coche = document.querySelector('input[name="musique"]:checked');
    return coche ? coche.value : 'boite';
  }

  function remplir(c) {
    champs.prenom.value = c.prenom;
    champs.signature.value = c.lettre.signature;
    champs.accueilTitre.value = c.accueil.titre;
    champs.invitation.value = c.accueil.invitation;
    champs.grandMessage.value = c.grandMessage;
    champs.avantPrenom.value = c.avantPrenom;
    champs.messages.value = c.messages.join('\n');
    champs.bouton.value = c.boutonLettre;
    champs.surEnveloppe.value = c.lettre.surEnveloppe;
    champs.lettreTitre.value = c.lettre.titre;
    champs.lettre.value = c.lettre.paragraphes.join('\n\n');
    champs.formule.value = c.lettre.formule;
    champs.photosTitre.value = c.photos.titre;
    champs.auto.checked = c.options.avancementAuto;
    champs.musiqueFichier.value = c.musique.fichier;
    var mode = !c.musique.activee ? 'aucune' : (c.musique.fichier ? 'fichier' : 'boite');
    document.querySelector('input[name="musique"][value="' + mode + '"]').checked = true;
    couleur = c.couleur;
    photos = c.photos.liste.map(function (p) { return { image: p.image, legende: p.legende }; });
    dessinerPhotos();
    dessinerNuancier();
    majMusique();
  }

  // Valeurs brutes du formulaire (normaliser() se charge du reste).
  function brut() {
    var mode = modeMusique();
    return {
      prenom: champs.prenom.value,
      accueil: { titre: champs.accueilTitre.value, invitation: champs.invitation.value },
      grandMessage: champs.grandMessage.value,
      avantPrenom: champs.avantPrenom.value,
      messages: champs.messages.value,
      boutonLettre: champs.bouton.value,
      lettre: {
        surEnveloppe: champs.surEnveloppe.value,
        titre: champs.lettreTitre.value,
        paragraphes: champs.lettre.value,
        formule: champs.formule.value,
        signature: champs.signature.value
      },
      photos: {
        titre: champs.photosTitre.value,
        liste: photos.filter(function (p) { return p.image.trim(); })
      },
      couleur: couleur,
      musique: { activee: mode !== 'aucune', fichier: mode === 'fichier' ? champs.musiqueFichier.value : '' },
      options: { avancementAuto: champs.auto.checked }
    };
  }

  function lire() { return O.normaliser(brut(), base); }

  function egal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // Ne garde que ce qui diffère de config.js (liens plus courts).
  function difference(c) {
    var res = {};
    Object.keys(c).forEach(function (cle) {
      var a = c[cle], b = base[cle];
      if (egal(a, b)) return;
      if (a && typeof a === 'object' && !Array.isArray(a)) {
        var sous = {};
        Object.keys(a).forEach(function (k) { if (!egal(a[k], b[k])) sous[k] = a[k]; });
        res[cle] = sous;
      } else {
        res[cle] = a;
      }
    });
    return res;
  }

  function code(c) {
    var diff = difference(c);
    return Object.keys(diff).length ? O.encoderLien(diff) : '';
  }

  function lien(c) {
    var url = new URL('index.html', window.location.href);
    var d = code(c);
    url.search = '';
    url.hash = d ? 'd=' + d : '';
    return url.href;
  }

  /* ------------------------------------------------------------------ */
  /* Nuancier                                                            */
  /* ------------------------------------------------------------------ */

  function dessinerNuancier() {
    var nuancier = $('nuancier');
    while (nuancier.firstChild) nuancier.removeChild(nuancier.firstChild);
    var estPreset = !!O.THEMES[couleur];

    Object.keys(O.THEMES).forEach(function (cle) {
      var t = O.THEMES[cle];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pastille' + (cle === couleur ? ' choisie' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', cle === couleur ? 'true' : 'false');
      var rond = document.createElement('span');
      rond.className = 'pastille-rond';
      rond.style.background = 'linear-gradient(135deg, ' + t.claire + ', ' + t.principale + ' 45%, ' + t.profonde + ')';
      var nom = document.createElement('span');
      nom.className = 'pastille-nom';
      nom.textContent = t.nom;
      b.appendChild(rond);
      b.appendChild(nom);
      b.addEventListener('click', function () { couleur = cle; dessinerNuancier(); changement(); });
      nuancier.appendChild(b);
    });

    var perso = document.createElement('label');
    perso.className = 'pastille pastille-perso' + (estPreset ? '' : ' choisie');
    var choix = document.createElement('input');
    choix.type = 'color';
    choix.value = estPreset ? '#e91e63' : (O.hexVersRgb(couleur) ? normaliserHex(couleur) : '#e91e63');
    choix.setAttribute('aria-label', 'Choisir une autre couleur');
    choix.addEventListener('input', function () { couleur = choix.value; marquerPerso(perso); changement(); });
    choix.addEventListener('change', function () { dessinerNuancier(); });
    var rondPerso = document.createElement('span');
    rondPerso.className = 'pastille-rond';
    rondPerso.appendChild(choix);
    var nomPerso = document.createElement('span');
    nomPerso.className = 'pastille-nom';
    nomPerso.textContent = 'Autre…';
    perso.appendChild(rondPerso);
    perso.appendChild(nomPerso);
    nuancier.appendChild(perso);

    O.appliquerTheme(O.resoudreTheme(couleur));
  }

  function marquerPerso(perso) {
    var boutons = document.querySelectorAll('#nuancier button.pastille');
    for (var i = 0; i < boutons.length; i++) {
      boutons[i].setAttribute('aria-checked', 'false');
      boutons[i].classList.remove('choisie');
    }
    perso.classList.add('choisie');
    O.appliquerTheme(O.resoudreTheme(couleur));
  }

  function normaliserHex(c) {
    var rgb = O.hexVersRgb(c);
    return '#' + rgb.map(function (v) { var s = v.toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Photos                                                              */
  /* ------------------------------------------------------------------ */

  function dessinerPhotos() {
    var liste = $('liste-photos');
    while (liste.firstChild) liste.removeChild(liste.firstChild);
    photos.forEach(function (p, i) {
      var ligne = document.createElement('div');
      ligne.className = 'ligne-photo';

      var vignette = document.createElement('span');
      vignette.className = 'vignette';
      majVignette(vignette, p.image);

      var textes = document.createElement('span');
      textes.className = 'ligne-photo-textes';
      var image = document.createElement('input');
      image.type = 'text';
      image.inputMode = 'url';
      image.placeholder = 'https://… ou medias/photo-' + (i + 1) + '.jpg';
      image.value = p.image;
      image.setAttribute('aria-label', 'Adresse de la photo ' + (i + 1));
      image.addEventListener('input', function () { p.image = image.value; majVignette(vignette, image.value); changement(); });
      var legende = document.createElement('input');
      legende.type = 'text';
      legende.placeholder = 'Légende (facultatif)';
      legende.value = p.legende;
      legende.maxLength = 80;
      legende.setAttribute('aria-label', 'Légende de la photo ' + (i + 1));
      legende.addEventListener('input', function () { p.legende = legende.value; changement(); });
      textes.appendChild(image);
      textes.appendChild(legende);

      var retirer = document.createElement('button');
      retirer.type = 'button';
      retirer.className = 'retirer';
      retirer.setAttribute('aria-label', 'Retirer la photo ' + (i + 1));
      retirer.textContent = '✕';
      retirer.addEventListener('click', function () { photos.splice(i, 1); dessinerPhotos(); changement(); });

      ligne.appendChild(vignette);
      ligne.appendChild(textes);
      ligne.appendChild(retirer);
      liste.appendChild(ligne);
    });
  }

  function majVignette(vignette, adresse) {
    var src = O.urlSure(adresse || '');
    vignette.style.backgroundImage = src ? 'url("' + src.replace(/["\\]/g, '\\$&') + '")' : '';
  }

  /* ------------------------------------------------------------------ */
  /* Aperçu                                                              */
  /* ------------------------------------------------------------------ */

  var compteur = 0, minuterieApercu = 0;

  function urlApercu() {
    var d = code(lire());
    return 'index.html?apercu=' + (++compteur) + (d ? '#d=' + d : '');
  }

  function chargerApercu(conteneur) {
    var cadre = conteneur.querySelector('iframe');
    if (!cadre) {
      cadre = document.createElement('iframe');
      cadre.title = 'Aperçu de la déclaration';
      cadre.setAttribute('allow', 'autoplay');
      conteneur.appendChild(cadre);
    }
    cadre.src = urlApercu();
  }

  function apercuLateral() {
    if (LARGE.matches) chargerApercu($('ecran-apercu'));
  }

  function ouvrirModale() {
    $('modale').hidden = false;
    document.documentElement.classList.add('modale-ouverte');
    chargerApercu($('modale-ecran'));
    $('fermer-modale').focus();
  }

  function fermerModale() {
    var ecran = $('modale-ecran');
    while (ecran.firstChild) ecran.removeChild(ecran.firstChild);
    $('modale').hidden = true;
    document.documentElement.classList.remove('modale-ouverte');
    $('voir-apercu').focus();
  }

  /* ------------------------------------------------------------------ */
  /* Lien, partage, fichier                                              */
  /* ------------------------------------------------------------------ */

  function majLien() {
    var c = lire();
    dernierLien = lien(c);
    $('lien').value = dernierLien;
    $('ouvrir').href = dernierLien;
    $('whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent('J’ai quelque chose à te dire… 💌 ' + dernierLien);

    var infos = [];
    if (window.location.protocol === 'file:') {
      infos.push('Tu ouvres le site depuis ton ordinateur : ce lien ne marchera que sur cet appareil. Mets d’abord le site en ligne (voir le README), puis reviens sur cette page.');
    }
    if (!base.options.personnalisationParLien) {
      infos.push('Les liens personnalisés sont désactivés dans config.js (options.personnalisationParLien) : utilise plutôt « Télécharger config.js ».');
    }
    if (dernierLien.length > 3000) {
      infos.push('Le lien est long (' + dernierLien.length + ' caractères) : il fonctionne, mais tu peux le raccourcir avec un service de liens courts, ou utiliser config.js.');
    }
    if (!infos.length) infos.push('Le message est rangé dans le lien lui-même : aucun compte, aucun serveur.');
    $('info-lien').textContent = infos.join(' ');
  }

  function toast(texte) {
    var t = $('toast');
    t.textContent = texte;
    t.classList.add('visible');
    clearTimeout(toast.minuterie);
    toast.minuterie = setTimeout(function () { t.classList.remove('visible'); }, 2600);
  }

  function copier() {
    majLien();
    var texte = dernierLien;
    function secours() {
      var champ = $('lien');
      champ.focus();
      champ.select();
      try { champ.setSelectionRange(0, texte.length); } catch (e) { /* rien */ }
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      toast(ok ? 'Lien copié 💌' : 'Sélectionne le lien puis copie-le');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texte).then(function () { toast('Lien copié 💌'); }, secours);
    } else {
      secours();
    }
  }

  function partager() {
    majLien();
    var titre = 'J’ai quelque chose à te dire… 💌';
    if (navigator.share) {
      navigator.share({ title: titre, text: titre, url: dernierLien }).catch(function () {});
    } else {
      window.open($('whatsapp').href, '_blank', 'noopener');
    }
  }

  function js(v) {
    return JSON.stringify(v).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }

  function listeJs(valeurs, retrait) {
    if (!valeurs.length) return '[]';
    return '[\n' + valeurs.map(function (v) { return retrait + '  ' + v + ','; }).join('\n') + '\n' + retrait + ']';
  }

  function genererConfig(c) {
    var date = new Date();
    var jour = ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + date.getFullYear();
    return [
      '/* ==========================================================================',
      '   ✏️  PERSONNALISATION — fichier créé avec personnaliser.html le ' + jour,
      '   Remplace le fichier config.js du site par celui-ci.',
      '   Garde les guillemets "..." et la virgule en fin de ligne.',
      '   ========================================================================== */',
      '',
      'window.DECLARATION = {',
      '',
      '  /* 1. Son prénom (il s\'écrit progressivement à l\'écran) */',
      '  prenom: ' + js(c.prenom) + ',',
      '',
      '  /* 2. L\'écran d\'accueil */',
      '  accueil: {',
      '    titre: ' + js(c.accueil.titre) + ',',
      '    invitation: ' + js(c.accueil.invitation) + ',',
      '  },',
      '',
      '  /* 3. Le grand message, puis les mots avant le prénom */',
      '  grandMessage: ' + js(c.grandMessage) + ',',
      '  avantPrenom: ' + js(c.avantPrenom) + ',',
      '',
      '  /* 4. Les petits messages, dans l\'ordre (le dernier est mis en valeur) */',
      '  messages: ' + listeJs(c.messages.map(js), '  ') + ',',
      '  boutonLettre: ' + js(c.boutonLettre) + ',',
      '',
      '  /* 5. La lettre finale */',
      '  lettre: {',
      '    surEnveloppe: ' + js(c.lettre.surEnveloppe) + ',',
      '    titre: ' + js(c.lettre.titre) + ',',
      '    paragraphes: ' + listeJs(c.lettre.paragraphes.map(js), '    ') + ',',
      '    formule: ' + js(c.lettre.formule) + ',',
      '    signature: ' + js(c.lettre.signature) + ',',
      '  },',
      '',
      '  /* 6. Les photos (facultatif) — fichiers dans « medias » ou liens https:// */',
      '  photos: {',
      '    titre: ' + js(c.photos.titre) + ',',
      '    liste: ' + listeJs(c.photos.liste.map(function (p) {
        return '{ image: ' + js(p.image) + ', legende: ' + js(p.legende) + ' }';
      }), '    ') + ',',
      '  },',
      '',
      '  /* 7. La couleur : "rose", "passion", "lavande", "or", "aurore", "nuit" ou "#e91e63" */',
      '  couleur: ' + js(c.couleur) + ',',
      '',
      '  /* 8. La musique (fichier vide = boîte à musique intégrée) */',
      '  musique: {',
      '    activee: ' + c.musique.activee + ',',
      '    fichier: ' + js(c.musique.fichier) + ',',
      '    volume: ' + c.musique.volume + ',',
      '    debut: ' + c.musique.debut + ',',
      '  },',
      '',
      '  /* 9. Réglages */',
      '  options: {',
      '    avancementAuto: ' + c.options.avancementAuto + ',',
      '    vibration: ' + c.options.vibration + ',',
      '    personnalisationParLien: ' + c.options.personnalisationParLien + ',',
      '  },',
      '};',
      ''
    ].join('\n');
  }

  function telecharger() {
    var contenu = genererConfig(lire());
    var blob = new Blob([contenu], { type: 'text/javascript;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'config.js';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1500);
    toast('config.js téléchargé : remplace celui du site');
  }

  /* ------------------------------------------------------------------ */
  /* Brouillon (gardé sur cet appareil)                                  */
  /* ------------------------------------------------------------------ */

  function enregistrerBrouillon() {
    try { window.localStorage.setItem(CLE_BROUILLON, JSON.stringify(brut())); } catch (e) { /* stockage indisponible */ }
  }

  function lireBrouillon() {
    try {
      var texte = window.localStorage.getItem(CLE_BROUILLON);
      return texte ? JSON.parse(texte) : null;
    } catch (e) {
      return null;
    }
  }

  function effacerBrouillon() {
    try { window.localStorage.removeItem(CLE_BROUILLON); } catch (e) { /* rien */ }
  }

  /* ------------------------------------------------------------------ */
  /* Événements                                                          */
  /* ------------------------------------------------------------------ */

  var minuterieBrouillon = 0;

  function changement() {
    majLien();
    clearTimeout(minuterieBrouillon);
    minuterieBrouillon = setTimeout(enregistrerBrouillon, 400);
    clearTimeout(minuterieApercu);
    minuterieApercu = setTimeout(apercuLateral, 1200);
  }

  function majMusique() {
    champs.musiqueFichier.hidden = modeMusique() !== 'fichier';
  }

  $('formulaire').addEventListener('input', changement);
  $('formulaire').addEventListener('change', function (e) {
    if (e.target.name === 'musique') { majMusique(); changement(); }
    if (e.target === champs.auto) changement();
  });
  $('formulaire').addEventListener('submit', function (e) { e.preventDefault(); });

  $('ajouter-photo').addEventListener('click', function () {
    photos.push({ image: '', legende: '' });
    dessinerPhotos();
    var champsPhotos = document.querySelectorAll('.ligne-photo input');
    if (champsPhotos.length) champsPhotos[champsPhotos.length - 2].focus();
  });

  $('copier').addEventListener('click', copier);
  $('partager').addEventListener('click', partager);
  $('telecharger').addEventListener('click', telecharger);
  $('reinitialiser').addEventListener('click', function () {
    effacerBrouillon();
    remplir(base);
    changement();
    toast('Retour aux textes de config.js');
  });
  $('lien').addEventListener('focus', function () { this.select(); });
  $('voir-apercu').addEventListener('click', ouvrirModale);
  $('fermer-modale').addEventListener('click', fermerModale);
  $('rejouer-apercu').addEventListener('click', function () { chargerApercu($('ecran-apercu')); });
  $('aller-lien').addEventListener('click', function () {
    majLien();
    $('bloc-lien').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { $('copier').focus({ preventScroll: true }); }, 500);
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && !$('modale').hidden) fermerModale();
  });
  if (LARGE.addEventListener) LARGE.addEventListener('change', apercuLateral);
  else if (LARGE.addListener) LARGE.addListener(apercuLateral);

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                           */
  /* ------------------------------------------------------------------ */

  var depuisLien = /[#&]d=/.test(window.location.hash);
  var brouillon = depuisLien ? null : lireBrouillon();
  remplir(brouillon ? O.normaliser(brouillon, base) : O.chargerConfig().config);
  majLien();
  apercuLateral();
  if (brouillon) toast('Ton brouillon a été retrouvé ✨');
})();
