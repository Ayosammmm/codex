import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, MapPin } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { importanceColor } from '@/config/events';
import { EPISODE_ROLES, episodeRole } from '@/config/stories';
import { Badge } from '@/components/ui/Badge';
import { RichText } from '@/components/ui/RichText';
import { CharacterChip } from '@/components/characters/CharacterChip';
import { SheetSection } from '@/components/entity/SheetSection';
import { plainText, universePath } from '@/utils/universe';
import styles from './EpisodeSheet.module.scss';

/**
 * Fiche d'un épisode : sa place dans l'histoire, le récit, les personnages par rôle,
 * les lieux et les événements (module actif), puis la navigation vers les épisodes voisins.
 * - `episodes` : épisodes de l'histoire dans l'ordre (pour le numéro et la navigation)
 */
export function EpisodeSheet({ universe, story, episode: ep, episodes, modules, actions }) {
  const index = episodes.findIndex((e) => e.id === ep.id);
  const prev = index > 0 ? episodes[index - 1] : null;
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null;
  const path = (e) => universePath(universe, `histoires/${story.id}/episodes/${e.id}`);
  const characters = [...(ep.characters || [])].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr'));
  const events = modules.events ? [...(ep.events || [])].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9)) : [];

  return (
    <article className={styles.sheet}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.kicker}>
            {index >= 0 && <span className={styles.number}>Épisode {index + 1}</span>}
            <Link to={universePath(universe, `histoires/${story.id}`)}>{story.name}</Link>
          </p>
          <h1 className={styles.title}>{ep.title}</h1>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>

      {plainText(ep.description) ? (
        <SheetSection id="recit" title="Récit">
          <RichText html={ep.description} />
        </SheetSection>
      ) : (
        <p className={styles.note}>Le récit de cet épisode n’est pas encore écrit.</p>
      )}

      {characters.length > 0 && (
        <SheetSection id="personnages" title="Personnages">
          {EPISODE_ROLES.map((role) => {
            const people = characters.filter((c) => episodeRole(c) === role.value);
            if (!people.length) return null;
            return (
              <div key={role.value} className={styles.group}>
                <p className={styles.groupLabel}>
                  {role.plural} <span>{people.length}</span>
                </p>
                <ul className={styles.cast}>
                  {people.map((c) => (
                    <li key={c.id}>
                      <CharacterChip universe={universe} character={c} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </SheetSection>
      )}

      {ep.places?.length > 0 && (
        <SheetSection id="lieux" title="Lieux">
          <ul className={styles.chips}>
            {ep.places.map((p) => (
              <li key={p.id}>
                <Link to={universePath(universe, `lieux/${p.id}`)} className={styles.chip}>
                  <MapPin aria-hidden /> {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {events.length > 0 && (
        <SheetSection id="evenements" title="Événements">
          <ul className={styles.events}>
            {events.map((ev) => (
              <li key={ev.id}>
                <Link to={universePath(universe, `evenements/${ev.id}`)} className={styles.event} style={{ '--tone': importanceColor(ev.importance) || 'var(--border-strong)' }}>
                  <span className={styles.eventName}>{ev.name}</span>
                  <span className={styles.eventMeta}>
                    {ev.date && <span>{ev.date}</span>}
                    {ev.importance && <Badge color={importanceColor(ev.importance)}>{ev.importance}</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {(prev || next) && (
        <nav aria-label="Épisodes voisins" className={styles.pager}>
          {prev ? (
            <Link to={path(prev)} className={styles.pagerLink}>
              <ArrowLeft aria-hidden />
              <span>
                <span className={styles.pagerLabel}>Épisode précédent</span>
                <span className={styles.pagerTitle}>{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={path(next)} className={`${styles.pagerLink} ${styles.pagerNext}`}>
              <span>
                <span className={styles.pagerLabel}>Épisode suivant</span>
                <span className={styles.pagerTitle}>{next.title}</span>
              </span>
              <ArrowRight aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
