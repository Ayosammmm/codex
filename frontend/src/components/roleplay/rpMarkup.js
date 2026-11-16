/**
 * Balises du roleplay écrit, découpées à l'affichage :
 *   ((texte))   hors roleplay (HRP)
 *   !!texte!!   onomatopée
 *   *texte*     action
 *   « texte »   dialogue (aussi "texte" et “texte”)
 *   (texte)     pensée
 * Le reste est de la narration. Les balises ne s'imbriquent pas ; à position égale, la première
 * de la liste l'emporte (((…)) avant (…)).
 */
export const RP_MARKUP = [
  { type: 'dialogue', label: 'Dialogue', example: '« On lève l’ancre ce soir. »', hint: '« … » ou "…"' },
  { type: 'thought', label: 'Pensée', example: '(Pourvu qu’ils suivent…)', hint: '( … )' },
  { type: 'action', label: 'Action', example: '*Il pose sa chope.*', hint: '* … *' },
  { type: 'sound', label: 'Onomatopée', example: '!!BAM!!', hint: '!! … !!' },
  { type: 'hrp', label: 'Hors roleplay', example: '((je reviens dans 5 min))', hint: '(( … ))' },
  { type: 'narration', label: 'Narration', example: 'La pluie tombe sur le port.', hint: 'texte sans balise' },
];

const PATTERN = /\(\(([\s\S]+?)\)\)|!!([\s\S]+?)!!|\*([^*\n]+?)\*|«\s*([\s\S]+?)\s*»|“([\s\S]+?)”|"([^"]+?)"|\(([^()]+?)\)/g;
const GROUP_TYPES = [null, 'hrp', 'sound', 'action', 'dialogue', 'dialogue', 'dialogue', 'thought'];

/** Découpe un message : [{ type, text }], dans l'ordre. Les narrations vides sont omises. */
export function parseRp(content = '') {
  const segments = [];
  const pushNarration = (text) => {
    if (text.trim()) segments.push({ type: 'narration', text: text.replace(/^\s*\n|\n\s*$/g, '') });
  };
  let last = 0;
  for (const match of content.matchAll(PATTERN)) {
    pushNarration(content.slice(last, match.index));
    const group = match.findIndex((g, i) => i > 0 && g !== undefined);
    segments.push({ type: GROUP_TYPES[group], text: match[group].trim() });
    last = match.index + match[0].length;
  }
  pushNarration(content.slice(last));
  return segments;
}

const timeFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
/** Date d'un message ou d'une scène : 15/11/26 22:30. */
export const formatRpDate = (date) => (date ? timeFormat.format(new Date(date)) : '');

const GROUP_WINDOW = 30 * 60 * 1000; // au-delà, l'en-tête est répété

/**
 * Le message `m` suit-il `prev` sans répéter l'en-tête ? Même rédacteur, mêmes personnages (au moins un),
 * même nature (RP / HRP), même scène, et moins de 30 minutes d'écart.
 */
export const continuesMessage = (prev, m) =>
  Boolean(prev) &&
  m.characterIds.length > 0 &&
  prev.author?.id === m.author?.id &&
  prev.characterIds.join() === m.characterIds.join() &&
  prev.isHrp === m.isHrp &&
  prev.sceneId === m.sceneId &&
  new Date(m.createdAt) - new Date(prev.createdAt) < GROUP_WINDOW;
