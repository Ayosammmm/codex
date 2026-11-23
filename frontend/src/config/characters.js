/**
 * Configuration des personnages : traits de personnalité, archétypes de relations,
 * tris, filtres et regroupements de la liste.
 * Voir Obsidian/Personnalité.md et Obsidian/Relations.md.
 */

// --- Personnalité : 24 forces (valeur +10) et leurs faiblesses (valeur -10), en 6 vertus ---
// `questions` : questions à se poser sur le personnage pour placer le curseur (infobulle).
export const TRAIT_GROUPS = [
  {
    key: 'sagesse', label: 'Sagesse',
    traits: [
      { key: 'trait_creativite', strength: 'Créativité', weakness: 'Inflexibilité',
        questions: ['Face à un problème inédit, invente-t-il sa propre solution, ou s’en tient-il à ce qui a toujours marché ?', 'Supporte-t-il qu’on bouscule ses habitudes et ses idées ?'] },
      { key: 'trait_curiosite', strength: 'Curiosité', weakness: 'Indifférence',
        questions: ['Devant un mystère ou une porte fermée, a-t-il besoin de savoir ce qu’il y a derrière ?', 'S’intéresse-t-il au monde qui l’entoure, ou seulement à ce qui le concerne ?'] },
      { key: 'trait_discernement', strength: 'Discernement', weakness: 'Crédulité',
        questions: ['Croit-il ce qu’on lui raconte, ou pèse-t-il le pour et le contre avant de se faire un avis ?', 'Est-il capable de changer d’avis face à de bons arguments ?'] },
      { key: 'trait_gout_apprendre', strength: 'Goût d’apprendre', weakness: 'Apathie intellectuelle',
        questions: ['Cherche-t-il à progresser, à maîtriser de nouveaux savoirs ou savoir-faire ?', 'Apprendre est-il un plaisir pour lui, ou une corvée ?'] },
      { key: 'trait_perspective', strength: 'Perspective', weakness: 'Manque de recul',
        questions: ['Ses proches viennent-ils lui demander conseil ?', 'Sait-il prendre du recul et voir la situation dans son ensemble, ou garde-t-il le nez dans le guidon ?'] },
    ],
  },
  {
    key: 'courage', label: 'Courage',
    traits: [
      { key: 'trait_bravoure', strength: 'Bravoure', weakness: 'Lâcheté',
        questions: ['Face au danger, fait-il front ou prend-il la fuite ?', 'Défendrait-il une cause impopulaire, même seul contre tous ?'] },
      { key: 'trait_perseverance', strength: 'Persévérance', weakness: 'Abandon',
        questions: ['Quand la tâche devient longue, difficile ou ingrate, va-t-il jusqu’au bout ?', 'Combien d’échecs lui faut-il avant de renoncer ?'] },
      { key: 'trait_honnetete', strength: 'Honnêteté', weakness: 'Tromperie',
        questions: ['Peu importe la situation, préfère-t-il globalement dire la vérité, ou arranger les faits à sa façon ?', 'Se montre-t-il tel qu’il est, ou joue-t-il un rôle ?'] },
      { key: 'trait_enthousiasme', strength: 'Enthousiasme', weakness: 'Passivité',
        questions: ['Aborde-t-il la vie avec énergie et entrain, ou se laisse-t-il porter ?', 'Se lance-t-il à fond dans ce qu’il entreprend ?'] },
    ],
  },
  {
    key: 'humanite', label: 'Humanité',
    traits: [
      { key: 'trait_amour', strength: 'Amour', weakness: 'Détachement',
        questions: ['Laisse-t-il les autres s’approcher de lui ? S’attache-t-il facilement ?', 'Sait-il montrer son affection, et l’accepter en retour ?'] },
      { key: 'trait_gentillesse', strength: 'Gentillesse', weakness: 'Cruauté',
        questions: ['Rendrait-il service à un inconnu sans rien attendre en échange ?', 'La souffrance des autres le touche-t-elle, le laisse-t-elle froid, ou y prend-il plaisir ?'] },
      { key: 'trait_intelligence_sociale', strength: 'Intelligence sociale', weakness: 'Maladresse sociale',
        questions: ['Devine-t-il ce que ressentent les autres sans qu’ils aient à le dire ?', 'Sait-il comment se comporter selon les gens et les situations ?'] },
    ],
  },
  {
    key: 'justice', label: 'Justice',
    traits: [
      { key: 'trait_esprit_equipe', strength: 'Esprit d’équipe', weakness: 'Individualisme',
        questions: ['Fait-il passer le groupe avant ses propres intérêts ?', 'Reste-t-il loyal envers les siens, même quand cela lui coûte ?'] },
      { key: 'trait_equite', strength: 'Équité', weakness: 'Partialité',
        questions: ['Traite-t-il tout le monde de la même façon, ou a-t-il ses favoris ?', 'Laisse-t-il ses sentiments personnels influencer ses jugements ?'] },
      { key: 'trait_leadership', strength: 'Leadership', weakness: 'Passivité',
        questions: ['Prend-il les choses en main quand personne ne sait quoi faire ?', 'Les autres le suivent-ils naturellement ?'] },
    ],
  },
  {
    key: 'temperance', label: 'Tempérance',
    traits: [
      { key: 'trait_pardon', strength: 'Pardon', weakness: 'Rancœur',
        questions: ['Accorde-t-il une seconde chance à ceux qui lui ont fait du tort ?', 'Garde-t-il le compte de chaque offense, ou passe-t-il vite à autre chose ?'] },
      { key: 'trait_modestie', strength: 'Modestie', weakness: 'Orgueil',
        questions: ['Laisse-t-il ses actes parler pour lui, ou a-t-il besoin qu’on reconnaisse sa valeur ?', 'Admet-il facilement ses torts et ses limites ?'] },
      { key: 'trait_prudence', strength: 'Prudence', weakness: 'Impulsivité',
        questions: ['Réfléchit-il aux conséquences avant d’agir, ou fonce-t-il tête baissée ?', 'Prend-il des risques inutiles ?'] },
      { key: 'trait_autoregulation', strength: 'Autorégulation', weakness: 'Instabilité',
        questions: ['Garde-t-il le contrôle de ses émotions, de ses envies et de ses habitudes ?', 'Dans la colère ou la tentation, sait-il se retenir ?'] },
    ],
  },
  {
    key: 'transcendance', label: 'Transcendance',
    traits: [
      { key: 'trait_appreciation_beaute', strength: 'Appréciation de la beauté', weakness: 'Cynisme esthétique',
        questions: ['S’arrête-t-il pour admirer un paysage, une œuvre ou un geste remarquable ?', 'Le talent des autres l’émerveille-t-il, ou le trouve-t-il futile ?'] },
      { key: 'trait_gratitude', strength: 'Gratitude', weakness: 'Ingratitude',
        questions: ['Remercie-t-il ceux qui l’aident, ou trouve-t-il que tout lui est dû ?', 'A-t-il conscience de ce qu’il a et de ce qu’on lui a donné ?'] },
      { key: 'trait_espoir', strength: 'Espoir', weakness: 'Fatalisme',
        questions: ['Croit-il que demain peut être meilleur, et agit-il en ce sens ?', 'Face à une situation désespérée, baisse-t-il les bras ?'] },
      { key: 'trait_humour', strength: 'Humour', weakness: 'Rigidité',
        questions: ['Aime-t-il rire et faire rire, même dans les moments difficiles ?', 'Sait-il rire de lui-même ?'] },
      { key: 'trait_spiritualite', strength: 'Spiritualité', weakness: 'Nihilisme',
        questions: ['Croit-il en quelque chose de plus grand que lui : une foi, un idéal, un destin ?', 'Sa vie a-t-elle un sens à ses yeux ?'] },
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
