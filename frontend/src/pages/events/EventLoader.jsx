import { EntityLoader } from '../EntityLoader';

const LABELS = {
  loading: 'Chargement de l’événement…',
  notFound: 'Événement introuvable',
  notFoundText: 'Cet événement n’existe pas ou a été supprimé.',
  error: 'Impossible de charger l’événement',
  back: 'Retour aux événements',
  listPath: 'evenements',
};

/** Charge l'événement de l'URL (:eventId) ; `children(event, universe)`. */
export const EventLoader = ({ children }) => (
  <EntityLoader resource="events" param="eventId" labels={LABELS}>
    {children}
  </EntityLoader>
);
