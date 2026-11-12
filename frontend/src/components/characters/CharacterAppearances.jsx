import { Link } from 'react-router';
import { BookOpen } from 'lucide-react';
import { importanceColor } from '@/config/events';
import { EPISODE_ROLES, episodeRole, sortedEpisodes } from '@/config/stories';
import { SheetSection } from '@/components/entity/SheetSection';
import { universePath } from '@/utils/universe';
import styles from './CharacterAppearances.module.scss';

const roleLabel = (role) => EPISODE_ROLES.find((r) => r.value === role)?.label || role;

/**
 * Parcours d'un personnage : épisodes où il apparaît, regroupés par histoire (avec son rôle),
 * et événements auxquels il a assisté.
 * - `stories` / `events` : listes de l'univers (vides si le module est désactivé)
 */
export function CharacterAppearances({ universe, character, stories, events }) {
  const appearances = stories
    .map((s) => ({
      story: s,
      episodes: sortedEpisodes(s)
        .map((ep, index) => ({ ep, index, member: ep.characters?.find((c) => c.id === character.id) }))
        .filter((x) => x.member),
    }))
    .filter((a) => a.episodes.length);
  const lived = events.filter((e) => e.characters?.some((c) => c.id === character.id));

  if (!appearances.length && !lived.length) return null;

  return (
    <>
      {appearances.length > 0 && (
        <SheetSection id="histoires" title="Histoires">
          <ul className={styles.stories}>
            {appearances.map(({ story, episodes }) => (
              <li key={story.id} className={styles.story}>
                <Link to={universePath(universe, `histoires/${story.id}`)} className={styles.storyName}>
                  <BookOpen aria-hidden /> {story.name}
                </Link>
                <ol className={styles.episodes}>
                  {episodes.map(({ ep, index, member }) => (
                    <li key={ep.id}>
                      <Link to={universePath(universe, `histoires/${story.id}/episodes/${ep.id}`)} className={styles.episode}>
                        <span className={styles.number}>{index + 1}</span>
                        <span className={styles.title}>{ep.title}</span>
                        <span className={styles.role} data-role={episodeRole(member)}>
                          {roleLabel(episodeRole(member))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {lived.length > 0 && (
        <SheetSection id="evenements" title="Événements vécus">
          <ul className={styles.events}>
            {lived.map((e) => (
              <li key={e.id}>
                <Link to={universePath(universe, `evenements/${e.id}`)} className={styles.event} style={{ '--tone': importanceColor(e.importance) || 'var(--border-strong)' }}>
                  <span className={styles.eventName}>{e.name}</span>
                  {e.date && <span className={styles.eventDate}>{e.date}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}
    </>
  );
}
