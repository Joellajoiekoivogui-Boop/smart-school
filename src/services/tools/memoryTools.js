const { Customer } = require('../../models');

/**
 * Permet a l'agent d'enregistrer explicitement une information durable sur
 * un client (preference, adresse, contexte recurrent) pour eviter de la
 * redemander lors d'un futur contact.
 */

const rememberFactTool = {
  name: 'remember_customer_fact',
  description:
    "Enregistre une information durable et utile sur ce client (preference produit, adresse de livraison habituelle, contexte particulier) afin de na pas la lui redemander lors d'un prochain contact. Ne pas utiliser pour des details ponctuels sans valeur future.",
  input_schema: {
    type: 'object',
    properties: {
      cle: { type: 'string', description: "Identifiant court de l'information, ex: adresse_livraison, produit_prefere" },
      valeur: { type: 'string' },
    },
    required: ['cle', 'valeur'],
  },
};

async function executeRememberFact(ctx, input) {
  const { customerId } = ctx;
  const customer = await Customer.findById(customerId);
  if (!customer) return { enregistre: false };

  const existant = customer.memoire.find((f) => f.cle === input.cle);
  if (existant) {
    existant.valeur = input.valeur;
    existant.updatedAt = new Date();
  } else {
    customer.memoire.push({ cle: input.cle, valeur: input.valeur, source: 'client', updatedAt: new Date() });
  }
  await customer.save();
  return { enregistre: true };
}

module.exports = {
  definitions: [rememberFactTool],
  executors: {
    remember_customer_fact: executeRememberFact,
  },
};
