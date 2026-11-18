/*
 * Icônes du thème médiéval (rendues par components/ui/icons.jsx), dessinées « à la plume »
 * dans le carré 24×24 de lucide : pointes de flèche empennées, losanges au lieu des points,
 * empattements, et quelques objets d'époque (sablier, tour, couronne, bannière...).
 *
 * Chaque icône : { paths, rotate?, flip?, transform?, strokeWidth? }
 * Un élément de `paths` est soit un tracé (chaîne `d`), soit un objet
 * { d, fill?, transform?, dash? } (fill = forme pleine, sans contour).
 */

// --- Motifs réutilisables ---

/** Pointe de flèche à la plume, pointe en (0, 0), orientée vers la droite. */
const HEAD = 'M-7-4.5C-5.4-2.4-3.4-.9 0 0C-3.4.9-5.4 2.4-7 4.5';
/** Pointe posée en (x, y), orientée de `angle` degrés, à l'échelle `scale`. */
const head = (x, y, angle = 0, scale = 0.7) => ({
  d: HEAD,
  transform: `translate(${x} ${y}) rotate(${angle}) scale(${scale})`,
});

/** Losange plein de « rayon » r centré en (x, y). */
const lozenge = (x, y, r = 1.2) => ({
  d: `M${x} ${y - r}l${r} ${r}-${r} ${r}-${r}-${r}z`,
  fill: true,
});

/** Flèche empennée complète, orientée vers la droite. */
const QUILL = 'M4 12h14M14 7.5c1.6 2.1 3.6 3.6 7 4.5-3.4.9-5.4 2.4-7 4.5M3 12l2.5-3M3 12l2.5 3M5.5 12L8 9M5.5 12L8 15';
/** Flèche empennée réduite (75 %), centrée en (x, 12) et tournée de `angle`. */
const smallQuill = (x, angle) => ({
  d: QUILL,
  transform: `translate(${x} 12) rotate(${angle}) scale(.75) translate(-12 -12)`,
});

const CHEVRON = ['M9 5c3.5 2.4 5.6 4.7 6.5 7-.9 2.3-3 4.6-6.5 7', 'M9 5c-1.3.1-1.8 1.2-1.1 2'];
// Deux chevrons décalés (tracés recopiés plutôt que transformés, pour garder l'épaisseur du trait)
const CHEVRONS = [-3.5, 3].flatMap((dx) => CHEVRON.map((d) => d.replace(/^M9 /, `M${9 + dx} `)));
const CORNER = ['M5 4c0 6.5 3 9.5 10 10', 'M12 10.5c1.2 1.5 2.6 2.7 5 3.5-2.4.8-3.8 2-5 3.5'];
const QUILL_PEN = ['M20 3.5c-7 .8-11.6 5.6-13.4 12.4L5.5 20l3.4-2.1C15 15.8 19 11 20 3.5z', 'M7.5 16.5L15 9'];
const UNDO = ['M4 9h10.5a5.5 5.5 0 0 1 0 11H10', 'M10 20c-1.4 0-1.9-1.3-1-2', head(3.5, 9, 180)];
const ROWS3 = ['M3.5 4.5h17v15h-17z', 'M3.5 9.5h17M3.5 14.5h17'];

/** Silhouette encapuchonnée (capuche pointue), décalée de dx. */
const hooded = (dx = 0) => [
  `M${9 + dx} 3.5c1.7.6 3 2.1 3.2 3.9.3 2.4-1 4.1-3.2 4.1s-3.5-1.7-3.2-4.1C${6 + dx} 5.6 ${7.3 + dx} 4.1 ${9 + dx} 3.5z`,
  `M${2.5 + dx} 20.5c0-4 2.8-6.5 6.5-6.5s6.5 2.5 6.5 6.5`,
];

/** Roue dentée à dents trapézoïdales. */
const gear = () => {
  const pt = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return `${+(12 + r * Math.cos(a)).toFixed(2)} ${+(12 + r * Math.sin(a)).toFixed(2)}`;
  };
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = k * 45;
    pts.push(pt(7, a - 15), pt(9.5, a - 8), pt(9.5, a + 8), pt(7, a + 15));
  }
  return `M${pts.join('L')}z`;
};

/** Petit écu (blason) dont le coin haut gauche est en (x, y). */
const shield = (x, y) => `M${x} ${y}h6v3c0 2-1.5 3.2-3 3.8-1.5-.6-3-1.8-3-3.8z`;

/** Doigt de patte en goutte pointue, posé en (x, y) et incliné de `angle`. */
const toe = (x, y, angle) => ({
  d: 'M0-3.2c1.3 1.6 1.9 2.7 1.9 3.6a1.9 1.9 0 0 1-3.8 0c0-.9.6-2 1.9-3.6z',
  transform: `translate(${x} ${y}) rotate(${angle})`,
});

/** Trait « à main levée » horizontal de x1 à x2 à la hauteur y (légèrement bombé, comme Menu). */
const line = (x1, x2, y) => `M${x1} ${y}c${(x2 - x1) / 4} -.7 ${((x2 - x1) * 3) / 4} -.7 ${x2 - x1} 0`;

/** Étoile à quatre branches aux côtés incurvés (étincelle), centrée en (x, y). */
const star4 = (x, y, r) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z`;

/** Étoile à cinq branches, rayons extérieur R et intérieur r. */
const star5 = (cx, cy, R, r) => {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = ((k * 36 - 90) * Math.PI) / 180;
    const d = k % 2 ? r : R;
    pts.push(`${+(cx + d * Math.cos(a)).toFixed(2)} ${+(cy + d * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}z`;
};

/** Cor de chasse (volume), pavillon vers la droite. */
const HORN = ['M3 9.5c2.5 0 6-1.5 8.5-5v15c-2.5-3.5-6-5-8.5-5z', 'M3 9.5v5'];

/** Œil en amande, iris et pupille en losange. */
const EYE = [
  'M2.5 12C5 7.5 8.3 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-5.8 6.5-9.5 6.5S5 16.5 2.5 12z',
  'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  lozenge(12, 12, 1.1),
];

/** Maillon de chaîne horizontal de x à x + 9, centré sur y = 12. */
const link = (x) => `M${x + 2.5} 9.5h4a2.5 2.5 0 0 1 0 5h-4a2.5 2.5 0 0 1 0-5z`;

/** Lettre X à empattements (indices et exposants), réduite à gauche. */
const LETTER_X = ['M4 6c2.5 3.5 5 8 7.5 12M11.5 6C9 9.5 6.5 14 4 18', 'M2.5 6h3M10 6h3M2.5 18h3M10 18h3'];
/** Petit « 2 » manuscrit, haut à (x, y). */
const two = (x, y) => `M${x} ${y + 1.6}c0-1 .8-1.6 1.7-1.6s1.7.6 1.7 1.6c0 1.6-3.4 2.6-3.4 5h3.6`;

/** Tableau encadré (image). */
const FRAME = 'M4.5 3.5h15a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z';

/** Épée verticale, pointe en haut. */
const SWORD = ['M12 2.5l1.4 2.2V15h-2.8V4.7z', 'M6.5 15h11', lozenge(6, 15, 1.1), lozenge(18, 15, 1.1), 'M12 15v4.3', lozenge(12, 20.8, 1.3)];

const TAG = ['M3.5 5h9.5l7.5 7-7.5 7H3.5l3-7z', lozenge(14.5, 12, 1.1)];

export const MEDIEVAL_ICONS = {
  // --- Flèches et chevrons ---
  ArrowRight: { paths: [QUILL] },
  ArrowLeft: { paths: [QUILL], rotate: 180 },
  ArrowUp: { paths: [QUILL], rotate: -90 },
  ArrowDown: { paths: [QUILL], rotate: 90 },
  ChevronRight: { paths: CHEVRON },
  ChevronDown: { paths: CHEVRON, rotate: 90 },
  ChevronLeft: { paths: CHEVRON, rotate: 180 },
  ArrowUpDown: { paths: [smallQuill(7, -90), smallQuill(17, 90)] },
  ArrowDownAZ: {
    paths: [smallQuill(7, 90), 'M14 10.5l2.75-7.5 2.75 7.5M15 8h3.5', 'M14 13.5h5.5L14 20.5h5.5'],
  },
  ArrowUpZA: {
    paths: [smallQuill(7, -90), 'M14 3.5h5.5L14 10.5h5.5', 'M14 20.5l2.75-7.5 2.75 7.5M15 18h3.5'],
  },
  CornerDownRight: { paths: CORNER },
  CornerLeftUp: { paths: CORNER, transform: 'matrix(0 -1 -1 0 24 24)' },
  Undo2: { paths: UNDO },
  Redo2: { paths: UNDO, flip: true },
  RotateCcw: { paths: ['M3.5 12A8.5 8.5 0 1 0 6 6', head(5.3, 6.7, 135, 0.6)] },
  RefreshCw: {
    paths: [
      'M4 12A8 8 0 0 1 18 6.7',
      head(18.6, 7.4, 48, 0.6),
      'M20 12A8 8 0 0 1 6 17.3',
      head(5.4, 16.6, -132, 0.6),
    ],
  },
  Shuffle: {
    paths: [
      'M3 6.5c5 0 6.5 1.5 9 5.5s4 5.5 8.5 5.5',
      'M3 17.5c5 0 6.5-1.5 9-5.5s4-5.5 8.5-5.5',
      head(21, 6.5, 0, 0.55),
      head(21, 17.5, 0, 0.55),
    ],
  },
  TrendingUp: { paths: ['M3 17.5l5.5-5.5 4 4L20 8.5', head(20.6, 7.9, -45, 0.65)] },
  Download: {
    paths: ['M12 3v11', head(12, 15, 90), 'M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3'],
  },
  Upload: {
    paths: ['M12 15V4', head(12, 3, -90), 'M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3'],
  },
  ExternalLink: {
    paths: [
      'M11 4.5H5.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V13',
      'M10 14L19.5 4.5',
      head(20.3, 3.7, -45, 0.6),
    ],
  },
  LogIn: {
    paths: ['M14 20.5V9.5C14 6 15.8 3.5 18 3.5S22 6 22 9.5v11', 'M12.5 20.5h11', 'M2.5 12h10', head(14, 12)],
  },
  LogOut: {
    paths: ['M2 20.5V9.5C2 6 3.8 3.5 6 3.5S10 6 10 9.5v11', 'M.5 20.5h11', 'M7 12h13', head(21.5, 12)],
  },

  // --- Actions ---
  // Croix pattée
  Plus: { paths: ['M12 4.5v15M4.5 12h15', 'M10 4.5h4M10 19.5h4M4.5 10v4M19.5 10v4'] },
  Minus: { paths: ['M4.5 12h15', 'M4.5 10v4M19.5 10v4'] },
  // Sautoir à empattements
  X: { paths: ['M6.5 6.5l11 11M17.5 6.5l-11 11', 'M4.5 7.5l3-3M16.5 4.5l3 3M4.5 16.5l3 3M16.5 19.5l3-3'] },
  Check: { paths: ['M4 12.5c1.5.8 3 2.4 4.5 5.5C11 11.5 14.5 7.5 20 4.5'] },
  // Plume
  Pencil: { paths: [...QUILL_PEN, 'M3.5 21h5'] },
  PencilLine: { paths: [...QUILL_PEN, 'M3.5 21h17'] },
  // Coffre
  Trash2: {
    paths: ['M4 10h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z', 'M4 10c0-3.5 3.6-6 8-6s8 2.5 8 6', 'M12 13v3M9 10v10.5M15 10v10.5'],
  },
  // Loupe à manche bagué
  Search: {
    paths: ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M7 9a3.8 3.8 0 0 1 3-2.6', 'M15.5 15.5l5 5', 'M14.4 17.6l3.2-3.2'],
  },
  Filter: { paths: ['M3.5 4.5h17l-6.5 8v6l-4 2v-8z', 'M6.5 7.5h11'] },
  // Deux parchemins
  Copy: {
    paths: [
      'M15 7V4.5a1 1 0 0 0-1-1H4.5a1 1 0 0 0-1 1V15a1 1 0 0 0 1 1H7',
      'M7 8a1 1 0 0 1 1-1h11.5a1 1 0 0 1 1 1v10l-3 3H8a1 1 0 0 1-1-1z',
      'M20.5 18h-3v3',
    ],
  },
  // Tableau encadré
  ImagePlus: {
    paths: [
      'M13.5 4H4.5a1 1 0 0 0-1 1v14.5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V11',
      'M3.5 17l5-5 4 4 2.5-2.5 5.5 5.5',
      lozenge(8, 8.5, 1.4),
      'M19 1.5v7M15.5 5h7',
    ],
  },
  // Roue dentée
  Settings: { paths: [gear(), 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'] },
  PowerOff: { paths: ['M12 3v8', 'M10.5 3h3', 'M6.5 6.5a7.5 7.5 0 1 0 11 0'] },
  Ellipsis: { paths: [lozenge(5, 12, 1.8), lozenge(12, 12, 1.8), lozenge(19, 12, 1.8)] },
  Menu: { paths: ['M4 6c4-1 12-1 16 0M4 12c4-1 12-1 16 0M4 18c4-1 12-1 16 0'] },

  // --- États ---
  LoaderCircle: { paths: ['M12 3.5a8.5 8.5 0 1 0 8.5 8.5', lozenge(12, 3.5, 1.5)] },
  CircleAlert: {
    paths: ['M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', { d: 'M10.9 7h2.2l-.7 6.5h-.8z', fill: true }, lozenge(12, 16.3, 1.2)],
  },
  CircleCheck: {
    paths: ['M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', 'M7.5 12.5c1 .6 2 1.6 3 3.5 1.6-3.6 3.6-6 6-7.5'],
  },
  // Écu au sautoir
  ShieldX: { paths: ['M4.5 4h15v6c0 5.5-3.5 9-7.5 10.5C8 19 4.5 15.5 4.5 10z', 'M9 8.5l6 6M15 8.5l-6 6'] },
  Lock: {
    paths: [
      'M5 11h14v9.5H5z',
      'M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11',
      { d: 'M12 13.2a1.3 1.3 0 0 0-.6 2.45L11 18.3h2l-.4-2.65A1.3 1.3 0 0 0 12 13.2z', fill: true },
    ],
  },
  // Clé à panneton
  KeyRound: {
    paths: ['M7 3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z', lozenge(7, 7, 1.1), 'M9.5 9.5L20.5 20.5', 'M16 16l1.8-1.8M18.5 18.5l1.8-1.8'],
  },
  // Maillets croisés
  Construction: {
    paths: [
      { d: 'M12 9v12M9 4h6v5H9z', transform: 'rotate(-40 12 16)' },
      { d: 'M12 9v12M9 4h6v5H9z', transform: 'rotate(40 12 16)' },
    ],
  },

  // --- Affichage et mise en forme ---
  Sun: {
    paths: [
      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
      'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3',
      lozenge(17, 7),
      lozenge(17, 17),
      lozenge(7, 17),
      lozenge(7, 7),
    ],
  },
  Moon: { paths: ['M15 3.5a8.5 8.5 0 1 0 5.5 13A7 7 0 0 1 15 3.5z', lozenge(19, 7, 1.4)] },
  // Fenêtre à ogive (thème « système »)
  Monitor: { paths: ['M5 20.5V10a7 7 0 0 1 14 0v10.5z', 'M12 3v17.5M5 13h14', 'M3.5 20.5h17'] },
  Table2: { paths: [...ROWS3, 'M10 4.5v15'] },
  Rows3: { paths: ROWS3 },
  Columns3: { paths: ROWS3, rotate: 90 },
  LayoutGrid: {
    paths: [
      'M5 3.5h4.5L11 5v4.5L9.5 11H5L3.5 9.5V5z',
      'M14.5 3.5H19L20.5 5v4.5L19 11h-4.5L13 9.5V5z',
      'M5 13h4.5l1.5 1.5V19l-1.5 1.5H5L3.5 19v-4.5z',
      'M14.5 13H19l1.5 1.5V19L19 20.5h-4.5L13 19v-4.5z',
    ],
  },
  // Parchemins empilés
  Layers: { paths: ['M12 3.5l9 4.5-9 4.5-9-4.5z', 'M3 12.5l9 4.5 9-4.5', 'M3 16.5l9 4.5 9-4.5'] },
  List: { paths: ['M8.5 6h12M8.5 12h12M8.5 18h12', lozenge(4.5, 6, 1.5), lozenge(4.5, 12, 1.5), lozenge(4.5, 18, 1.5)] },
  // Chiffres romains
  ListOrdered: {
    paths: ['M4.5 4.5v3', 'M3.5 10.5v3M5.5 10.5v3', 'M2.5 16.5v3M4.5 16.5v3M6.5 16.5v3', 'M9.5 6h11M9.5 12h11M9.5 18h11'],
  },
  ListChecks: {
    paths: ['M3 6l1.5 1.5L7.5 4', 'M3 12l1.5 1.5L7.5 10', lozenge(5, 18, 1.4), 'M10.5 6h10M10.5 12h10M10.5 18h10'],
  },
  ListTree: {
    paths: [
      'M9 6h11.5M13 12h7.5M13 18h7.5',
      'M4.5 7.5V16c0 1.1.9 2 2 2H10M4.5 10c0 1.1.9 2 2 2H10',
      lozenge(4.5, 6, 1.5),
    ],
  },
  Bold: { strokeWidth: 2.5, paths: ['M7 4.5h5.5a3.5 3.5 0 0 1 0 7H7zM7 11.5h6.5a4 4 0 0 1 0 8H7z', 'M7 4.5v15'] },
  Italic: { paths: ['M11 4.5h7M6 19.5h7', 'M15 4.5c-2.5 3.5-4 8.5-5.5 15'] },
  Heading2: {
    paths: [
      'M4 5v14M11 5v14M4 12h7',
      'M2.5 5h3M9.5 5h3M2.5 19h3M9.5 19h3',
      'M15 10c0-1.6 1.2-2.5 2.5-2.5S20 8.4 20 10c0 2.5-5 4.5-5 9h5',
    ],
  },
  Heading3: {
    paths: [
      'M4 5v14M11 5v14M4 12h7',
      'M2.5 5h3M9.5 5h3M2.5 19h3M9.5 19h3',
      'M15 7.5h5l-3 4c2 0 3 1.2 3 3.3S18.6 19 17 19c-1 0-1.6-.3-2-.8',
    ],
  },
  Quote: {
    paths: [
      { d: 'M4 6h6v5c0 3.3-1.8 5.8-5.2 6.8.9-1.6 1.6-3.4 1.6-5.8H4z', fill: true },
      { d: 'M13.5 6h6v5c0 3.3-1.8 5.8-5.2 6.8.9-1.6 1.6-3.4 1.6-5.8h-2.4z', fill: true },
    ],
  },

  // --- Contenus de l'univers ---
  // Silhouettes encapuchonnées
  Users: { paths: [...hooded(), 'M16 3.5c1.7.6 3 2.1 3.2 3.9.3 2.4-1 4.1-3.2 4.1', 'M17.5 14c2.5.5 4 2.8 4 6.5'] },
  UsersRound: { paths: [...hooded(), 'M16 3.5c1.7.6 3 2.1 3.2 3.9.3 2.4-1 4.1-3.2 4.1', 'M17.5 14c2.5.5 4 2.8 4 6.5'] },
  UserPlus: { paths: [...hooded(-1), 'M19 7.5v7M15.5 11h7'] },
  // Bannière plantée
  MapPin: {
    paths: ['M6 21V3', 'M6 4c3-1.2 5 1 8 0s4-.8 6-.3l-2.5 4 2.5 4c-2-.5-3.5-.6-6 .3s-5-1.2-8 0', 'M3.5 21h5'],
  },
  // Carte roulée
  Map: {
    paths: [
      'M4.5 4.5A1.5 1.5 0 0 1 6 3h12a1.5 1.5 0 0 1 0 3H6a1.5 1.5 0 0 1-1.5-1.5z',
      'M4.5 19.5A1.5 1.5 0 0 1 6 18h12a1.5 1.5 0 0 1 0 3H6a1.5 1.5 0 0 1-1.5-1.5z',
      'M6 6v12M18 6v12',
      { d: 'M8.5 15.5c1.5-1 1.8-3 3.5-3.5s3 .3 3.5-1.5', dash: '1.5 1.8' },
      'M14.5 8l2 2M16.5 8l-2 2',
    ],
  },
  // Rose des vents
  Compass: { paths: ['M12 2.5l2 7.5 7.5 2-7.5 2-2 7.5-2-7.5-7.5-2 7.5-2z', 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z'] },
  // Compas de géomètre
  Ruler: {
    paths: ['M12 2.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z', 'M11.2 5.6L5.5 20.5M12.8 5.6l5.7 14.9', 'M7.5 15c3 1.2 6 1.2 9 0'],
  },
  // Grimoire ouvert et son signet
  BookOpen: {
    paths: [
      'M12 6.5C10 5 7 4.5 3.5 4.5V18c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2V4.5c-3.5 0-6.5.5-8.5 2z',
      'M12 6.5V20',
      'M15.5 5.2V10l1.5-1.2 1.5 1.2V4.7',
    ],
  },
  Library: {
    paths: [
      'M4 5h3v15H4zM8.5 3.5h3V20h-3z',
      'M4 8h3M4 17h3M8.5 7h3M8.5 16.5h3',
      'M13.5 6.5l2.8-.9 4.6 14-2.8.9z',
      'M2.5 20h19',
    ],
  },
  CalendarRange: {
    paths: ['M4 6h16v14.5H4z', 'M8 3.5v4M16 3.5v4', 'M4 10.5h16', 'M8 15h8', lozenge(7.5, 15, 1.3), lozenge(16.5, 15, 1.3)],
  },
  // Sablier
  CalendarClock: {
    paths: [
      'M5.5 3h13M5.5 21h13',
      'M7.5 3c0 4.5 4.5 6.5 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 6.5-4.5 9s4.5 4.5 4.5 9',
      { d: 'M9.3 19.5c.7-1.6 1.7-2.5 2.7-2.5s2 .9 2.7 2.5z', fill: true },
    ],
  },
  // Scène de théâtre
  Clapperboard: {
    paths: [
      'M3.5 21V9.5C3.5 6 7.3 3.5 12 3.5s8.5 2.5 8.5 6V21',
      'M3.5 9.5c3 0 5 3 5.5 8M20.5 9.5c-3 0-5 3-5.5 8',
      'M2 21h20',
    ],
  },
  // Caducée
  Dna: { paths: ['M12 2.5v19', 'M8 4c0 3 8 4 8 7.5S8 16 8 20', 'M16 4c0 3-8 4-8 7.5s8 4.5 8 8.5'] },
  // Patte griffue
  PawPrint: {
    paths: [
      'M12 12.5c-3 0-5.5 3.5-5.5 5.7 0 1.7 1.3 2.3 2.6 2.3 1.2 0 1.8-.6 2.9-.6s1.7.6 2.9.6c1.3 0 2.6-.6 2.6-2.3 0-2.2-2.5-5.7-5.5-5.7z',
      toe(4.5, 10.5, -35),
      toe(9, 6, -12),
      toe(15, 6, 12),
      toe(19.5, 10.5, 35),
    ],
  },
  // Arbre héraldique
  Network: { paths: [shield(9, 2.5), shield(2.5, 14), shield(15.5, 14), 'M12 9.8V12M5.5 14v-2h13v2'] },
  // Tour crénelée
  Building2: {
    paths: [
      'M5 21V8h14v13',
      'M5 8V4h2.5v2H10V4h4v2h2.5V4H19v4',
      'M10 21v-4a2 2 0 0 1 4 0v4',
      'M12 10v2.5',
      'M3.5 21h17',
    ],
  },
  // Cœur percé d'une flèche
  HeartHandshake: {
    paths: [
      'M12 20c-4-2.6-8-5.7-8-10.2C4 7 5.8 5 8 5c1.7 0 3.1 1 4 2.4C12.9 6 14.3 5 16 5c2.2 0 4 2 4 4.8 0 4.5-4 7.6-8 10.2z',
      'M2.5 18l3-2.2M18.8 6.3l2.4-1.8',
      head(21.7, 4.2, -36, 0.55),
      'M2.5 18l.3-2M2.5 18l2 .3',
    ],
  },
  GitCommitVertical: { paths: ['M12 2.5v6M12 15.5v6', 'M12 8.5l3.5 3.5-3.5 3.5L8.5 12z'] },
  // Masque (personnalité)
  Brain: {
    paths: [
      'M4 5c5 1.5 11 1.5 16 0v6c0 5-3.6 8.5-8 9.5-4.4-1-8-4.5-8-9.5z',
      'M7.5 10.5c.8-.8 2.2-.8 3 0M13.5 10.5c.8-.8 2.2-.8 3 0',
      'M9.5 15c1.5 1 3.5 1 5 0',
    ],
  },
  VenusAndMars: {
    paths: ['M10 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z', 'M10 16.5v5M7.5 19h5', 'M13.2 8.8L19 3', head(19.6, 2.4, -45, 0.55)],
  },
  // Chandelle (statut)
  Activity: {
    paths: [
      'M9.5 10h5v10.5h-5z',
      'M12 2.5c1.8 2 2.5 3.4 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.2.7-2.6 2.5-4.6z',
      'M12 8.5V10',
      'M6.5 20.5h11',
    ],
  },
  // Balance
  Scale: {
    paths: [
      'M12 4.5v16M7.5 20.5h9M4 6.5h16',
      'M5.5 6.5L3 13M5.5 6.5L8 13M18.5 6.5L16 13M18.5 6.5L21 13',
      'M2.5 13a3 3 0 0 0 6 0zM15.5 13a3 3 0 0 0 6 0z',
      lozenge(12, 3, 1.3),
    ],
  },
  // Couronne (rangs de puissance)
  Medal: {
    paths: ['M4 17.5L3 8l5 4 4-7 4 7 5-4-1 9.5z', 'M4 20.5h16', lozenge(3, 6.5, 1.2), lozenge(12, 3, 1.2), lozenge(21, 6.5, 1.2)],
  },
  // Étiquette à queue d'aronde
  Tag: { paths: TAG },
  Tags: { paths: [...TAG.map((p) => (typeof p === 'string' ? { d: p, transform: 'translate(-1 1.5)' } : { ...p, d: p.d.replace(/^M14.5 12/, 'M13.5 13.5') })), 'M6 3h9.5l7 6.5'] },

  // --- Navigation (compléments) ---
  ChevronsRight: { paths: CHEVRONS },
  ChevronsLeft: { paths: CHEVRONS, rotate: 180 },
  // Message porté par un trait empenné
  SendHorizontal: {
    paths: ['M3.5 4.5C9 6.5 15 9 20.5 12 15 15 9 17.5 3.5 19.5c1.3-2.5 2-5 2-7.5s-.7-5-2-7.5z', 'M5.5 12h6'],
  },
  CircleHelp: {
    paths: [
      'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z',
      'M9.4 9.6c0-1.7 1.2-2.8 2.7-2.8s2.6 1 2.6 2.5c0 2.2-2.7 2.3-2.7 4.4',
      lozenge(12, 16.6, 1.1),
    ],
  },

  // --- Mise en forme du texte (compléments) ---
  AlignLeft: { paths: [line(4, 20, 6), line(4, 14, 10), line(4, 20, 14), line(4, 14, 18)] },
  AlignRight: { paths: [line(4, 20, 6), line(4, 14, 10), line(4, 20, 14), line(4, 14, 18)], flip: true },
  AlignCenter: { paths: [line(4, 20, 6), line(7, 17, 10), line(4, 20, 14), line(7, 17, 18)] },
  AlignJustify: { paths: [line(4, 20, 6), line(4, 20, 10), line(4, 20, 14), line(4, 20, 18)] },
  // Lettre A à empattements soulignée (couleur du texte)
  Baseline: { paths: ['M6.5 16l5.5-12 5.5 12M8.3 12h7.4', 'M4.5 16h4M15.5 16h4', line(4, 20, 20.5)] },
  Underline: { paths: ['M7 4v7a5 5 0 0 0 10 0V4', 'M5.5 4h3M15.5 4h3', line(5, 19, 20.5)] },
  Strikethrough: {
    paths: [
      'M16.5 6.5C15.6 5.1 14 4.5 12.2 4.5 9.6 4.5 8 5.9 8 7.8c0 1.6 1 2.6 2.6 3.2',
      'M15.2 14c.5.6.8 1.2.8 1.9 0 2-1.8 3.6-4.6 3.6-2 0-3.7-.8-4.6-2.3',
      'M3.5 12h17',
    ],
  },
  Subscript: { paths: [...LETTER_X, two(15.5, 13.5)] },
  Superscript: { paths: [...LETTER_X, two(15.5, 3)] },
  RemoveFormatting: { paths: ['M4.5 5.5h12M10.5 5.5V19M8.5 19h4', 'M3 5.5v1.5M18 5.5v1.5', 'M15 14l5 5M20 14l-5 5'] },
  // Pinceau d'enlumineur
  Highlighter: {
    paths: [
      'M20 3.5l-8 8.5',
      'M12 12c-1.6-.4-3.2.3-3.8 2-.5 1.4-1.3 2.2-3 2.5 2.7 1.5 6 1.1 7.4-1 .8-1.2.6-2.6-.6-3.5z',
      line(13, 21, 20),
    ],
  },
  // Chevrons à empattements barrés d'un trait de plume
  Code: {
    paths: [
      'M8.5 6.5C6.5 8.5 4.8 10.4 3.5 12c1.3 1.6 3 3.5 5 5.5',
      'M15.5 6.5c2 2 3.7 3.9 5 5.5-1.3 1.6-3 3.5-5 5.5',
      'M13.8 4.5c-1.3 4.8-2.3 9.8-3.6 15',
    ],
  },
  SquareCode: {
    paths: [FRAME, 'M10 8.5c-1 1.2-2 2.4-3 3.5 1 1.1 2 2.3 3 3.5', 'M14 8.5c1 1.2 2 2.4 3 3.5-1 1.1-2 2.3-3 3.5'],
  },
  SeparatorHorizontal: {
    paths: [line(3, 10, 12), line(14, 21, 12), lozenge(12, 12, 1.5), 'M9 7.5l3-3 3 3', 'M9 16.5l3 3 3-3'],
  },
  ListTodo: {
    paths: ['M3 4.5h4.5V9H3z', 'M3.8 6.6l1.4 1.4L9 3.5', 'M3 14.5h4.5V19H3z', 'M11 6.5h9.5M11 12h9.5M11 17h9.5'],
  },

  // --- Médias ---
  Image: { paths: [FRAME, 'M3.5 17l5-5 4 4 2.5-2.5 5.5 5.5', lozenge(15.5, 8.5, 1.4)] },
  Eye: { paths: EYE },
  EyeOff: { paths: [...EYE, 'M3.5 3.5l17 17'] },
  // Notes en losange (notation ancienne)
  Music: {
    paths: [
      { d: 'M4.8 17l2.4-2.4 2.4 2.4-2.4 2.4z', fill: true },
      { d: 'M14.8 15l2.4-2.4 2.4 2.4-2.4 2.4z', fill: true },
      'M9.6 17V5.5L19.6 3.5V15',
      'M9.6 8.5l10-2',
    ],
  },
  Play: { paths: ['M7 4.5c4.5 2 8.5 4.5 12 7.5-3.5 3-7.5 5.5-12 7.5z'] },
  // Deux colonnes à chapiteau
  Pause: { paths: ['M8 5v14M16 5v14', 'M6 5h4M6 19h4M14 5h4M14 19h4'] },
  Volume2: { paths: [...HORN, 'M15 9a4 4 0 0 1 0 6', 'M17.5 6.5a7.5 7.5 0 0 1 0 11'] },
  VolumeX: { paths: [...HORN, 'M15.5 9.5l5 5M20.5 9.5l-5 5'] },
  // Chaîne
  Link: { paths: [link(3), link(11.5)], rotate: -45 },
  Unlink: { paths: [link(1), link(14), 'M12 5.5v2.5M12 16v2.5', 'M9.5 6.5l1 1.5M14.5 6.5l-1 1.5'], rotate: -45 },

  // --- Jeu et divers ---
  // Deux pièces d'or frappées d'une croix
  Coins: {
    paths: [
      'M10.5 5.6A5.5 5.5 0 1 1 15.6 14.5',
      'M9.5 7a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z',
      'M9.5 10.5v6M6.5 13.5h6',
    ],
  },
  Dices: {
    paths: [
      'M3.5 10.5h9v9h-9z',
      lozenge(6, 13, 0.9),
      lozenge(8, 15, 0.9),
      lozenge(10, 17, 0.9),
      'M14 2.6l7.24 1.94-1.94 7.24-7.24-1.94z',
      lozenge(15.4, 5.1, 0.9),
      lozenge(17.9, 9.3, 0.9),
    ],
  },
  Sparkles: { paths: [star4(10, 13, 7.5), star4(18.5, 5.5, 3), lozenge(19, 18, 1.1)] },
  // Bulles en phylactères
  MessagesSquare: {
    paths: ['M3 4.5h11v7.5H8.5L5.5 15v-3H3z', 'M16.5 8.5H21V16h-2v3l-3-3h-5.5v-2'],
  },

  // --- Icônes proposées aux mods ---
  Anchor: {
    paths: [
      'M12 3a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 12 3z',
      'M12 6.6v14',
      'M8.5 9.5h7',
      'M4 13.5c0 4.2 3.5 7 8 7s8-2.8 8-7',
      'M2.5 15.5L4 13.2l2.2 1.3M21.5 15.5L20 13.2l-2.2 1.3',
    ],
  },
  Boxes: { paths: ['M3.5 12.5h8v8h-8z', 'M12.5 12.5h8v8h-8z', 'M8 4.5h8v8H8z', 'M3.5 12.5l8 8M12.5 12.5l8 8M8 4.5l8 8'] },
  Castle: {
    paths: [
      'M3 21V6h1.7v1.5h1.6V6H8v15',
      'M16 21V6h1.7v1.5h1.6V6H21v15',
      'M8 11h1.5v1.5H11V11h2v1.5h1.5V11H16',
      'M10 21v-3.5a2 2 0 0 1 4 0V21',
      'M2 21h20',
    ],
  },
  // Couronne fleuronnée
  Crown: {
    paths: [
      'M5 15.5c0-3.5-.5-6-.5-6 2.3 1.3 4.8.5 7.5-3.5 2.7 4 5.2 4.8 7.5 3.5 0 0-.5 2.5-.5 6',
      'M5 15.5h14v3.5H5z',
      lozenge(4.5, 8, 1.2),
      lozenge(12, 4, 1.3),
      lozenge(19.5, 8, 1.2),
      lozenge(12, 17.25, 0.9),
    ],
  },
  Feather: {
    paths: ['M20 3.5c-6.5.5-12 5-13.5 12L6 19c5.5-.5 11.5-5 14-15.5z', 'M3.5 20.5L15 9', 'M9 15h4M11.5 12.5h3.5'],
  },
  // Gonfanon
  Flag: { paths: ['M4.5 3.5h15', lozenge(3.5, 3.5, 1), lozenge(20.5, 3.5, 1), 'M6.5 3.5V20l5.5-3.5 5.5 3.5V3.5', lozenge(12, 9.5, 1.6)] },
  Flame: {
    paths: [
      'M12 21c-4 0-6.5-2.6-6.5-6 0-3.8 3-5.5 3.5-9.5 2 1.3 3 3 3.2 4.8C13.5 8.5 14 6 13.5 3c3.5 2.5 5 6.5 5 11 0 4-2.5 7-6.5 7z',
      'M12 21c-1.6 0-2.5-1.2-2.5-2.6 0-1.6 1.3-2.4 2-4 .9 1 3 2.3 3 4 0 1.4-1 2.6-2.5 2.6z',
    ],
  },
  // Échiquier
  Gamepad2: {
    paths: [
      'M4 4h16v16H4z',
      { d: 'M4 4h4v4H4zM12 4h4v4h-4zM8 8h4v4H8zM16 8h4v4h-4zM4 12h4v4H4zM12 12h4v4h-4zM8 16h4v4H8zM16 16h4v4h-4z', fill: true },
    ],
  },
  Gem: { paths: ['M6.5 4h11l3.5 5-9 11.5L3 9z', 'M3 9h18', 'M9.5 4L8 9l4 11.5L16 9l-1.5-5'] },
  // Orbe crucigère
  Globe: { paths: ['M12 7.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z', 'M5.5 14h13', 'M12 7.5V14', 'M12 2v5.5M10 3.8h4'] },
  // Clé à panneton, anneau en quadrilobe
  Key: {
    paths: ['M12 2.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z', lozenge(12, 6, 1.1), 'M12 9.2V21', 'M12 17.5h3.5V20.5H12M12 14h2.5'],
  },
  // Sac noué
  Package: {
    paths: [
      'M8.5 8c-2.5 2-4.5 5.5-4.5 8.5 0 3 2 4 8 4s8-1 8-4c0-3-2-6.5-4.5-8.5',
      'M8 8h8',
      'M8.5 8C7.5 6 8.2 3.8 9.8 4.6L12 6l2.2-1.4c1.6-.8 2.3 1.4 1.3 3.4',
      lozenge(12, 14.5, 1.4),
    ],
  },
  Puzzle: { paths: ['M4 7h4.5a2 2 0 1 1 3.5 0H16v4.5a2 2 0 1 1 0 3.5V20h-4a2 2 0 1 0-3.5 0H4z'] },
  // Comète
  Rocket: {
    paths: [star4(16.5, 7.5, 4.5), 'M13.5 10.5C10.5 13.5 7.5 16.5 3.5 20.5', 'M12.5 8.5c-3 1.5-5.5 3.8-8 6.5', 'M15.5 11.5c-1.5 3-3.8 5.5-6.5 8'],
  },
  Scroll: {
    paths: [
      'M7 17.5V5.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1.5h-4',
      'M17 3.5a2 2 0 0 0-2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1h12v1a2 2 0 0 0 2 2',
      'M10 8.5h4M10 12h4',
    ],
  },
  // Écu parti et coupé
  Shield: { paths: ['M4.5 4h15v6c0 5.5-3.5 9-7.5 10.5C8 19 4.5 15.5 4.5 10z', 'M12 4v16.5', 'M4.5 10h15'] },
  // Nef à voile carrée
  Ship: {
    paths: [
      'M3 15h18l-2.5 4.5h-13z',
      'M12 3v12',
      'M6.5 5.5c3.5.6 7.5.6 11 0v6.5c-3.5.6-7.5.6-11 0z',
      'M12 3l3.5 1L12 5',
      line(3, 21, 22),
    ],
  },
  Skull: {
    paths: [
      'M12 3.5c-4.4 0-7.5 3-7.5 7 0 2.6 1.3 4.3 3 5.3v3.7h9v-3.7c1.7-1 3-2.7 3-5.3 0-4-3.1-7-7.5-7z',
      lozenge(9, 11, 1.7),
      lozenge(15, 11, 1.7),
      { d: 'M12 13.6l.9 1.7h-1.8z', fill: true },
      'M10.5 19.5v-2M13.5 19.5v-2',
    ],
  },
  Star: { paths: [star5(12, 12.5, 9.5, 4)] },
  Sword: { paths: SWORD, rotate: 45 },
  Swords: {
    paths: [
      'M20.5 3.5l-.6 2.4-9.1 9.1-1.8-1.8 9.1-9.1z',
      'M5.8 11.8l6.4 6.4M9.5 14.5l-4 4',
      lozenge(4.8, 19.2, 1.2),
      'M3.5 3.5l.6 2.4 9.1 9.1 1.8-1.8-9.1-9.1z',
      'M18.2 11.8l-6.4 6.4M14.5 14.5l4 4',
      lozenge(19.2, 19.2, 1.2),
    ],
  },
  // Calice
  Trophy: {
    paths: [
      'M6.5 3.5h11c0 5-2.5 8.5-5.5 8.5S6.5 8.5 6.5 3.5z',
      'M12 12v5',
      lozenge(12, 14.5, 1.2),
      'M7.5 20.5c0-2 2-3.5 4.5-3.5s4.5 1.5 4.5 3.5z',
    ],
  },
  WandSparkles: {
    paths: ['M3.5 20.5L13.5 10.5', 'M11.5 12.5l1.5 1.5', star4(16.5, 7.5, 4), lozenge(21, 13, 1), lozenge(10, 4, 1)],
  },
  Zap: { paths: ['M13.5 2.5C10.5 6.3 7.8 10 5 13.5h6.5l-1.5 8c3-3.6 5.8-7.3 8.5-11H12z'] },
};
