import { EntityLoader } from '../EntityLoader';

const LABELS = {
  loading: 'Chargement de la créature…',
  notFound: 'Créature introuvable',
  notFoundText: 'Cette créature n’existe pas ou a été supprimée.',
  error: 'Impossible de charger la créature',
  back: 'Retour au bestiaire',
  listPath: 'bestiaire',
};

/** Charge la créature de l'URL (:creatureId) ; `children(creature, universe)`. */
export const CreatureLoader = ({ children }) => (
  <EntityLoader resource="creatures" param="creatureId" labels={LABELS}>
    {children}
  </EntityLoader>
);
