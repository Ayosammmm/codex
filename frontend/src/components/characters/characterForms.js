/**
 * Formes d'un personnage : la forme par défaut est le personnage lui-même (dans le présent), les autres sont dans
 * `character.forms` (même profil : identité, classification, espèces, récit, personnalité, couleurs, images, son).
 * `formType` : « transformation » (transformation, changement physique) ou « temporal » (version passée, ordonnées
 * chronologiquement par `position` : la plus récente en dernier).
 * Groupes, lieux, relations, album, collections et éditeurs restent ceux du personnage.
 */

export const DEFAULT_FORM_NAME = 'Forme de base';

// Colonnes d'une forme qui ne font pas partie du profil
const FORM_META = ['id', 'character_id', 'universe_id', 'formType', 'position', 'createdAt', 'updatedAt'];

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

export const TEMPORAL = 'temporal';
export const isPastForm = (form) => form?.formType === TEMPORAL;

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id;

/** Transformations, dans leur ordre. */
export const transformationForms = (character) => (character?.forms || []).filter((f) => !isPastForm(f)).sort(byPosition);

/** Époques, de la plus ancienne à la plus récente. */
export const pastForms = (character) => (character?.forms || []).filter(isPastForm).sort(byPosition);

/** Toutes les autres formes : transformations, puis époques de la plus récente à la plus ancienne. */
export const orderedForms = (character) => [...transformationForms(character), ...pastForms(character).reverse()];

export const formLabelOf = (form) => form.formName || 'Forme sans nom';

const option = (f) => ({ value: String(f.id), label: formLabelOf(f) });

/**
 * Options du sélecteur : { present, past } — `present` : la forme par défaut (value '') puis les transformations ;
 * `past` : les époques, de la plus ancienne à la plus récente.
 */
export const formOptions = (character) => ({
  present: [{ value: '', label: character?.formName || DEFAULT_FORM_NAME }, ...transformationForms(character).map(option)],
  past: pastForms(character).map(option),
});
