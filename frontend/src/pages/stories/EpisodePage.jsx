import { Link } from 'react-router';
import { ArrowLeft, Pencil } from '@/components/ui/icons';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { episodeBackdrop, sortedEpisodes } from '@/config/stories';
import { Button } from '@/components/ui/Button';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { EpisodeSheet } from '@/components/stories/EpisodeSheet';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { EpisodeLoader } from './EpisodeLoader';
import { usePermissions } from '@/auth/auth';

/** Fiche d'un épisode (/histoires/:storyId/episodes/:episodeId), aux couleurs de son histoire. */
export default function EpisodePage() {
  const { canEdit } = usePermissions();
  return (
    <EpisodeLoader>
      {({ story, episode, universe }) => (
        <EntityThemeZone universe={universe} colors={story.colors} {...episodeBackdrop(episode, story)}>
          <main className={`${page.main} ${page.mainSpaced}`}>
            <Link to={universePath(universe, `histoires/${story.id}`)} className={page.backLink}>
              <ArrowLeft aria-hidden /> {story.name}
            </Link>
            <div className={page.belowBack}>
              <EpisodeSheet
                key={episode.id}
                universe={universe}
                story={story}
                episode={episode}
                episodes={sortedEpisodes(story)}
                modules={{ events: isModuleEnabled(getModulesState(universe), 'events'), roleplay: isModuleEnabled(getModulesState(universe), 'roleplay') }}
                actions={
                  canEdit('story', story.id) && (
                    <Button as={Link} to={universePath(universe, `histoires/${story.id}/episodes/${episode.id}/modifier`)} variant="primary" icon={Pencil}>
                      Modifier
                    </Button>
                  )
                }
              />
            </div>
          </main>
        </EntityThemeZone>
      )}
    </EpisodeLoader>
  );
}
