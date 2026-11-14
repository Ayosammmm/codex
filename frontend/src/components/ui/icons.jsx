/* eslint-disable react-refresh/only-export-components -- les exports sont des composants créés par themed() */
import { forwardRef } from 'react';
import {
  Activity as LucideActivity,
  ArrowDown as LucideArrowDown,
  ArrowDownAZ as LucideArrowDownAZ,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUp as LucideArrowUp,
  ArrowUpDown as LucideArrowUpDown,
  ArrowUpZA as LucideArrowUpZA,
  Bold as LucideBold,
  BookOpen as LucideBookOpen,
  Brain as LucideBrain,
  Building2 as LucideBuilding2,
  CalendarClock as LucideCalendarClock,
  CalendarRange as LucideCalendarRange,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  CircleAlert as LucideCircleAlert,
  CircleCheck as LucideCircleCheck,
  Clapperboard as LucideClapperboard,
  Columns3 as LucideColumns3,
  Compass as LucideCompass,
  Construction as LucideConstruction,
  Copy as LucideCopy,
  CornerDownRight as LucideCornerDownRight,
  CornerLeftUp as LucideCornerLeftUp,
  Dna as LucideDna,
  Download as LucideDownload,
  Ellipsis as LucideEllipsis,
  ExternalLink as LucideExternalLink,
  Filter as LucideFilter,
  GitCommitVertical as LucideGitCommitVertical,
  Heading2 as LucideHeading2,
  Heading3 as LucideHeading3,
  HeartHandshake as LucideHeartHandshake,
  ImagePlus as LucideImagePlus,
  Italic as LucideItalic,
  KeyRound as LucideKeyRound,
  Layers as LucideLayers,
  LayoutGrid as LucideLayoutGrid,
  Library as LucideLibrary,
  List as LucideList,
  ListChecks as LucideListChecks,
  ListOrdered as LucideListOrdered,
  ListTree as LucideListTree,
  LoaderCircle as LucideLoaderCircle,
  Lock as LucideLock,
  LogIn as LucideLogIn,
  LogOut as LucideLogOut,
  Map as LucideMap,
  MapPin as LucideMapPin,
  Medal as LucideMedal,
  Menu as LucideMenu,
  Minus as LucideMinus,
  Monitor as LucideMonitor,
  Moon as LucideMoon,
  Network as LucideNetwork,
  PawPrint as LucidePawPrint,
  Pencil as LucidePencil,
  PencilLine as LucidePencilLine,
  Plus as LucidePlus,
  PowerOff as LucidePowerOff,
  Quote as LucideQuote,
  Redo2 as LucideRedo2,
  RefreshCw as LucideRefreshCw,
  RotateCcw as LucideRotateCcw,
  Rows3 as LucideRows3,
  Ruler as LucideRuler,
  Scale as LucideScale,
  Search as LucideSearch,
  Settings as LucideSettings,
  ShieldX as LucideShieldX,
  Shuffle as LucideShuffle,
  Sun as LucideSun,
  Table2 as LucideTable2,
  Tag as LucideTag,
  Tags as LucideTags,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  Undo2 as LucideUndo2,
  Upload as LucideUpload,
  UserPlus as LucideUserPlus,
  Users as LucideUsers,
  UsersRound as LucideUsersRound,
  VenusAndMars as LucideVenusAndMars,
  X as LucideX,
} from 'lucide-react';
import { MEDIEVAL_ICONS } from './medievalIcons';
import { PIXEL_ICONS } from './pixelIcons';
import { useThemeKey } from '@/theme/themeKey';

/*
 * Icônes d'interface selon le thème de l'univers (notes Obsidian « Frontend - Design »).
 * On les importe d'ici à la place de lucide-react : `import { ArrowLeft } from '@/components/ui/icons'`.
 * - médiéval : dessins à la plume (flèches empennées, plume, sablier, tour...), voir medievalIcons.js
 * - terminal : pixel art (grilles de pixels nets, voir pixel())
 * - crayonné : icônes habituelles, tracé « à main levée » (filtre SVG, voir SketchFilter)
 * - par défaut : lucide-react
 * Toutes les icônes de l'app passent par ce fichier (exception : `Map` est exportée sous le nom `MapIcon`).
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

// --- Médiéval : dessins à la plume (tracés dans medievalIcons.js) ---
const medieval = ({ paths, rotate, flip, transform, strokeWidth }) => {
  const groupTransform = [transform, rotate && `rotate(${rotate} 12 12)`, flip && 'matrix(-1 0 0 1 24 0)']
    .filter(Boolean)
    .join(' ');
  return function MedievalIcon(props) {
    return (
      <Svg {...(strokeWidth && { strokeWidth })} {...props}>
        <g transform={groupTransform || undefined}>
          {paths.map((p, i) =>
            typeof p === 'string' ? (
              <path key={i} d={p} />
            ) : (
              <path
                key={i}
                d={p.d}
                transform={p.transform}
                // Les tracés mis à l'échelle gardent l'épaisseur du trait
                vectorEffect={p.transform ? 'non-scaling-stroke' : undefined}
                fill={p.fill ? 'currentColor' : undefined}
                stroke={p.fill ? 'none' : undefined}
                strokeDasharray={p.dash}
              />
            ),
          )}
        </g>
      </Svg>
    );
  };
};

const MEDIEVAL = Object.fromEntries(Object.entries(MEDIEVAL_ICONS).map(([name, icon]) => [name, medieval(icon)]));

// --- Terminal : pixel art ---
/*
 * Les grilles sont dans pixelIcons.js (`#` = pixel allumé, 8×8 au plus).
 * Un pixel mesure 3 unités, soit exactement 2 px à la taille habituelle (16 px) :
 * le dessin reste net. La grille est centrée dans le carré 24×24 ; un décalage
 * d'un demi-pixel (1 px à 16 px) garde aussi les grilles impaires nettes.
 */
const PX = 3;
const pixelPath = (rows) => {
  const dx = (24 - PX * rows[0].length) / 2;
  const dy = (24 - PX * rows.length) / 2;
  let d = '';
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '#') d += `M${dx + PX * x} ${dy + PX * y}h${PX}v${PX}h-${PX}z`;
    }),
  );
  return d;
};

/** Icône pixel art ; `rotate` l'oriente (180 = gauche, -90 = haut, 90 = bas). */
const pixel = (rows, rotate) => {
  const d = pixelPath(rows);
  return function TerminalIcon(props) {
    return (
      <Svg {...props} stroke="none" fill="currentColor" shapeRendering="crispEdges">
        <path d={d} transform={rotate ? `rotate(${rotate} 12 12)` : undefined} />
      </Svg>
    );
  };
};

const TERMINAL = Object.fromEntries(
  Object.entries(PIXEL_ICONS).map(([name, { rows, rotate, flip }]) => [
    name,
    pixel(flip ? rows.map((row) => [...row].reverse().join('')) : rows, rotate),
  ]),
);

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

export const Activity = themed('Activity', LucideActivity);
export const ArrowDown = themed('ArrowDown', LucideArrowDown);
export const ArrowDownAZ = themed('ArrowDownAZ', LucideArrowDownAZ);
export const ArrowLeft = themed('ArrowLeft', LucideArrowLeft);
export const ArrowRight = themed('ArrowRight', LucideArrowRight);
export const ArrowUp = themed('ArrowUp', LucideArrowUp);
export const ArrowUpDown = themed('ArrowUpDown', LucideArrowUpDown);
export const ArrowUpZA = themed('ArrowUpZA', LucideArrowUpZA);
export const Bold = themed('Bold', LucideBold);
export const BookOpen = themed('BookOpen', LucideBookOpen);
export const Brain = themed('Brain', LucideBrain);
export const Building2 = themed('Building2', LucideBuilding2);
export const CalendarClock = themed('CalendarClock', LucideCalendarClock);
export const CalendarRange = themed('CalendarRange', LucideCalendarRange);
export const Check = themed('Check', LucideCheck);
export const ChevronDown = themed('ChevronDown', LucideChevronDown);
export const ChevronLeft = themed('ChevronLeft', LucideChevronLeft);
export const ChevronRight = themed('ChevronRight', LucideChevronRight);
export const CircleAlert = themed('CircleAlert', LucideCircleAlert);
export const CircleCheck = themed('CircleCheck', LucideCircleCheck);
export const Clapperboard = themed('Clapperboard', LucideClapperboard);
export const Columns3 = themed('Columns3', LucideColumns3);
export const Compass = themed('Compass', LucideCompass);
export const Construction = themed('Construction', LucideConstruction);
export const Copy = themed('Copy', LucideCopy);
export const CornerDownRight = themed('CornerDownRight', LucideCornerDownRight);
export const CornerLeftUp = themed('CornerLeftUp', LucideCornerLeftUp);
export const Dna = themed('Dna', LucideDna);
export const Download = themed('Download', LucideDownload);
export const Ellipsis = themed('Ellipsis', LucideEllipsis);
export const ExternalLink = themed('ExternalLink', LucideExternalLink);
export const Filter = themed('Filter', LucideFilter);
export const GitCommitVertical = themed('GitCommitVertical', LucideGitCommitVertical);
export const Heading2 = themed('Heading2', LucideHeading2);
export const Heading3 = themed('Heading3', LucideHeading3);
export const HeartHandshake = themed('HeartHandshake', LucideHeartHandshake);
export const ImagePlus = themed('ImagePlus', LucideImagePlus);
export const Italic = themed('Italic', LucideItalic);
export const KeyRound = themed('KeyRound', LucideKeyRound);
export const Layers = themed('Layers', LucideLayers);
export const LayoutGrid = themed('LayoutGrid', LucideLayoutGrid);
export const Library = themed('Library', LucideLibrary);
export const List = themed('List', LucideList);
export const ListChecks = themed('ListChecks', LucideListChecks);
export const ListOrdered = themed('ListOrdered', LucideListOrdered);
export const ListTree = themed('ListTree', LucideListTree);
export const LoaderCircle = themed('LoaderCircle', LucideLoaderCircle);
export const Lock = themed('Lock', LucideLock);
export const LogIn = themed('LogIn', LucideLogIn);
export const LogOut = themed('LogOut', LucideLogOut);
export const MapIcon = themed('Map', LucideMap);
export const MapPin = themed('MapPin', LucideMapPin);
export const Medal = themed('Medal', LucideMedal);
export const Menu = themed('Menu', LucideMenu);
export const Minus = themed('Minus', LucideMinus);
export const Monitor = themed('Monitor', LucideMonitor);
export const Moon = themed('Moon', LucideMoon);
export const Network = themed('Network', LucideNetwork);
export const PawPrint = themed('PawPrint', LucidePawPrint);
export const Pencil = themed('Pencil', LucidePencil);
export const PencilLine = themed('PencilLine', LucidePencilLine);
export const Plus = themed('Plus', LucidePlus);
export const PowerOff = themed('PowerOff', LucidePowerOff);
export const Quote = themed('Quote', LucideQuote);
export const Redo2 = themed('Redo2', LucideRedo2);
export const RefreshCw = themed('RefreshCw', LucideRefreshCw);
export const RotateCcw = themed('RotateCcw', LucideRotateCcw);
export const Rows3 = themed('Rows3', LucideRows3);
export const Ruler = themed('Ruler', LucideRuler);
export const Scale = themed('Scale', LucideScale);
export const Search = themed('Search', LucideSearch);
export const Settings = themed('Settings', LucideSettings);
export const ShieldX = themed('ShieldX', LucideShieldX);
export const Shuffle = themed('Shuffle', LucideShuffle);
export const Sun = themed('Sun', LucideSun);
export const Table2 = themed('Table2', LucideTable2);
export const Tag = themed('Tag', LucideTag);
export const Tags = themed('Tags', LucideTags);
export const Trash2 = themed('Trash2', LucideTrash2);
export const TrendingUp = themed('TrendingUp', LucideTrendingUp);
export const Undo2 = themed('Undo2', LucideUndo2);
export const Upload = themed('Upload', LucideUpload);
export const UserPlus = themed('UserPlus', LucideUserPlus);
export const Users = themed('Users', LucideUsers);
export const UsersRound = themed('UsersRound', LucideUsersRound);
export const VenusAndMars = themed('VenusAndMars', LucideVenusAndMars);
export const X = themed('X', LucideX);

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
