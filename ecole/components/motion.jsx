'use client';
/**
 * Animations de N°1 (Motion, ex-Framer Motion).
 *
 * Interface vivante : transitions de page avec flou, cascades à ressort,
 * compteurs qui défilent, cartes qui se révèlent au défilement et réagissent
 * au survol. Tout est automatiquement adouci quand l'utilisateur a demandé à
 * réduire les animations dans son système.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, animate, motion, useInView, useReducedMotion } from 'motion/react';

export const EASE = [0.22, 1, 0.36, 1]; // easeOutQuint : départ vif, arrivée douce
export const SPRING = { type: 'spring', stiffness: 260, damping: 24, mass: 0.9 };
export const SPRING_SOFT = { type: 'spring', stiffness: 170, damping: 22 };

export const transition = { duration: 0.35, ease: EASE };

/** Conteneur de page : entrée avec léger flou, cascade des enfants, sortie rapide. */
export const pageVariants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease: EASE, staggerChildren: 0.06, delayChildren: 0.04 },
    // Un filtre ou une transformation résiduels feraient de la page le repère
    // des éléments « fixed » (fenêtres modales) : on les retire en fin d'animation.
    transitionEnd: { filter: 'none', transform: 'none' },
  },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.18, ease: 'easeIn' } },
};

/** Élément d'une page (carte, statistique, bandeau…). */
export const itemVariants = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  hover: { y: -4, transition: SPRING_SOFT },
};

/** Liste en cascade (priorités, badges…). */
export const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
export const listItemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

export function MotionProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user" transition={transition}>
      {children}
    </MotionConfig>
  );
}

/** Enveloppe d'une page : rejoue la transition à chaque changement de `pageKey`. */
export function Page({ pageKey, children }) {
  return (
    <AnimatePresence mode="wait" initial>
      <motion.div key={pageKey} variants={pageVariants} initial="hidden" animate="show" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Bloc animé réutilisable (hérite de la cascade de la page). */
export function Reveal({ as = 'div', className, children, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={itemVariants} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Anime le premier nombre d'un texte (« 15,0 », « 89 % », « 47 500 000 GNF »,
 * « 4/4 »…) de 0 jusqu'à sa valeur, en conservant le format français.
 */
export function AnimatedValue({ value, duration = 1.1 }) {
  const text = String(value ?? '');
  const match = text.match(/\d(?:[\d\s]*\d)?(?:,\d+)?/);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(match && !reduced ? text.replace(match[0], '0') : text);

  useEffect(() => {
    if (!match || reduced) {
      setDisplay(text);
      return undefined;
    }
    if (!inView) return undefined;
    const raw = match[0];
    const decimals = raw.includes(',') ? raw.split(',')[1].length : 0;
    const target = Number(raw.replace(/\s/g, '').replace(',', '.'));
    const grouped = /\s/.test(raw);
    const controls = animate(0, target, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        const n = v.toLocaleString('fr-FR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          useGrouping: grouped,
        });
        setDisplay(text.replace(raw, n));
      },
    });
    return () => controls.stop();
  }, [text, inView, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref}>{display}</span>;
}

export { motion, AnimatePresence };
