import { EntityLoader } from '../EntityLoader';

const LABELS = {
  loading: 'Chargement du lieu…',
  notFound: 'Lieu introuvable',
  notFoundText: 'Ce lieu n’existe pas ou a été supprimé.',
  error: 'Impossible de charger le lieu',
  back: 'Retour aux lieux',
  listPath: 'lieux',
};

/** Charge le lieu de l'URL (:placeId) ; `children(place, universe)`. */
export const PlaceLoader = ({ children }) => (
  <EntityLoader resource="places" param="placeId" labels={LABELS}>
    {children}
  </EntityLoader>
);
