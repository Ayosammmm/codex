import { SoundSheetSection } from '@/components/sound/SoundSections';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Pencil } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { CharacterSheet } from '@/components/characters/CharacterSheet';
import { CharacterFormSwitcher } from '@/components/characters/CharacterFormSwitcher';
import { characterInForm, findForm } from '@/components/characters/characterForms';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { detectDynamics } from '@/utils/dynamics';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { CharacterLoader } from './CharacterLoader';
import { usePermissions } from '@/auth/auth';

/** Fiche d'un personnage (/personnages/:characterId), en lecture seule. */
export default function CharacterPage() {
  return <CharacterLoader>{(character, universe) => <CharacterView key={character.id} universe={universe} character={character} />}</CharacterLoader>;
}

function CharacterView({ universe, character: base }) {
  const { canEdit } = usePermissions();
  // Forme affichée (?forme=id) ; forme par défaut si absente ou inconnue
  const [params, setParams] = useSearchParams();
  const form = findForm(base, params.get('forme'));
  const character = characterInForm(base, form);
  const selectForm = (value) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set('forme', value);
      else next.delete('forme');
      return next;
    }, { replace: true });
  const state = getModulesState(universe);
  const on = (key) => isModuleEnabled(state, key);
  const modules = { groups: on('groups'), species: on('species'), personality: on('personality'), relations: on('relations'), powers: on('powers'), ranks: on('powerRanks'), roleplay: on('roleplay') };
  // Parcours : histoires et événements de l'univers (si leurs modules sont actifs)
  const { data: stories = [] } = useEntityList('stories', universe.id, { enabled: on('stories') });
  const { data: events = [] } = useEntityList('events', universe.id, { enabled: on('events') });
  // Dynamiques de groupe impliquant ce personnage (module Relations)
  const relationsOn = modules.relations;
  const groupsOn = modules.groups;
  const allCharacters = useEntityList('characters', universe.id, { enabled: relationsOn }).data;
  const groups = useEntityList('groups', universe.id, { enabled: relationsOn && groupsOn }).data;
  // (calcul mémorisé automatiquement par le React Compiler)
  const dynamics =
    relationsOn && allCharacters
      ? {
          list: detectDynamics(allCharacters, groupsOn ? groups || [] : []).filter((d) => d.members.includes(character.id)),
          byId: new Map(allCharacters.map((c) => [c.id, c])),
        }
      : null;

  return (
    <EntityThemeZone universe={universe} colors={character.colors} background={uploadUrl(character.background)}>
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to={universePath(universe, 'personnages')} className={page.backLink}>
          <ArrowLeft aria-hidden /> Personnages
        </Link>
        <div className={page.belowBack}>
          <CharacterSheet
            universe={universe}
            character={character}
            modules={modules}
            formSwitcher={<CharacterFormSwitcher character={base} value={form ? form.id : ''} onChange={selectForm} />}
            sound={on('sound') && <SoundSheetSection sounds={[{ label: 'Thème', path: character.themeSound, autoPlay: true }]} />}
            stories={on('stories') ? stories : []}
            events={on('events') ? events : []}
            dynamics={dynamics}
            actions={
              canEdit('character', character.id) && (
                <Button as={Link} to={universePath(universe, `personnages/${character.id}/modifier${form ? `?forme=${form.id}` : ''}`)} variant="primary" icon={Pencil}>
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
