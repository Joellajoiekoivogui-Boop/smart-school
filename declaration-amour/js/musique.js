/*
 * Musique et petits sons.
 *
 * - Si config.musique.fichier est renseigné, la chanson est jouée en boucle.
 * - Sinon, une boîte à musique est générée en direct (Web Audio) : le Canon
 *   de Pachelbel (vers 1680, domaine public), arpèges, basse, nappe douce et
 *   réverbération. Aucun fichier à télécharger, aucun droit d'auteur.
 *
 * Les navigateurs n'autorisent le son qu'après un geste : tout démarre donc
 * au clic sur le cœur.
 */
(function (global) {
  'use strict';

  var Amour = global.Amour = global.Amour || {};
  var doc = global.document;
  var Contexte = global.AudioContext || global.webkitAudioContext;

  var reglages = { activee: true, fichier: '', volume: 0.7, debut: 0, leger: false };
  var ctx = null, maitre = null, bus = null, sec = null, bruit = null;
  var fondu = null, fonduSec = null; // fondu d'entrée de la musique (pas des petits sons)
  var audio = null;
  var actif = true;      // choix de la personne (bouton son)
  var demarre = false;   // le cœur a été cliqué
  var joue = false;
  var minuterie = 0, prochain = 0, pas = 0;
  var fonduAudio = 0;
  var ecouteurs = [];

  /* ------------------------------------------------------------------ */
  /* Partition                                                           */
  /* ------------------------------------------------------------------ */

  var NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  function frequence(note) {
    var m = /^([A-G]#?)(\d)$/.exec(note);
    var midi = (parseInt(m[2], 10) + 1) * 12 + NOTES[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  var TEMPO = 66;
  var CROCHE = 60 / TEMPO / 2;
  var PAS_PAR_CYCLE = 32; // 8 accords × 4 croches

  var ACCORDS = [
    { basse: 'D3', notes: ['D4', 'F#4', 'A4'] },
    { basse: 'A2', notes: ['C#4', 'E4', 'A4'] },
    { basse: 'B2', notes: ['D4', 'F#4', 'B4'] },
    { basse: 'F#2', notes: ['C#4', 'F#4', 'A4'] },
    { basse: 'G2', notes: ['D4', 'G4', 'B4'] },
    { basse: 'D2', notes: ['D4', 'F#4', 'A4'] },
    { basse: 'G2', notes: ['D4', 'G4', 'B4'] },
    { basse: 'A2', notes: ['C#4', 'E4', 'A4'] }
  ];

  // Les trois premières variations du canon (mélodie de la boîte à musique).
  var VARIATIONS = [
    { tous: 4, duree: 2.6, force: 0.15, notes: ['F#5', 'E5', 'D5', 'C#5', 'B4', 'A4', 'B4', 'C#5'] },
    { tous: 4, duree: 2.4, force: 0.12, notes: ['D6', 'C#6', 'B5', 'A5', 'G5', 'F#5', 'G5', 'E5'] },
    { tous: 2, duree: 1.7, force: 0.12, notes: ['D5', 'F#5', 'A5', 'G5', 'F#5', 'D5', 'F#5', 'E5', 'D5', 'B4', 'D5', 'A5', 'G5', 'B5', 'A5', 'G5'] }
  ];

  /* ------------------------------------------------------------------ */
  /* Chaîne audio                                                        */
  /* ------------------------------------------------------------------ */

  function impulsion(duree, pente) {
    var taux = ctx.sampleRate, n = Math.floor(taux * duree);
    var tampon = ctx.createBuffer(2, n, taux);
    for (var canal = 0; canal < 2; canal++) {
      var d = tampon.getChannelData(canal);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, pente);
    }
    return tampon;
  }

  function construireChaine() {
    maitre = ctx.createGain();
    maitre.gain.value = 0.0001;
    var compresseur = ctx.createDynamicsCompressor();
    compresseur.threshold.value = -18;
    compresseur.knee.value = 24;
    compresseur.ratio.value = 3;
    compresseur.attack.value = 0.01;
    compresseur.release.value = 0.3;

    bus = ctx.createGain();
    sec = ctx.createGain();
    sec.gain.value = 0.8;
    var reverb = ctx.createConvolver();
    reverb.buffer = impulsion(reglages.leger ? 1.6 : 2.6, 2.6);
    var humide = ctx.createGain();
    humide.gain.value = 0.45;

    // La musique passe par deux fondus (avec et sans réverbération) ;
    // les petits sons vont directement dans le bus, sans attendre le fondu.
    fondu = ctx.createGain();
    fondu.gain.value = 0.0001;
    fonduSec = ctx.createGain();
    fonduSec.gain.value = 0.0001;
    fondu.connect(bus);
    fonduSec.connect(sec);

    bus.connect(sec);
    bus.connect(reverb);
    reverb.connect(humide);
    sec.connect(compresseur);
    humide.connect(compresseur);
    compresseur.connect(maitre);
    maitre.connect(ctx.destination);

    var n = Math.floor(ctx.sampleRate * 0.8);
    bruit = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = bruit.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }

  function contexte() {
    if (!ctx && Contexte) {
      try {
        ctx = new Contexte();
        construireChaine();
      } catch (e) {
        ctx = null;
      }
    }
    return ctx;
  }

  // iOS : jouer un échantillon silencieux pendant le geste déverrouille le son.
  function deverrouiller() {
    try {
      var source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 22050);
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) { /* rien */ }
  }

  // Les très anciens navigateurs n'exposent pas ctx.state : on le suppose actif.
  function enMarche() { return !!ctx && (ctx.state === undefined || ctx.state === 'running'); }

  function reprendreContexte() {
    if (ctx && ctx.state && ctx.state !== 'running' && ctx.resume) {
      var p = ctx.resume();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function rampe(param, valeur, duree) {
    var t = ctx.currentTime;
    try {
      param.cancelScheduledValues(t);
      param.setValueAtTime(Math.max(param.value, 0.0001), t);
      param.exponentialRampToValueAtTime(Math.max(valeur, 0.0001), t + duree);
    } catch (e) {
      param.value = valeur;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Instruments                                                         */
  /* ------------------------------------------------------------------ */

  function partiel(f, t, force, duree, sortie) {
    if (f > 14000) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(force, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(g);
    g.connect(sortie || bus);
    o.start(t);
    o.stop(t + duree + 0.05);
  }

  // Lame de boîte à musique : fondamentale, octave, et un « tink » métallique.
  function cloche(f, t, force, duree, sortie) {
    force *= 0.88 + Math.random() * 0.24;
    partiel(f, t, force, duree, sortie);
    partiel(f * 2, t, force * 0.26, duree * 0.45, sortie);
    if (!reglages.leger) partiel(f * 5.95, t, force * 0.06, 0.09, sortie);
  }

  function nappe(notes, t, duree) {
    var g = ctx.createGain(), filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.frequency.value = 900;
    filtre.Q.value = 0.4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.011, t + 0.9);
    g.gain.setValueAtTime(0.011, t + duree);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree + 1.3);
    filtre.connect(g);
    g.connect(fondu);
    notes.forEach(function (note) {
      var f = frequence(note) / 2;
      [-6, 6].forEach(function (cents) {
        var o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f * Math.pow(2, cents / 1200);
        o.connect(filtre);
        o.start(t);
        o.stop(t + duree + 1.4);
      });
    });
  }

  function basse(f, t, duree) {
    var o = ctx.createOscillator(), o2 = ctx.createOscillator();
    var g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    o2.type = 'sine';
    o2.frequency.value = f * 2;
    g2.gain.value = 0.35;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree + 0.5);
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(fonduSec);
    o.start(t);
    o2.start(t);
    o.stop(t + duree + 0.6);
    o2.stop(t + duree + 0.6);
  }

  function jouerPas(p, t) {
    var cycle = Math.floor(p / PAS_PAR_CYCLE), i = p % PAS_PAR_CYCLE;
    var accord = ACCORDS[Math.floor(i / 4)], croche = i % 4;
    var humain = function () { return (Math.random() - 0.5) * 0.014; };

    if (croche === 0) {
      basse(frequence(accord.basse), t, CROCHE * 4);
      nappe(accord.notes, t, CROCHE * 4);
    }

    var motif = cycle % 2 ? [0, 2, 1, 3] : [0, 1, 2, 3];
    var indice = motif[croche];
    var f = indice === 3 ? frequence(accord.notes[0]) * 2 : frequence(accord.notes[indice]);
    cloche(f, t + humain(), croche === 0 ? 0.085 : 0.062, 1.6, fondu);

    if (cycle > 0) {
      var v = VARIATIONS[(cycle - 1) % VARIATIONS.length];
      if (i % v.tous === 0) cloche(frequence(v.notes[i / v.tous]), t + humain(), v.force, v.duree, fondu);
    }
  }

  function planifier() {
    if (!enMarche() || !joue || audio) return;
    if (prochain < ctx.currentTime) prochain = ctx.currentTime + 0.06;
    var limite = ctx.currentTime + 0.6;
    while (prochain < limite) {
      jouerPas(pas, prochain);
      prochain += CROCHE;
      pas++;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Effets sonores                                                      */
  /* ------------------------------------------------------------------ */

  function souffle(t, duree, de, a, force) {
    var source = ctx.createBufferSource(), filtre = ctx.createBiquadFilter(), g = ctx.createGain();
    source.buffer = bruit;
    filtre.type = 'bandpass';
    filtre.Q.value = 0.9;
    filtre.frequency.setValueAtTime(de, t);
    filtre.frequency.exponentialRampToValueAtTime(a, t + duree);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(force, t + duree * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    source.connect(filtre);
    filtre.connect(g);
    g.connect(bus);
    source.start(t);
    source.stop(t + duree + 0.05);
  }

  function battementSourd(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.32);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g);
    g.connect(sec);
    o.start(t);
    o.stop(t + 0.45);
  }

  function arpegeRapide(notes, t, ecart, force, duree) {
    notes.forEach(function (note, i) {
      cloche(frequence(note), t + i * ecart, force * (1 - i * 0.07), duree);
    });
  }

  var EFFETS = {
    eclat: function (t) {
      battementSourd(t);
      souffle(t, 0.7, 400, 3800, 0.09);
      arpegeRapide(['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6', 'D7'], t + 0.04, 0.045, 0.085, 1.7);
    },
    prenom: function (t) { arpegeRapide(['A5', 'D6', 'F#6'], t, 0.09, 0.07, 2.4); },
    final: function (t) { arpegeRapide(['F#5', 'A5', 'D6', 'F#6'], t, 0.07, 0.07, 2.4); },
    pop: function (t) { cloche(frequence('A6'), t, 0.05, 0.9); },
    lettre: function (t) {
      souffle(t, 0.45, 2500, 6000, 0.05);
      souffle(t + 0.18, 0.4, 3000, 1800, 0.04);
      arpegeRapide(['D6', 'A6'], t + 0.4, 0.12, 0.05, 2);
    }
  };

  function effet(nom) {
    if (!actif || !demarre || !enMarche() || !EFFETS[nom]) return;
    try { EFFETS[nom](ctx.currentTime + 0.02); } catch (e) { /* jamais bloquant */ }
  }

  /* ------------------------------------------------------------------ */
  /* Lecture / pause                                                     */
  /* ------------------------------------------------------------------ */

  function volume() { return Math.max(0.0001, reglages.volume * 0.9); }

  function fondreAudio(cible, duree, apres) {
    clearInterval(fonduAudio);
    var depart = audio.volume, debut = Date.now();
    fonduAudio = setInterval(function () {
      var t = Math.min(1, (Date.now() - debut) / duree);
      try { audio.volume = depart + (cible - depart) * t; } catch (e) { /* iOS : volume fixe */ }
      if (t >= 1) {
        clearInterval(fonduAudio);
        if (apres) apres();
      }
    }, 50);
  }

  // premiere : premier démarrage (fondu lent de la musique) ou simple reprise.
  function lancer(premiere) {
    joue = true;
    if (ctx) {
      reprendreContexte();
      rampe(maitre.gain, volume(), premiere ? 0.05 : 0.5);
      if (premiere) {
        var t = ctx.currentTime;
        [fondu.gain, fonduSec.gain].forEach(function (g) {
          g.cancelScheduledValues(t);
          g.setValueAtTime(0.01, t);
          g.exponentialRampToValueAtTime(1, t + 3);
        });
      }
    }
    if (audio) {
      if (reglages.debut && audio.currentTime < reglages.debut) {
        try { audio.currentTime = reglages.debut; } catch (e) { /* plus tard */ }
      }
      try { audio.volume = 0; } catch (e) { /* iOS */ }
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
      fondreAudio(reglages.volume, 2500);
    } else if (ctx && !minuterie) {
      prochain = ctx.currentTime + 0.15;
      minuterie = setInterval(planifier, 100);
      planifier();
    }
    signaler();
  }

  function couper() {
    joue = false;
    if (audio) fondreAudio(0, 400, function () { if (!joue) audio.pause(); });
    if (ctx) {
      rampe(maitre.gain, 0.0001, 0.35);
      setTimeout(function () { if (!joue && ctx.suspend) ctx.suspend(); }, 450);
    }
    signaler();
  }

  function signaler() {
    ecouteurs.forEach(function (f) { f(actif, joue); });
  }

  function init(r) {
    for (var cle in r) if (Object.prototype.hasOwnProperty.call(r, cle)) reglages[cle] = r[cle];
    actif = reglages.activee !== false;
    if (actif && reglages.fichier) {
      audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      audio.src = reglages.fichier;
      audio.addEventListener('loadedmetadata', function () {
        if (reglages.debut && audio.currentTime < reglages.debut) {
          try { audio.currentTime = reglages.debut; } catch (e) { /* rien */ }
        }
      });
      audio.addEventListener('error', function () {
        // Fichier introuvable : on se rabat sur la boîte à musique.
        if (global.console) global.console.warn('Musique introuvable : ' + reglages.fichier + ' — boîte à musique utilisée à la place.');
        audio = null;
        if (joue && ctx && !minuterie) {
          prochain = ctx.currentTime + 0.15;
          minuterie = setInterval(planifier, 100);
        }
      });
    }

    doc.addEventListener('visibilitychange', function () {
      if (!demarre || !actif) return;
      if (doc.hidden) {
        if (audio) audio.pause();
        if (ctx && ctx.suspend) ctx.suspend();
      } else {
        reprendreContexte();
        if (audio && joue) {
          var p = audio.play();
          if (p && p.catch) p.catch(function () {});
        }
      }
    });
  }

  // À appeler pendant le clic sur le cœur (geste exigé par les navigateurs).
  function demarrer() {
    if (demarre) return;
    demarre = true;
    if (global.navigator.audioSession) {
      try { global.navigator.audioSession.type = 'playback'; } catch (e) { /* rien */ }
    }
    if (contexte()) {
      reprendreContexte();
      deverrouiller();
    }
    if (actif) lancer(true);
  }

  function basculer() {
    actif = !actif;
    if (actif) {
      if (demarre) {
        var neuf = !ctx || !minuterie;
        contexte();
        reprendreContexte();
        lancer(neuf);
      } else {
        signaler();
      }
    } else {
      couper();
    }
    return actif;
  }

  // Après une mise en veille, iOS peut exiger un nouveau geste pour reprendre.
  function reveiller() {
    if (!demarre || !actif) return;
    reprendreContexte();
    if (audio && joue && audio.paused) {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  Amour.musique = {
    init: init,
    demarrer: demarrer,
    basculer: basculer,
    effet: effet,
    reveiller: reveiller,
    disponible: function () { return !!(Contexte || reglages.fichier); },
    surChangement: function (f) { ecouteurs.push(f); }
  };
})(window);
