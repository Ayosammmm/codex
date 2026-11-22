/**
 * Formes d'un personnage : la forme par défaut est le personnage lui-même, les autres sont dans
 * `character.forms` (même profil : identité, classification, espèces, récit, personnalité, couleurs, images, son).
 * Groupes, lieux, relations, album, collections et éditeurs restent ceux du personnage.
 */

export const DEFAULT_FORM_NAME = 'Forme de base';

// Colonnes d'une forme qui ne font pas partie du profil
const FORM_META = ['id', 'character_id', 'universe_id', 'position', 'createdAt', 'updatedAt'];

/** Forme `formId` du personnage (null : forme par défaut ou forme inconnue). */
export const findForm = (character, formId) =>
  formId == null || formId === '' ? null : (character?.forms || []).find((f) => String(f.id) === String(formId)) || null;

/** Le personnage tel qu'il apparaît dans la forme `form` (null : forme par défaut). */
export function characterInForm(character, form) {
  if (!form) return character;
  const profile = { ...form };
  for (const key of FORM_META) delete profile[key];
  return { ...character, ...profile, formId: form.id };
}

/** Options du sélecteur : [{ value, label }], la forme par défaut en premier (value ''). */
export const formOptions = (character) => [
  { value: '', label: character?.formName || DEFAULT_FORM_NAME },
  ...(character?.forms || []).map((f) => ({ value: String(f.id), label: f.formName || 'Forme sans nom' })),
];
