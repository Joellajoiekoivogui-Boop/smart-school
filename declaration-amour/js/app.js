/*
 * Le scénario : accueil → explosion de cœurs → « JE T'AIME » → le prénom
 * écrit à la main → les petits messages → l'enveloppe → la lettre.
 */
(function () {
  'use strict';

  var Amour = window.Amour;
  var O = Amour.outils, E = Amour.effets, M = Amour.musique;
  var html = document.documentElement;

  var charge = O.chargerConfig();
  var config = charge.config;
  var theme = O.resoudreTheme(config.couleur);
  O.appliquerTheme(theme);
  if (config.titrePage) document.title = config.titrePage;

  var mqReduit = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduit = !!(mqReduit && mqReduit.matches);
  var tactile = !(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  if (appareilModeste()) html.classList.add('leger');
  if (reduit) html.classList.add('reduit');
  if (tactile) html.classList.add('tactile');
  var masqueOk = !!(window.CSS && CSS.supports && (
    CSS.supports('-webkit-mask-image', 'linear-gradient(#000, #000)') ||
    CSS.supports('mask-image', 'linear-gradient(#000, #000)')));

  // Économie de données, peu de mémoire ou de cœurs : effets allégés d'emblée.
  function appareilModeste() {
    var n = navigator, c = n.connection || {};
    return !!(c.saveData || (n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2));
  }

  function $(id) { return document.getElementById(id); }

  var el = {
    scenes: $('scenes'),
    accueil: $('accueil'),
    titreAccueil: $('titre-accueil'),
    invitation: $('invitation'),
    grandCoeur: $('grand-coeur'),
    sceneJetaime: $('scene-jetaime'),
    jetaime: $('jetaime'),
    scenePrenom: $('scene-prenom'),
    avantPrenom: $('avant-prenom'),
    lignePrenom: $('ligne-prenom'),
    prenom: $('prenom'),
    prenomCoeur: $('prenom-coeur'),
    sceneMessages: $('scene-messages'),
    zoneMessages: $('zone-messages'),
    boutonLettre: $('bouton-lettre'),
    indice: $('indice-suite'),
    sceneEnveloppe: $('scene-enveloppe'),
    enveloppe: $('enveloppe'),
    envTexte: $('env-texte'),
    envIndice: $('env-indice'),
    lettre: $('lettre'),
    lettreTitre: $('lettre-titre'),
    lettreCorps: $('lettre-corps'),
    lettreFormule: $('lettre-formule'),
    lettreSignature: $('lettre-signature'),
    coeurDessine: $('coeur-dessine'),
    souvenirs: $('souvenirs'),
    souvenirsTitre: $('souvenirs-titre'),
    polaroids: $('polaroids'),
    lettreFin: $('lettre-fin'),
    boutonRejouer: $('bouton-rejouer'),
    flash: $('flash'),
    boutonSon: $('bouton-son'),
    annonce: $('annonce'),
    visionneuse: $('visionneuse'),
    visionneuseImg: $('visionneuse-img'),
    visionneuseLegende: $('visionneuse-legende')
  };

  var etat = 'chargement';
  var jeton = 0;               // change à chaque « rejouer » : annule les suites en cours
  var toucherEnAttente = null; // fonction appelée au prochain toucher

  /* ------------------------------------------------------------------ */
  /* Petits outils                                                       */
  /* ------------------------------------------------------------------ */

  function attendre(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Attend `ms` millisecondes OU un toucher (ms < 0 : seulement un toucher).
  // Renvoie true si la personne a touché l'écran.
  function attendreOuToucher(ms) {
    return new Promise(function (resoudre) {
      var fini = false;
      var minuterie = ms >= 0 ? setTimeout(function () { fin(false); }, ms) : 0;
      function fin(touche) {
        if (fini) return;
        fini = true;
        clearTimeout(minuterie);
        if (toucherEnAttente === fin) toucherEnAttente = null;
        resoudre(touche);
      }
      toucherEnAttente = fin;
    });
  }

  function vider(noeud) { while (noeud.firstChild) noeud.removeChild(noeud.firstChild); }

  function centre(noeud) {
    var r = noeud.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function annoncer(texte) { el.annonce.textContent = texte; }

  /* ------------------------------------------------------------------ */
  /* Texte : lettres, mots, et ❤️ remplacés par un cœur animé            */
  /* ------------------------------------------------------------------ */

  var RE_GRAPHEME = /\uD83C[\uDDE6-\uDDFF]\uD83C[\uDDE6-\uDDFF]|(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF])(?:[\u0300-\u036F\uFE0E\uFE0F\u20E3]|\uD83C[\uDFFB-\uDFFF])*(?:\u200D(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF])(?:[\uFE0E\uFE0F]|\uD83C[\uDFFB-\uDFFF])*)*/g;
  var COEURS = { '\u2764': 1, '\u2764\uFE0F': 1, '\u2665': 1, '\u2665\uFE0F': 1 };

  function graphemes(texte) {
    if (window.Intl && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(texte), function (s) { return s.segment; });
    }
    return texte.match(RE_GRAPHEME) || [];
  }

  function estCoeur(g) { return COEURS[g] === 1; }

  // Découpe en mots ; un « mot » sans lettre (❤️, !, ?, …) reste collé au
  // précédent par une espace insécable, comme en typographie française.
  var RE_LETTRE = /[0-9A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;
  function decouperMots(texte) {
    var mots = [];
    texte.split(/\s+/).forEach(function (m) {
      if (!m) return;
      if (mots.length && !RE_LETTRE.test(m)) mots[mots.length - 1] += '\u00A0' + m;
      else mots.push(m);
    });
    return mots;
  }

  function coeurInline() {
    var span = document.createElement('span');
    span.className = 'coeur-inline';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 100 92" focusable="false"><use xlink:href="#chemin-coeur" href="#chemin-coeur"></use></svg>';
    return span;
  }

  function texteLecteur(noeud, texte) {
    var sr = document.createElement('span');
    sr.className = 'sr';
    sr.textContent = texte;
    noeud.appendChild(sr);
  }

  // Texte simple, chaque ❤️ devient un cœur SVG.
  function remplirTexte(noeud, texte) {
    vider(noeud);
    var tampon = '';
    graphemes(texte).forEach(function (g) {
      if (estCoeur(g)) {
        tampon = tampon.replace(/ $/, '\u00A0');
        if (tampon) noeud.appendChild(document.createTextNode(tampon));
        tampon = '';
        noeud.appendChild(coeurInline());
      } else {
        tampon += g;
      }
    });
    if (tampon) noeud.appendChild(document.createTextNode(tampon));
  }

  // Une <span> par lettre (animées l'une après l'autre), regroupées par mot
  // pour que les retours à la ligne se fassent entre les mots.
  function remplirLettres(noeud, texte, classe, delai, pas, avecLueur) {
    vider(noeud);
    texteLecteur(noeud, texte);
    var i = 0;
    decouperMots(texte).forEach(function (m, n) {
      if (n) noeud.appendChild(document.createTextNode(' '));
      var mot = document.createElement('span');
      mot.className = 'mot';
      mot.setAttribute('aria-hidden', 'true');
      noeud.appendChild(mot);
      graphemes(m).forEach(function (g) { ajouterLettre(mot, g); });
    });
    return i;

    function ajouterLettre(mot, g) {
      var lettre;
      if (estCoeur(g)) {
        lettre = coeurInline();
      } else {
        lettre = document.createElement('span');
        if (avecLueur) {
          var lueur = document.createElement('span');
          lueur.className = 'lueur';
          lueur.style.animationDelay = (i * 110) + 'ms';
          lueur.textContent = g;
          lettre.appendChild(lueur);
        } else {
          lettre.textContent = g;
        }
      }
      lettre.className += (lettre.className ? ' ' : '') + classe;
      lettre.style.animationDelay = (delai + i * pas) + 'ms';
      mot.appendChild(lettre);
      i++;
    }
  }

  // Une <span> par mot.
  function remplirMots(noeud, texte, classe, delai, pas) {
    vider(noeud);
    texteLecteur(noeud, texte);
    var mots = decouperMots(texte);
    mots.forEach(function (m, i) {
      if (i) noeud.appendChild(document.createTextNode(' '));
      var span = document.createElement('span');
      span.className = classe;
      span.setAttribute('aria-hidden', 'true');
      span.style.animationDelay = (delai + i * pas) + 'ms';
      remplirTexte(span, m);
      noeud.appendChild(span);
    });
    return mots.length;
  }

  // Réduit la taille de police si le texte (sur une ligne) dépasse l'écran.
  function ajusterLargeur(noeud) {
    noeud.style.fontSize = '';
    var dispo = Math.min(window.innerWidth, document.documentElement.clientWidth) - 28;
    var largeur = noeud.getBoundingClientRect().width;
    if (largeur > dispo && largeur > 0) {
      var taille = parseFloat(window.getComputedStyle(noeud).fontSize);
      noeud.style.fontSize = Math.max(16, Math.floor(taille * dispo / largeur)) + 'px';
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scènes                                                              */
  /* ------------------------------------------------------------------ */

  function montrer(id) {
    var scenes = document.querySelectorAll('.scene');
    for (var i = 0; i < scenes.length; i++) {
      scenes[i].classList.toggle('est-active', scenes[i].id === id);
    }
  }

  function flash(x, y) {
    el.flash.style.setProperty('--fx', x + 'px');
    el.flash.style.setProperty('--fy', y + 'px');
    el.flash.classList.remove('actif');
    void el.flash.offsetWidth;
    el.flash.classList.add('actif');
  }

  function vibrer(motif) {
    if (!config.options.vibration || !navigator.vibrate) return;
    try { navigator.vibrate(motif); } catch (e) { /* refusé : tant pis */ }
  }

  /* ------------------------------------------------------------------ */
  /* 1. Accueil                                                          */
  /* ------------------------------------------------------------------ */

  function lancerAccueil() {
    etat = 'accueil';
    remplirLettres(el.titreAccueil, config.accueil.titre, 'lettre-douce', 250, 42);
    remplirTexte(el.invitation, config.accueil.invitation);
    el.grandCoeur.setAttribute('aria-label', config.accueil.invitation.replace(/[\u2764\u2665]\uFE0F?/g, '').trim() || 'Ouvrir le message');
    montrer('accueil');
    html.classList.add('pret');
  }

  function surCoeur() {
    if (etat !== 'accueil') return;
    etat = 'histoire';
    M.demarrer();               // pendant le geste : obligatoire pour le son
    vibrer([28, 90, 42]);
    var c = centre(el.grandCoeur);
    el.grandCoeur.blur();
    try { el.scenes.focus({ preventScroll: true }); } catch (e) { el.scenes.focus(); }
    histoire(++jeton, c.x, c.y);
  }

  /* ------------------------------------------------------------------ */
  /* 2 à 4. L'histoire                                                   */
  /* ------------------------------------------------------------------ */

  function encore(j) { return j === jeton; }

  async function histoire(j, x, y) {
    html.classList.add('eclate');
    await attendre(240);
    if (!encore(j)) return;
    E.explosion(x, y);
    M.effet('eclat');
    flash(x, y);

    await attendre(950);
    if (!encore(j)) return;

    if (config.grandMessage) {
      await grandMessage(j);
      if (!encore(j)) return;
    }
    if (config.prenom) {
      await ecrirePrenom(j);
      if (!encore(j)) return;
    }
    await messages(j);
  }

  async function grandMessage(j) {
    el.jetaime.classList.remove('sort', 'brille');
    var n = remplirLettres(el.jetaime, config.grandMessage, 'lettre-grande', 0, 85, true);
    montrer('scene-jetaime');
    annoncer(config.grandMessage);
    ajusterLargeur(el.jetaime);

    await attendre(n * 85 + 650);
    if (!encore(j)) return;
    el.jetaime.classList.add('brille');
    var coeur = el.jetaime.querySelector('.coeur-inline');
    var c = centre(coeur || el.jetaime);
    E.petitEclat(c.x, c.y, coeur ? 1.4 : 1);
    M.effet('pop');
    vibrer(20);

    await attendre(2700);
    if (!encore(j)) return;
    el.jetaime.classList.add('sort');
    await attendre(650);
  }

  function ecrirePrenom(j) {
    return new Promise(function (resoudre) {
      el.scenePrenom.classList.remove('sort');
      el.prenom.classList.remove('en-ecriture', 'ecrit', 'simple');
      el.prenom.style.webkitMaskPosition = '';
      el.prenom.style.maskPosition = '';
      el.prenomCoeur.classList.remove('visible');
      remplirMots(el.avantPrenom, config.avantPrenom, 'mot-doux', 150, 160);
      el.prenom.textContent = config.prenom;
      montrer('scene-prenom');
      ajusterLargeur(el.lignePrenom);
      annoncer(config.avantPrenom + ' ' + config.prenom);

      var nbLettres = graphemes(config.prenom).length;
      var duree = Math.max(1500, Math.min(3600, 650 + nbLettres * 200));

      setTimeout(function () {
        if (!encore(j)) return resoudre();

        if (!masqueOk || reduit) {
          el.prenom.classList.add('simple');
          setTimeout(fin, 1300);
          return;
        }

        el.prenom.classList.add('en-ecriture');
        var r = el.prenom.getBoundingClientRect();
        var debut = 0;

        function etape(maintenant) {
          if (!encore(j)) { E.plume(null); return resoudre(); }
          if (!debut) debut = maintenant;
          var t = Math.min(1, (maintenant - debut) / duree);
          var e = 0.5 - Math.cos(t * Math.PI) / 2;          // départ et arrivée en douceur
          var f = -0.12 + e * 1.24;                          // bord de l'encre, de 0 à 1
          var p = ((1.5 - f) * 50).toFixed(2) + '% 0';
          el.prenom.style.webkitMaskPosition = p;
          el.prenom.style.maskPosition = p;
          E.plume(r.left + r.width * Math.max(0, Math.min(1, f)),
                  r.top + r.height * (0.56 + 0.15 * Math.sin(f * nbLettres * Math.PI)));
          if (t < 1) window.requestAnimationFrame(etape);
          else fin();
        }
        window.requestAnimationFrame(etape);
      }, 1000);

      function fin() {
        E.plume(null);
        if (!encore(j)) return resoudre();
        el.prenom.classList.remove('en-ecriture');
        el.prenom.classList.add('ecrit');
        el.prenomCoeur.classList.add('visible');
        var c = centre(el.prenomCoeur);
        E.petitEclat(c.x, c.y, 1.3);
        M.effet('prenom');
        vibrer(20);
        setTimeout(function () {
          if (!encore(j)) return resoudre();
          el.scenePrenom.classList.add('sort');
          setTimeout(resoudre, 700);
        }, 3000);
      }
    });
  }

  async function messages(j) {
    vider(el.zoneMessages);
    el.boutonLettre.classList.remove('visible');
    montrer('scene-messages');
    await attendre(700);
    if (!encore(j)) return;

    var liste = config.messages;
    for (var i = 0; i < liste.length; i++) {
      await unMessage(j, liste[i], i === liste.length - 1);
      if (!encore(j)) return;
    }
    await attendre(liste.length ? 1100 : 300);
    if (!encore(j)) return;
    etat = 'bouton';
    el.boutonLettre.classList.add('visible');
    el.boutonLettre.removeAttribute('tabindex');
  }

  async function unMessage(j, texte, dernier) {
    var bloc = document.createElement('div');
    bloc.className = 'message' + (dernier ? ' message-final' : '');
    var p = document.createElement('p');
    p.className = 'message-texte';
    var pas = dernier ? 170 : 115;
    var n = remplirMots(p, texte, 'mot-anime', 0, pas);
    bloc.appendChild(p);
    el.zoneMessages.appendChild(bloc);
    annoncer(texte);

    // Révélation des mots (un toucher l'accélère).
    var touche = await attendreOuToucher(n * pas + 900);
    if (!encore(j)) return;
    if (touche) bloc.classList.add('instantane');

    if (dernier) {
      var coeur = p.querySelector('.coeur-inline');
      var c = centre(coeur || p);
      E.explosion(c.x, c.y, { force: 0.45, confettis: false, ondes: false });
      M.effet('final');
      vibrer([20, 60, 30]);
      return;
    }

    // Lecture : passage automatique, ou au toucher.
    el.sceneMessages.classList.add('attend-toucher');
    var lecture = config.options.avancementAuto ? Math.min(9000, 2000 + texte.length * 50) : -1;
    await attendreOuToucher(lecture);
    el.sceneMessages.classList.remove('attend-toucher');
    if (!encore(j)) return;

    bloc.classList.add('sort');
    await attendre(700);
    if (bloc.parentNode) bloc.parentNode.removeChild(bloc);
  }

  /* ------------------------------------------------------------------ */
  /* 5. L'enveloppe et la lettre                                         */
  /* ------------------------------------------------------------------ */

  function surBoutonLettre() {
    if (etat !== 'bouton') return;
    etat = 'enveloppe';
    var c = centre(el.boutonLettre);
    E.etincelles(c.x, c.y, 26);
    M.effet('pop');
    el.boutonLettre.setAttribute('tabindex', '-1');
    el.sceneEnveloppe.classList.remove('ouverte', 'disparait');
    montrer('scene-enveloppe');
    setTimeout(function () { try { el.enveloppe.focus({ preventScroll: true }); } catch (e) { /* rien */ } }, 900);
  }

  function surEnveloppe() {
    if (etat !== 'enveloppe') return;
    etat = 'ouverture';
    var j = jeton;
    el.sceneEnveloppe.classList.add('ouverte');
    M.effet('lettre');
    vibrer(15);
    var c = centre(el.enveloppe);
    setTimeout(function () { if (encore(j)) E.etincelles(c.x, c.y - 30, 20); }, 250);
    setTimeout(function () {
      if (!encore(j)) return;
      el.sceneEnveloppe.classList.add('disparait');
      ouvrirLettre(j);
    }, 1750);
  }

  function construireLettre() {
    var l = config.lettre;
    el.lettreTitre.textContent = l.titre || (config.prenom ? config.prenom + ',' : '');
    el.lettreTitre.hidden = !el.lettreTitre.textContent;
    vider(el.lettreCorps);
    l.paragraphes.forEach(function (texte) {
      var p = document.createElement('p');
      p.className = 'revele';
      remplirTexte(p, texte);
      el.lettreCorps.appendChild(p);
    });
    remplirTexte(el.lettreFormule, l.formule);
    el.lettreFormule.hidden = !l.formule;
    var sig = el.lettreSignature.firstElementChild;
    sig.textContent = l.signature;
    el.lettreSignature.hidden = !l.signature;
    construirePhotos();
  }

  var photos = [];

  function construirePhotos() {
    photos = config.photos.liste.slice();
    vider(el.polaroids);
    el.souvenirs.hidden = !photos.length;
    if (!photos.length) return;
    el.souvenirsTitre.textContent = config.photos.titre;
    el.souvenirsTitre.hidden = !config.photos.titre;
    el.polaroids.className = 'polaroids' + (photos.length === 1 ? ' un-seul' : '');
    photos.forEach(function (photo, i) {
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'polaroid revele';
      bouton.setAttribute('data-pause', '320');
      bouton.setAttribute('aria-label', photo.legende ? 'Agrandir la photo : ' + photo.legende : 'Agrandir la photo');
      var cadre = document.createElement('span');
      cadre.className = 'polaroid-cadre';
      cadre.style.transform = 'rotate(' + ((i % 2 ? 1 : -1) * (2 + (i * 7) % 5)) + 'deg)';
      var fenetre = document.createElement('span');
      fenetre.className = 'polaroid-photo';
      var img = document.createElement('img');
      img.alt = photo.legende || '';
      img.decoding = 'async';
      if ('loading' in img) img.loading = 'lazy';
      img.onerror = function () {
        if (window.console) console.warn('Photo introuvable : ' + photo.image);
        photo.erreur = true;
        bouton.hidden = true;
        var restantes = photos.filter(function (ph) { return !ph.erreur; }).length;
        if (!restantes) el.souvenirs.hidden = true;
      };
      img.src = photo.image;
      fenetre.appendChild(img);
      cadre.appendChild(fenetre);
      var legende = document.createElement('span');
      legende.className = 'polaroid-legende';
      legende.textContent = photo.legende || '';
      cadre.appendChild(legende);
      bouton.appendChild(cadre);
      bouton.addEventListener('click', function () { ouvrirVisionneuse(i); });
      el.polaroids.appendChild(bouton);
    });
  }

  function ouvrirLettre(j) {
    etat = 'lettre';
    construireLettre();
    html.classList.add('lecture');
    el.lettre.hidden = false;
    el.lettre.scrollTop = 0;
    void el.lettre.offsetWidth;
    el.lettre.classList.add('ouverte');
    try { el.lettre.focus({ preventScroll: true }); } catch (e) { el.lettre.focus(); }
    annoncer(config.lettre.paragraphes.join(' '));

    var aReveler = [el.lettreTitre]
      .concat([].slice.call(el.lettreCorps.children))
      .concat([el.lettreFormule, el.lettreSignature, el.coeurDessine])
      .concat(photos.length ? [el.souvenirsTitre] : [])
      .concat([].slice.call(el.polaroids.children))
      .concat([el.lettreFin])
      .filter(function (n) { return !n.hidden; });

    setTimeout(function () {
      if (encore(j)) revelerProgressivement(aReveler, j);
    }, 700);
  }

  // Révèle les éléments dans l'ordre, au rythme de la lecture, en attendant
  // qu'ils soient visibles à l'écran (IntersectionObserver).
  function revelerProgressivement(elements, j) {
    var file = [], occupe = false, prochainIndex = 0;

    function suivant() {
      if (!encore(j)) return;
      if (!file.length) { occupe = false; return; }
      occupe = true;
      var n = file.shift();
      n.classList.add('visible');
      if (n === el.lettreSignature) ecrireSignature(j);
      var pause = parseInt(n.getAttribute('data-pause'), 10) || 650;
      setTimeout(suivant, pause);
    }

    // Révèle jusqu'à l'élément i inclus (jamais dans le désordre).
    function jusqua(i) {
      while (prochainIndex <= i && prochainIndex < elements.length) file.push(elements[prochainIndex++]);
      if (!occupe) suivant();
    }

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (en) {
          if (en.isIntersecting || en.intersectionRatio > 0) {
            obs.unobserve(en.target);
            jusqua(elements.indexOf(en.target));
          }
        });
      }, { root: el.lettre, threshold: 0.12 });
      elements.forEach(function (n) { obs.observe(n); });
    } else {
      jusqua(elements.length - 1);
    }
  }

  function ecrireSignature(j) {
    var trace = el.coeurDessine.querySelector('.trace');
    if (trace && trace.getTotalLength) {
      var longueur = Math.ceil(trace.getTotalLength());
      trace.style.strokeDasharray = longueur + ' ' + longueur;
      trace.style.strokeDashoffset = longueur;
    }
    setTimeout(function () {
      if (!encore(j)) return;
      if (trace) trace.style.strokeDashoffset = '0';
    }, 1900);
    setTimeout(function () {
      if (!encore(j)) return;
      E.pluieDeCoeurs(4.5, 9);
      M.effet('final');
    }, 3000);
  }

  /* ------------------------------------------------------------------ */
  /* Visionneuse de photos                                               */
  /* ------------------------------------------------------------------ */

  var photoActive = 0, focusAvant = null;

  function afficherPhoto(i) {
    var total = photos.length, sens = i < photoActive ? -1 : 1;
    var visibles = photos.filter(function (ph) { return !ph.erreur; }).length;
    if (!visibles) return;
    i = (i + total) % total;
    while (photos[i].erreur) i = (i + sens + total) % total;
    photoActive = i;
    var photo = photos[photoActive];
    el.visionneuseImg.src = photo.image;
    el.visionneuseImg.alt = photo.legende || '';
    el.visionneuseLegende.textContent = photo.legende || '';
    el.visionneuse.classList.toggle('une-seule', visibles < 2);
  }

  function ouvrirVisionneuse(i) {
    focusAvant = document.activeElement;
    afficherPhoto(i);
    el.visionneuse.hidden = false;
    void el.visionneuse.offsetWidth;
    el.visionneuse.classList.add('ouverte');
    $('visionneuse-fermer').focus();
  }

  function fermerVisionneuse() {
    if (el.visionneuse.hidden) return;
    el.visionneuse.classList.remove('ouverte');
    setTimeout(function () { el.visionneuse.hidden = true; }, 350);
    if (focusAvant && focusAvant.focus) focusAvant.focus();
  }

  /* ------------------------------------------------------------------ */
  /* Rejouer                                                             */
  /* ------------------------------------------------------------------ */

  function rejouer() {
    jeton++;
    toucherEnAttente = null;
    E.vider();
    E.plume(null);
    fermerVisionneuse();
    el.lettre.classList.remove('ouverte');
    setTimeout(function () { if (etat !== 'lettre') el.lettre.hidden = true; }, 900);
    var reveles = el.lettre.querySelectorAll('.revele');
    for (var i = 0; i < reveles.length; i++) reveles[i].classList.remove('visible');
    var trace = el.coeurDessine.querySelector('.trace');
    if (trace) trace.style.strokeDashoffset = trace.style.strokeDasharray ? trace.style.strokeDasharray.split(' ')[0] : '';
    html.classList.remove('eclate', 'lecture', 'pret');
    el.jetaime.classList.remove('sort', 'brille');
    el.scenePrenom.classList.remove('sort');
    el.prenom.classList.remove('en-ecriture', 'ecrit', 'simple');
    el.prenomCoeur.classList.remove('visible');
    el.sceneEnveloppe.classList.remove('ouverte', 'disparait');
    el.sceneMessages.classList.remove('attend-toucher');
    el.boutonLettre.classList.remove('visible');
    el.boutonLettre.setAttribute('tabindex', '-1');
    vider(el.zoneMessages);
    void html.offsetWidth;
    lancerAccueil();
    setTimeout(function () { try { el.grandCoeur.focus({ preventScroll: true }); } catch (e) { /* rien */ } }, 1200);
  }

  /* ------------------------------------------------------------------ */
  /* Toucher, souris, clavier                                            */
  /* ------------------------------------------------------------------ */

  function estInteractif(n) {
    while (n && n !== document.body && n !== document) {
      if (n.nodeName === 'BUTTON' || n.nodeName === 'A' || n.id === 'lettre' || n.id === 'visionneuse') return true;
      n = n.parentNode;
    }
    return false;
  }

  function surToucher(x, y, cible) {
    M.reveiller();
    if (estInteractif(cible)) return;
    if (etat === 'lettre' || etat === 'ouverture' || etat === 'chargement') return;
    E.petitEclat(x, y, 0.8);
    if (toucherEnAttente) toucherEnAttente(true);
  }

  var dernierToucher = 0;
  if (window.PointerEvent) {
    document.addEventListener('pointerdown', function (e) {
      if (e.isPrimary === false) return;
      surToucher(e.clientX, e.clientY, e.target);
    });
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') E.viser(e.clientX, e.clientY);
      if (etat !== 'lettre' && (e.pointerType === 'mouse' || e.buttons)) E.trainee(e.clientX, e.clientY);
    }, { passive: true });
  } else {
    document.addEventListener('touchstart', function (e) {
      dernierToucher = Date.now();
      var t = e.changedTouches[0];
      surToucher(t.clientX, t.clientY, e.target);
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      var t = e.changedTouches[0];
      if (etat !== 'lettre') E.trainee(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('mousedown', function (e) {
      if (Date.now() - dernierToucher < 800) return;
      surToucher(e.clientX, e.clientY, e.target);
    });
    document.addEventListener('mousemove', function (e) {
      E.viser(e.clientX, e.clientY);
      if (etat !== 'lettre') E.trainee(e.clientX, e.clientY);
    });
  }

  document.addEventListener('keydown', function (e) {
    var touche = e.key || '';
    if (!el.visionneuse.hidden) {
      if (touche === 'Escape' || touche === 'Esc') fermerVisionneuse();
      else if (touche === 'ArrowLeft' || touche === 'Left') afficherPhoto(photoActive - 1);
      else if (touche === 'ArrowRight' || touche === 'Right') afficherPhoto(photoActive + 1);
      return;
    }
    var surBouton = document.activeElement && document.activeElement.nodeName === 'BUTTON';
    if (toucherEnAttente && !surBouton && (touche === ' ' || touche === 'Spacebar' || touche === 'Enter' || touche === 'ArrowRight' || touche === 'Right')) {
      e.preventDefault();
      toucherEnAttente(true);
    }
  });

  el.grandCoeur.addEventListener('click', surCoeur);
  el.boutonLettre.addEventListener('click', surBoutonLettre);
  el.enveloppe.addEventListener('click', surEnveloppe);
  el.boutonRejouer.addEventListener('click', rejouer);
  $('visionneuse-fermer').addEventListener('click', fermerVisionneuse);
  $('visionneuse-prec').addEventListener('click', function () { afficherPhoto(photoActive - 1); });
  $('visionneuse-suiv').addEventListener('click', function () { afficherPhoto(photoActive + 1); });
  el.visionneuse.addEventListener('click', function (e) { if (e.target === el.visionneuse) fermerVisionneuse(); });

  var departGlisse = null;
  el.visionneuse.addEventListener('touchstart', function (e) { departGlisse = e.changedTouches[0].clientX; }, { passive: true });
  el.visionneuse.addEventListener('touchend', function (e) {
    if (departGlisse === null) return;
    var dx = e.changedTouches[0].clientX - departGlisse;
    departGlisse = null;
    if (Math.abs(dx) > 45 && photos.length > 1) afficherPhoto(photoActive + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ------------------------------------------------------------------ */
  /* Musique                                                             */
  /* ------------------------------------------------------------------ */

  function majBoutonSon(actif, joue) {
    el.boutonSon.classList.toggle('coupe', !actif);
    el.boutonSon.classList.toggle('joue', !!joue);
    el.boutonSon.setAttribute('aria-pressed', actif ? 'true' : 'false');
    el.boutonSon.title = actif ? 'Couper la musique' : 'Activer la musique';
  }

  M.init({
    activee: config.musique.activee,
    fichier: config.musique.fichier,
    volume: config.musique.volume,
    debut: config.musique.debut,
    leger: html.classList.contains('leger')
  });
  if (!config.musique.activee || !M.disponible()) {
    el.boutonSon.hidden = true;
  } else {
    M.surChangement(majBoutonSon);
    majBoutonSon(true, false);
    el.boutonSon.addEventListener('click', function () { M.basculer(); });
  }

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                           */
  /* ------------------------------------------------------------------ */

  function attendrePolices() {
    var polices = Promise.resolve();
    if (document.fonts && document.fonts.load) {
      polices = Promise.all([
        document.fonts.load('400 1em "Great Vibes"'),
        document.fonts.load('italic 500 1em "Cormorant Garamond"'),
        document.fonts.load('600 1em "Cormorant Garamond"')
      ]).catch(function () {});
    }
    return Promise.race([polices, attendre(2500)]);
  }

  function signalerErreurConfig() {
    var details = (window.__erreursConfig || []).join(' — ');
    if (window.console) console.error('config.js introuvable ou invalide. ' + details);
    var bandeau = document.createElement('div');
    bandeau.className = 'alerte-config';
    bandeau.setAttribute('role', 'alert');
    bandeau.textContent = '⚠️ Le fichier config.js est introuvable ou contient une erreur' +
      (details ? ' (' + details + ')' : '') + ' : la version par défaut est affichée.';
    document.body.appendChild(bandeau);
  }

  el.indice.textContent = tactile ? 'Touche l’écran pour continuer' : 'Clique pour continuer';
  el.envIndice.textContent = tactile ? 'Touche l’enveloppe pour l’ouvrir' : 'Clique sur l’enveloppe pour l’ouvrir';
  remplirTexte(el.boutonLettre, config.boutonLettre);
  remplirTexte(el.envTexte, config.lettre.surEnveloppe);

  E.initialiser({
    theme: theme,
    leger: html.classList.contains('leger'),
    reduit: reduit,
    surLeger: function () { html.classList.add('leger'); }
  });

  if (charge.erreur) signalerErreurConfig();

  var redim = 0;
  window.addEventListener('resize', function () {
    clearTimeout(redim);
    redim = setTimeout(function () {
      if (el.sceneJetaime.classList.contains('est-active')) ajusterLargeur(el.jetaime);
      if (el.scenePrenom.classList.contains('est-active')) ajusterLargeur(el.lignePrenom);
    }, 150);
  });

  attendrePolices().then(lancerAccueil);
})();
