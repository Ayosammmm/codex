import { EntityLoader } from '../EntityLoader';

const LABELS = {
  loading: 'Chargement de l’histoire…',
  notFound: 'Histoire introuvable',
  notFoundText: 'Cette histoire n’existe pas ou a été supprimée.',
  error: 'Impossible de charger l’histoire',
  back: 'Retour aux histoires',
  listPath: 'histoires',
};

/** Charge l'histoire de l'URL (:storyId) ; `children(story, universe)`. */
export const StoryLoader = ({ children }) => (
  <EntityLoader resource="stories" param="storyId" labels={LABELS}>
    {children}
  </EntityLoader>
);
