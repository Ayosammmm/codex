/**
 * Catalogue des thèmes visuels.
 * Chaque thème correspond à un bloc [data-theme='<key>'] dans src/styles/index.css.
 * `available: false` = prévu mais pas encore dessiné (affiché « bientôt » dans les paramètres).
 * `colors` : couleurs par défaut, remplacées par celles de l'univers si elles sont personnalisées.
 * `alwaysDark` : le thème ignore le mode clair (affiché dans les paramètres).
 */
export const DEFAULT_THEME = 'almanach';

export const THEMES = [
  {
    key: 'almanach',
    label: 'Almanach',
    description: 'Sobre et lisible : papier chaud, encre bleue, titres à empattements.',
    available: true,
    colors: { primary: '#3d5a98', secondary: '#b4532a', tertiary: '#c9a227' },
  },
  {
    key: 'sketch',
    label: 'Crayonné',
    description: 'Carnet de croquis : écriture manuscrite, papier ligné, traits d’encre. Tableau noir en sombre.',
    available: true,
    colors: { primary: '#2f5cb8', secondary: '#c4453a', tertiary: '#e9c53a' },
  },
  {
    key: 'terminal',
    label: 'Terminal',
    description: 'Ambiance cyber : police à chasse fixe, angles droits, lueurs. Toujours sombre.',
    available: true,
    alwaysDark: true,
    colors: { primary: '#39d98a', secondary: '#4cc9f0', tertiary: '#f72585' },
  },
  {
    key: 'medieval',
    label: 'Médiéval',
    description: 'Parchemin, capitales romaines et cadres à double filet. Cuir et chandelle en sombre.',
    available: true,
    colors: { primary: '#7a2e1f', secondary: '#4a5a2f', tertiary: '#b8892d' },
  },
];

const THEMES_BY_KEY = Object.fromEntries(THEMES.map((t) => [t.key, t]));

/** Thème utilisable (retombe sur le thème par défaut s'il est inconnu ou pas encore disponible). */
export const getTheme = (key) => {
  const theme = THEMES_BY_KEY[key];
  return theme?.available ? theme : THEMES_BY_KEY[DEFAULT_THEME];
};

export const COLOR_ROLES = [
  { key: 'primary', label: 'Principale', hint: 'Boutons, liens, éléments actifs.' },
  { key: 'secondary', label: 'Secondaire', hint: 'Accents, titres de sections, étiquettes.' },
  { key: 'tertiary', label: 'Tertiaire', hint: 'Mises en valeur ponctuelles.' },
];
