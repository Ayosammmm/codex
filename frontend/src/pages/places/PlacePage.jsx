import { Link } from 'react-router';
import { ArrowLeft, MessagesSquare, Pencil } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { entityAncestors } from '@/components/entity/tree';
import { Button } from '@/components/ui/Button';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { PlaceSheet } from '@/components/places/PlaceSheet';
import { SoundSheetSection } from '@/components/sound/SoundSections';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { PlaceLoader } from './PlaceLoader';
import { usePermissions } from '@/auth/auth';

/** Fiche d'un lieu (/lieux/:placeId), en lecture seule. */
export default function PlacePage() {
  return <PlaceLoader>{(place, universe) => <PlaceView key={place.id} universe={universe} place={place} />}</PlaceLoader>;
}

function PlaceView({ universe, place }) {
  const { canEdit } = usePermissions();
  const modulesState = getModulesState(universe);
  const groupsOn = isModuleEnabled(modulesState, 'groups');
  const creaturesOn = isModuleEnabled(modulesState, 'creatures');
  const roleplayOn = isModuleEnabled(modulesState, 'roleplay');
  // Liste de l'univers : fil d'Ariane, sous-lieux (images, compteurs) et logos des groupes indirects
  const { data: places = [] } = useEntityList('places', universe.id);
  const { data: groups = [] } = useEntityList('groups', universe.id, { enabled: groupsOn });
  const ancestors = entityAncestors(place, places);
  const subplaces = places.filter((p) => p.parentId === place.id).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  // Faune : créatures du bestiaire dont ce lieu est un habitat
  const { data: creatures = [] } = useEntityList('creatures', universe.id, { enabled: creaturesOn });
  const fauna = creaturesOn ? creatures.filter((c) => c.habitats?.some((h) => h.id === place.id)) : [];
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const enriched = {
    ...place,
    indirectlyControllingGroups: (place.indirectlyControllingGroups || []).map((g) => groupsById.get(g.id) || g),
  };

  return (
    <EntityThemeZone universe={universe} colors={place.colors} background={uploadUrl(place.background)} backgroundColor={place.backgroundColor}>
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to={universePath(universe, 'lieux')} className={page.backLink}>
          <ArrowLeft aria-hidden /> Lieux
        </Link>
        <div className={page.belowBack}>
          <PlaceSheet
            universe={universe}
            place={enriched}
            ancestors={ancestors}
            sound={
              isModuleEnabled(modulesState, 'sound') && (
                <SoundSheetSection
                  sounds={[
                    { label: 'Thème', path: place.themeSound, autoPlay: true },
                    { label: 'Ambiance', path: place.ambientSound },
                  ]}
                />
              )
            }
            subplaces={subplaces}
            fauna={fauna}
            modules={{ groups: groupsOn, ranks: isModuleEnabled(modulesState, 'powerRanks'), map: isModuleEnabled(modulesState, 'map') }}
            actions={
              (roleplayOn || canEdit('place', place.id)) && <>
                {roleplayOn && (
                  <Button as={Link} to={universePath(universe, `roleplay/lieux/${place.id}`)} icon={MessagesSquare}>
                    Roleplay
                  </Button>
                )}
                {canEdit('place', place.id) && (
                  <Button as={Link} to={universePath(universe, `lieux/${place.id}/modifier`)} variant="primary" icon={Pencil}>
                    Modifier
                  </Button>
                )}
              </>
            }
          />
        </div>
      </main>
    </EntityThemeZone>
  );
}
