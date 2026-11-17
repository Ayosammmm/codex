import { fieldColumns } from './modFields';
import { useUniverseMods } from './modsContext';

/**
 * Colonnes des champs de mods pour le tableau d'une archive de base (masquées par défaut).
 * `entityType` : character, place, group, specie, creature, story, event.
 */
export function useModFieldColumns(entityType) {
  const { fieldsFor, metadataOf } = useUniverseMods();
  return fieldsFor(entityType).flatMap(({ mod, fields }) =>
    fieldColumns({ fields, modId: mod.id, valuesOf: (item) => metadataOf(entityType, item.id)[mod.id] }).map((c) => ({ ...c, defaultHidden: true })),
  );
}

/** Entrée du sommaire des formulaires (null si aucun champ). */
export function useModFieldsToc(entityType) {
  const { fieldsFor } = useUniverseMods();
  return fieldsFor(entityType).length ? { id: 'champs-mods', label: 'Champs des mods' } : null;
}
