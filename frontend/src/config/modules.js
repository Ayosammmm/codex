import {
  Users, MapPin, Brain, HeartHandshake, Map, Building2, Dna, PawPrint, BookOpen, CalendarClock,
  VenusAndMars, Activity, Scale, Medal, Tags, Tag,
} from 'lucide-react';

/**
 * Modules d'un univers (voir Obsidian/Modules.md).
 *
 * - core          : toujours actif (personnages et lieux forment le socle de tout univers)
 * - parent        : n'a de sens que si le module parent est actif
 * - defaultEnabled: valeur tant que l'univers n'a rien enregistré pour ce module
 * - legacyFlag    : ancien booléen de l'univers, lu en repli
 * - aliases       : anciennes clés lues en repli (ex. `episodes` du frontend v2)
 * - comingSoon    : prévu mais pas encore disponible
 * - path          : segment d'URL de la page du module dans l'univers (absent = pas de page dédiée)
 * - navLabel      : libellé dans la navigation, s'il diffère du nom du module
 */
export const MODULES = [
  { key: 'characters', path: 'personnages', label: 'Personnages', icon: Users, core: true,
    description: 'Les êtres qui peuplent l’univers : identité, photos, description.' },
  { key: 'personality', label: 'Personnalité', icon: Brain, parent: 'characters', defaultEnabled: false,
    legacyFlag: 'personalityModuleEnabled',
    description: '24 traits de caractère, des forces aux faiblesses.' },
  { key: 'relations', path: 'dynamiques', navLabel: 'Dynamiques', label: 'Relations', icon: HeartHandshake, parent: 'characters', defaultEnabled: true,
    description: 'Liens entre personnages : famille, amitié, rivalité…' },

  { key: 'places', path: 'lieux', label: 'Lieux', icon: MapPin, core: true,
    description: 'Les lieux de l’univers, leurs types et leur hiérarchie.' },
  { key: 'map', label: 'Carte', icon: Map, parent: 'places', defaultEnabled: false,
    description: 'Une carte pour chaque lieu, avec ses sous-lieux placés dessus.' },

  { key: 'groups', path: 'groupes', label: 'Groupes', icon: Building2, defaultEnabled: true,
    description: 'Factions et organisations, avec rôles et organigramme.' },
  { key: 'species', path: 'especes', label: 'Espèces', icon: Dna, defaultEnabled: true,
    description: 'Espèces et races des personnages.' },
  { key: 'creatures', path: 'bestiaire', label: 'Bestiaire', icon: PawPrint, defaultEnabled: false, legacyFlag: 'bestiaryEnabled',
    description: 'Créatures et monstres : comportement, habitat, dangerosité.' },
  { key: 'powerRanks', label: 'Rangs de puissance', icon: Medal, defaultEnabled: false,
    description: 'Niveaux de puissance des personnages et des créatures (S, A, B…).' },
  { key: 'stories', path: 'histoires', label: 'Histoires', icon: BookOpen, defaultEnabled: false, legacyFlag: 'storiesEnabled',
    aliases: ['episodes'],
    description: 'Histoires découpées en épisodes, avec leurs personnages et lieux.' },
  { key: 'events', path: 'evenements', label: 'Événements', icon: CalendarClock, parent: 'stories', defaultEnabled: false,
    description: 'Moments clés, partagés entre plusieurs épisodes.' },
];

export const MODULES_BY_KEY = Object.fromEntries(MODULES.map((m) => [m.key, m]));

/**
 * Référentiels : listes de valeurs propres à l'univers, utilisées par les fiches
 * (genres, statuts...). Affichés si au moins un des modules `for` est actif.
 */
export const REFERENCES = [
  { key: 'genders', path: 'genres', label: 'Genres', icon: VenusAndMars, for: ['characters'] },
  { key: 'statuses', path: 'statuts', label: 'Statuts', icon: Activity, for: ['characters'] },
  { key: 'alignments', path: 'alignements', label: 'Alignements', icon: Scale, for: ['characters'] },
  { key: 'powerRanks', path: 'rangs', label: 'Rangs de puissance', icon: Medal, for: ['powerRanks'] },
  { key: 'placeTypes', path: 'types-de-lieux', label: 'Types de lieux', icon: Tags, for: ['places'] },
  { key: 'groupTypes', path: 'types-de-groupes', label: 'Types de groupes', icon: Tag, for: ['groups'] },
];

/** Modules de premier niveau, chacun avec ses sous-modules. */
export const MODULE_TREE = MODULES.filter((m) => !m.parent).map((m) => ({
  ...m,
  children: MODULES.filter((c) => c.parent === m.key),
}));

/** Valeur enregistrée (sans tenir compte du parent). */
const rawEnabled = (modules, universe, mod) => {
  if (mod.core) return true;
  if (mod.comingSoon) return false;
  for (const key of [mod.key, ...(mod.aliases || [])]) {
    if (typeof modules?.[key] === 'boolean') return modules[key];
  }
  if (mod.legacyFlag && typeof universe?.[mod.legacyFlag] === 'boolean') return universe[mod.legacyFlag];
  return mod.defaultEnabled;
};

/** État { clé: booléen } des interrupteurs, pour le formulaire. */
export const getModulesState = (universe) =>
  Object.fromEntries(MODULES.map((m) => [m.key, rawEnabled(universe?.modules, universe, m)]));

/** Un module est actif s'il est activé et que son parent l'est aussi. */
export const isModuleEnabled = (state, key) => {
  const mod = MODULES_BY_KEY[key];
  if (!mod) return false;
  if (mod.parent && !isModuleEnabled(state, mod.parent)) return false;
  return Boolean(state[key]);
};

/** Objet `modules` à envoyer à l'API (garde la clé `episodes` synchronisée pour le frontend v2). */
export const toModulesPayload = (state) => {
  const payload = {};
  for (const mod of MODULES) if (!mod.comingSoon) payload[mod.key] = Boolean(state[mod.key]);
  payload.episodes = payload.stories;
  return payload;
};

/** Pages de modules à afficher dans la navigation d'un univers (modules actifs ayant une page). */
export const getNavModules = (state) => MODULES.filter((m) => m.path && isModuleEnabled(state, m.key));

/** Référentiels utiles pour les modules actifs. */
export const getNavReferences = (state) => REFERENCES.filter((r) => r.for.some((key) => isModuleEnabled(state, key)));

/** Section (module ou référentiel) correspondant à un segment d'URL, avec son état d'activation. */
export const findSection = (state, path) => {
  const mod = MODULES.find((m) => m.path === path);
  if (mod) return { kind: 'module', section: mod, enabled: isModuleEnabled(state, mod.key) };
  const ref = REFERENCES.find((r) => r.path === path);
  if (ref) return { kind: 'reference', section: ref, enabled: ref.for.some((key) => isModuleEnabled(state, key)) };
  return null;
};
