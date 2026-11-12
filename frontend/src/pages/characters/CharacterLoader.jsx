import { EntityLoader } from '../EntityLoader';

const LABELS = {
  loading: 'Chargement du personnage…',
  notFound: 'Personnage introuvable',
  notFoundText: 'Ce personnage n’existe pas ou a été supprimé.',
  error: 'Impossible de charger le personnage',
  back: 'Retour aux personnages',
  listPath: 'personnages',
};

/** Charge le personnage de l'URL (:characterId) ; `children(character, universe)`. */
export const CharacterLoader = ({ children }) => (
  <EntityLoader resource="characters" param="characterId" labels={LABELS}>
    {children}
  </EntityLoader>
);
