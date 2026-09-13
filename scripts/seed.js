require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../src/config/db');
const { Boutique, Product, AgentSettings, User } = require('../src/models');

/**
 * Cree des donnees de demonstration en GNF pour tester l'agent sans attendre
 * une vraie boutique connectee. Usage: npm run seed
 */
async function seed() {
  await connectDB();

  const numeroDemo = process.env.SEED_WHATSAPP_NUMBER || '224600000000';

  let boutique = await Boutique.findOne({ whatsappNumber: numeroDemo });
  if (!boutique) {
    boutique = await Boutique.create({
      nom: 'Boutique Demo Conakry',
      secteur: 'boutique_generale',
      whatsappNumber: numeroDemo,
      responsable: { nom: 'Joel', telephone: numeroDemo },
    });
  }

  await AgentSettings.findOneAndUpdate(
    { boutiqueId: boutique._id },
    {
      agentActif: true,
      tonalite: 'chaleureux',
      peutAccorderRemise: true,
      remiseMaxPourcent: 5,
      peutPromettreDelaiLivraison: false,
      delaiRelanceMinutes: 60,
      maxRelancesParConversation: 2,
      messageBienvenue: 'Bonjour et bienvenue chez Boutique Demo Conakry ! Comment puis-je vous aider ?',
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const produitsDemo = [
    {
      nom: 'Smartphone Tecno Spark 20',
      description: 'Ecran 6.6 pouces, 128 Go, double SIM, garantie 12 mois.',
      categorie: 'electronique',
      prixGNF: 1850000,
      stock: 12,
      motsCles: ['telephone', 'smartphone', 'tecno'],
    },
    {
      nom: 'Climatiseur split 1.5CV',
      description: 'Installation incluse dans Conakry, basse consommation.',
      categorie: 'electromenager',
      prixGNF: 3200000,
      stock: 4,
      motsCles: ['clim', 'climatiseur', 'ac'],
    },
    {
      nom: 'Sac de riz 50kg',
      description: 'Riz importe, qualite superieure.',
      categorie: 'alimentation',
      prixGNF: 420000,
      stock: 0,
      disponible: false,
      motsCles: ['riz', 'alimentation'],
    },
  ];

  for (const p of produitsDemo) {
    await Product.findOneAndUpdate(
      { boutiqueId: boutique._id, nom: p.nom },
      { ...p, boutiqueId: boutique._id },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMoi123!';
  const motDePasseHash = await bcrypt.hash(adminPassword, 10);

  await User.findOneAndUpdate(
    { email: adminEmail },
    { boutiqueId: boutique._id, nom: 'Responsable', email: adminEmail, motDePasseHash, role: 'admin' },
    { upsert: true, setDefaultsOnInsert: true }
  );

  console.log('Seed termine.');
  console.log(`Boutique: ${boutique.nom} (${boutique._id})`);
  console.log(`Compte admin: ${adminEmail} / ${adminPassword}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erreur seed:', err);
  process.exit(1);
});
