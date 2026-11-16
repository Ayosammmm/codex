import { Link } from 'react-router';
import { ArrowLeft, Pencil } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { GroupSheet } from '@/components/groups/GroupSheet';
import { SoundSheetSection } from '@/components/sound/SoundSections';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { GroupLoader } from './GroupLoader';
import { usePermissions } from '@/auth/auth';

/** Fiche d'un groupe (/groupes/:groupId), en lecture seule. */
export default function GroupPage() {
  return <GroupLoader>{(group, universe) => <GroupView key={group.id} universe={universe} group={group} />}</GroupLoader>;
}

function GroupView({ universe, group }) {
  const { canEdit } = usePermissions();
  // Sous-groupes depuis la liste de l'univers (nom, logo, couleurs, membres)
  const { data: groups = [] } = useEntityList('groups', universe.id);
  const subgroups = groups.filter((g) => g.parentId === group.id).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <EntityThemeZone universe={universe} colors={group.colors} background={uploadUrl(group.background)} backgroundColor={group.backgroundColor}>
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to={universePath(universe, 'groupes')} className={page.backLink}>
          <ArrowLeft aria-hidden /> Groupes
        </Link>
        <div className={page.belowBack}>
          <GroupSheet
            universe={universe}
            group={group}
            subgroups={subgroups}
            sound={
              isModuleEnabled(getModulesState(universe), 'sound') && (
                <SoundSheetSection sounds={[{ label: 'Thème', path: group.themeSound, autoPlay: true }]} />
              )
            }
            actions={
              canEdit('group', group.id) && (
                <Button as={Link} to={universePath(universe, `groupes/${group.id}/modifier`)} variant="primary" icon={Pencil}>
                  Modifier
                </Button>
              )
            }
          />
        </div>
      </main>
    </EntityThemeZone>
  );
}
