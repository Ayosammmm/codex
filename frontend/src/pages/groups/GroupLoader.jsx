import { EntityLoader } from '../EntityLoader';

const LABELS = {
  loading: 'Chargement du groupe…',
  notFound: 'Groupe introuvable',
  notFoundText: 'Ce groupe n’existe pas ou a été supprimé.',
  error: 'Impossible de charger le groupe',
  back: 'Retour aux groupes',
  listPath: 'groupes',
};

/** Charge le groupe de l'URL (:groupId) ; `children(group, universe)`. */
export const GroupLoader = ({ children }) => (
  <EntityLoader resource="groups" param="groupId" labels={LABELS}>
    {children}
  </EntityLoader>
);
