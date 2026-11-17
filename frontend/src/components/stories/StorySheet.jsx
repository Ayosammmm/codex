import { Link } from 'react-router';
import { CalendarRange, MapPin, Plus } from '@/components/ui/icons';
import { importanceColor } from '@/config/events';
import { EPISODE_ROLES, episodeRole, sortedEpisodes, storyCharacters, storyImage, storyLinked, storyPeriod } from '@/config/stories';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { CharacterChip } from '@/components/characters/CharacterChip';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { ModFieldsSheetSections } from '@/mods/ModFieldsSections';
import { SheetSection } from '@/components/entity/SheetSection';
import { plainText, plural, universePath } from '@/utils/universe';
import styles from './StorySheet.module.scss';
import { usePermissions } from '@/auth/auth';

const excerpt = (html, max = 220) => {
  const text = plainText(html);
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

/**
 * Fiche d'une histoire : couverture, période, présentation, épisodes dans l'ordre,
 * puis personnages, lieux et événements réunis depuis ses épisodes.
 * - `modules` : { events } ; `actions` : boutons de l'en-tête (ex. « Modifier »)
 */
export function StorySheet({ universe, story: s, modules, actions }) {
  const { canEdit } = usePermissions();
  const image = storyImage(s);
  const episodes = sortedEpisodes(s);
  const cast = storyCharacters(s);
  const places = storyLinked(s, 'places').sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const events = modules.events ? storyLinked(s, 'events').sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9)) : [];
  const episodePath = (ep) => universePath(universe, `histoires/${s.id}/episodes/${ep.id}`);

  return (
    <article className={styles.sheet}>
      <header className={styles.hero}>
        {image && <EntityBanner src={image} className={styles.banner} />}
        <div className={styles.identity}>
          <div className={styles.heading}>
            {storyPeriod(s) && (
              <p className={styles.period}>
                <CalendarRange aria-hidden /> {storyPeriod(s)}
              </p>
            )}
            <h1 className={styles.name}>{s.name}</h1>
            <p className={styles.stats}>
              {[plural(episodes.length, 'épisode'), cast.length > 0 && plural(cast.length, 'personnage')].filter(Boolean).join(' · ')}
            </p>
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      </header>

      {plainText(s.description) && (
        <SheetSection id="presentation" title="Présentation">
          <RichText html={s.description} />
        </SheetSection>
      )}

      <SheetSection id="episodes" title="Épisodes">
        {episodes.length === 0 ? (
          <p className={styles.note}>Cette histoire n’a pas encore d’épisode.</p>
        ) : (
          <ol className={styles.episodes}>
            {episodes.map((ep, i) => {
              const main = (ep.characters || []).filter((c) => episodeRole(c) === 'principal');
              const shown = main.length ? main : ep.characters || [];
              return (
                <li key={ep.id} className={styles.episode}>
                  <span className={styles.number} aria-hidden>
                    {i + 1}
                  </span>
                  <Link to={episodePath(ep)} className={styles.episodeCard}>
                    <span className={styles.episodeTitle}>
                      <span className={styles.srOnly}>Épisode {i + 1} : </span>
                      {ep.title}
                    </span>
                    {excerpt(ep.description) && <span className={styles.excerpt}>{excerpt(ep.description)}</span>}
                    {(shown.length > 0 || ep.places?.length > 0) && (
                      <span className={styles.episodeMeta}>
                        <AvatarStack members={shown.slice(0, 5)} total={shown.length} className={styles.stack} />
                        {ep.places?.length > 0 && (
                          <span className={styles.metaItem}>
                            <MapPin aria-hidden /> {ep.places.map((p) => p.name).join(', ')}
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
        {canEdit('story', s.id) && (
          <Button as={Link} to={universePath(universe, `histoires/${s.id}/episodes/nouveau`)} icon={Plus} size="sm" className={styles.addEpisode}>
            Ajouter un épisode
          </Button>
        )}
      </SheetSection>

      {cast.length > 0 && (
        <SheetSection id="personnages" title="Personnages">
          {EPISODE_ROLES.map((role) => {
            const people = cast.filter((c) => c.role === role.value);
            if (!people.length) return null;
            return (
              <div key={role.value} className={styles.castGroup}>
                <p className={styles.castLabel}>
                  {role.plural} <span>{people.length}</span>
                </p>
                <ul className={styles.cast}>
                  {people.map((c) => (
                    <li key={c.id}>
                      <CharacterChip universe={universe} character={c} note={plural(c.appearances, 'épisode')} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </SheetSection>
      )}

      {places.length > 0 && (
        <SheetSection id="lieux" title="Lieux">
          <ul className={styles.chips}>
            {places.map((p) => (
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
          <ul className={styles.chips}>
            {events.map((ev) => (
              <li key={ev.id}>
                <Link to={universePath(universe, `evenements/${ev.id}`)} className={styles.eventChip} style={{ '--tone': importanceColor(ev.importance) || 'var(--border-strong)' }}>
                  <span className={styles.eventName}>{ev.name}</span>
                  {ev.date && <span className={styles.eventDate}>{ev.date}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      <ModFieldsSheetSections entityType="story" entityId={s.id} />
    </article>
  );
}
