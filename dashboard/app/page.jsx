import Link from 'next/link';
import './site.css';

// Numero WhatsApp commercial (format international sans +). Sans lui, le bouton
// « Demander une démo » renvoie vers la section contact.
const CONTACT_WHATSAPP = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '';
const DEMO_HREF = CONTACT_WHATSAPP
  ? `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent('Bonjour, je souhaite une démo de Vigie Commerciale.')}`
  : '#contact';

export const metadata = {
  title: 'Vigie Commerciale — votre commercial IA sur WhatsApp, 24h/24',
  description:
    "Un agent commercial IA branché sur votre numéro WhatsApp existant : il répond avec vos vrais prix et stocks, qualifie les prospects, relance et passe la main à un humain quand il le faut.",
};

const ETAPES = [
  { t: 'Comprendre', d: 'Le message du client est lu dans son contexte : historique, ce qu’il a déjà dit, ce qu’il cherche.' },
  { t: 'Vérifier', d: 'Prix, stock et promotions sont lus dans votre catalogue à chaque réponse. Rien n’est inventé.' },
  { t: 'Conseiller', d: 'Questions ciblées, recommandation, réponse aux objections, dans vos marges autorisées.' },
  { t: 'Relancer', d: 'Une conversation laissée en suspens ? L’agent relance avec un message écrit pour ce client précis.' },
  { t: 'Conclure', d: 'Devis ou commande créés, prospect qualifié, et un humain alerté dès que nécessaire.' },
];

const FONCTIONS = [
  {
    titre: 'Votre numéro, tel quel',
    texte: 'Connexion par simple scan de QR code, comme « Appareils liés ». Pas de nouveau numéro, pas de validation Meta.',
  },
  {
    titre: 'Données réelles, jamais devinées',
    texte: 'Catalogue, prix en GNF, stock et promotions viennent de votre base. Si l’information manque, il le dit.',
  },
  {
    titre: 'Relances intelligentes',
    texte: 'Le client a demandé un prix puis s’est tu ? La relance part au bon moment, avec le bon produit.',
  },
  {
    titre: 'Prospects qualifiés',
    texte: 'Intérêt, intention, objections, besoin : un résumé prêt à lire, sans relire tout l’historique.',
  },
  {
    titre: 'Mémoire client',
    texte: 'Ce qu’un client a déjà dit est retenu. Il n’a jamais à se répéter d’une visite à l’autre.',
  },
  {
    titre: 'Questions sans réponse',
    texte: 'Chaque question à laquelle l’agent n’a pas su répondre est notée pour enrichir votre base.',
  },
];

const CONTROLES = [
  'Activer ou couper l’agent en un clic, globalement ou pour une seule conversation',
  'Fixer la remise maximale et les délais de livraison qu’il peut promettre',
  'Alerte immédiate en cas de réclamation, de demande d’un humain ou de négociation hors marge',
  'Catalogue, prix, stock et promotions gérés depuis la console',
];

const FAQ = [
  {
    q: 'Faut-il changer de numéro WhatsApp ?',
    r: 'Non. L’agent se connecte au numéro que vos clients connaissent déjà, via un scan de QR code depuis Réglages → Appareils liés.',
  },
  {
    q: 'Et s’il ne connaît pas la réponse ?',
    r: 'Il ne l’invente pas. Il le dit honnêtement au client, enregistre la question pour que vous la complétiez, ou transfère à un humain.',
  },
  {
    q: 'Puis-je reprendre la main sur une conversation ?',
    r: 'Oui, à tout moment depuis la console : l’agent se met en retrait sur cette conversation et vous répondez vous-même.',
  },
  {
    q: 'Les prix sont-ils en francs guinéens ?',
    r: 'Oui. Le catalogue est géré en GNF, et l’agent parle français naturellement avec vos clients.',
  },
];

function Mark() {
  return <span className="brand-mark" aria-hidden="true">V</span>;
}

function ChatDemo() {
  return (
    <div className="phone" role="img" aria-label="Exemple de conversation WhatsApp entre un client et l'agent">
      <div className="phone-head">
        <span className="phone-avatar">BD</span>
        <div>
          <div className="phone-name">Boutique Démo Conakry</div>
          <div className="phone-status">en ligne</div>
        </div>
      </div>
      <div className="phone-body">
        <div className="bubble in">Bonsoir, vous avez le Tecno Spark 20 ? C’est combien ?</div>
        <div className="bubble out">
          Bonsoir ! Oui, il est en stock ✅<br />
          Tecno Spark 20 : <b className="mono">1 850 000 GNF</b>.<br />
          Vous l’utilisez surtout pour les photos, ou plutôt pour l’autonomie ?
          <span className="bubble-time mono">21:47</span>
        </div>
        <div className="bubble in">Les photos. Mais c’est un peu cher…</div>
        <div className="bubble out">
          Je comprends. Il a un capteur 50 MP, très bon en faible lumière. Je peux vous
          préparer un devis avec livraison à Kaloum demain ?
          <span className="bubble-time mono">21:48</span>
        </div>
        <div className="tool-note mono">↳ search_catalog · qualify_lead : chaud</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="site">
      <header className="site-nav">
        <div className="wrap nav-inner">
          <a href="#" className="site-brand">
            <Mark />
            <span className="brand-name">Vigie Commerciale</span>
          </a>
          <nav className="nav-links" aria-label="Navigation principale">
            <a href="#fonctionnement">Fonctionnement</a>
            <a href="#fonctions">Fonctions</a>
            <a href="#controle">Contrôle</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Link href="/login" className="btn btn-sm">Espace client</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="eyebrow">Agent commercial IA · WhatsApp</p>
              <h1>Un commercial qui répond à vos clients, même à 22h.</h1>
              <p className="lead">
                Vigie Commerciale se branche sur votre numéro WhatsApp existant. Il répond avec vos
                vrais prix et vos vrais stocks, qualifie chaque prospect, relance ceux qui hésitent,
                et vous passe la main quand il le faut.
              </p>
              <div className="hero-cta">
                <a href={DEMO_HREF} className="btn btn-accent btn-lg">Demander une démo</a>
                <a href="#fonctionnement" className="btn btn-lg">Voir comment ça marche</a>
              </div>
              <ul className="hero-facts">
                <li><b>24h/24</b> disponible</li>
                <li><b>0</b> prix inventé</li>
                <li><b>1</b> scan pour démarrer</li>
              </ul>
            </div>
            <ChatDemo />
          </div>
        </section>

        <section id="fonctionnement" className="section">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Fonctionnement</p>
              <h2>Pas un chatbot à réponses toutes faites.</h2>
              <p>Un vrai parcours de vente, du premier message à la commande.</p>
            </div>
            <ol className="steps">
              {ETAPES.map((e, i) => (
                <li key={e.t} className="step">
                  <span className="step-num mono">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{e.t}</h3>
                  <p>{e.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="fonctions" className="section section-alt">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Fonctions</p>
              <h2>Tout ce qu’un bon vendeur fait, sans pause.</h2>
            </div>
            <div className="features">
              {FONCTIONS.map((f) => (
                <article key={f.titre} className="feature">
                  <h3>{f.titre}</h3>
                  <p>{f.texte}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="controle" className="section">
          <div className="wrap split">
            <div>
              <p className="eyebrow">Contrôle</p>
              <h2>L’humain reste aux commandes.</h2>
              <p className="lead">
                Depuis la console, vous voyez chaque conversation, chaque prospect qualifié, et vous
                décidez de ce que l’agent a le droit de promettre.
              </p>
              <ul className="checks">
                {CONTROLES.map((c) => <li key={c}>{c}</li>)}
              </ul>
              <Link href="/login" className="btn btn-accent">Ouvrir la console</Link>
            </div>
            <div className="console-card" aria-hidden="true">
              <div className="console-row head">
                <span>Prospect</span><span>Besoin</span><span>Statut</span>
              </div>
              <div className="console-row">
                <span>Mariama D.</span><span>Climatiseur 1.5CV</span>
                <span className="pill pill-pret">Prêt</span>
              </div>
              <div className="console-row">
                <span>Ibrahima S.</span><span>Tecno Spark 20</span>
                <span className="pill pill-chaud">Chaud</span>
              </div>
              <div className="console-row">
                <span>Fatoumata K.</span><span>Riz 50 kg × 10</span>
                <span className="pill pill-tiede">Tiède</span>
              </div>
              <div className="console-row">
                <span>Alpha B.</span><span>Réclamation livraison</span>
                <span className="pill pill-critique">Humain requis</span>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="section section-alt">
          <div className="wrap narrow">
            <div className="section-head">
              <p className="eyebrow">Questions fréquentes</p>
              <h2>Ce qu’on nous demande souvent.</h2>
            </div>
            <div className="faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="section">
          <div className="wrap">
            <div className="cta-band">
              <div>
                <h2>Prêt à ne plus rater un seul client ?</h2>
                <p>
                  {CONTACT_WHATSAPP
                    ? 'Écrivez-nous sur WhatsApp : on connecte votre numéro et votre catalogue avec vous.'
                    : 'Contactez-nous : on connecte votre numéro et votre catalogue avec vous.'}
                </p>
              </div>
              {CONTACT_WHATSAPP ? (
                <a href={DEMO_HREF} className="btn btn-lg btn-invert">Écrire sur WhatsApp</a>
              ) : (
                <Link href="/login" className="btn btn-lg btn-invert">Espace client</Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="wrap foot-inner">
          <span className="site-brand"><Mark /><span className="brand-name">Vigie Commerciale</span></span>
          <span className="foot-note">Agent commercial IA pour WhatsApp · Conakry, Guinée</span>
        </div>
      </footer>
    </div>
  );
}
