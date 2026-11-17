/* eslint-disable react-refresh/only-export-components -- les exports sont des composants créés par themed() */
import { forwardRef } from 'react';
import {
  Activity as LucideActivity,
  Anchor as LucideAnchor,
  Boxes as LucideBoxes,
  Castle as LucideCastle,
  Crown as LucideCrown,
  Feather as LucideFeather,
  Flag as LucideFlag,
  Flame as LucideFlame,
  Gamepad2 as LucideGamepad2,
  Gem as LucideGem,
  Globe as LucideGlobe,
  Key as LucideKey,
  Package as LucidePackage,
  Puzzle as LucidePuzzle,
  Rocket as LucideRocket,
  Scroll as LucideScroll,
  Shield as LucideShield,
  Ship as LucideShip,
  Skull as LucideSkull,
  Star as LucideStar,
  Sword as LucideSword,
  Swords as LucideSwords,
  Trophy as LucideTrophy,
  WandSparkles as LucideWandSparkles,
  Zap as LucideZap,
  AlignCenter as LucideAlignCenter,
  AlignJustify as LucideAlignJustify,
  AlignLeft as LucideAlignLeft,
  AlignRight as LucideAlignRight,
  ArrowDown as LucideArrowDown,
  ArrowDownAZ as LucideArrowDownAZ,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUp as LucideArrowUp,
  ArrowUpDown as LucideArrowUpDown,
  ArrowUpZA as LucideArrowUpZA,
  Baseline as LucideBaseline,
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
  ChevronsLeft as LucideChevronsLeft,
  ChevronsRight as LucideChevronsRight,
  CircleAlert as LucideCircleAlert,
  CircleCheck as LucideCircleCheck,
  CircleHelp as LucideCircleHelp,
  Clapperboard as LucideClapperboard,
  Code as LucideCode,
  Columns3 as LucideColumns3,
  Compass as LucideCompass,
  Construction as LucideConstruction,
  Coins as LucideCoins,
  Copy as LucideCopy,
  CornerDownRight as LucideCornerDownRight,
  CornerLeftUp as LucideCornerLeftUp,
  Dna as LucideDna,
  Dices as LucideDices,
  Download as LucideDownload,
  Ellipsis as LucideEllipsis,
  ExternalLink as LucideExternalLink,
  Eye as LucideEye,
  EyeOff as LucideEyeOff,
  Filter as LucideFilter,
  GitCommitVertical as LucideGitCommitVertical,
  Heading2 as LucideHeading2,
  Heading3 as LucideHeading3,
  HeartHandshake as LucideHeartHandshake,
  Highlighter as LucideHighlighter,
  Image as LucideImage,
  ImagePlus as LucideImagePlus,
  Italic as LucideItalic,
  KeyRound as LucideKeyRound,
  Layers as LucideLayers,
  LayoutGrid as LucideLayoutGrid,
  Library as LucideLibrary,
  Link as LucideLink,
  List as LucideList,
  ListChecks as LucideListChecks,
  ListOrdered as LucideListOrdered,
  ListTodo as LucideListTodo,
  ListTree as LucideListTree,
  LoaderCircle as LucideLoaderCircle,
  Lock as LucideLock,
  LogIn as LucideLogIn,
  LogOut as LucideLogOut,
  Map as LucideMap,
  MapPin as LucideMapPin,
  Medal as LucideMedal,
  Menu as LucideMenu,
  MessagesSquare as LucideMessagesSquare,
  Minus as LucideMinus,
  Monitor as LucideMonitor,
  Moon as LucideMoon,
  Music as LucideMusic,
  Network as LucideNetwork,
  Pause as LucidePause,
  PawPrint as LucidePawPrint,
  Pencil as LucidePencil,
  PencilLine as LucidePencilLine,
  Play as LucidePlay,
  Plus as LucidePlus,
  PowerOff as LucidePowerOff,
  Quote as LucideQuote,
  Redo2 as LucideRedo2,
  RefreshCw as LucideRefreshCw,
  RemoveFormatting as LucideRemoveFormatting,
  RotateCcw as LucideRotateCcw,
  Rows3 as LucideRows3,
  Ruler as LucideRuler,
  Scale as LucideScale,
  Search as LucideSearch,
  SendHorizontal as LucideSendHorizontal,
  SeparatorHorizontal as LucideSeparatorHorizontal,
  Settings as LucideSettings,
  ShieldX as LucideShieldX,
  Shuffle as LucideShuffle,
  Sparkles as LucideSparkles,
  SquareCode as LucideSquareCode,
  Strikethrough as LucideStrikethrough,
  Subscript as LucideSubscript,
  Sun as LucideSun,
  Superscript as LucideSuperscript,
  Table2 as LucideTable2,
  Tag as LucideTag,
  Tags as LucideTags,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  Underline as LucideUnderline,
  Undo2 as LucideUndo2,
  Unlink as LucideUnlink,
  Upload as LucideUpload,
  UserPlus as LucideUserPlus,
  Users as LucideUsers,
  UsersRound as LucideUsersRound,
  VenusAndMars as LucideVenusAndMars,
  Volume2 as LucideVolume2,
  VolumeX as LucideVolumeX,
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
 * Toutes les icônes de l'app passent par ce fichier (exceptions : `Map` et `Image` sont exportées sous les noms `MapIcon` et `ImageIcon`).
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
export const AlignCenter = themed('AlignCenter', LucideAlignCenter);
export const AlignJustify = themed('AlignJustify', LucideAlignJustify);
export const AlignLeft = themed('AlignLeft', LucideAlignLeft);
export const AlignRight = themed('AlignRight', LucideAlignRight);
export const ArrowDown = themed('ArrowDown', LucideArrowDown);
export const ArrowDownAZ = themed('ArrowDownAZ', LucideArrowDownAZ);
export const ArrowLeft = themed('ArrowLeft', LucideArrowLeft);
export const ArrowRight = themed('ArrowRight', LucideArrowRight);
export const ArrowUp = themed('ArrowUp', LucideArrowUp);
export const ArrowUpDown = themed('ArrowUpDown', LucideArrowUpDown);
export const ArrowUpZA = themed('ArrowUpZA', LucideArrowUpZA);
export const Baseline = themed('Baseline', LucideBaseline);
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
export const ChevronsLeft = themed('ChevronsLeft', LucideChevronsLeft);
export const ChevronsRight = themed('ChevronsRight', LucideChevronsRight);
export const CircleAlert = themed('CircleAlert', LucideCircleAlert);
export const CircleCheck = themed('CircleCheck', LucideCircleCheck);
export const CircleHelp = themed('CircleHelp', LucideCircleHelp);
export const Clapperboard = themed('Clapperboard', LucideClapperboard);
export const Code = themed('Code', LucideCode);
export const Columns3 = themed('Columns3', LucideColumns3);
export const Compass = themed('Compass', LucideCompass);
export const Construction = themed('Construction', LucideConstruction);
export const Coins = themed('Coins', LucideCoins);
export const Copy = themed('Copy', LucideCopy);
export const CornerDownRight = themed('CornerDownRight', LucideCornerDownRight);
export const CornerLeftUp = themed('CornerLeftUp', LucideCornerLeftUp);
export const Dna = themed('Dna', LucideDna);
export const Dices = themed('Dices', LucideDices);
export const Download = themed('Download', LucideDownload);
export const Ellipsis = themed('Ellipsis', LucideEllipsis);
export const ExternalLink = themed('ExternalLink', LucideExternalLink);
export const Eye = themed('Eye', LucideEye);
export const EyeOff = themed('EyeOff', LucideEyeOff);
export const Filter = themed('Filter', LucideFilter);
export const GitCommitVertical = themed('GitCommitVertical', LucideGitCommitVertical);
export const Heading2 = themed('Heading2', LucideHeading2);
export const Heading3 = themed('Heading3', LucideHeading3);
export const HeartHandshake = themed('HeartHandshake', LucideHeartHandshake);
export const Highlighter = themed('Highlighter', LucideHighlighter);
export const ImageIcon = themed('Image', LucideImage);
export const ImagePlus = themed('ImagePlus', LucideImagePlus);
export const Italic = themed('Italic', LucideItalic);
export const KeyRound = themed('KeyRound', LucideKeyRound);
export const Layers = themed('Layers', LucideLayers);
export const LayoutGrid = themed('LayoutGrid', LucideLayoutGrid);
export const Library = themed('Library', LucideLibrary);
export const Link = themed('Link', LucideLink);
export const List = themed('List', LucideList);
export const ListChecks = themed('ListChecks', LucideListChecks);
export const ListOrdered = themed('ListOrdered', LucideListOrdered);
export const ListTodo = themed('ListTodo', LucideListTodo);
export const ListTree = themed('ListTree', LucideListTree);
export const LoaderCircle = themed('LoaderCircle', LucideLoaderCircle);
export const Lock = themed('Lock', LucideLock);
export const LogIn = themed('LogIn', LucideLogIn);
export const LogOut = themed('LogOut', LucideLogOut);
export const MapIcon = themed('Map', LucideMap);
export const MapPin = themed('MapPin', LucideMapPin);
export const Medal = themed('Medal', LucideMedal);
export const Menu = themed('Menu', LucideMenu);
export const MessagesSquare = themed('MessagesSquare', LucideMessagesSquare);
export const Minus = themed('Minus', LucideMinus);
export const Monitor = themed('Monitor', LucideMonitor);
export const Moon = themed('Moon', LucideMoon);
export const Music = themed('Music', LucideMusic);
export const Network = themed('Network', LucideNetwork);
export const Pause = themed('Pause', LucidePause);
export const PawPrint = themed('PawPrint', LucidePawPrint);
export const Pencil = themed('Pencil', LucidePencil);
export const PencilLine = themed('PencilLine', LucidePencilLine);
export const Play = themed('Play', LucidePlay);
export const Plus = themed('Plus', LucidePlus);
export const PowerOff = themed('PowerOff', LucidePowerOff);
export const Quote = themed('Quote', LucideQuote);
export const Redo2 = themed('Redo2', LucideRedo2);
export const RefreshCw = themed('RefreshCw', LucideRefreshCw);
export const RemoveFormatting = themed('RemoveFormatting', LucideRemoveFormatting);
export const RotateCcw = themed('RotateCcw', LucideRotateCcw);
export const Rows3 = themed('Rows3', LucideRows3);
export const Ruler = themed('Ruler', LucideRuler);
export const Scale = themed('Scale', LucideScale);
export const Search = themed('Search', LucideSearch);
export const SendHorizontal = themed('SendHorizontal', LucideSendHorizontal);
export const SeparatorHorizontal = themed('SeparatorHorizontal', LucideSeparatorHorizontal);
export const Settings = themed('Settings', LucideSettings);
export const ShieldX = themed('ShieldX', LucideShieldX);
export const Shuffle = themed('Shuffle', LucideShuffle);
export const Sparkles = themed('Sparkles', LucideSparkles);
export const SquareCode = themed('SquareCode', LucideSquareCode);
export const Strikethrough = themed('Strikethrough', LucideStrikethrough);
export const Subscript = themed('Subscript', LucideSubscript);
export const Sun = themed('Sun', LucideSun);
export const Superscript = themed('Superscript', LucideSuperscript);
export const Table2 = themed('Table2', LucideTable2);
export const Tag = themed('Tag', LucideTag);
export const Tags = themed('Tags', LucideTags);
export const Trash2 = themed('Trash2', LucideTrash2);
export const TrendingUp = themed('TrendingUp', LucideTrendingUp);
export const Underline = themed('Underline', LucideUnderline);
export const Undo2 = themed('Undo2', LucideUndo2);
export const Unlink = themed('Unlink', LucideUnlink);
export const Upload = themed('Upload', LucideUpload);
export const UserPlus = themed('UserPlus', LucideUserPlus);
export const Users = themed('Users', LucideUsers);
export const UsersRound = themed('UsersRound', LucideUsersRound);
export const VenusAndMars = themed('VenusAndMars', LucideVenusAndMars);
export const Volume2 = themed('Volume2', LucideVolume2);
export const VolumeX = themed('VolumeX', LucideVolumeX);
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

// Icônes proposées aux mods (voir src/mods/modIcons.js)
export const Anchor = themed('Anchor', LucideAnchor);
export const Boxes = themed('Boxes', LucideBoxes);
export const Castle = themed('Castle', LucideCastle);
export const Crown = themed('Crown', LucideCrown);
export const Feather = themed('Feather', LucideFeather);
export const Flag = themed('Flag', LucideFlag);
export const Flame = themed('Flame', LucideFlame);
export const Gamepad2 = themed('Gamepad2', LucideGamepad2);
export const Gem = themed('Gem', LucideGem);
export const Globe = themed('Globe', LucideGlobe);
export const Key = themed('Key', LucideKey);
export const Package = themed('Package', LucidePackage);
export const Puzzle = themed('Puzzle', LucidePuzzle);
export const Rocket = themed('Rocket', LucideRocket);
export const Scroll = themed('Scroll', LucideScroll);
export const Shield = themed('Shield', LucideShield);
export const Ship = themed('Ship', LucideShip);
export const Skull = themed('Skull', LucideSkull);
export const Star = themed('Star', LucideStar);
export const Sword = themed('Sword', LucideSword);
export const Swords = themed('Swords', LucideSwords);
export const Trophy = themed('Trophy', LucideTrophy);
export const WandSparkles = themed('WandSparkles', LucideWandSparkles);
export const Zap = themed('Zap', LucideZap);
