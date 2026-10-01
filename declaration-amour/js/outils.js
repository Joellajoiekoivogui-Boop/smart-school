/*
 * Outils partagés par la page et par l'éditeur :
 * thèmes de couleurs, lecture de la configuration, liens personnalisés.
 *
 * Écrit en JavaScript « classique » (sans module ni syntaxe récente) pour
 * fonctionner aussi sur les anciens téléphones (iOS 12, Android 7…).
 */
(function (global) {
  'use strict';

  var Amour = global.Amour = global.Amour || {};

  /* ------------------------------------------------------------------ */
  /* Thèmes                                                              */
  /* ------------------------------------------------------------------ */

  var THEMES = {
    rose: {
      nom: 'Rose tendre',
      principale: '#ff4f8b', claire: '#ffb3c8', profonde: '#a3154f',
      eclat: '#ffd9a8', texte: '#fff3f7',
      fond: ['#12030c', '#3a0a29', '#7b1748']
    },
    passion: {
      nom: 'Rouge passion',
      principale: '#ff2d55', claire: '#ff9fae', profonde: '#8e0b26',
      eclat: '#ffcf8a', texte: '#fff2f3',
      fond: ['#0e0204', '#38080f', '#741022']
    },
    lavande: {
      nom: 'Lavande',
      principale: '#c084fc', claire: '#efc6ff', profonde: '#5b21b6',
      eclat: '#ffd6f5', texte: '#f8f0ff',
      fond: ['#0a0616', '#241243', '#4c2a85']
    },
    or: {
      nom: 'Or champagne',
      principale: '#f2b45c', claire: '#ffe2b0', profonde: '#8a531a',
      eclat: '#fff1c9', texte: '#fff8ee',
      fond: ['#0d0806', '#2a1810', '#5e3520']
    },
    aurore: {
      nom: 'Coucher de soleil',
      principale: '#ff7088', claire: '#ffc8a8', profonde: '#b23a6b',
      eclat: '#ffe0a0', texte: '#fff5ef',
      fond: ['#1a0a24', '#4d1a4a', '#a8466a']
    },
    nuit: {
      nom: 'Nuit étoilée',
      principale: '#ff6fa8', claire: '#ffc1dc', profonde: '#4b2f9a',
      eclat: '#bfe3ff', texte: '#f2f6ff',
      fond: ['#050816', '#111b42', '#2c2f72']
    }
  };

  function borne(v, min, max) { return v < min ? min : (v > max ? max : v); }

  function hexVersRgb(hex) {
    var h = String(hex || '').replace(/^#/, '').trim();
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbVersHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      var s = Math.round(borne(v, 0, 255)).toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('');
  }

  function rgbVersHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s = borne(s, 0, 1); l = borne(l, 0, 1);
    function canal(t) {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return rgbVersHex(canal(h + 1 / 3) * 255, canal(h) * 255, canal(h - 1 / 3) * 255);
  }

  // Calcule un thème complet (dégradé, lumières…) à partir d'une seule couleur.
  function themeDepuisCouleur(couleur) {
    var rgb = hexVersRgb(couleur);
    if (!rgb) return null;
    var x = rgbVersHsl(rgb[0], rgb[1], rgb[2]);
    var h = x[0], s = Math.max(0.5, x[1]);
    return {
      nom: 'Personnalisé',
      principale: hsl(h, Math.min(1, s * 1.05), borne(x[2], 0.52, 0.68)),
      claire: hsl(h + 4, s, 0.83),
      profonde: hsl(h - 3, Math.min(0.9, s), 0.34),
      eclat: hsl(h + 28, 1, 0.84),
      texte: hsl(h, 1, 0.97),
      fond: [hsl(h, 0.65, 0.045), hsl(h - 4, 0.6, 0.13), hsl(h - 8, 0.52, 0.27)]
    };
  }

  function resoudreTheme(valeur) {
    var cle = String(valeur || '').trim().toLowerCase();
    if (THEMES[cle]) return THEMES[cle];
    return themeDepuisCouleur(cle) || THEMES.rose;
  }

  // Écrit le thème dans les variables CSS (--principale, --principale-rgb…).
  function appliquerTheme(theme, racine) {
    var style = (racine || global.document.documentElement).style;
    function poser(nom, hex) {
      var rgb = hexVersRgb(hex) || [255, 255, 255];
      style.setProperty('--' + nom, hex);
      style.setProperty('--' + nom + '-rgb', rgb.join(', '));
    }
    ['principale', 'claire', 'profonde', 'eclat', 'texte'].forEach(function (nom) { poser(nom, theme[nom]); });
    theme.fond.forEach(function (hex, i) { poser('fond-' + (i + 1), hex); });
    var meta = global.document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.fond[0]);
  }

  /* ------------------------------------------------------------------ */
  /* Configuration                                                       */
  /* ------------------------------------------------------------------ */

  var DEFAUTS = {
    prenom: 'Mon amour',
    titrePage: 'J’ai quelque chose à te dire… ❤️',
    accueil: {
      titre: 'J’ai quelque chose à te dire…',
      invitation: 'Clique sur le cœur ❤️'
    },
    grandMessage: 'JE T’AIME ❤️',
    avantPrenom: 'Je t’aime,',
    messages: [
      'Depuis quelque temps, tu occupes une place particulière dans mes pensées.',
      'Et aujourd’hui, j’avais simplement envie de te le dire…',
      'Je t’aime ❤️'
    ],
    boutonLettre: 'Découvrir mon message 💌',
    lettre: {
      surEnveloppe: 'Pour toi',
      titre: '',
      paragraphes: [
        'Je ne sais pas exactement quand c’est arrivé. Peut-être à travers un regard, un sourire, ou une conversation qui a duré bien plus longtemps que prévu.',
        'Mais un jour, j’ai compris que tu n’étais plus tout à fait une personne comme les autres pour moi.',
        'Depuis, je pense à toi plus souvent que je ne l’avoue. Un message de toi suffit à illuminer ma journée, et ta présence a quelque chose d’apaisant que je ne trouve nulle part ailleurs.',
        'J’aime ta façon de rire, ta façon de voir le monde, et cette lumière que tu portes sans même t’en rendre compte.',
        'Je ne t’écris pas pour te demander quoi que ce soit. Je voulais simplement que tu saches, avec sincérité, ce que tu représentes pour moi.',
        'Tu comptes énormément. Et je t’aime, tout simplement. ❤️'
      ],
      formule: 'Avec tout mon cœur,',
      signature: 'Moi'
    },
    photos: { titre: 'Quelques instants précieux', liste: [] },
    couleur: 'rose',
    musique: { activee: true, fichier: '', volume: 0.7, debut: 0 },
    options: { avancementAuto: true, vibration: true, personnalisationParLien: true }
  };

  var LIMITE_TEXTE = 2000;

  function cloner(v) { return JSON.parse(JSON.stringify(v)); }
  function estObjet(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function texte(v, defaut) {
    if (typeof v === 'number') v = String(v);
    return typeof v === 'string' ? v.trim().slice(0, LIMITE_TEXTE) : defaut;
  }

  // Liste de textes ; une chaîne est découpée selon `separateur`.
  function listeTextes(v, defaut, separateur) {
    if (typeof v === 'string') v = v.split(separateur);
    if (!Array.isArray(v)) return defaut.slice();
    return v.map(function (x) { return texte(x, ''); })
      .filter(function (x) { return x.length > 0; })
      .slice(0, 60);
  }

  // Adresse d'image ou de son : chemin relatif, http(s), data:image|audio.
  // Tout autre protocole (javascript:, etc.) est refusé.
  function urlSure(u) {
    if (typeof u !== 'string') return '';
    u = u.trim();
    if (!u) return '';
    if (/^(https?:)?\/\//i.test(u)) return u;
    if (/^data:(image|audio)\//i.test(u)) return u;
    if (/^blob:/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return '';
    return u;
  }

  function normaliserPhotos(v, base) {
    var res = { titre: base.titre, liste: base.liste.slice() };
    if (Array.isArray(v)) v = { liste: v };
    if (!estObjet(v)) return res;
    res.titre = texte(v.titre, res.titre);
    if (Array.isArray(v.liste)) {
      res.liste = v.liste.map(function (p) {
        if (typeof p === 'string') p = { image: p };
        if (!estObjet(p)) return null;
        var image = urlSure(p.image || p.src || p.url);
        return image ? { image: image, legende: texte(p.legende || p.texte, '') } : null;
      }).filter(Boolean).slice(0, 30);
    }
    return res;
  }

  function normaliserMusique(v, base) {
    var res = cloner(base);
    if (typeof v === 'boolean') { res.activee = v; return res; }
    if (typeof v === 'string') { res.activee = true; res.fichier = urlSure(v); return res; }
    if (!estObjet(v)) return res;
    if (typeof v.activee === 'boolean') res.activee = v.activee;
    if (typeof v.fichier === 'string') res.fichier = urlSure(v.fichier);
    if (typeof v.volume === 'number' && isFinite(v.volume)) res.volume = borne(v.volume, 0, 1);
    if (typeof v.debut === 'number' && isFinite(v.debut)) res.debut = Math.max(0, v.debut);
    return res;
  }

  // Fusionne une configuration « brute » (fichier ou lien) avec une base
  // complète. Seuls les champs connus sont lus ; les types sont vérifiés.
  function normaliser(brut, base) {
    var c = cloner(base || DEFAUTS);
    if (!estObjet(brut)) return c;

    c.prenom = texte(brut.prenom, c.prenom);
    c.titrePage = texte(brut.titrePage, c.titrePage);
    c.grandMessage = texte(brut.grandMessage, c.grandMessage);
    c.avantPrenom = texte(brut.avantPrenom, c.avantPrenom);
    c.boutonLettre = texte(brut.boutonLettre, c.boutonLettre) || DEFAUTS.boutonLettre;
    c.messages = listeTextes(brut.messages, c.messages, /\r?\n/);
    if (typeof brut.couleur === 'string' && brut.couleur.trim()) c.couleur = brut.couleur.trim();

    if (estObjet(brut.accueil)) {
      c.accueil.titre = texte(brut.accueil.titre, c.accueil.titre);
      c.accueil.invitation = texte(brut.accueil.invitation, c.accueil.invitation);
    }

    var l = brut.lettre;
    if (typeof l === 'string' || Array.isArray(l)) l = { paragraphes: l };
    if (estObjet(l)) {
      c.lettre.surEnveloppe = texte(l.surEnveloppe, c.lettre.surEnveloppe);
      c.lettre.titre = texte(l.titre, c.lettre.titre);
      c.lettre.paragraphes = listeTextes(l.paragraphes, c.lettre.paragraphes, /\r?\n\s*\r?\n/);
      c.lettre.formule = texte(l.formule, c.lettre.formule);
      c.lettre.signature = texte(l.signature, c.lettre.signature);
    }

    if ('photos' in brut) c.photos = normaliserPhotos(brut.photos, c.photos);
    if ('musique' in brut) c.musique = normaliserMusique(brut.musique, c.musique);

    if (estObjet(brut.options)) {
      Object.keys(c.options).forEach(function (cle) {
        if (typeof brut.options[cle] === 'boolean') c.options[cle] = brut.options[cle];
      });
    }
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* Liens personnalisés : …/index.html#d=<configuration encodée>        */
  /* ------------------------------------------------------------------ */

  function versBase64Url(chaine) {
    var binaire = '';
    if (global.TextEncoder) {
      var octets = new global.TextEncoder().encode(chaine);
      for (var i = 0; i < octets.length; i++) binaire += String.fromCharCode(octets[i]);
    } else {
      binaire = unescape(encodeURIComponent(chaine));
    }
    return global.btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function depuisBase64Url(code) {
    var s = String(code).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var binaire = global.atob(s);
    if (global.TextDecoder) {
      var octets = new Uint8Array(binaire.length);
      for (var i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
      return new global.TextDecoder().decode(octets);
    }
    return decodeURIComponent(escape(binaire));
  }

  function encoderLien(objet) { return versBase64Url(JSON.stringify(objet)); }

  function lireParametre(chaine, noms) {
    var re = new RegExp('[?&#](?:' + noms + ')=([^&#]*)');
    var m = re.exec(chaine);
    if (!m) return null;
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { return null; }
  }

  function lireLien(loc) {
    var res = {};
    var hash = loc.hash || '';
    var m = /[#&]d=([A-Za-z0-9_\-]+)/.exec(hash);
    if (m) {
      try {
        var objet = JSON.parse(depuisBase64Url(m[1]));
        if (estObjet(objet)) res = objet;
      } catch (e) { /* lien abîmé : on l'ignore */ }
    }
    var prenom = lireParametre(loc.search || '', 'prenom|p');
    if (prenom !== null) res.prenom = prenom;
    var couleur = lireParametre(loc.search || '', 'couleur|theme');
    if (couleur) res.couleur = couleur;
    return res;
  }

  // Configuration finale : défauts ← config.js ← lien (si autorisé).
  function chargerConfig() {
    var brut = global.DECLARATION;
    var config = normaliser(brut, DEFAUTS);
    if (config.options.personnalisationParLien) {
      var lien = lireLien(global.location);
      if (Object.keys(lien).length) config = normaliser(lien, config);
    }
    return { config: config, erreur: !estObjet(brut) };
  }

  Amour.outils = {
    THEMES: THEMES,
    DEFAUTS: DEFAUTS,
    hexVersRgb: hexVersRgb,
    resoudreTheme: resoudreTheme,
    appliquerTheme: appliquerTheme,
    normaliser: normaliser,
    chargerConfig: chargerConfig,
    encoderLien: encoderLien,
    depuisBase64Url: depuisBase64Url,
    urlSure: urlSure,
    cloner: cloner
  };
})(window);
