'use client';
import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  stagger,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';

// Ressorts definis par duree percue + rebond (API moderne de Motion)
const SPRING = { type: 'spring', visualDuration: 0.5, bounce: 0.2 };
const SPRING_SOFT = { type: 'spring', visualDuration: 0.7, bounce: 0.1 };

// Respecte « Réduire les animations » du systeme pour tout le site
export function MotionRoot({ children }) {
  return <MotionConfig reducedMotion="user" transition={SPRING}>{children}</MotionConfig>;
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

const revealItem = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: SPRING_SOFT },
};

// Conteneur qui revele ses enfants <RevealItem> en cascade a l'entree dans l'ecran
export function Reveal({ as = 'div', children, className, delay = 0, step = 0.08, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      variants={{ hidden: {}, show: { transition: { delayChildren: stagger(step, { startDelay: delay }) } } }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function RevealItem({ as = 'div', children, className, hover = false, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={revealItem}
      whileHover={hover ? { y: -6, transition: SPRING } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Titre revele mot par mot
export function WordsTitle({ text, className }) {
  return (
    <motion.h1
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { delayChildren: stagger(0.06, { startDelay: 0.1 }) } } }}
      aria-label={text}
    >
      {text.split(' ').map((w, i) => (
        <motion.span key={i} className="word" aria-hidden="true" variants={revealItem}>
          {w}&nbsp;
        </motion.span>
      ))}
    </motion.h1>
  );
}

export function MotionLink({ className, children, ...rest }) {
  return (
    <motion.a className={className} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} {...rest}>
      {children}
    </motion.a>
  );
}

/* ---------- conversation WhatsApp jouee en direct ---------- */

const SCRIPT = [
  { from: 'in', body: 'Bonsoir, vous avez le Tecno Spark 20 ? C’est combien ?' },
  {
    from: 'out',
    time: '21:47',
    body: (
      <>
        Bonsoir ! Oui, il est en stock ✅<br />
        Tecno Spark 20 : <b className="mono">1 850 000 GNF</b>.<br />
        Vous l’utilisez surtout pour les photos, ou plutôt pour l’autonomie ?
      </>
    ),
  },
  { from: 'in', body: 'Les photos. Mais c’est un peu cher…' },
  {
    from: 'out',
    time: '21:48',
    body: 'Je comprends. Il a un capteur 50 MP, très bon en faible lumière. Je peux vous préparer un devis avec livraison à Kaloum demain ?',
  },
  { from: 'tool', body: '↳ search_catalog · qualify_lead : chaud' },
];

function Typing() {
  return (
    <motion.div
      className="bubble out typing"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </motion.div>
  );
}

export function ChatDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);

  // Parallaxe douce du telephone au defilement
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const rotate = useTransform(scrollYProgress, [0, 1], [2, -2]);

  useEffect(() => {
    if (!inView) return;
    let t;
    if (shown >= SCRIPT.length) {
      // Pause sur la conversation complete, puis on rejoue
      t = setTimeout(() => setShown(0), 6000);
    } else if (SCRIPT[shown].from === 'out' && !typing) {
      t = setTimeout(() => setTyping(true), 500);
    } else {
      t = setTimeout(() => {
        setTyping(false);
        setShown((n) => n + 1);
      }, typing ? 1300 : shown === 0 ? 600 : 900);
    }
    return () => clearTimeout(t);
  }, [inView, shown, typing]);

  return (
    <motion.div
      ref={ref}
      className="phone"
      style={{ y, rotate }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING_SOFT, delay: 0.3 }}
      role="img"
      aria-label="Exemple de conversation WhatsApp entre un client et l'agent"
    >
      <div className="phone-head">
        <span className="phone-avatar">BD</span>
        <div>
          <div className="phone-name">Boutique Démo Conakry</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={typing ? 'typing' : 'online'}
              className="phone-status"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 0.8, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {typing ? 'écrit…' : 'en ligne'}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <motion.div className="phone-body" layout>
        <AnimatePresence mode="popLayout">
          {SCRIPT.slice(0, shown).map((m, i) =>
            m.from === 'tool' ? (
              <motion.div
                key={i}
                layout
                className="tool-note mono"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                {m.body}
              </motion.div>
            ) : (
              <motion.div
                key={i}
                layout
                className={`bubble ${m.from}`}
                style={{ originX: m.from === 'in' ? 0 : 1, originY: 1 }}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                {m.body}
                {m.time && <span className="bubble-time mono">{m.time}</span>}
              </motion.div>
            ),
          )}
          {typing && <Typing key="typing" />}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ---------- console : les prospects se reclassent en direct (layout animations) ---------- */

const RANG = { critique: 0, pret: 1, chaud: 2, tiede: 3, froid: 4 };
const LABEL = { critique: 'Humain requis', pret: 'Prêt', chaud: 'Chaud', tiede: 'Tiède', froid: 'Froid' };
const PROSPECTS_INIT = [
  { id: 'm', nom: 'Mariama D.', besoin: 'Climatiseur 1.5CV', statut: 'chaud' },
  { id: 'i', nom: 'Ibrahima S.', besoin: 'Tecno Spark 20', statut: 'tiede' },
  { id: 'f', nom: 'Fatoumata K.', besoin: 'Riz 50 kg × 10', statut: 'froid' },
  { id: 'a', nom: 'Alpha B.', besoin: 'Réclamation livraison', statut: 'tiede' },
];
// Scenario joue en boucle : chaque etape fait progresser un prospect
const EVOLUTIONS = [
  ['m', 'pret'],
  ['a', 'critique'],
  ['i', 'chaud'],
  ['f', 'tiede'],
];

export function ConsoleLive() {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.5 });
  const [etape, setEtape] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setEtape((e) => (e + 1) % (EVOLUTIONS.length + 2)), etape === 0 ? 900 : 1800);
    return () => clearTimeout(t);
  }, [inView, etape]);

  const prospects = PROSPECTS_INIT.map((p) => {
    let statut = p.statut;
    EVOLUTIONS.slice(0, etape).forEach(([id, s]) => { if (id === p.id) statut = s; });
    return { ...p, statut };
  }).sort((a, b) => RANG[a.statut] - RANG[b.statut]);

  return (
    <motion.div
      ref={ref}
      className="console-card"
      aria-hidden="true"
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={SPRING_SOFT}
    >
      <div className="console-row head">
        <span>Prospect</span><span>Besoin</span><span>Statut</span>
      </div>
      {prospects.map((p) => (
        <motion.div key={p.id} layout className="console-row" transition={SPRING}>
          <span>{p.nom}</span>
          <span>{p.besoin}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={p.statut}
              className={`pill pill-${p.statut}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              {LABEL[p.statut]}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ---------- FAQ en accordeon anime (hauteur auto) ---------- */

export function Faq({ items }) {
  const [ouvert, setOuvert] = useState(null);
  return (
    <Reveal className="faq">
      {items.map((f, i) => {
        const open = ouvert === i;
        return (
          <RevealItem key={f.q} className={`faq-item${open ? ' is-open' : ''}`}>
            <button
              type="button"
              className="faq-q"
              aria-expanded={open}
              aria-controls={`faq-${i}`}
              onClick={() => setOuvert(open ? null : i)}
            >
              {f.q}
              <motion.span className="faq-icon" animate={{ rotate: open ? 45 : 0 }} aria-hidden="true">+</motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id={`faq-${i}`}
                  className="faq-a"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', visualDuration: 0.35, bounce: 0 }}
                >
                  <p>{f.r}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </RevealItem>
        );
      })}
    </Reveal>
  );
}

/* ---------- bande d'appel a l'action : degrade qui suit le curseur ---------- */

export function CtaBand({ children }) {
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const background = useMotionTemplate`radial-gradient(520px circle at ${mx}% ${my}%, color-mix(in srgb, var(--accent-ink) 22%, transparent), transparent 60%), var(--accent)`;
  return (
    <motion.div
      className="cta-band"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 100);
        my.set(((e.clientY - r.top) / r.height) * 100);
      }}
      style={{ background }}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={SPRING_SOFT}
    >
      {children}
    </motion.div>
  );
}
