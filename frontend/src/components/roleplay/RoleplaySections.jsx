import { useEntityList } from '@/api/queries';
import { useCharacterRoleplay, useEpisodeScenes } from '@/api/roleplay';
import { SheetSection } from '@/components/entity/SheetSection';
import { SceneCard } from './SceneCard';
import styles from './Roleplay.module.scss';

/** Fiche personnage : scènes de roleplay où il apparaît. */
export function CharacterRoleplaySection({ universe, character }) {
  const { data } = useCharacterRoleplay(character.id);
  const { data: places = [] } = useEntityList('places', universe.id);
  const { data: characters = [] } = useEntityList('characters', universe.id);
  if (!data?.scenes.length) return null;
  const placesById = new Map(places.map((p) => [p.id, p]));
  const charactersById = new Map(characters.map((c) => [c.id, c]));

  return (
    <SheetSection id="roleplay" title="Roleplay">
      <div className={styles.sceneList}>
        {data.scenes.map((s) => (
          <SceneCard key={s.id} universe={universe} scene={s} place={placesById.get(s.placeId)} charactersById={charactersById} />
        ))}
      </div>
    </SheetSection>
  );
}

/** Fiche épisode : scènes de roleplay qui lui sont rattachées (le choix se fait dans l'édition de l'épisode). */
export function EpisodeScenesSection({ universe, episode }) {
  const { data: scenes = [] } = useEpisodeScenes(episode.id);
  const { data: places = [] } = useEntityList('places', universe.id, { enabled: scenes.length > 0 });
  const { data: characters = [] } = useEntityList('characters', universe.id, { enabled: scenes.length > 0 });
  if (!scenes.length) return null;
  const placesById = new Map(places.map((p) => [p.id, p]));
  const charactersById = new Map(characters.map((c) => [c.id, c]));

  return (
    <SheetSection id="roleplay" title="Scènes de roleplay">
      <div className={styles.sceneList}>
        {scenes.map((s) => (
          <SceneCard key={s.id} universe={universe} scene={s} place={placesById.get(s.placeId)} charactersById={charactersById} />
        ))}
      </div>
    </SheetSection>
  );
}
