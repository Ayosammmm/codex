/* eslint-disable react-refresh/only-export-components -- les exports sont des composants créés par themed() */
import { forwardRef } from 'react';
import {
  ArrowDown as LucideArrowDown,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUp as LucideArrowUp,
  ArrowUpDown as LucideArrowUpDown,
  ChevronDown as LucideChevronDown,
  ChevronRight as LucideChevronRight,
  CornerDownRight as LucideCornerDownRight,
  Pencil as LucidePencil,
  Plus as LucidePlus,
  Search as LucideSearch,
  Settings as LucideSettings,
  Trash2 as LucideTrash2,
  X as LucideX,
} from 'lucide-react';
import { useThemeKey } from '@/theme/themeKey';

/*
 * Icônes d'interface selon le thème de l'univers (notes Obsidian « Frontend - Design »).
 * On les importe d'ici à la place de lucide-react : `import { ArrowLeft } from '@/components/ui/icons'`.
 * - médiéval : dessins propres (flèches empennées, plume, croix pattée...)
 * - terminal : glyphes en police monospace (<-, [+], rm...)
 * - crayonné : icônes habituelles, tracé « à main levée » (filtre SVG, voir SketchFilter)
 * - par défaut : lucide-react
 * Les autres icônes restent celles de lucide-react, retouchées par le CSS du thème.
 */

// --- Base SVG commune aux dessins (mêmes dimensions et classes que lucide) ---
const Svg = forwardRef(function Svg({ className, children, size = 24, strokeWidth = 1.75, ...props }, ref) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['lucide', 'themed-icon', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </svg>
  );
});

// --- Médiéval : dessins à la plume ---
/** Flèche empennée orientée vers la droite ; `rotate` l'oriente (180 = gauche, -90 = haut, 90 = bas). */
const quillArrow = (rotate) =>
  function MedievalArrow(props) {
    return (
      <Svg {...props}>
        <g transform={rotate ? `rotate(${rotate} 12 12)` : undefined}>
          <path d="M4 12h14" />
          <path d="M14 7.5c1.6 2.1 3.6 3.6 7 4.5-3.4.9-5.4 2.4-7 4.5" />
          <path d="M3 12l2.5-3M3 12l2.5 3M5.5 12L8 9M5.5 12L8 15" />
        </g>
      </Svg>
    );
  };

const MEDIEVAL = {
  ArrowRight: quillArrow(0),
  ArrowLeft: quillArrow(180),
  ArrowUp: quillArrow(-90),
  ArrowDown: quillArrow(90),
  ChevronRight: (props) => (
    <Svg {...props}>
      <path d="M9 5c3.5 2.4 5.6 4.7 6.5 7-.9 2.3-3 4.6-6.5 7" />
      <path d="M9 5c-1.3.1-1.8 1.2-1.1 2" />
    </Svg>
  ),
  ChevronDown: (props) => (
    <Svg {...props}>
      <path d="M5 9c2.4 3.5 4.7 5.6 7 6.5 2.3-.9 4.6-3 7-6.5" />
      <path d="M5 9c.1-1.3 1.2-1.8 2-1.1" />
    </Svg>
  ),
  // Croix pattée
  Plus: (props) => (
    <Svg {...props}>
      <path d="M12 4.5v15M4.5 12h15" />
      <path d="M10 4.5h4M10 19.5h4M4.5 10v4M19.5 10v4" />
    </Svg>
  ),
  // Plume
  Pencil: (props) => (
    <Svg {...props}>
      <path d="M20 3.5c-7 .8-11.6 5.6-13.4 12.4L5.5 20l3.4-2.1C15 15.8 19 11 20 3.5z" />
      <path d="M7.5 16.5L15 9" />
      <path d="M3.5 21h5" />
    </Svg>
  ),
  // Sautoir à empattements
  X: (props) => (
    <Svg {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
      <path d="M4.5 7.5l3-3M16.5 4.5l3 3M4.5 16.5l3 3M16.5 19.5l3-3" />
    </Svg>
  ),
  // Coffre
  Trash2: (props) => (
    <Svg {...props}>
      <path d="M4 10h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 10c0-3.5 3.6-6 8-6s8 2.5 8 6" />
      <path d="M12 13v3M9 10v10.5M15 10v10.5" />
    </Svg>
  ),
  CornerDownRight: (props) => (
    <Svg {...props}>
      <path d="M5 4c0 6.5 3 9.5 10 10" />
      <path d="M12 10.5c1.2 1.5 2.6 2.7 5 3.5-2.4.8-3.8 2-5 3.5" />
    </Svg>
  ),
};

// --- Terminal : glyphes monospace ---
const glyph = (text) =>
  function TerminalGlyph(props) {
    // Taille adaptée à la longueur pour tenir dans le carré de l'icône
    const fontSize = text.length <= 1 ? 17 : text.length === 2 ? 13 : 10;
    return (
      <Svg {...props} strokeWidth={0}>
        <text
          x="12"
          y="12"
          dominantBaseline="central"
          textAnchor="middle"
          fontFamily="var(--font-mono, ui-monospace, monospace)"
          fontSize={fontSize}
          fontWeight="700"
          fill="currentColor"
        >
          {text}
        </text>
      </Svg>
    );
  };

const TERMINAL = {
  ArrowLeft: glyph('<-'),
  ArrowRight: glyph('->'),
  ArrowUp: glyph('^'),
  ArrowDown: glyph('v'),
  ArrowUpDown: glyph('<>'),
  ChevronRight: glyph('>'),
  ChevronDown: glyph('v'),
  CornerDownRight: glyph('└>'),
  Plus: glyph('+'),
  Pencil: glyph('vi'),
  Trash2: glyph('rm'),
  X: glyph('x'),
  Search: glyph('/'),
  Settings: glyph('cfg'),
};

const SETS = { medieval: MEDIEVAL, terminal: TERMINAL };

/** Icône `name` : version du thème courant si elle existe, sinon celle de lucide-react. */
function themed(name, Fallback) {
  const Icon = forwardRef(function ThemedIcon(props, ref) {
    const Variant = SETS[useThemeKey()]?.[name];
    return Variant ? <Variant ref={ref} {...props} /> : <Fallback ref={ref} {...props} />;
  });
  Icon.displayName = name;
  return Icon;
}

export const ArrowLeft = themed('ArrowLeft', LucideArrowLeft);
export const ArrowRight = themed('ArrowRight', LucideArrowRight);
export const ArrowUp = themed('ArrowUp', LucideArrowUp);
export const ArrowDown = themed('ArrowDown', LucideArrowDown);
export const ArrowUpDown = themed('ArrowUpDown', LucideArrowUpDown);
export const ChevronRight = themed('ChevronRight', LucideChevronRight);
export const ChevronDown = themed('ChevronDown', LucideChevronDown);
export const CornerDownRight = themed('CornerDownRight', LucideCornerDownRight);
export const Plus = themed('Plus', LucidePlus);
export const Pencil = themed('Pencil', LucidePencil);
export const Trash2 = themed('Trash2', LucideTrash2);
export const X = themed('X', LucideX);
export const Search = themed('Search', LucideSearch);
export const Settings = themed('Settings', LucideSettings);

/**
 * Filtre SVG du thème crayonné : léger tremblé des traits, comme dessinés à la main.
 * À rendre une fois dans la page (le CSS du thème l'applique aux icônes).
 */
export function SketchFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <filter id="almanach-sketch" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
