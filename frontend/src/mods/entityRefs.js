import { uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';

/**
 * Entités de base pouvant recevoir des champs de mods ou être référencées par un champ « ref ».
 * - resource : clé de RESOURCES (api/resources.js) ; path : segment d'URL de l'archive ; module : module requis
 */
export const BASE_ENTITIES = {
  character: { resource: 'characters', path: 'personnages', module: 'characters', label: 'Personnage', plural: 'Personnages' },
  place: { resource: 'places', path: 'lieux', module: 'places', label: 'Lieu', plural: 'Lieux' },
  group: { resource: 'groups', path: 'groupes', module: 'groups', label: 'Groupe', plural: 'Groupes' },
  specie: { resource: 'species', path: 'especes', module: 'species', label: 'Espèce', plural: 'Espèces' },
  creature: { resource: 'creatures', path: 'bestiaire', module: 'creatures', label: 'Créature', plural: 'Créatures' },
  story: { resource: 'stories', path: 'histoires', module: 'stories', label: 'Histoire', plural: 'Histoires' },
  event: { resource: 'events', path: 'evenements', module: 'events', label: 'Événement', plural: 'Événements' },
};

/** Ressource API d'un type d'entité ('custom' : entités des mods). */
export const resourceOf = (entityType) => (entityType === 'custom' ? 'customEntities' : BASE_ENTITIES[entityType]?.resource);

/** Nom affiché d'une entité, quel que soit son type. */
export const entityLabel = (entityType, entity) => {
  if (!entity) return '';
  if (entityType === 'character') return characterName(entity);
  return entity.name || entity.title || `#${entity.id}`;
};

/** Vignette d'une entité, quel que soit son type. */
export const entityThumb = (entity) => uploadUrl(entity?.avatar || entity?.image || entity?.banner) || null;

/**
 * Chemin (relatif à l'univers) de la fiche d'une entité.
 * `typeOfCustom(entity)` : type de mod d'une entité `custom` (voir useUniverseMods().typeOf).
 */
export const entityPath = (entityType, entity, typeOfCustom) => {
  if (!entity) return null;
  if (entityType === 'custom') {
    const type = typeOfCustom?.(entity);
    return type ? `${type.basePath}/${entity.id}` : null;
  }
  const base = BASE_ENTITIES[entityType];
  return base ? `${base.path}/${entity.id}` : null;
};
