// Tests de js/outils.js (configuration, thèmes, liens).
// Lancer depuis la racine du dépôt : node --test declaration-amour/tests/*.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.window = globalThis;
window.location = { hash: '', search: '' };
require('../js/outils.js');
const O = window.Amour.outils;

const HEX = /^#[0-9a-f]{6}$/;

test('sans config.js, les textes par défaut sont utilisés', () => {
  const c = O.normaliser(undefined, O.DEFAUTS);
  assert.equal(c.prenom, 'Mon amour');
  assert.equal(c.accueil.titre, 'J’ai quelque chose à te dire…');
  assert.equal(c.grandMessage, 'JE T’AIME ❤️');
  assert.deepEqual(c.messages, O.DEFAUTS.messages);
  assert.equal(c.boutonLettre, 'Découvrir mon message 💌');
});

test('les champs connus remplacent les défauts, les autres sont ignorés', () => {
  const c = O.normaliser({
    prenom: '  Aïcha  ',
    accueil: { titre: 'Coucou' },
    lettre: { signature: 'Ibrahima' },
    inconnu: 'ignoré',
  }, O.DEFAUTS);
  assert.equal(c.prenom, 'Aïcha');
  assert.equal(c.accueil.titre, 'Coucou');
  assert.equal(c.accueil.invitation, O.DEFAUTS.accueil.invitation);
  assert.equal(c.lettre.signature, 'Ibrahima');
  assert.deepEqual(c.lettre.paragraphes, O.DEFAUTS.lettre.paragraphes);
  assert.equal(c.inconnu, undefined);
});

test('les types sont vérifiés', () => {
  const c = O.normaliser({ prenom: 42, messages: ['ok', 3, null, { a: 1 }, ''], couleur: 12, options: { vibration: 'non' } }, O.DEFAUTS);
  assert.equal(c.prenom, '42');
  assert.deepEqual(c.messages, ['ok', '3']);
  assert.equal(c.couleur, 'rose');
  assert.equal(c.options.vibration, true);
});

test('formes courtes : textes multilignes, musique, photos', () => {
  const c = O.normaliser({
    messages: 'Premier\n\nDeuxième\r\nTroisième',
    lettre: 'Paragraphe un.\nSuite du un.\n\nParagraphe deux.',
    musique: 'medias/chanson.mp3',
    photos: ['medias/a.jpg', { image: 'medias/b.jpg', legende: 'B' }, { legende: 'sans image' }],
  }, O.DEFAUTS);
  assert.deepEqual(c.messages, ['Premier', 'Deuxième', 'Troisième']);
  assert.deepEqual(c.lettre.paragraphes, ['Paragraphe un.\nSuite du un.', 'Paragraphe deux.']);
  assert.equal(c.musique.activee, true);
  assert.equal(c.musique.fichier, 'medias/chanson.mp3');
  assert.deepEqual(c.photos.liste, [{ image: 'medias/a.jpg', legende: '' }, { image: 'medias/b.jpg', legende: 'B' }]);
  assert.equal(O.normaliser({ musique: false }, O.DEFAUTS).musique.activee, false);
});

test('musique : volume borné, début positif', () => {
  const c = O.normaliser({ musique: { volume: 3, debut: -5 } }, O.DEFAUTS);
  assert.equal(c.musique.volume, 1);
  assert.equal(c.musique.debut, 0);
});

test('adresses : seuls les chemins, http(s) et data:image|audio sont acceptés', () => {
  assert.equal(O.urlSure('medias/photo.jpg'), 'medias/photo.jpg');
  assert.equal(O.urlSure(' https://exemple.org/a.jpg '), 'https://exemple.org/a.jpg');
  assert.equal(O.urlSure('//cdn.exemple.org/a.mp3'), '//cdn.exemple.org/a.mp3');
  assert.equal(O.urlSure('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(O.urlSure('javascript:alert(1)'), '');
  assert.equal(O.urlSure('JaVaScRiPt:alert(1)'), '');
  assert.equal(O.urlSure('data:text/html,<script>'), '');
  assert.equal(O.urlSure('C:\\photos\\a.jpg'), '');
  const c = O.normaliser({ photos: [{ image: 'javascript:alert(1)' }], musique: { fichier: 'vbscript:x' } }, O.DEFAUTS);
  assert.deepEqual(c.photos.liste, []);
  assert.equal(c.musique.fichier, '');
});

test('thèmes : noms, couleurs libres, repli sur « rose »', () => {
  assert.equal(O.resoudreTheme('lavande'), O.THEMES.lavande);
  assert.equal(O.resoudreTheme(' OR '), O.THEMES.or);
  assert.equal(O.resoudreTheme('n’importe quoi'), O.THEMES.rose);
  for (const valeur of ['#e91e63', 'e91e63', '#0af', '#808080', '#000000', '#ffffff']) {
    const t = O.resoudreTheme(valeur);
    assert.notEqual(t, O.THEMES.rose, valeur);
    for (const cle of ['principale', 'claire', 'profonde', 'eclat', 'texte']) assert.match(t[cle], HEX, valeur + ' ' + cle);
    assert.equal(t.fond.length, 3);
    t.fond.forEach((c) => assert.match(c, HEX));
  }
});

test('lien : aller-retour fidèle, accents et émojis compris', () => {
  const objet = { prenom: 'Aïcha', messages: ['Je t’aime ❤️', '👩‍❤️‍👨 Ensemble'] };
  const code = O.encoderLien(objet);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(JSON.parse(O.depuisBase64Url(code)), objet);
});

test('chargerConfig : config.js, puis le lien (#d=) et ?prenom=', () => {
  window.DECLARATION = { prenom: 'Depuis config', couleur: 'or' };
  window.location = { hash: '#d=' + O.encoderLien({ messages: ['Du lien'] }), search: '?prenom=Mariam%20Bah' };
  let r = O.chargerConfig();
  assert.equal(r.erreur, false);
  assert.equal(r.config.prenom, 'Mariam Bah');
  assert.equal(r.config.couleur, 'or');
  assert.deepEqual(r.config.messages, ['Du lien']);

  // Liens désactivés par config.js
  window.DECLARATION = { prenom: 'Fixe', options: { personnalisationParLien: false } };
  r = O.chargerConfig();
  assert.equal(r.config.prenom, 'Fixe');
  assert.deepEqual(r.config.messages, O.DEFAUTS.messages);

  // Lien abîmé : ignoré sans erreur ; config.js absent : signalé
  window.DECLARATION = undefined;
  window.location = { hash: '#d=%%%abime', search: '' };
  r = O.chargerConfig();
  assert.equal(r.erreur, true);
  assert.equal(r.config.prenom, 'Mon amour');
});

test('les textes trop longs sont tronqués', () => {
  const c = O.normaliser({ prenom: 'x'.repeat(5000) }, O.DEFAUTS);
  assert.equal(c.prenom.length, 2000);
});
