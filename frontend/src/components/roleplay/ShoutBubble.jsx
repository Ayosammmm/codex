import { useLayoutEffect, useRef, useState } from 'react';
import styles from './Roleplay.module.scss';

/*
 * Bulle de cri façon BD / manga (2 « ! » et plus) : un contour SVG calculé en pixels à partir de la taille
 * réelle de la bulle. La base est un rectangle aux coins arrondis qui épouse le texte ; chaque pique part de
 * ce contour et pointe vers l'extérieur, perpendiculairement au bord (y compris dans les coins arrondis),
 * si bien qu'elles restent toujours attachées à la bulle.
 */

// Par niveau : écart entre deux piques (px le long du contour), longueur des piques, alternance longue / courte
const LEVELS = {
  2: { spacing: 24, length: 11, short: 1 },
  3: { spacing: 20, length: 20, short: 0.5 },
};

/** Point du contour d'un rectangle arrondi (w × h, rayon r) à l'abscisse curviligne s, avec sa normale. */
function pointOnRoundedRect(w, h, r, s) {
  const straightX = w - 2 * r;
  const straightY = h - 2 * r;
  const arc = (Math.PI / 2) * r;
  // Point d'un coin arrondi (centre cx, cy) à l'angle donné : la normale est le rayon
  const corner = (cx, cy, angle) => {
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    return { x: cx + r * nx, y: cy + r * ny, nx, ny };
  };
  const segments = [
    // [longueur, fonction (t de 0 à 1) → { x, y, nx, ny }]
    [straightX, (t) => ({ x: r + t * straightX, y: 0, nx: 0, ny: -1 })],
    [arc, (t) => corner(w - r, r, -Math.PI / 2 + t * (Math.PI / 2))],
    [straightY, (t) => ({ x: w, y: r + t * straightY, nx: 1, ny: 0 })],
    [arc, (t) => corner(w - r, h - r, t * (Math.PI / 2))],
    [straightX, (t) => ({ x: w - r - t * straightX, y: h, nx: 0, ny: 1 })],
    [arc, (t) => corner(r, h - r, Math.PI / 2 + t * (Math.PI / 2))],
    [straightY, (t) => ({ x: 0, y: h - r - t * straightY, nx: -1, ny: 0 })],
    [arc, (t) => corner(r, r, Math.PI + t * (Math.PI / 2))],
  ];
  for (let k = 0; k < segments.length; k++) {
    const [length, at] = segments[k];
    if (s <= length || k === segments.length - 1) return at(length ? Math.min(1, s / length) : 0);
    s -= length;
  }
  return segments[0][1](0);
}

/** Contour hérissé (chemin SVG), décalé de `margin` pour laisser la place aux piques. */
function burstPath(w, h, level, margin) {
  const { spacing, length, short } = LEVELS[level];
  const r = Math.min(h / 2, w / 2, 18);
  const perimeter = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
  const count = Math.max(8, Math.round(perimeter / spacing));
  const step = perimeter / count;
  const point = (s) => pointOnRoundedRect(w, h, r, ((s % perimeter) + perimeter) % perimeter);
  const fmt = (n) => Math.round((n + margin) * 10) / 10;

  const parts = [];
  for (let i = 0; i < count; i++) {
    const base = point(i * step);
    const tip = point((i + 0.5) * step);
    const reach = length * (i % 2 ? short : 1);
    parts.push(`${i ? 'L' : 'M'}${fmt(base.x)} ${fmt(base.y)}`);
    parts.push(`L${fmt(tip.x + tip.nx * reach)} ${fmt(tip.y + tip.ny * reach)}`);
  }
  return `${parts.join(' ')} Z`;
}

/**
 * Bulle (dialogue, pensée, chuchotement) entourée d'un éclat à piques. `className` : styles de la bulle
 * et du niveau ; le contour suit la taille de la bulle (redimensionnement compris).
 */
export function ShoutBubble({ level, className, children }) {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  const margin = LEVELS[level].length + 4; // place des piques + épaisseur du trait

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setSize((prev) => {
      const next = { w: el.offsetWidth, h: el.offsetHeight };
      return prev && prev.w === next.w && prev.h === next.h ? prev : next;
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <p ref={ref} className={className} style={{ '--burst-margin': `${margin}px` }}>
      {size && (
        <svg
          className={styles.burstSvg}
          aria-hidden
          width={size.w + 2 * margin}
          height={size.h + 2 * margin}
          style={{ left: -margin, top: -margin }}
        >
          <path className={styles.burstPath} d={burstPath(size.w, size.h, level, margin)} />
        </svg>
      )}
      {children}
    </p>
  );
}
