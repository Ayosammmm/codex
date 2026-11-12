import { EntityLoader } from '../EntityLoader';

const LABELS = {
  loading: 'Chargement de l’espèce…',
  notFound: 'Espèce introuvable',
  notFoundText: 'Cette espèce n’existe pas ou a été supprimée.',
  error: 'Impossible de charger l’espèce',
  back: 'Retour aux espèces',
  listPath: 'especes',
};

/** Charge l'espèce de l'URL (:specieId) ; `children(specie, universe)`. */
export const SpecieLoader = ({ children }) => (
  <EntityLoader resource="species" param="specieId" labels={LABELS}>
    {children}
  </EntityLoader>
);
