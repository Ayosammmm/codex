import { IMG } from '@/api/client';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, CalendarClock, MapPin } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { eventImage, importanceColor } from '@/config/events';
import { Badge } from '@/components/ui/Badge';
import { RichText } from '@/components/ui/RichText';
import { CharacterChip } from '@/components/characters/CharacterChip';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { ModFieldsSheetSections } from '@/mods/ModFieldsSections';
import { SheetSection } from '@/components/entity/SheetSection';
import { GroupLogo } from '@/components/groups/GroupLogo';
import { entityColorVars } from '@/theme/universeTheme';
import { plainText, universePath } from '@/utils/universe';
import story from '@/components/stories/StorySheet.module.scss';
import styles from './EventSheet.module.scss';

/** Épisodes d'un événement regroupés par histoire. */
function episodesByStory(event) {
  const byStory = new Map();
  for (const ep of event.episodes || []) {
    const stories = ep.stories?.length ? ep.stories : [{ id: 0, name: 'Hors histoire' }];
    for (const s of stories) {
      if (!byStory.has(s.id)) byStory.set(s.id, { ...s, episodes: [] });
      byStory.get(s.id).episodes.push(ep);
    }
  }
  return [...byStory.values()];
}

/**
 * Fiche d'un événement : moment, importance, description, épisodes où il apparaît (par histoire),
 * personnages, lieux et groupes présents, puis les événements voisins dans la chronologie.
 * - `prev` / `next` : événements voisins ; `modules` : { groups }
 */
export function EventSheet({ universe, event: e, prev, next, modules, actions }) {
  const image = eventImage(e, IMG.large);
  const characters = [...(e.characters || [])].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr'));
  const stories = episodesByStory(e);
  const path = (ev) => universePath(universe, `evenements/${ev.id}`);

  return (
    <article className={story.sheet}>
      <header className={story.hero}>
        {image && <EntityBanner src={image} zoom={eventImage(e)} label={`Image de ${e.name}`} className={story.banner} />}
        <div className={story.identity}>
          <div className={story.heading}>
            <p className={styles.kicker}>
              <span className={styles.date}>
                <CalendarClock aria-hidden /> {e.date || 'Date inconnue'}
              </span>
              {e.importance && <Badge color={importanceColor(e.importance)}>Importance {e.importance.toLowerCase()}</Badge>}
            </p>
            <h1 className={story.name}>{e.name}</h1>
          </div>
          {actions && <div className={story.actions}>{actions}</div>}
        </div>
      </header>

      {plainText(e.description) && (
        <SheetSection id="description" title="Description">
          <RichText html={e.description} />
        </SheetSection>
      )}

      {stories.length > 0 && (
        <SheetSection id="episodes" title="Dans les histoires">
          <ul className={styles.stories}>
            {stories.map((s) => (
              <li key={s.id} className={styles.story} style={entityColorVars(s.colors)}>
                <p className={styles.storyName}>
                  <BookOpen aria-hidden />
                  {s.id ? <Link to={universePath(universe, `histoires/${s.id}`)}>{s.name}</Link> : s.name}
                </p>
                <ul className={styles.episodeList}>
                  {s.episodes.map((ep) => (
                    <li key={ep.id}>
                      {s.id ? <Link to={universePath(universe, `histoires/${s.id}/episodes/${ep.id}`)}>{ep.title}</Link> : ep.title}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {characters.length > 0 && (
        <SheetSection id="personnages" title="Personnages présents">
          <ul className={story.cast}>
            {characters.map((c) => (
              <li key={c.id}>
                <CharacterChip universe={universe} character={c} />
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {e.places?.length > 0 && (
        <SheetSection id="lieux" title="Lieux">
          <ul className={story.chips}>
            {e.places.map((p) => (
              <li key={p.id}>
                <Link to={universePath(universe, `lieux/${p.id}`)} className={story.chip}>
                  <MapPin aria-hidden /> {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {modules.groups && e.groups?.length > 0 && (
        <SheetSection id="groupes" title="Groupes impliqués">
          <ul className={story.chips}>
            {e.groups.map((g) => (
              <li key={g.id}>
                <Link to={universePath(universe, `groupes/${g.id}`)} className={styles.group} style={entityColorVars(g.colors)}>
                  <GroupLogo group={g} round className={styles.groupLogo} />
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      <ModFieldsSheetSections entityType="event" entityId={e.id} />

      {(prev || next) && (
        <nav aria-label="Événements voisins dans la chronologie" className={styles.pager}>
          {prev ? (
            <Link to={path(prev)} className={styles.pagerLink}>
              <ArrowLeft aria-hidden />
              <span>
                <span className={styles.pagerLabel}>Avant</span>
                <span className={styles.pagerTitle}>{prev.name}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={path(next)} className={`${styles.pagerLink} ${styles.pagerNext}`}>
              <span>
                <span className={styles.pagerLabel}>Après</span>
                <span className={styles.pagerTitle}>{next.name}</span>
              </span>
              <ArrowRight aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
