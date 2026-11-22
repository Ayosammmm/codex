import { normalizeText } from '@/components/entity/useListState';

/*
 * Personnages inconnus (« /??? » dans la saisie) : quelqu'un parle sans qu'on sache encore qui.
 * Jusqu'à UNKNOWN_COUNT inconnus distincts, numérotés pour les distinguer dans une même scène.
 * Dans les messages (characterIds), un inconnu a un id négatif : -1 pour « ??? », -2 pour « ??? 2 »…
 * (le serveur les enregistre à part : voir backend/services/messages.js).
 */
export const UNKNOWN_COUNT = 5;

export const isUnknownId = (id) => id < 0 && id >= -UNKNOWN_COUNT;

/** Faux personnage d'un inconnu, affichable comme les autres (nom « ??? », initiales « ? »). */
export const unknownSpeaker = (id) => ({
  id,
  unknown: true,
  firstname: '???',
  name: id === -1 ? null : String(-id),
  title: 'Personnage inconnu',
  avatar: null,
  colors: null,
});

export const UNKNOWN_SPEAKERS = Array.from({ length: UNKNOWN_COUNT }, (_, i) => unknownSpeaker(-(i + 1)));

/** Personnage d'un id de message : un personnage de l'univers, ou un inconnu. */
export const speakerOf = (charactersById, id) => (isUnknownId(id) ? unknownSpeaker(id) : charactersById.get(id));

/** Inconnus proposés pour une recherche « /??? » (« /?2 » : le 2e), ou « /inconnu ». */
export function matchUnknowns(query) {
  const q = normalizeText(query).replace(/\s+/g, '');
  if (!q) return [];
  const digits = /^\?+(\d?)$/.exec(q);
  if (digits) return digits[1] ? UNKNOWN_SPEAKERS.filter((s) => -s.id === Number(digits[1])) : UNKNOWN_SPEAKERS;
  return 'inconnu'.startsWith(q) ? UNKNOWN_SPEAKERS : [];
}
