'use client';
/**
 * Animations de N°1 (Motion, ex-Framer Motion).
 *
 * Principe de la charte : « peu d'effets inutiles ». Les animations sont
 * courtes (≤ 350 ms), servent à orienter le regard (arrivée d'une page, d'une
 * carte, d'une valeur) et sont désactivées automatiquement quand l'utilisateur
 * a demandé à réduire les animations dans son système.
 */
import { MotionConfig, motion } from 'motion/react';

export const EASE = [0.22, 1, 0.36, 1]; // easeOutQuint : départ vif, arrivée douce

export const transition = { duration: 0.35, ease: EASE };

/** Conteneur de page : ses enfants animés apparaissent en cascade. */
export const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, staggerChildren: 0.045, delayChildren: 0.02 } },
};

/** Élément d'une page (carte, statistique, bandeau…). */
export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition },
};

export function MotionProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user" transition={transition}>
      {children}
    </MotionConfig>
  );
}

/** Enveloppe d'une page : rejoue la cascade à chaque changement de `pageKey`. */
export function Page({ pageKey, children }) {
  return (
    <motion.div key={pageKey} variants={pageVariants} initial="hidden" animate="show">
      {children}
    </motion.div>
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

export { motion };
