import { useOutletContext, useParams } from 'react-router';
import { useEntity } from '@/api/queries';
import { Spinner } from '@/components/ui/Feedback';
import { EntityLoader } from '../EntityLoader';

const LABELS = {
  loading: 'Chargement de l’épisode…',
  notFound: 'Épisode introuvable',
  notFoundText: 'Cet épisode n’existe pas ou a été supprimé.',
  error: 'Impossible de charger l’épisode',
  back: 'Retour aux histoires',
  listPath: 'histoires',
};

/**
 * Charge l'histoire (:storyId) et, si `withEpisode`, l'épisode (:episodeId) de l'URL ;
 * `children({ story, episode, universe })`.
 */
export function EpisodeLoader({ withEpisode = true, children }) {
  const { universe } = useOutletContext();
  const { storyId } = useParams();
  const story = useEntity('stories', storyId, { universeId: universe.id });

  if (story.isPending) return <Spinner label="Chargement de l’histoire…" />;
  // Histoire introuvable : l'EntityLoader de l'épisode affichera l'erreur adaptée
  const storyData = story.data || { id: Number(storyId), name: 'Histoire', episodes: [] };
  if (!withEpisode) return children({ story: storyData, episode: null, universe });
  return (
    <EntityLoader resource="episodes" param="episodeId" labels={LABELS}>
      {(episode) => children({ story: storyData, episode, universe })}
    </EntityLoader>
  );
}
