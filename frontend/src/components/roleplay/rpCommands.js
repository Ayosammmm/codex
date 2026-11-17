import { normalizeText } from '@/components/entity/useListState';

/*
 * Commandes du roleplay, proposées par « / » dans la saisie comme les personnages (backend/services/rpCommands.js) :
 * - hasard : le tirage est fait par le serveur et enregistré avec le message (`roll`) ;
 * - mise en scène : le fond ou l'ambiance du fil change à partir du message (`effect`), quand le lecteur
 *   arrive à sa hauteur. `hint` : texte d'aide de la ligne ; `needsSound` : seulement avec le module « Son ».
 */

/** Dés : « d20 », « 2d6 », « 3d8+2 » (1 à 50 dés, 2 à 1000 faces). */
export const DICE_PATTERN = /^(\d{0,2})d(\d{1,4})(?:([+-])(\d{1,4}))?$/i;

export const RP_COMMANDS = [
  { command: 'd20', kind: 'dice', label: 'Dé à 20 faces' },
  { command: 'd6', kind: 'dice', label: 'Dé à 6 faces' },
  { command: '2d6', kind: 'dice', label: 'Deux dés à 6 faces' },
  { command: 'd4', kind: 'dice', label: 'Dé à 4 faces' },
  { command: 'd8', kind: 'dice', label: 'Dé à 8 faces' },
  { command: 'd10', kind: 'dice', label: 'Dé à 10 faces' },
  { command: 'd12', kind: 'dice', label: 'Dé à 12 faces' },
  { command: 'd100', kind: 'dice', label: 'Dé à 100 faces (pourcentage)' },
  { command: 'pileface', kind: 'coin', label: 'Pile ou face', keywords: ['pile', 'face', 'piece'] },
  {
    command: 'fond', kind: 'background', label: 'Changer le fond (image jointe ; sans image : fond retiré)', keywords: ['image', 'decor'],
    hint: 'Joignez l’image du nouveau fond (sans image : fond retiré) · commentaire facultatif…',
  },
  { command: 'fin-fond', kind: 'background', label: 'Revenir au fond du lieu', keywords: ['retirer'], hint: 'Retour au fond du lieu · commentaire facultatif…' },
  {
    command: 'ambiance', kind: 'ambience', label: 'Changer l’ambiance (son joint ; sans son : silence)', keywords: ['musique', 'son'], needsSound: true,
    hint: 'Joignez le son de la nouvelle ambiance (sans son : silence) · commentaire facultatif…',
  },
  { command: 'fin-ambiance', kind: 'ambience', label: 'Revenir à l’ambiance du lieu', keywords: ['retirer'], needsSound: true, hint: 'Retour à l’ambiance du lieu · commentaire facultatif…' },
];

export const findCommand = (command) => RP_COMMANDS.find((c) => c.command === command);

/** Libellé d'un lancer de dés libre : « 3 dés à 8 faces, +2 ». */
function diceLabel(expr) {
  const [, count = '', sides, sign, mod] = DICE_PATTERN.exec(expr);
  const n = Number(count || 1);
  return `${n > 1 ? `${n} dés` : 'Un dé'} à ${sides} faces${sign ? `, ${sign}${mod}` : ''}`;
}

/**
 * Commandes correspondant à une recherche « /d2… » (rien pour une recherche vide : la liste des personnages
 * reste lisible). Un lancer libre (« 3d8+2 ») est proposé tel quel.
 */
export function matchCommands(query, { sound = true } = {}) {
  const q = normalizeText(query).replace(/\s+/g, '');
  if (!q) return [];
  const found = RP_COMMANDS.filter((c) => sound || !c.needsSound).filter((c) => c.command.startsWith(q) || c.keywords?.some((k) => k.startsWith(q)) || (q.length >= 2 && ['de', 'des'].includes(q) && c.kind === 'dice'));
  if (DICE_PATTERN.test(q) && !found.some((c) => c.command === q)) found.unshift({ command: q, kind: 'dice', label: diceLabel(q) });
  return found.map((c) => ({ ...c, id: `cmd:${c.command}` }));
}

/** La recherche ressemble-t-elle à un lancer de dés (« d6 », « 2d1… ») ? Les commandes passent alors en premier. */
export const looksLikeDice = (query) => /^\d*d\d/i.test(query);

/** Fond et ambiance en vigueur ('place' : ceux du lieu) : { background, ambience }, chacun 'place' | 'none' | message. */
export function activeEffects(base, messages, uptoId) {
  const state = { background: 'place', ambience: 'place' };
  const apply = (m) => {
    if (!m?.effect) return;
    const [kind, mode] = m.effect.split(':');
    if (kind !== 'background' && kind !== 'ambience') return;
    state[kind] = mode === 'reset' ? 'place' : mode === 'none' ? 'none' : m;
  };
  apply(base?.background);
  apply(base?.ambience);
  for (const m of messages) if (m.effect && m.id <= uptoId) apply(m);
  return state;
}

/** Résultat en texte : « 2d6+3 : 4 + 3 + 3 = 10 », « Pile ». */
export function describeRoll(roll) {
  if (!roll) return '';
  if (roll.type === 'coin') return roll.result === 'pile' ? 'Pile' : 'Face';
  const detail = `${roll.rolls.join(' + ')}${roll.modifier ? ` ${roll.modifier > 0 ? '+' : '−'} ${Math.abs(roll.modifier)}` : ''}`;
  return `${roll.expr} : ${roll.rolls.length > 1 || roll.modifier ? `${detail} = ` : ''}${roll.total}`;
}
