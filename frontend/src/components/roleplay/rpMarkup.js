/**
 * Balises du roleplay écrit, découpées à l'affichage :
 *   ((texte))   hors roleplay (HRP)
 *   {texte}     onomatopée
 *   *texte*     action
 *   « texte »   dialogue (aussi "texte" et “texte”)
 *   (texte)     pensée
 *   ~texte~     chuchotement
 * Le reste (texte sans balise) est du dialogue dans un message de personnage, de la narration sinon
 * (voir `plain` de parseRp). Dans un dialogue, une pensée ou un chuchotement, les « ! » hérissent la bulle
 * de piques (3 niveaux : voir shoutLevel). Les balises ne s'imbriquent pas ; à position égale, la première
 * de la liste l'emporte (((…)) avant (…)).
 */
export const RP_MARKUP = [
  { type: 'narration', label: 'Narration', example: 'La pluie tombe sur le port.', hint: 'message sans personnage' },
  { type: 'dialogue', label: 'Dialogue', example: '« On lève l’ancre ce soir. »', hint: 'texte sans balise, « … » ou "…"' },
  { type: 'action', label: 'Action', example: '*Il pose sa chope.*', hint: '* … *' },
  { type: 'thought', label: 'Pensée', example: '(Pourvu qu’ils suivent…)', hint: '( … )' },
  { type: 'whisper', label: 'Chuchotement', example: '~Ils nous écoutent…~', hint: '~ … ~' },
  { type: 'shout', label: 'Exclamation', example: '« Non ! » « Non !! » « NON !!! »', hint: '! · !! · !!!' },
  { type: 'sound', label: 'Onomatopée', example: '{BAM}', hint: '{ … }' },
  { type: 'hrp', label: 'Hors roleplay', example: '((je reviens dans 5 min))', hint: '(( … ))' },
];

const PATTERN = /\(\(([\s\S]+?)\)\)|\{([^{}\n]+?)\}|\*([^*\n]+?)\*|«\s*([\s\S]+?)\s*»|“([\s\S]+?)”|"([^"]+?)"|\(([^()]+?)\)|~([^~\n]+?)~/g;
const GROUP_TYPES = [null, 'hrp', 'sound', 'action', 'dialogue', 'dialogue', 'dialogue', 'thought', 'whisper'];

// Bulles qui peuvent se hérisser de piques
const BUBBLES = new Set(['dialogue', 'thought', 'whisper']);

/** Intensité d'une bulle selon ses « ! » : 0 (aucun), 1, 2, ou 3 (trois et plus). */
export const shoutLevel = ({ type, text }) => (BUBBLES.has(type) ? Math.min(3, (text.match(/!/g) || []).length) : 0);

/**
 * Découpe un message : [{ type, text }], dans l'ordre. `plain` : type du texte sans balise
 * ('dialogue' pour un message de personnage, 'narration' sinon). Les passages vides sont omis.
 */
export function parseRp(content = '', { plain = 'narration' } = {}) {
  const segments = [];
  const pushPlain = (text) => {
    if (!text.trim()) return;
    segments.push({ type: plain, text: plain === 'narration' ? text.replace(/^\s*\n|\n\s*$/g, '') : text.trim() });
  };
  let last = 0;
  for (const match of content.matchAll(PATTERN)) {
    pushPlain(content.slice(last, match.index));
    const group = match.findIndex((g, i) => i > 0 && g !== undefined);
    segments.push({ type: GROUP_TYPES[group], text: match[group].trim() });
    last = match.index + match[0].length;
  }
  pushPlain(content.slice(last));
  return segments;
}

const timeFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
/** Date d'un message ou d'une scène : 15/11/26 22:30. */
export const formatRpDate = (date) => (date ? timeFormat.format(new Date(date)) : '');

const GROUP_WINDOW = 30 * 60 * 1000; // au-delà, l'en-tête est répété

/**
 * Le message `m` suit-il `prev` sans répéter l'en-tête ? Même rédacteur, mêmes personnages (ou narration
 * des deux côtés), même nature (RP / HRP), même scène, et moins de 30 minutes d'écart.
 */
export const continuesMessage = (prev, m) =>
  Boolean(prev) &&
  prev.author?.id === m.author?.id &&
  prev.characterIds.join() === m.characterIds.join() &&
  prev.isHrp === m.isHrp &&
  prev.sceneId === m.sceneId &&
  new Date(m.createdAt) - new Date(prev.createdAt) < GROUP_WINDOW;
