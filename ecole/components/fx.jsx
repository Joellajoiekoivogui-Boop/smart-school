'use client';
/**
 * Effets visuels de N°1 : confettis, onde au clic, barre de défilement,
 * inclinaison 3D, étincelles, écran de chargement, texte tapé en direct.
 * Tous se désactivent quand l'utilisateur demande à réduire les animations.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';

const CONFETTI_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#4F46E5', '#38BDF8', '#F472B6'];

/** Pluie de confettis (rejouée à chaque nouvelle `burstKey`). */
export function Confetti({ burstKey, count = 70 }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.random() * Math.PI) - Math.PI; // vers le haut
        const speed = 260 + Math.random() * 420;
        return {
          id: `${burstKey}-${i}`,
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
          rotate: Math.random() * 720 - 360,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 6 + Math.random() * 7,
          round: Math.random() > 0.6,
          delay: Math.random() * 0.12,
        };
      }),
    [burstKey, count],
  );
  if (reduced) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      <div className="absolute left-1/2 top-[62%]">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute block"
            style={{ width: p.size, height: p.round ? p.size : p.size * 0.45, background: p.color, borderRadius: p.round ? '50%' : 2 }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: [0, p.x * 0.6, p.x], y: [0, p.y, p.y + 520], opacity: [1, 1, 0], rotate: p.rotate, scale: 1 }}
            transition={{ duration: 1.9, delay: p.delay, ease: ['easeOut', 'easeIn'], times: [0, 0.35, 1] }}
          />
        ))}
      </div>
    </div>
  );
}

/** Onde qui se propage sous le doigt / la souris sur les éléments cliquables. */
export function RippleLayer() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const onDown = (e) => {
      const el = e.target.closest?.('.btn, .priority, .choice, .assistant-mode, .pay-method, .chat-contact, .tab, .pill-select button, .demo-ripple');
      if (!el || el.disabled) return;
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.style.overflow = 'hidden';
      el.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
  return null;
}

/** Fine barre en haut de l'écran qui suit le défilement de la page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-sky-400 via-brand to-indigo-500"
      style={{ scaleX }}
    />
  );
}

/**
 * Inclinaison 3D + halo qui suit le pointeur. Renvoie les props à poser sur
 * un élément `motion`.
 */
export function useTilt(max = 8) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 220, damping: 18 });
  if (reduced) return {};
  return {
    style: { rotateX: rx, rotateY: ry, transformPerspective: 800 },
    onPointerMove: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      mx.set(x);
      my.set(y);
      e.currentTarget.style.setProperty('--mx', `${x * 100}%`);
      e.currentTarget.style.setProperty('--my', `${y * 100}%`);
    },
    onPointerLeave: () => {
      mx.set(0.5);
      my.set(0.5);
    },
  };
}

/** Halo lumineux qui suit la souris (sans inclinaison) : pour les grandes cartes. */
export function spotlightHandlers() {
  return {
    onPointerMove: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
      e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
  };
}

/** Petites étincelles qui montent doucement (bandeaux d'accueil). */
export function Sparkles({ count = 14 }) {
  const reduced = useReducedMotion();
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 3,
        duration: 5 + Math.random() * 6,
        delay: Math.random() * 6,
      })),
    [count],
  );
  if (reduced) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute bottom-0 rounded-full bg-white"
          style={{ left: d.left, width: d.size, height: d.size, boxShadow: '0 0 8px rgba(255,255,255,0.9)' }}
          animate={{ y: [0, -180], opacity: [0, 0.9, 0] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </span>
  );
}

/** Écran de chargement : logo qui apparaît avec un ressort et un halo pulsé. */
export function Splash() {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#0f172a_70%)]">
      <div className="relative grid place-items-center">
        <motion.span
          className="absolute h-40 w-40 rounded-full bg-brand/40 blur-2xl"
          animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-sky-400 via-brand to-indigo-600 font-display text-3xl font-extrabold text-white shadow-glow"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        >
          N°1
        </motion.div>
        <div className="mt-6 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-white/80"
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Texte qui s'écrit progressivement (réponses de l'assistant). */
export function Typewriter({ text, speed = 12, onDone }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? text.length : 0);
  const done = useRef(false);
  useEffect(() => {
    if (reduced) return undefined;
    const step = Math.max(1, Math.round(text.length / 120)); // ~2 s max
    const id = setInterval(() => {
      setN((v) => {
        const next = Math.min(text.length, v + step);
        if (next >= text.length) {
          clearInterval(id);
          if (!done.current) {
            done.current = true;
            onDone?.();
          }
        }
        return next;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-brand" />}
    </span>
  );
}
