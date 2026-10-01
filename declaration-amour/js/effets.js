/*
 * Effets visuels sur deux <canvas> :
 *  - « ciel » (derrière le texte) : étoiles, lueurs, poussières lumineuses,
 *    cœurs flottants, pétales, étoiles filantes ;
 *  - « magie » (devant) : explosion de cœurs, confettis, étincelles, ondes,
 *    pluie de cœurs, plume lumineuse et traînée du doigt.
 *
 * Les formes sont pré-dessinées une fois (sprites) puis simplement copiées
 * à chaque image : c'est ce qui garde l'animation fluide sur téléphone.
 * Si l'appareil peine (moins de ~40 images/s), le mode léger s'active seul.
 */
(function (global) {
  'use strict';

  var Amour = global.Amour = global.Amour || {};
  var doc = global.document;
  var PI2 = Math.PI * 2;

  function hasard(min, max) { return min + Math.random() * (max - min); }
  function choisir(liste) { return liste[(Math.random() * liste.length) | 0]; }
  function borne(v, min, max) { return v < min ? min : (v > max ? max : v); }

  function rgba(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ------------------------------------------------------------------ */
  /* Forme de cœur (même dessin que le cœur SVG de la page)              */
  /* ------------------------------------------------------------------ */

  // Cœur centré sur (x, y), de largeur l (hauteur ≈ 0,92 l).
  function tracerCoeur(ctx, x, y, l) {
    var k = l / 100;
    ctx.beginPath();
    ctx.moveTo(x, y + 42 * k);
    ctx.bezierCurveTo(x - 3 * k, y + 39 * k, x - 42 * k, y + 14 * k, x - 46 * k, y - 12 * k);
    ctx.bezierCurveTo(x - 49 * k, y - 30 * k, x - 38 * k, y - 42 * k, x - 23 * k, y - 42 * k);
    ctx.bezierCurveTo(x - 12 * k, y - 42 * k, x - 4 * k, y - 35 * k, x, y - 26 * k);
    ctx.bezierCurveTo(x + 4 * k, y - 35 * k, x + 12 * k, y - 42 * k, x + 23 * k, y - 42 * k);
    ctx.bezierCurveTo(x + 38 * k, y - 42 * k, x + 49 * k, y - 30 * k, x + 46 * k, y - 12 * k);
    ctx.bezierCurveTo(x + 42 * k, y + 14 * k, x + 3 * k, y + 39 * k, x, y + 42 * k);
    ctx.closePath();
  }

  /* ------------------------------------------------------------------ */
  /* Sprites                                                             */
  /* ------------------------------------------------------------------ */

  function toile(l, h) {
    var c = doc.createElement('canvas');
    c.width = Math.ceil(l);
    c.height = Math.ceil(h);
    return c;
  }

  // Cœur net : dégradé, reflet et halo. `ratio` = largeur du sprite / largeur du cœur.
  function spriteCoeur(couleur, clair) {
    var t = 96, m = Math.round(t * 0.3);
    var c = toile(t + 2 * m, t + 2 * m), ctx = c.getContext('2d');
    var cx = c.width / 2, cy = c.height / 2 + t * 0.03;
    var g = ctx.createLinearGradient(cx - t / 2, cy - t / 2, cx + t / 3, cy + t / 2);
    g.addColorStop(0, clair);
    g.addColorStop(0.55, couleur);
    g.addColorStop(1, couleur);
    ctx.shadowColor = rgba(couleur, 0.85);
    ctx.shadowBlur = t * 0.24;
    tracerCoeur(ctx, cx, cy, t);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
    var r = ctx.createRadialGradient(cx - t * 0.2, cy - t * 0.2, 0, cx - t * 0.2, cy - t * 0.2, t * 0.32);
    r.addColorStop(0, 'rgba(255,255,255,0.6)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    tracerCoeur(ctx, cx, cy, t);
    ctx.fillStyle = r;
    ctx.fill();
    c.ratio = c.width / t;
    return c;
  }

  // Cœur flou (effet de profondeur) : seule l'ombre floue est visible.
  function spriteCoeurFlou(couleur, flou) {
    var t = 64, m = Math.ceil(flou * 1.8) + 2, decalage = 4000;
    var c = toile(t + 2 * m, t + 2 * m), ctx = c.getContext('2d');
    ctx.shadowColor = couleur;
    ctx.shadowBlur = flou;
    ctx.shadowOffsetX = decalage;
    ctx.fillStyle = couleur;
    tracerCoeur(ctx, c.width / 2 - decalage, c.height / 2, t);
    ctx.fill();
    c.ratio = c.width / t;
    return c;
  }

  // Point lumineux : cœur blanc, halo coloré (étoiles, poussières).
  function spriteLueur(couleur, coeurBlanc) {
    var t = 64, c = toile(t, t), ctx = c.getContext('2d'), m = t / 2;
    var g = ctx.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, coeurBlanc ? 'rgba(255,255,255,1)' : rgba(couleur, 1));
    g.addColorStop(0.16, rgba(couleur, 0.95));
    g.addColorStop(0.4, rgba(couleur, 0.28));
    g.addColorStop(1, rgba(couleur, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, t, t);
    c.ratio = 1;
    return c;
  }

  // Grande lueur très douce (bokeh d'arrière-plan).
  function spriteBokeh(couleur) {
    var t = 128, c = toile(t, t), ctx = c.getContext('2d'), m = t / 2;
    var g = ctx.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, rgba(couleur, 0.9));
    g.addColorStop(0.55, rgba(couleur, 0.35));
    g.addColorStop(1, rgba(couleur, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, t, t);
    c.ratio = 1;
    return c;
  }

  // Étincelle à quatre branches.
  function spriteEtincelle(couleur) {
    var t = 64, c = toile(t, t), ctx = c.getContext('2d'), m = t / 2;
    var g = ctx.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.22, rgba(couleur, 0.95));
    g.addColorStop(1, rgba(couleur, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(m, 0);
    ctx.quadraticCurveTo(m + 3, m - 3, t, m);
    ctx.quadraticCurveTo(m + 3, m + 3, m, t);
    ctx.quadraticCurveTo(m - 3, m + 3, 0, m);
    ctx.quadraticCurveTo(m - 3, m - 3, m, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m, m, t * 0.12, 0, PI2);
    ctx.fill();
    c.ratio = 1;
    return c;
  }

  // Pétale de rose.
  function spritePetale(couleur, clair) {
    var l = 40, h = 50, c = toile(l, h), ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, l * 0.8, h);
    g.addColorStop(0, clair);
    g.addColorStop(1, couleur);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(l / 2, h - 1);
    ctx.bezierCurveTo(2, h * 0.72, 0, h * 0.16, l * 0.3, 3);
    ctx.quadraticCurveTo(l / 2, h * 0.16, l * 0.7, 3);
    ctx.bezierCurveTo(l, h * 0.16, l - 2, h * 0.72, l / 2, h - 1);
    ctx.fill();
    var r = ctx.createLinearGradient(0, 0, l, 0);
    r.addColorStop(0, 'rgba(255,255,255,0)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.28)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = r;
    ctx.fill();
    c.ratio = 1;
    return c;
  }

  /* ------------------------------------------------------------------ */
  /* État                                                                */
  /* ------------------------------------------------------------------ */

  var ciel, cielCtx, magie, magieCtx;
  var L = 0, H = 0, dpr = 1;
  var theme, sprites, couleursConfettis;
  var leger = false, reduit = false, pret = false;
  var etoiles = [], bokehs = [], poussieres = [], flottants = [], petales = [], filantes = [];
  var particules = [], ondes = [];
  var prochaineFilante = 4;
  var pluieRestante = 0, pluieDebit = 0, pluieCumul = 0;
  var plume = { active: false, x: 0, y: 0, cumul: 0 };
  var traine = { x: 0, y: 0, dernier: 0 };
  var parallaxe = { x: 0.5, y: 0.5, lx: 0.5, ly: 0.5 };
  var magieSale = false, rafId = 0, enCours = false, dernier = 0, temps = 0;
  var mesures = [], mesureFaite = false;
  var minuterieTaille = 0;
  var surLeger = null;

  function echelle() { return borne(Math.min(L, H) / 700, 0.55, 1.4); }

  function construireSprites() {
    sprites = {
      coeurs: [
        spriteCoeur(theme.principale, theme.claire),
        spriteCoeur(theme.claire, '#ffffff'),
        spriteCoeur(theme.profonde, theme.principale),
        spriteCoeur(theme.principale, '#ffffff')
      ],
      coeursFlous: [spriteCoeurFlou(theme.principale, 7), spriteCoeurFlou(theme.claire, 9)],
      etoile: spriteLueur('#fff6fb', true),
      lueurs: [spriteLueur(theme.eclat, true), spriteLueur(theme.claire, true), spriteLueur(theme.principale, false)],
      bokeh: [spriteBokeh(theme.principale), spriteBokeh(theme.claire), spriteBokeh(theme.profonde)],
      etincelles: [spriteEtincelle(theme.eclat), spriteEtincelle('#ffffff'), spriteEtincelle(theme.claire)],
      petales: [spritePetale(theme.principale, theme.claire), spritePetale(theme.profonde, theme.principale)]
    };
    couleursConfettis = [theme.principale, theme.claire, theme.eclat, '#ffffff', theme.profonde];
  }

  /* ------------------------------------------------------------------ */
  /* Arrière-plan                                                        */
  /* ------------------------------------------------------------------ */

  function quantite(base) { return Math.max(1, Math.round(base * (leger ? 0.55 : 1))); }

  function creerFlottant(enBas) {
    var taille = hasard(9, 30);
    var flou = taille > 24 || taille < 12;
    return {
      x: hasard(0, L),
      y: enBas ? H + hasard(20, H * 0.5) : hasard(0, H),
      taille: taille,
      vy: -hasard(14, 40) * (reduit ? 0.5 : 1),
      amp: hasard(8, 26),
      freq: hasard(0.25, 0.6),
      phase: hasard(0, PI2),
      rot: hasard(-0.4, 0.4),
      alpha: flou ? hasard(0.25, 0.5) : hasard(0.35, 0.75),
      img: flou ? choisir(sprites.coeursFlous) : choisir(sprites.coeurs)
    };
  }

  function creerPetale(enHaut) {
    return {
      x: hasard(-20, L),
      y: enHaut ? -hasard(20, H * 0.6) : hasard(0, H),
      taille: hasard(10, 17),
      vy: hasard(22, 46),
      vx: hasard(8, 26),
      rot: hasard(0, PI2),
      vr: hasard(-1.2, 1.2),
      flip: hasard(0, PI2),
      vflip: hasard(1.2, 2.6),
      alpha: hasard(0.45, 0.8),
      img: choisir(sprites.petales)
    };
  }

  function peupler() {
    var aire = L * H;
    etoiles = [];
    var n = quantite(borne(aire / 4200, 50, 230));
    for (var i = 0; i < n; i++) {
      etoiles.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() < 0.88 ? hasard(0.5, 1.3) : hasard(1.4, 2.3),
        phase: hasard(0, PI2), v: hasard(0.6, 2.2),
        a: hasard(0.35, 0.95), z: hasard(0.2, 1)
      });
    }
    bokehs = [];
    n = quantite(L > 900 ? 9 : 6);
    for (i = 0; i < n; i++) {
      bokehs.push({
        x: Math.random(), y: Math.random(),
        r: hasard(50, 150) * echelle(),
        vx: hasard(-0.006, 0.006), vy: hasard(-0.008, 0.004),
        a: hasard(0.06, 0.15), phase: hasard(0, PI2), v: hasard(0.2, 0.5),
        img: choisir(sprites.bokeh)
      });
    }
    poussieres = [];
    n = quantite(borne(aire / 15000, 14, 48));
    for (i = 0; i < n; i++) {
      poussieres.push({
        x: hasard(0, L), y: hasard(0, H),
        vx: hasard(-6, 6), vy: -hasard(4, 16),
        r: hasard(2, 5.5), phase: hasard(0, PI2), v: hasard(0.8, 2.4),
        a: hasard(0.25, 0.7), img: choisir(sprites.lueurs)
      });
    }
    flottants = [];
    n = quantite(borne(aire / 26000, 9, 26));
    for (i = 0; i < n; i++) flottants.push(creerFlottant(false));
    petales = [];
    n = reduit ? 0 : quantite(L > 900 ? 8 : 5);
    for (i = 0; i < n; i++) petales.push(creerPetale(false));
  }

  // Dessine un sprite centré en (x, y) ; `taille` = largeur de la forme.
  function poser(ctx, img, x, y, taille, rot, alpha, sx, sy) {
    var s = taille * img.ratio / img.width * dpr;
    ctx.globalAlpha = alpha;
    if (rot || sx !== undefined) {
      var c = Math.cos(rot || 0) * s, n = Math.sin(rot || 0) * s;
      var ex = sx === undefined ? 1 : sx, ey = sy === undefined ? 1 : sy;
      ctx.setTransform(c * ex, n * ex, -n * ey, c * ey, x * dpr, y * dpr);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    } else {
      ctx.setTransform(s, 0, 0, s, x * dpr, y * dpr);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
    }
  }

  function dessinerCiel(dt) {
    var ctx = cielCtx, i, p, a;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, ciel.width, ciel.height);

    parallaxe.lx += (parallaxe.x - parallaxe.lx) * Math.min(1, dt * 2.5);
    parallaxe.ly += (parallaxe.y - parallaxe.ly) * Math.min(1, dt * 2.5);
    var ox = (parallaxe.lx - 0.5) * -28, oy = (parallaxe.ly - 0.5) * -20;

    // Grandes lueurs douces.
    for (i = 0; i < bokehs.length; i++) {
      p = bokehs[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -0.2) p.x = 1.2; else if (p.x > 1.2) p.x = -0.2;
      if (p.y < -0.2) p.y = 1.2; else if (p.y > 1.2) p.y = -0.2;
      a = p.a * (0.7 + 0.3 * Math.sin(temps * p.v + p.phase));
      poser(ctx, p.img, p.x * L + ox * 0.4, p.y * H + oy * 0.4, p.r * 2, 0, a);
    }

    ctx.globalCompositeOperation = 'lighter';

    // Étoiles scintillantes.
    for (i = 0; i < etoiles.length; i++) {
      p = etoiles[i];
      var sc = 0.5 + 0.5 * Math.sin(temps * p.v + p.phase);
      a = p.a * (0.3 + 0.7 * sc * sc);
      poser(ctx, sprites.etoile, p.x * L + ox * p.z, p.y * H + oy * p.z, p.r * 7, 0, a);
    }

    // Poussières lumineuses qui montent doucement.
    for (i = 0; i < poussieres.length; i++) {
      p = poussieres[i];
      p.x += (p.vx + Math.sin(temps * 0.6 + p.phase) * 6) * dt;
      p.y += p.vy * dt;
      if (p.y < -20) { p.y = H + 20; p.x = hasard(0, L); }
      if (p.x < -20) p.x = L + 20; else if (p.x > L + 20) p.x = -20;
      a = p.a * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(temps * p.v + p.phase)));
      poser(ctx, p.img, p.x + ox * 0.6, p.y + oy * 0.6, p.r * 6, 0, a);
    }

    // Étoiles filantes.
    if (!reduit && temps > prochaineFilante) {
      prochaineFilante = temps + hasard(6, 13);
      var versDroite = Math.random() < 0.5, vitesse = hasard(700, 1000) * echelle();
      filantes.push({
        x: versDroite ? hasard(-0.1, 0.5) * L : hasard(0.5, 1.1) * L,
        y: hasard(-0.05, 0.3) * H,
        vx: (versDroite ? 1 : -1) * vitesse * 0.82, vy: vitesse * 0.57,
        vie: 0.9, max: 0.9
      });
    }
    for (i = filantes.length - 1; i >= 0; i--) {
      p = filantes[i];
      p.vie -= dt;
      if (p.vie <= 0) { filantes.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      var t = p.vie / p.max, al = Math.sin(t * Math.PI);
      var qx = p.x - p.vx * 0.16, qy = p.y - p.vy * 0.16;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var g = ctx.createLinearGradient(p.x, p.y, qx, qy);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * al).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(qx, qy);
      ctx.stroke();
      poser(ctx, sprites.etoile, p.x, p.y, 14, 0, al);
    }

    ctx.globalCompositeOperation = 'source-over';

    // Pétales qui tombent en tournoyant.
    for (i = 0; i < petales.length; i++) {
      p = petales[i];
      p.x += (p.vx + Math.sin(temps * 0.9 + p.flip) * 14) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vflip * dt;
      if (p.y > H + 30 || p.x > L + 40) {
        var n = creerPetale(true);
        for (var cle in n) p[cle] = n[cle];
      }
      poser(ctx, p.img, p.x, p.y, p.taille, p.rot, p.alpha, Math.cos(p.flip), 1);
    }

    // Cœurs qui montent en se balançant.
    for (i = 0; i < flottants.length; i++) {
      p = flottants[i];
      p.y += p.vy * dt;
      if (p.y < -p.taille * 2) {
        var f = creerFlottant(true);
        for (var c2 in f) p[c2] = f[c2];
        p.y = H + p.taille * 2;
      }
      var balance = Math.sin(temps * p.freq * PI2 + p.phase);
      poser(ctx, p.img, p.x + balance * p.amp, p.y, p.taille, p.rot + balance * 0.18, p.alpha);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Premier plan : particules                                           */
  /* ------------------------------------------------------------------ */

  // genre : 0 cœur, 1 confetti, 2 lueur, 3 étincelle
  function particule(genre, x, y, o) {
    var p = {
      genre: genre, x: x, y: y,
      vx: o.vx || 0, vy: o.vy || 0,
      g: o.g || 0, frein: o.frein === undefined ? 1 : o.frein,
      rot: o.rot || 0, vr: o.vr || 0,
      taille: o.taille, vie: o.vie, max: o.vie,
      alpha: o.alpha === undefined ? 1 : o.alpha,
      img: o.img || null, couleur: o.couleur || null,
      amp: o.amp || 0, freq: o.freq || 0, phase: o.phase || 0,
      flip: o.flip || 0, vflip: o.vflip || 0,
      ajout: genre >= 2, age: 0
    };
    particules.push(p);
    return p;
  }

  function vitesseAleatoire(min, max) {
    var angle = hasard(0, PI2), v = hasard(min, max);
    return { vx: Math.cos(angle) * v, vy: Math.sin(angle) * v };
  }

  function explosion(x, y, options) {
    if (!pret) return;
    options = options || {};
    var force = options.force || 1, e = echelle() * force, i, v;
    var nCoeurs = Math.round(quantite(reduit ? 26 : 74) * force);
    var nMini = Math.round(quantite(reduit ? 0 : 26) * force);
    var nConfettis = options.confettis === false || reduit ? 0 : Math.round(quantite(70) * force);
    var nEtincelles = Math.round(quantite(reduit ? 10 : 42) * force);

    for (i = 0; i < nCoeurs; i++) {
      v = vitesseAleatoire(480, 1450);
      particule(0, x, y, {
        vx: v.vx * e, vy: v.vy * e - 120 * e, g: 150, frein: 0.1,
        taille: hasard(11, 36), vie: hasard(1.7, 3.1), alpha: hasard(0.8, 1),
        rot: hasard(-0.6, 0.6), vr: hasard(-2.4, 2.4), img: choisir(sprites.coeurs)
      });
    }
    for (i = 0; i < nMini; i++) {
      v = vitesseAleatoire(900, 1900);
      particule(0, x, y, {
        vx: v.vx * e, vy: v.vy * e, g: 90, frein: 0.07,
        taille: hasard(6, 12), vie: hasard(1.1, 2.2), alpha: 1,
        rot: hasard(-0.5, 0.5), vr: hasard(-3, 3), img: choisir(sprites.coeurs)
      });
    }
    for (i = 0; i < nConfettis; i++) {
      v = vitesseAleatoire(420, 1350);
      particule(1, x, y, {
        vx: v.vx * e, vy: v.vy * e - 160 * e, g: 230, frein: 0.16,
        taille: hasard(6, 11), vie: hasard(2.2, 3.8),
        rot: hasard(0, PI2), vr: hasard(-5, 5),
        flip: hasard(0, PI2), vflip: hasard(6, 13),
        amp: hasard(10, 30), freq: hasard(0.8, 1.8), phase: hasard(0, PI2),
        couleur: choisir(couleursConfettis)
      });
    }
    for (i = 0; i < nEtincelles; i++) {
      v = vitesseAleatoire(80, 760);
      particule(3, x, y, {
        vx: v.vx * e, vy: v.vy * e, g: 50, frein: 0.12,
        taille: hasard(10, 26), vie: hasard(0.5, 1.4),
        rot: hasard(0, PI2), vr: hasard(-2, 2), img: choisir(sprites.etincelles)
      });
    }
    if (!reduit && options.ondes !== false) {
      var diag = Math.sqrt(L * L + H * H);
      ondes.push({ x: x, y: y, max: diag * 0.55, duree: 1.3, age: 0, epaisseur: 3, couleur: theme.claire, coeur: false, a: 0.45 });
      ondes.push({ x: x, y: y, max: diag * 0.32, duree: 1.05, age: -0.08, epaisseur: 3, couleur: '#ffffff', coeur: true, a: 1 });
    }
    eveiller();
  }

  // Petit éclat de cœurs (toucher, apparition d'un mot…).
  function petitEclat(x, y, force) {
    if (!pret) return;
    force = force || 1;
    var e = echelle(), n = Math.round(quantite(reduit ? 4 : 9) * force), i, v;
    for (i = 0; i < n; i++) {
      v = vitesseAleatoire(140, 360 * force);
      particule(0, x, y, {
        vx: v.vx * e, vy: v.vy * e - 70, g: 170, frein: 0.07,
        taille: hasard(8, 18) * Math.sqrt(force), vie: hasard(0.8, 1.35), alpha: 1,
        rot: hasard(-0.5, 0.5), vr: hasard(-2.5, 2.5), img: choisir(sprites.coeurs)
      });
    }
    for (i = 0; i < Math.round(5 * force); i++) {
      v = vitesseAleatoire(60, 260);
      particule(3, x, y, {
        vx: v.vx * e, vy: v.vy * e, g: 40, frein: 0.1,
        taille: hasard(8, 18), vie: hasard(0.4, 0.9),
        rot: hasard(0, PI2), vr: hasard(-2, 2), img: choisir(sprites.etincelles)
      });
    }
    eveiller();
  }

  // Étincelles seules (boutons).
  function etincelles(x, y, n) {
    if (!pret) return;
    var e = echelle();
    for (var i = 0; i < (n || 18); i++) {
      var v = vitesseAleatoire(60, 420);
      particule(3, x, y, {
        vx: v.vx * e, vy: v.vy * e, g: 60, frein: 0.1,
        taille: hasard(8, 22), vie: hasard(0.5, 1.2),
        rot: hasard(0, PI2), vr: hasard(-2, 2), img: choisir(sprites.etincelles)
      });
    }
    eveiller();
  }

  function pluieDeCoeurs(duree, densite) {
    if (!pret) return;
    pluieRestante = duree;
    pluieDebit = (densite || 9) * (leger ? 0.6 : 1) * (reduit ? 0.4 : 1) * borne(L / 500, 0.7, 2);
    eveiller();
  }

  function goutte() {
    var vy = hasard(70, 160);
    particule(0, hasard(0, L), -24, {
      vx: hasard(-12, 12), vy: vy, g: 8, frein: 1,
      taille: hasard(10, 28), vie: (H + 60) / vy + 0.6, alpha: hasard(0.5, 0.85),
      rot: hasard(-0.4, 0.4), vr: hasard(-0.7, 0.7),
      amp: hasard(10, 30), freq: hasard(0.4, 0.9), phase: hasard(0, PI2),
      img: choisir(sprites.coeurs)
    });
  }

  // Plume lumineuse qui « écrit » (prénom). plumer(null) l'éteint.
  function plumer(x, y) {
    if (x === null || x === undefined || !pret) { plume.active = false; return; }
    plume.active = true;
    plume.x = x;
    plume.y = y;
    eveiller();
  }

  function trainee(x, y) {
    if (!pret || reduit) return;
    var maintenant = temps;
    var dx = x - traine.x, dy = y - traine.y;
    if (maintenant - traine.dernier < 0.03 || dx * dx + dy * dy < 36) return;
    traine.dernier = maintenant;
    traine.x = x;
    traine.y = y;
    particule(Math.random() < 0.5 ? 3 : 2, x, y, {
      vx: hasard(-25, 25), vy: hasard(-30, 10), g: 30, frein: 0.4,
      taille: hasard(6, 14), vie: hasard(0.45, 0.85),
      rot: hasard(0, PI2), vr: hasard(-2, 2),
      img: Math.random() < 0.5 ? choisir(sprites.etincelles) : choisir(sprites.lueurs)
    });
    eveiller();
  }

  function dessinerMagie(dt) {
    var ctx = magieCtx, i, p;
    var actif = particules.length || ondes.length || pluieRestante > 0 || plume.active;
    if (!actif) {
      if (magieSale) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, magie.width, magie.height);
        magieSale = false;
      }
      return;
    }
    magieSale = true;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, magie.width, magie.height);

    if (pluieRestante > 0) {
      pluieRestante -= dt;
      pluieCumul += pluieDebit * dt;
      while (pluieCumul >= 1) { goutte(); pluieCumul -= 1; }
    }

    if (plume.active) {
      plume.cumul += dt * (leger ? 70 : 130);
      while (plume.cumul >= 1) {
        plume.cumul -= 1;
        var coeur = Math.random() < 0.08;
        particule(coeur ? 0 : (Math.random() < 0.35 ? 3 : 2), plume.x + hasard(-4, 4), plume.y + hasard(-4, 4), {
          vx: hasard(-34, 34), vy: hasard(-46, 14), g: coeur ? 120 : 70, frein: 0.35,
          taille: coeur ? hasard(7, 12) : hasard(4, 11), vie: hasard(0.5, 1.2),
          rot: hasard(-0.5, 0.5), vr: hasard(-2, 2),
          img: coeur ? choisir(sprites.coeurs) : (Math.random() < 0.5 ? sprites.lueurs[0] : choisir(sprites.etincelles))
        });
      }
    }

    // Mise à jour, puis deux passes : formes normales, puis lumières additives.
    for (i = particules.length - 1; i >= 0; i--) {
      p = particules[i];
      p.age += dt;
      p.vie -= dt;
      if (p.vie <= 0 || p.y > H + 80) {
        particules[i] = particules[particules.length - 1];
        particules.pop();
        continue;
      }
      if (p.frein !== 1) {
        var k = Math.pow(p.frein, dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vflip * dt;
    }

    for (var passe = 0; passe < 2; passe++) {
      ctx.globalCompositeOperation = passe ? 'lighter' : 'source-over';
      for (i = 0; i < particules.length; i++) {
        p = particules[i];
        if (p.ajout !== (passe === 1)) continue;
        var a = p.alpha * Math.min(1, p.age / 0.06) * Math.min(1, p.vie / (p.max * 0.4));
        var x = p.x + (p.amp ? Math.sin(p.age * p.freq * PI2 + p.phase) * p.amp : 0);
        if (p.genre === 1) {
          var s = dpr, c = Math.cos(p.rot) * s, n = Math.sin(p.rot) * s, fl = Math.cos(p.flip);
          ctx.globalAlpha = a;
          ctx.setTransform(c, n, -n * fl, c * fl, x * dpr, p.y * dpr);
          ctx.fillStyle = p.couleur;
          ctx.fillRect(-p.taille / 2, -p.taille * 0.3, p.taille, p.taille * 0.6);
        } else {
          poser(ctx, p.img, x, p.y, p.taille, p.rot, a);
        }
      }
    }

    // Pointe de la plume : un éclat lumineux.
    if (plume.active) {
      ctx.globalCompositeOperation = 'lighter';
      poser(ctx, sprites.lueurs[0], plume.x, plume.y, 70, 0, 0.55);
      poser(ctx, sprites.etoile, plume.x, plume.y, 26, 0, 1);
    }

    // Ondes de choc (cercle et cœur).
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (i = ondes.length - 1; i >= 0; i--) {
      var o = ondes[i];
      o.age += dt;
      if (o.age < 0) continue;
      var t = o.age / o.duree;
      if (t >= 1) { ondes.splice(i, 1); continue; }
      var e = 1 - Math.pow(1 - t, 3), r = o.max * e;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = o.couleur;
      for (var trait = 0; trait < 2; trait++) {
        ctx.globalAlpha = (1 - t) * (trait ? 0.9 : 0.25) * o.a;
        ctx.lineWidth = (trait ? o.epaisseur : o.epaisseur * 4) * (1 - t) + 0.5;
        if (o.coeur) tracerCoeur(ctx, o.x, o.y, r * 2);
        else { ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, PI2); }
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ */
  /* Boucle, taille, performances                                        */
  /* ------------------------------------------------------------------ */

  function dimensionner() {
    var l = global.innerWidth || doc.documentElement.clientWidth;
    var h = global.innerHeight || doc.documentElement.clientHeight;
    var ancienL = L, ancienH = H;
    L = l; H = h;
    dpr = Math.min(global.devicePixelRatio || 1, leger ? 1 : 2);
    [ciel, magie].forEach(function (c) {
      c.width = Math.round(L * dpr);
      c.height = Math.round(H * dpr);
    });
    if (ancienL && ancienH) {
      var rx = L / ancienL, ry = H / ancienH;
      flottants.concat(poussieres, petales).forEach(function (p) { p.x *= rx; p.y *= ry; });
    }
  }

  function surRedimension() {
    clearTimeout(minuterieTaille);
    minuterieTaille = setTimeout(function () {
      if (Math.abs((global.innerWidth || 0) - L) < 2 && Math.abs((global.innerHeight || 0) - H) < 2) return;
      dimensionner();
      if (!enCours) dessinerCiel(0);
    }, 120);
  }

  function passerEnLeger() {
    if (leger) return;
    leger = true;
    doc.documentElement.classList.add('leger');
    var garder = function (liste) { return liste.slice(0, Math.max(1, Math.round(liste.length * 0.55))); };
    etoiles = garder(etoiles);
    bokehs = garder(bokehs);
    poussieres = garder(poussieres);
    flottants = garder(flottants);
    petales = garder(petales);
    dimensionner();
    if (surLeger) surLeger();
  }

  function mesurer(dt) {
    if (mesureFaite || leger) return;
    mesures.push(dt);
    if (mesures.length < 160) return;
    mesureFaite = true;
    var tri = mesures.slice(40).sort(function (a, b) { return a - b; });
    var mediane = tri[Math.floor(tri.length / 2)];
    if (mediane > 1 / 38) passerEnLeger();
  }

  function image(maintenant) {
    rafId = global.requestAnimationFrame(image);
    var dt = dernier ? (maintenant - dernier) / 1000 : 1 / 60;
    dernier = maintenant;
    if (!(dt > 0)) dt = 1 / 60;
    mesurer(dt);
    dt = Math.min(dt, 0.05);
    temps += dt;
    dessinerCiel(dt);
    dessinerMagie(dt);
  }

  function demarrerBoucle() {
    if (enCours) return;
    enCours = true;
    dernier = 0;
    rafId = global.requestAnimationFrame(image);
  }

  function arreterBoucle() {
    enCours = false;
    global.cancelAnimationFrame(rafId);
  }

  function eveiller() {
    if (pret && !doc.hidden) demarrerBoucle();
  }

  function initialiser(options) {
    ciel = doc.getElementById('ciel');
    magie = doc.getElementById('magie');
    if (!ciel || !ciel.getContext || !global.requestAnimationFrame) return false;
    cielCtx = ciel.getContext('2d');
    magieCtx = magie.getContext('2d');
    if (!cielCtx || !magieCtx) return false;
    theme = options.theme;
    leger = !!options.leger;
    reduit = !!options.reduit;
    surLeger = options.surLeger || null;
    construireSprites();
    dimensionner();
    peupler();
    pret = true;

    global.addEventListener('resize', surRedimension);
    global.addEventListener('orientationchange', surRedimension);
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) arreterBoucle(); else demarrerBoucle();
    });
    demarrerBoucle();
    return true;
  }

  function vider() {
    particules.length = 0;
    ondes.length = 0;
    pluieRestante = 0;
    plume.active = false;
  }

  function viser(x, y) {
    parallaxe.x = borne(x / (L || 1), 0, 1);
    parallaxe.y = borne(y / (H || 1), 0, 1);
  }

  Amour.effets = {
    initialiser: initialiser,
    explosion: explosion,
    petitEclat: petitEclat,
    etincelles: etincelles,
    pluieDeCoeurs: pluieDeCoeurs,
    plume: plumer,
    trainee: trainee,
    viser: viser,
    vider: vider,
    estLeger: function () { return leger; }
  };
})(window);
