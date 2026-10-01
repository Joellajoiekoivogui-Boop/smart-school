// Construction sur Vercel (lancée automatiquement, voir vercel.json).
// Copie le site dans public/ et rend absolue l'adresse de l'image d'aperçu
// (og:image) : WhatsApp et Facebook l'exigent pour afficher l'image quand
// on partage le lien. En dehors de Vercel, ce fichier ne sert pas.
'use strict';

const fs = require('fs');
const path = require('path');

const ici = __dirname;
const sortie = path.join(ici, 'public');
const aCopier = ['index.html', 'personnaliser.html', 'config.js', 'apercu.jpg', 'icone.png', 'css', 'js', 'fonts', 'medias'];

fs.rmSync(sortie, { recursive: true, force: true });
fs.mkdirSync(sortie);
for (const nom of aCopier) {
  const source = path.join(ici, nom);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(sortie, nom), { recursive: true });
}

const domaine = process.env.VERCEL_PROJECT_PRODUCTION_URL;
if (domaine) {
  const page = path.join(sortie, 'index.html');
  const html = fs.readFileSync(page, 'utf8');
  fs.writeFileSync(page, html.replace('content="apercu.jpg"', 'content="https://' + domaine + '/apercu.jpg"'));
  console.log('Image d’aperçu : https://' + domaine + '/apercu.jpg');
}
console.log('Site prêt dans public/');
