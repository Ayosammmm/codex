/**
 * Configuration des personnages : traits de personnalité, archétypes de relations,
 * tris, filtres et regroupements de la liste.
 * Voir Obsidian/Personnalité.md et Obsidian/Relations.md.
 */

// --- Personnalité : 24 forces (valeur +10) et leurs faiblesses (valeur -10), en 6 vertus ---
export const TRAIT_GROUPS = [
  {
    key: 'sagesse', label: 'Sagesse',
    traits: [
      { key: 'trait_creativite', strength: 'Créativité', weakness: 'Inflexibilité' },
      { key: 'trait_curiosite', strength: 'Curiosité', weakness: 'Indifférence' },
      { key: 'trait_discernement', strength: 'Discernement', weakness: 'Crédulité' },
      { key: 'trait_gout_apprendre', strength: 'Goût d’apprendre', weakness: 'Apathie intellectuelle' },
      { key: 'trait_perspective', strength: 'Perspective', weakness: 'Manque de recul' },
    ],
  },
  {
    key: 'courage', label: 'Courage',
    traits: [
      { key: 'trait_bravoure', strength: 'Bravoure', weakness: 'Lâcheté' },
      { key: 'trait_perseverance', strength: 'Persévérance', weakness: 'Abandon' },
      { key: 'trait_honnetete', strength: 'Honnêteté', weakness: 'Tromperie' },
      { key: 'trait_enthousiasme', strength: 'Enthousiasme', weakness: 'Passivité' },
    ],
  },
  {
    key: 'humanite', label: 'Humanité',
    traits: [
      { key: 'trait_amour', strength: 'Amour', weakness: 'Détachement' },
      { key: 'trait_gentillesse', strength: 'Gentillesse', weakness: 'Cruauté' },
      { key: 'trait_intelligence_sociale', strength: 'Intelligence sociale', weakness: 'Maladresse sociale' },
    ],
  },
  {
    key: 'justice', label: 'Justice',
    traits: [
      { key: 'trait_esprit_equipe', strength: 'Esprit d’équipe', weakness: 'Individualisme' },
      { key: 'trait_equite', strength: 'Équité', weakness: 'Partialité' },
      { key: 'trait_leadership', strength: 'Leadership', weakness: 'Passivité' },
    ],
  },
  {
    key: 'temperance', label: 'Tempérance',
    traits: [
      { key: 'trait_pardon', strength: 'Pardon', weakness: 'Rancœur' },
      { key: 'trait_modestie', strength: 'Modestie', weakness: 'Orgueil' },
      { key: 'trait_prudence', strength: 'Prudence', weakness: 'Impulsivité' },
      { key: 'trait_autoregulation', strength: 'Autorégulation', weakness: 'Instabilité' },
    ],
  },
  {
    key: 'transcendance', label: 'Transcendance',
    traits: [
      { key: 'trait_appreciation_beaute', strength: 'Appréciation de la beauté', weakness: 'Cynisme esthétique' },
      { key: 'trait_gratitude', strength: 'Gratitude', weakness: 'Ingratitude' },
      { key: 'trait_espoir', strength: 'Espoir', weakness: 'Fatalisme' },
      { key: 'trait_humour', strength: 'Humour', weakness: 'Rigidité' },
      { key: 'trait_spiritualite', strength: 'Spiritualité', weakness: 'Nihilisme' },
    ],
  },
];

// --- Évolution du personnage (notes Obsidian « Personnalité ») ---
export const DEVELOPMENT_TYPES = [
  { value: 'statique', label: 'Statique', hint: 'Reste fidèle à lui-même tout au long du récit (ex. Luffy).' },
  { value: 'dynamique', label: 'Dynamique', hint: 'Évolue, change de valeurs ou de caractère au fil du récit (ex. Naruto).' },
];
export const developmentType = (value) => DEVELOPMENT_TYPES.find((d) => d.value === value);

export const TRAIT_KEYS = TRAIT_GROUPS.flatMap((g) => g.traits.map((t) => t.key));
export const TRAIT_MIN = -10;
export const TRAIT_MAX = 10;

// --- Relations (notes Obsidian « Relations ») ---
// Archétypes, chacun avec des natures suggérées (la nature reste un texte libre).
export const RELATION_CATEGORIES = [
  { value: 'familiale', label: 'Familiale', color: '#a855f7', suggestions: ['Parent / Enfant', 'Frères et sœurs', 'Cousins', 'Famille adoptive', 'Mère protectrice', 'Père abusif', 'Enfant en rébellion'] },
  { value: 'amoureuse', label: 'Amoureuse', color: '#ec4899', suggestions: ['Couple', 'Fiançailles', 'Amour secret', 'Amour à sens unique', 'Ex'] },
  { value: 'amicale', label: 'Amicale', color: '#22c55e', suggestions: ['Amitié', 'Meilleurs amis', 'Amis d’enfance', 'Compagnons d’armes'] },
  { value: 'hierarchique', label: 'Hiérarchique', color: '#3b82f6', suggestions: ['Mentor / Élève', 'Supérieur / Subordonné', 'Maître / Serviteur', 'Camarades', 'Emprise'] },
  { value: 'rivalite', label: 'Rivalité', color: '#f59e0b', suggestions: ['Rivalité', 'Rivalité amicale', 'Concurrence', 'Reflet inversé'] },
  { value: 'inimitie', label: 'Inimitié', color: '#ef4444', suggestions: ['Ennemis', 'Ennemi juré', 'Vengeance', 'Méfiance'] },
  { value: 'autre', label: 'Autre', color: '#94a3b8', suggestions: ['Connaissance', 'Client', 'Allié de circonstance', 'Dette'] },
];
export const relationCategory = (value) => RELATION_CATEGORIES.find((c) => c.value === value);
export const RELATION_SUGGESTIONS = RELATION_CATEGORIES.flatMap((c) => c.suggestions);

/** Ton du lien, de très négatif à très positif. */
export const RELATION_TONES = [
  { value: -2, label: 'Très négative', short: '−−', color: '#dc2626' },
  { value: -1, label: 'Négative', short: '−', color: '#f97316' },
  { value: 0, label: 'Neutre', short: '=', color: '#94a3b8' },
  { value: 1, label: 'Positive', short: '+', color: '#22c55e' },
  { value: 2, label: 'Très positive', short: '++', color: '#15803d' },
];
export const relationTone = (value) => RELATION_TONES.find((t) => t.value === value);

// --- Affichage ---
export const characterName = (c) => [c?.firstname, c?.name].filter(Boolean).join(' ').trim() || 'Sans nom';

// --- Tris (clé d'URL → comparaison) ---
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byText = (get) => (a, b) => collator.compare(get(a) || '￿', get(b) || '￿');
const byNumber = (get) => (a, b) => (get(a) ?? Infinity) - (get(b) ?? Infinity);
// Valeur d'un référentiel : dans l'ordre choisi sur sa page (position), non renseigné en dernier
const byReference = (get) => byNumber((c) => (get(c) ? (get(c).position ?? get(c).id) : undefined));

export const SORTS = [
  { key: 'name', label: 'Nom complet', compare: byText(characterName) },
  { key: 'lastname', label: 'Nom de famille', compare: byText((c) => c.name || c.firstname) },
  { key: 'age', label: 'Âge', compare: byNumber((c) => c.age) },
  { key: 'gender', label: 'Genre', compare: byReference((c) => c.genders) },
  { key: 'status', label: 'Statut', compare: byReference((c) => c.statuses) },
  { key: 'alignment', label: 'Alignement', compare: byReference((c) => c.alignments) },
  { key: 'rank', label: 'Rang', module: 'powerRanks', compare: byReference((c) => c.power_ranks) },
  { key: 'updated', label: 'Dernière modification', compare: byNumber((c) => -Date.parse(c.updatedAt)) },
  { key: 'created', label: 'Date d’ajout', compare: byNumber((c) => -Date.parse(c.createdAt)) },
];

/**
 * Critères de filtre et de regroupement.
 * - resource : référentiel / entité qui fournit les options
 * - values   : id(s) du personnage pour ce critère
 * - module   : module requis (sinon le critère est masqué)
 */
export const CRITERIA = [
  { key: 'gender', label: 'Genre', resource: 'genders', values: (c) => [c.genders?.id] },
  { key: 'status', label: 'Statut', resource: 'statuses', values: (c) => [c.statuses?.id] },
  { key: 'alignment', label: 'Alignement', resource: 'alignments', values: (c) => [c.alignments?.id] },
  { key: 'rank', label: 'Rang', resource: 'powerRanks', module: 'powerRanks', values: (c) => [c.power_ranks?.id] },
  { key: 'group', label: 'Groupe', resource: 'groups', module: 'groups', values: (c) => c.groups?.map((g) => g.id) || [] },
  { key: 'species', label: 'Espèce', resource: 'species', module: 'species', values: (c) => c.species?.map((s) => s.id) || [] },
  { key: 'place', label: 'Lieu d’origine', resource: 'places', module: 'places', values: (c) => c.places?.map((p) => p.id) || [] },
];
