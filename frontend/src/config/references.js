/**
 * Référentiels d'un univers : champs éditables et entités qui les utilisent.
 * La clé est celle de REFERENCES (config/modules.js) et de RESOURCES (api/resources.js).
 * - `fields`  : champs en plus du nom ('color', 'description')
 * - `usage`   : entité qui utilise la valeur ; `values(item)` → id(s) du référentiel ;
 *               `filter` : paramètre d'URL de sa liste pour n'afficher que les éléments concernés.
 *               `{ collections: true }` : entités de tous types, via les liens de collection
 * - `emptyTitle` : titre quand le référentiel est vide (par défaut « Aucun <singular> pour l’instant »)
 */
export const REFERENCE_CONFIG = {
  genders: {
    singular: 'genre',
    newLabel: 'Nouveau genre',
    fields: ['color'],
    description: 'Les genres proposés pour les personnages.',
    usage: { resource: 'characters', path: 'personnages', filter: 'f_gender', noun: ['personnage', 'personnages'], values: (c) => [c.genders?.id] },
  },
  statuses: {
    singular: 'statut',
    newLabel: 'Nouveau statut',
    fields: ['color'],
    description: 'Vivant, disparu, décédé… l’état actuel des personnages.',
    usage: { resource: 'characters', path: 'personnages', filter: 'f_status', noun: ['personnage', 'personnages'], values: (c) => [c.statuses?.id] },
  },
  alignments: {
    singular: 'alignement',
    newLabel: 'Nouvel alignement',
    fields: ['color', 'description'],
    description: 'Les orientations morales des personnages.',
    usage: { resource: 'characters', path: 'personnages', filter: 'f_alignment', noun: ['personnage', 'personnages'], values: (c) => [c.alignments?.id] },
  },
  powerRanks: {
    singular: 'rang',
    newLabel: 'Nouveau rang',
    fields: ['color', 'description'],
    description: 'Les niveaux de puissance, du plus fort au plus faible : l’ordre de la liste sert aussi au tri des personnages.',
    usage: { resource: 'characters', path: 'personnages', filter: 'f_rank', noun: ['personnage', 'personnages'], values: (c) => [c.power_ranks?.id] },
  },
  placeTypes: {
    singular: 'type de lieu',
    newLabel: 'Nouveau type de lieu',
    fields: [],
    description: 'Continent, ville, bâtiment… les natures de lieux.',
    usage: { resource: 'places', path: 'lieux', filter: 'f_type', noun: ['lieu', 'lieux'], values: (p) => [p.type?.id ?? p.placeTypeId] },
  },
  groupTypes: {
    singular: 'type de groupe',
    newLabel: 'Nouveau type de groupe',
    fields: [],
    description: 'Famille, guilde, équipage… les natures de groupes.',
    usage: { resource: 'groups', path: 'groupes', filter: 'f_type', noun: ['groupe', 'groupes'], values: (g) => [g.type?.id ?? g.groupTypeId] },
  },
  collections: {
    singular: 'collection',
    newLabel: 'Nouvelle collection',
    emptyTitle: 'Aucune collection pour l’instant',
    fields: ['color', 'description'],
    description: 'Saisons, jeux d’une saga, ères, « WIP »… des ensembles libres pour classer toutes les entités. Le filtre de la barre latérale n’affiche qu’une collection à la fois.',
    usage: { collections: true, noun: ['fiche', 'fiches'] },
  },
};

/** Couleur proposée pour un nouvel élément. */
export const DEFAULT_REFERENCE_COLOR = '#6b7280';
