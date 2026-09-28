#!/usr/bin/env node
/**
 * Demarrage "tout-en-un" sur l'ordinateur du responsable :
 * configuration guidee au premier lancement (.env), base MongoDB locale
 * sans installation si aucune n'est joignable, donnees initiales, puis le
 * serveur (QR code WhatsApp dans le terminal). Usage : npm run demarrer
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const readline = require('readline');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const DATA_DIR = path.join(ROOT, 'data');
const SEEDED_FLAG = path.join(DATA_DIR, '.seeded');

function normalizePhone(raw) {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = '224' + digits; // numero guineen saisi sans indicatif
  return digits;
}

async function firstRunSetup() {
  if (fs.existsSync(ENV_PATH)) return false;

  // Iterateur de lignes plutot que rl.question : aucune ligne perdue si les
  // reponses arrivent d'un bloc (copier-coller, entree redirigee).
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (question) => {
    process.stdout.write(question);
    const { value, done } = await lines.next();
    if (done) throw new Error('Configuration interrompue avant la fin.');
    return value.trim();
  };

  console.log('\n=== Premiere configuration (une seule fois) ===\n');

  let key = '';
  while (!key.startsWith('sk-')) {
    key = await ask('Cle API OpenAI (commence par sk-) : ');
  }
  let phone = '';
  while (phone.length < 11 || phone.length > 15) {
    phone = normalizePhone(await ask('Numero WhatsApp de la boutique (ex. 627 94 39 08) : '));
  }
  const nom = (await ask('Nom de la boutique [Ma Boutique] : ')).replace(/"/g, '') || 'Ma Boutique';
  const email = (await ask('Email du compte admin [admin@boutique.local] : ')) || 'admin@boutique.local';
  rl.close();

  const password = crypto.randomBytes(6).toString('base64url');
  const env = fs
    .readFileSync(path.join(ROOT, '.env.example'), 'utf8')
    .replace(/^OPENAI_API_KEY=.*$/m, `OPENAI_API_KEY=${key}`)
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`)
    .concat(
      '\n# --- Genere par npm run demarrer ---\n',
      `SEED_WHATSAPP_NUMBER=${phone}\n`,
      `BUSINESS_NAME="${nom}"\n`,
      `SEED_ADMIN_EMAIL=${email}\n`,
      `SEED_ADMIN_PASSWORD=${password}\n`
    );
  fs.writeFileSync(ENV_PATH, env, { mode: 0o600 });
  console.log('\nConfiguration enregistree dans .env (ce fichier reste sur votre ordinateur).');
  return true;
}

function isReachable(uri) {
  const match = /^mongodb:\/\/(?:[^@/]+@)?([^:/,]+)(?::(\d+))?/.exec(uri || '');
  if (!match) return Promise.resolve(true); // mongodb+srv (Atlas) : on laisse le driver gerer
  return new Promise((resolve) => {
    const socket = net.connect({ host: match[1], port: Number(match[2] || 27017) });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(1500, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

async function startLocalMongo() {
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server-core'));
  } catch {
    throw new Error("Aucune base MongoDB joignable et le module local est absent : lancez d'abord `npm install`.");
  }
  const dbPath = path.join(DATA_DIR, 'db');
  fs.mkdirSync(dbPath, { recursive: true });
  console.log('Demarrage de la base de donnees locale (le premier lancement telecharge MongoDB, ~100 Mo)...');
  try {
    return await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } });
  } catch (err) {
    throw new Error(
      'Impossible de demarrer la base de donnees locale (telechargement de MongoDB interrompu ?).\n' +
        'Verifiez votre connexion internet puis relancez. Sinon, installez MongoDB Community ' +
        '(https://www.mongodb.com/try/download/community) ou creez une base gratuite sur MongoDB Atlas, ' +
        'et mettez son adresse dans MONGODB_URI du fichier .env.\n' +
        `Detail technique : ${String(err.message).split('\n')[0]}`
    );
  }
}

async function main() {
  const justConfigured = await firstRunSetup();
  require('dotenv').config({ path: ENV_PATH });

  let mongod = null;
  if (!(await isReachable(process.env.MONGODB_URI))) {
    mongod = await startLocalMongo();
    process.env.MONGODB_URI = mongod.getUri('ai-sales-agent');
  }

  const stop = async () => {
    if (mongod) await mongod.stop({ doCleanup: false }).catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  if (justConfigured || !fs.existsSync(SEEDED_FLAG)) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'seed.js')], {
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0) throw new Error('La creation des donnees initiales a echoue (voir le message ci-dessus).');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SEEDED_FLAG, new Date().toISOString());
  }

  console.log('\n=== Tout est pret ===');
  console.log(`Tableau de bord / API : http://localhost:${process.env.PORT || 3000}`);
  console.log(`Compte admin : ${process.env.SEED_ADMIN_EMAIL} / ${process.env.SEED_ADMIN_PASSWORD}`);
  console.log('Un QR code va s\'afficher : sur le telephone de la boutique, WhatsApp > Appareils lies > Lier un appareil.');
  console.log('Laissez cette fenetre ouverte : fermer la fenetre arrete l\'agent.\n');

  require('../src/server');
}

main().catch((err) => {
  console.error(`\nErreur : ${err.message}`);
  process.exit(1);
});
