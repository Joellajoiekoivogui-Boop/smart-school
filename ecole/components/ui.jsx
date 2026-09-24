'use client';
import { useId, useState } from 'react';
import { motion } from 'motion/react';
import Icon from './Icon';
import { AnimatedValue, EASE, SPRING, itemVariants, listItemVariants, listVariants } from './motion';
import { formatDate, formatNote } from '@/lib/compute';

export function PageHead({ title, subtitle, children }) {
  return (
    <motion.div className="page-head" variants={itemVariants}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </motion.div>
  );
}

export function Card({ title, action, children, className = '', flush = false }) {
  return (
    <motion.section
      className={`card ${flush ? 'flush' : ''} ${className}`}
      variants={itemVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.08 }}
    >
      {(title || action) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function Stat({ label, value, unit, sub, icon, tone = 'blue', children }) {
  return (
    <motion.div className={`card stat stat-${tone}`} variants={itemVariants} whileHover="hover">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && (
          <motion.span className={`stat-icon tone-${tone}`} variants={{ hover: { rotate: -12, scale: 1.15, transition: SPRING } }}>
            <Icon name={icon} size={18} />
          </motion.span>
        )}
      </div>
      <div className={`stat-value num ${String(value).length > 9 ? 'long' : ''}`}>
        <AnimatedValue value={value} />
        {unit && <small> {unit}</small>}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
      {children}
    </motion.div>
  );
}

export function Badge({ tone = 'gray', children, icon }) {
  return (
    <span className={`badge badge-${tone}`}>
      {icon && <Icon name={icon} size={12} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

export function Avatar({ name, size, dark }) {
  const initials = (name || '?')
    .replace(/^(M\.|Mme)\s+/, '')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return <span className={`avatar ${size === 'lg' ? 'avatar-lg' : ''} ${dark ? 'avatar-dark' : ''}`}>{initials}</span>;
}

export function Empty({ children = 'Rien à afficher pour le moment.' }) {
  return <div className="empty">{children}</div>;
}

export function Bar({ value, max = 100, tone }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar ${tone || ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.2 }} />
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  const id = useId();
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          className={`tab ${value === t.value ? 'active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {value === t.value && (
            <motion.span
              className="tab-indicator"
              layoutId={`tab-${id}`}
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <motion.div
      className="modal-back"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 40, scale: 0.9, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{ transformPerspective: 900 }}
      >
        <div className="modal-head no-print">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fermer">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot no-print">{footer}</div>}
      </motion.div>
    </motion.div>
  );
}

export function Field({ label, children, full }) {
  return (
    <label className={`field ${full ? 'full' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

/** Couleur d'une note : statut réservé, toujours accompagné du chiffre. */
export function gradeTone(n) {
  if (n == null) return 'gray';
  if (n >= 14) return 'green';
  if (n >= 10) return 'blue';
  if (n >= 8) return 'orange';
  return 'red';
}

export function Grade({ value }) {
  return <Badge tone={gradeTone(value)}>{formatNote(value)}/20</Badge>;
}

/** Anneau de pourcentage (indicateur unique : pas de légende nécessaire). */
export function Ring({ value, size = 88, stroke = 9, color = 'var(--blue)', label }) {
  const r = (size - stroke) / 2;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pct / 100 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        />
      </svg>
      <div className="ring-label" style={{ fontSize: size / 5 }}>
        {label ?? `${Math.round(pct)} %`}
      </div>
    </div>
  );
}

/**
 * Courbe (une seule série) sur une échelle /20 : ligne 2px, points ≥ 8px,
 * grille discrète, infobulle au survol et étiquette directe sur le dernier point.
 */
export function LineChart({ points, height = 200, min = 0, max = 20, format = formatNote, suffix = '/20', ariaLabel }) {
  const [hover, setHover] = useState(null);
  const width = 640;
  const pad = { t: 16, r: 44, b: 28, l: 32 };
  if (!points?.length) return <Empty>Pas encore assez de données.</Empty>;
  const values = points.map((p) => p.value);
  const lo = Math.max(min, Math.floor(Math.min(...values) - 2));
  const hi = Math.min(max, Math.ceil(Math.max(...values) + 2));
  const x = (i) => pad.l + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (height - pad.t - pad.b);
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1)},${height - pad.b} L${x(0)},${height - pad.b} Z`;
  const last = points[points.length - 1];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel || `Évolution : ${points.map((p) => `${formatDate(p.date)} ${format(p.value)}`).join(', ')}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="#E2E8F0" strokeDasharray="3 4" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748B">
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i === 0 || i === points.length - 1 || points.length <= 6 ? (
            <text key={p.date} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="#64748B">
              {formatDate(p.date)}
            </text>
          ) : null,
        )}
        <motion.path
          d={area}
          fill="url(#lc-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        />
        <motion.path
          d={d}
          fill="none"
          stroke="#2563EB"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        />
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="#94A3B8" strokeWidth="1" />
        )}
        {points.map((p, i) => (
          <motion.circle
            key={p.date}
            cx={x(i)}
            cy={y(p.value)}
            r={hover === i ? 6 : 4}
            fill="#fff"
            stroke="#2563EB"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.1 + (i / Math.max(1, points.length - 1)) * 0.8 }}
          />
        ))}
        <motion.text
          x={x(points.length - 1) + 10}
          y={y(last.value) + 4}
          fontSize="12"
          fontWeight="700"
          fill="#0F172A"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {format(last.value)}
        </motion.text>
      </svg>
      {hover != null && (
        <div
          className="chart-tip"
          style={{ left: `${(x(hover) / width) * 100}%`, top: `${(y(points[hover].value) / height) * 100}%` }}
        >
          <strong>
            {format(points[hover].value)}
            {suffix}
          </strong>{' '}
          · {formatDate(points[hover].date, { day: 'numeric', month: 'long' })}
        </div>
      )}
    </div>
  );
}

/**
 * Barres horizontales (magnitude, une seule teinte). Un repère foncé optionnel
 * indique la moyenne de la classe.
 */
export function HBars({ rows, max = 20, format = formatNote, markLabel = 'Moyenne de la classe' }) {
  const hasMarks = rows.some((r) => r.mark != null);
  return (
    <div>
      <div className="hbars">
        {rows.map((r, i) => (
          <div
            className="hbar"
            key={r.label}
            title={`${r.label} : ${format(r.value)}${r.mark != null ? ` — ${markLabel.toLowerCase()} : ${format(r.mark)}` : ''}`}
          >
            <span className="ellipsis">{r.label}</span>
            <div className="hbar-track">
              <motion.div
                className="hbar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${((r.value ?? 0) / max) * 100}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 16, delay: 0.1 + i * 0.06 }}
              />
              {r.mark != null && <div className="hbar-mark" style={{ left: `${(r.mark / max) * 100}%` }} />}
            </div>
            <span className="num strong" style={{ textAlign: 'right' }}>
              {format(r.value)}
            </span>
          </div>
        ))}
      </div>
      {hasMarks && (
        <div className="row tiny muted mt" style={{ gap: 16 }}>
          <span className="row" style={{ gap: 6 }}>
            <span className="dot" style={{ background: 'var(--blue)' }} /> Élève
          </span>
          <span className="row" style={{ gap: 6 }}>
            <span style={{ width: 2, height: 12, background: 'var(--navy)', display: 'inline-block' }} /> {markLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export function Select({ value, onChange, options, className = 'select', ...rest }) {
  return (
    <select className={className} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Bandeau d'accueil animé : dégradé qui ondule, halos lumineux qui flottent
 * et motif discret en arrière-plan.
 */
export function Hero({ children, className = '' }) {
  return (
    <motion.div
      className={`hero relative isolate overflow-hidden bg-[linear-gradient(120deg,#0f172a_0%,#1e3a8a_45%,#2563eb_75%,#4f46e5_100%)] bg-[length:220%_220%] animate-gradient ${className}`}
      variants={itemVariants}
    >
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 -z-10 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl animate-float" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/35 blur-3xl animate-float-slow" />
      <span aria-hidden className="pointer-events-none absolute top-6 left-6 -z-10 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl animate-float" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
      />
      {children}
    </motion.div>
  );
}

/** Main qui salue 👋 (petite animation de bienvenue). */
export function Wave() {
  return (
    <motion.span
      className="inline-block origin-[70%_70%]"
      animate={{ rotate: [0, 18, -8, 18, -4, 10, 0] }}
      transition={{ duration: 1.8, delay: 0.6, repeat: Infinity, repeatDelay: 4 }}
      aria-hidden
    >
      👋
    </motion.span>
  );
}

/** Conteneur dont les enfants <StaggerItem> apparaissent en cascade. */
export function Stagger({ as = 'div', className, children }) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={listVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
      {children}
    </Tag>
  );
}

export function StaggerItem({ as = 'div', className, children, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={listItemVariants} {...rest}>
      {children}
    </Tag>
  );
}
