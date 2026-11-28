import { Link } from 'react-router';
import { ArrowLeft, Pencil } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { StorySheet } from '@/components/stories/StorySheet';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { StoryLoader } from './StoryLoader';
import { usePermissions } from '@/auth/auth';

/** Fiche d'une histoire (/histoires/:storyId), en lecture seule. */
export default function StoryPage() {
  const { canEdit } = usePermissions();
  return (
    <StoryLoader>
      {(story, universe) => (
        <EntityThemeZone tinted universe={universe} colors={story.colors} background={uploadUrl(story.background)} backgroundColor={story.backgroundColor}>
          <main className={`${page.main} ${page.mainSpaced}`}>
            <Link to={universePath(universe, 'histoires')} className={page.backLink}>
              <ArrowLeft aria-hidden /> Histoires
            </Link>
            <div className={page.belowBack}>
              <StorySheet
                key={story.id}
                universe={universe}
                story={story}
                modules={{ events: isModuleEnabled(getModulesState(universe), 'events') }}
                actions={
                  canEdit('story', story.id) && (
                    <Button as={Link} to={universePath(universe, `histoires/${story.id}/modifier`)} variant="primary" icon={Pencil}>
                      Modifier
                    </Button>
                  )
                }
              />
            </div>
          </main>
        </EntityThemeZone>
      )}
    </StoryLoader>
  );
}
