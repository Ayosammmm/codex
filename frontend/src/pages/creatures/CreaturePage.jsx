import { Link } from 'react-router';
import { ArrowLeft, Pencil } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { CreatureSheet } from '@/components/creatures/CreatureSheet';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { CreatureLoader } from './CreatureLoader';
import { usePermissions } from '@/auth/auth';

/** Fiche d'une créature (/bestiaire/:creatureId), en lecture seule. */
export default function CreaturePage() {
  const { canEdit } = usePermissions();
  return (
    <CreatureLoader>
      {(creature, universe) => (
        <EntityThemeZone universe={universe} colors={creature.colors} background={uploadUrl(creature.background)} backgroundColor={creature.backgroundColor}>
          <main className={`${page.main} ${page.mainSpaced}`}>
            <Link to={universePath(universe, 'bestiaire')} className={page.backLink}>
              <ArrowLeft aria-hidden /> Bestiaire
            </Link>
            <div className={page.belowBack}>
              <CreatureSheet
                key={creature.id}
                universe={universe}
                creature={creature}
                modules={{ ranks: isModuleEnabled(getModulesState(universe), 'powerRanks') }}
                actions={
                  canEdit('creature', creature.id) && (
                    <Button as={Link} to={universePath(universe, `bestiaire/${creature.id}/modifier`)} variant="primary" icon={Pencil}>
                      Modifier
                    </Button>
                  )
                }
              />
            </div>
          </main>
        </EntityThemeZone>
      )}
    </CreatureLoader>
  );
}
