import Link from 'next/link';
import './site.css';
import {
  ChatDemo,
  ConsoleLive,
  CtaBand,
  Faq,
  MotionLink,
  MotionRoot,
  Reveal,
  RevealItem,
  ScrollProgress,
  WordsTitle,
} from './site-motion';

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

export default function Home() {
  return (
    <MotionRoot>
    <div className="site">
      <ScrollProgress />
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
              <Reveal>
                <RevealItem as="p" className="eyebrow">Agent commercial IA · WhatsApp</RevealItem>
              </Reveal>
              <WordsTitle text="Un commercial qui répond à vos clients, même à 22h." />
              <Reveal delay={0.55}>
                <RevealItem as="p" className="lead">
                  Vigie Commerciale se branche sur votre numéro WhatsApp existant. Il répond avec vos
                  vrais prix et vos vrais stocks, qualifie chaque prospect, relance ceux qui hésitent,
                  et vous passe la main quand il le faut.
                </RevealItem>
                <RevealItem className="hero-cta">
                  <MotionLink href={DEMO_HREF} className="btn btn-accent btn-lg">Demander une démo</MotionLink>
                  <MotionLink href="#fonctionnement" className="btn btn-lg">Voir comment ça marche</MotionLink>
                </RevealItem>
                <RevealItem as="ul" className="hero-facts">
                  <li><b>24h/24</b> disponible</li>
                  <li><b>0</b> prix inventé</li>
                  <li><b>1</b> scan pour démarrer</li>
                </RevealItem>
              </Reveal>
            </div>
            <ChatDemo />
          </div>
        </section>

        <section id="fonctionnement" className="section">
          <div className="wrap">
            <Reveal className="section-head">
              <RevealItem as="p" className="eyebrow">Fonctionnement</RevealItem>
              <RevealItem as="h2">Pas un chatbot à réponses toutes faites.</RevealItem>
              <RevealItem as="p">Un vrai parcours de vente, du premier message à la commande.</RevealItem>
            </Reveal>
            <Reveal as="ol" className="steps" step={0.1}>
              {ETAPES.map((e, i) => (
                <RevealItem as="li" key={e.t} className="step">
                  <span className="step-num mono">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{e.t}</h3>
                  <p>{e.d}</p>
                </RevealItem>
              ))}
            </Reveal>
          </div>
        </section>

        <section id="fonctions" className="section section-alt">
          <div className="wrap">
            <Reveal className="section-head">
              <RevealItem as="p" className="eyebrow">Fonctions</RevealItem>
              <RevealItem as="h2">Tout ce qu’un bon vendeur fait, sans pause.</RevealItem>
            </Reveal>
            <Reveal className="features">
              {FONCTIONS.map((f) => (
                <RevealItem as="article" key={f.titre} className="feature" hover>
                  <h3>{f.titre}</h3>
                  <p>{f.texte}</p>
                </RevealItem>
              ))}
            </Reveal>
          </div>
        </section>

        <section id="controle" className="section">
          <div className="wrap split">
            <Reveal>
              <RevealItem as="p" className="eyebrow">Contrôle</RevealItem>
              <RevealItem as="h2">L’humain reste aux commandes.</RevealItem>
              <RevealItem as="p" className="lead">
                Depuis la console, vous voyez chaque conversation, chaque prospect qualifié, et vous
                décidez de ce que l’agent a le droit de promettre.
              </RevealItem>
              <ul className="checks">
                {CONTROLES.map((c) => <RevealItem as="li" key={c}>{c}</RevealItem>)}
              </ul>
              <RevealItem>
                <MotionLink href="/login" className="btn btn-accent">Ouvrir la console</MotionLink>
              </RevealItem>
            </Reveal>
            <ConsoleLive />
          </div>
        </section>

        <section id="faq" className="section section-alt">
          <div className="wrap narrow">
            <Reveal className="section-head">
              <RevealItem as="p" className="eyebrow">Questions fréquentes</RevealItem>
              <RevealItem as="h2">Ce qu’on nous demande souvent.</RevealItem>
            </Reveal>
            <Faq items={FAQ} />
          </div>
        </section>

        <section id="contact" className="section">
          <div className="wrap">
            <CtaBand>
              <div>
                <h2>Prêt à ne plus rater un seul client ?</h2>
                <p>
                  {CONTACT_WHATSAPP
                    ? 'Écrivez-nous sur WhatsApp : on connecte votre numéro et votre catalogue avec vous.'
                    : 'Contactez-nous : on connecte votre numéro et votre catalogue avec vous.'}
                </p>
              </div>
              {CONTACT_WHATSAPP ? (
                <MotionLink href={DEMO_HREF} className="btn btn-lg btn-invert">Écrire sur WhatsApp</MotionLink>
              ) : (
                <Link href="/login" className="btn btn-lg btn-invert">Espace client</Link>
              )}
            </CtaBand>
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
    </MotionRoot>
  );
}
