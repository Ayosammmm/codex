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
// Archétypes : regroupent les natures ; servent aussi à la détection des dynamiques.
export const RELATION_CATEGORIES = [
  { value: 'familiale', label: 'Familiale', color: '#a855f7' },
  { value: 'amoureuse', label: 'Amoureuse', color: '#ec4899' },
  { value: 'amicale', label: 'Amicale', color: '#22c55e' },
  { value: 'hierarchique', label: 'Hiérarchique', color: '#3b82f6' },
  { value: 'rivalite', label: 'Rivalité', color: '#f59e0b' },
  { value: 'inimitie', label: 'Inimitié', color: '#ef4444' },
  { value: 'autre', label: 'Autre', color: '#94a3b8' },
];
export const relationCategory = (value) => RELATION_CATEGORIES.find((c) => c.value === value);

/**
 * Natures de relation (liste fermée ; positif ou négatif, c'est le ton qui le dit).
 * - key     : valeur enregistrée (`relation_type`)
 * - roles   : [rôle A, rôle B] si chacun a sa place (qui est le parent, qui est l'enfant) ;
 *             absent = relation réciproque (les deux ont le même rôle)
 * - aliases : anciens libellés libres reconnus (relations saisies avant la liste fermée)
 */
export const RELATION_NATURES = [
  // Familiale
  { key: 'parent', category: 'familiale', label: 'Parent / Enfant', roles: ['Parent', 'Enfant'],
    aliases: ['Père / Fils', 'Père / Fille', 'Mère / Fils', 'Mère / Fille', 'Mère protectrice', 'Père abusif', 'Enfant en rébellion'] },
  { key: 'adoption', category: 'familiale', label: 'Parent adoptif / Enfant adopté', roles: ['Parent adoptif', 'Enfant adopté'], aliases: ['Famille adoptive'] },
  { key: 'grandparent', category: 'familiale', label: 'Grand-parent / Petit-enfant', roles: ['Grand-parent', 'Petit-enfant'] },
  { key: 'uncle', category: 'familiale', label: 'Oncle ou tante / Neveu ou nièce', roles: ['Oncle ou tante', 'Neveu ou nièce'] },
  { key: 'siblings', category: 'familiale', label: 'Frères et sœurs' },
  { key: 'twins', category: 'familiale', label: 'Jumeaux' },
  { key: 'cousins', category: 'familiale', label: 'Cousins' },
  { key: 'in-laws', category: 'familiale', label: 'Belle-famille' },
  // Amoureuse
  { key: 'couple', category: 'amoureuse', label: 'Couple' },
  { key: 'engaged', category: 'amoureuse', label: 'Fiancés', aliases: ['Fiançailles'] },
  { key: 'married', category: 'amoureuse', label: 'Mariés' },
  { key: 'crush', category: 'amoureuse', label: 'Crush mutuel' },
  { key: 'unrequited', category: 'amoureuse', label: 'Amour à sens unique', roles: ['Amoureux', 'Aimé'] },
  { key: 'secret-love', category: 'amoureuse', label: 'Amour secret' },
  { key: 'ex', category: 'amoureuse', label: 'Ex' },
  // Amicale
  { key: 'friends', category: 'amicale', label: 'Amitié' },
  { key: 'best-friends', category: 'amicale', label: 'Meilleurs amis' },
  { key: 'childhood-friends', category: 'amicale', label: 'Amis d’enfance' },
  { key: 'comrades', category: 'amicale', label: 'Compagnons d’armes', aliases: ['Camarades'] },
  // Hiérarchique
  { key: 'mentor', category: 'hierarchique', label: 'Mentor / Élève', roles: ['Mentor', 'Élève'] },
  { key: 'superior', category: 'hierarchique', label: 'Supérieur / Subordonné', roles: ['Supérieur', 'Subordonné'] },
  { key: 'master', category: 'hierarchique', label: 'Maître / Serviteur', roles: ['Maître', 'Serviteur'] },
  { key: 'protector', category: 'hierarchique', label: 'Protecteur / Protégé', roles: ['Protecteur', 'Protégé'] },
  { key: 'hold', category: 'hierarchique', label: 'Emprise', roles: ['A l’ascendant', 'Sous emprise'] },
  // Rivalité
  { key: 'rivals', category: 'rivalite', label: 'Rivalité', aliases: ['Rivalité amicale'] },
  { key: 'competition', category: 'rivalite', label: 'Concurrence' },
  { key: 'mirror', category: 'rivalite', label: 'Reflet inversé' },
  // Inimitié
  { key: 'enemies', category: 'inimitie', label: 'Ennemis', aliases: ['Ennemi juré'] },
  { key: 'revenge', category: 'inimitie', label: 'Vengeance', roles: ['Vengeur', 'Cible'] },
  { key: 'hunt', category: 'inimitie', label: 'Traque', roles: ['Chasseur', 'Proie'] },
  { key: 'distrust', category: 'inimitie', label: 'Méfiance' },
  // Autre
  { key: 'acquaintance', category: 'autre', label: 'Connaissance' },
  { key: 'allies', category: 'autre', label: 'Alliés de circonstance', aliases: ['Allié de circonstance'] },
  { key: 'client', category: 'autre', label: 'Client / Prestataire', roles: ['Client', 'Prestataire'], aliases: ['Client'] },
  { key: 'debt', category: 'autre', label: 'Créancier / Débiteur', roles: ['Créancier', 'Débiteur'], aliases: ['Dette'] },
];

const simplify = (text = '') => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, "'").trim().toLowerCase();
const NATURES_BY_NAME = new Map(
  RELATION_NATURES.flatMap((n) => [n.key, n.label, ...(n.aliases || [])].map((name) => [simplify(name), n])),
);
/** Nature d'une relation (clé enregistrée, ou ancien libellé libre reconnu) ; undefined si inconnue. */
export const relationNature = (value) => (value ? NATURES_BY_NAME.get(simplify(value)) : undefined);

/**
 * Rôle d'un personnage dans une relation (« Parent », « Enfant »…), ou null
 * (relation réciproque, ou on ne sait pas encore qui est qui).
 * `link` : { relation_type, lead_id } — `lead_id` : personnage qui tient le premier rôle.
 */
export function relationRole(link, characterId) {
  const nature = relationNature(link?.relation_type);
  if (!nature?.roles || link.lead_id == null) return null;
  return nature.roles[link.lead_id === characterId ? 0 : 1];
}

/** Libellé d'une relation : nature connue, sinon le texte enregistré tel quel. */
export const relationLabel = (link) => relationNature(link?.relation_type)?.label || link?.relation_type || '';

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
