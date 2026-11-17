import { createContext, useContext } from 'react';

const EMPTY = {
  ready: true,
  installed: [],
  activeMods: [],
  types: [],
  pages: [],
  customEntities: [],
  customLoading: false,
  fieldsFor: () => [],
  metadataOf: () => ({}),
  typeOf: () => null,
  findTypeByPath: () => null,
  findPageByPath: () => null,
};

export const ModsContext = createContext(EMPTY);

/**
 * Mods de l'univers courant (fournis par ModsProvider dans UniverseLayout) :
 * - ready          : liste des mods chargée
 * - installed      : tous les mods installés sur le serveur
 * - activeMods     : mods activés dans l'univers
 * - types          : types d'entités des mods actifs { id: 'modId.key', key, label, plural, path, basePath, Icon, fields, mod… }
 * - pages          : pages des mods actifs { key, label, basePath, entry, Icon, mod… }
 * - customEntities : toutes les entités des types de mods de l'univers
 * - fieldsFor(entityType)   : [{ mod, fields }] champs ajoutés aux fiches de base ('character', 'place'…)
 * - metadataOf(type, id)    : { [modId]: { champ: valeur } }
 * - typeOf(customEntity)    : type de mod d'une entité `custom`
 */
export const useUniverseMods = () => useContext(ModsContext);
