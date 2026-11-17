import { Link } from 'react-router';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { plural, universePath } from '@/utils/universe';
import { formatRpDate } from './rpMarkup';
import styles from './Roleplay.module.scss';

/**
 * Carte d'une scène de roleplay : titre, lieu, personnages, nombre de messages et dates.
 * `storyId` : scène lue dans une histoire (la page propose alors la scène suivante de cette histoire).
 */
export function SceneCard({ universe, scene, place, charactersById, storyId }) {
  const characters = scene.characterIds.map((id) => charactersById.get(id)).filter(Boolean);
  return (
    <Link to={`${universePath(universe, `roleplay/scenes/${scene.id}`)}${storyId ? `?histoire=${storyId}` : ''}`} className={styles.sceneCard}>
      <span className={styles.sceneTitle}>{scene.title}</span>
      <span className={styles.sceneMeta}>
        {[place?.name, plural(scene.messageCount, 'message'), scene.firstAt && `du ${formatRpDate(scene.firstAt)} au ${formatRpDate(scene.lastAt)}`, scene.episodeIds.length > 0 && plural(scene.episodeIds.length, 'épisode')]
          .filter(Boolean)
          .join(' · ')}
      </span>
      {scene.description && <span className={styles.sceneDescription}>{scene.description}</span>}
      {characters.length > 0 && (
        <span className={styles.miniAvatars} aria-label={`Personnages : ${characters.map((c) => c.firstname || c.name).join(', ')}`}>
          {characters.slice(0, 8).map((c) => <CharacterAvatar key={c.id} character={c} round />)}
        </span>
      )}
    </Link>
  );
}
