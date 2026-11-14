import { Link } from 'react-router';
import { ArrowDown, ArrowUp, BookOpen, MapPin } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { IMPORTANCE, eventImage, eventStories, importanceColor } from '@/config/events';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { NameCell, dash } from '@/components/entity/EntityTable';
import { entityColorVars } from '@/theme/universeTheme';
import { plainText } from '@/utils/universe';
import styles from './EventViews.module.scss';

const people = (e) => [...(e.characters || [])].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr'));
const excerpt = (html, max = 180) => {
  const text = plainText(html);
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

/** Méta d'un événement : histoires, lieux, personnages. */
function EventMeta({ event: e }) {
  const stories = eventStories(e);
  const cast = people(e);
  return (
    <span className={styles.meta}>
      {stories.length > 0 && (
        <span className={styles.metaItem}>
          <BookOpen aria-hidden /> {stories.map((s) => s.name).join(', ')}
        </span>
      )}
      {e.places?.length > 0 && (
        <span className={styles.metaItem}>
          <MapPin aria-hidden /> {e.places.map((p) => p.name).join(', ')}
        </span>
      )}
      {cast.length > 0 && <AvatarStack members={cast.slice(0, 5)} total={cast.length} className={styles.stack} />}
    </span>
  );
}

/**
 * Frise chronologique : les événements dans leur ordre, reliés par un fil.
 * `onMove(index, delta)` (facultatif) affiche les flèches pour régler l'ordre.
 */
export function EventTimeline({ events, linkTo, onMove, moving }) {
  return (
    <ol className={styles.timeline}>
      {events.map((e, i) => (
        <li key={e.id} className={styles.node} style={{ ...entityColorVars(e.colors), '--tone': importanceColor(e.importance) || 'var(--border-strong)' }}>
          <span className={cx(styles.dot, e.importance === 'Capitale' && styles.dotMajor)} aria-hidden />
          <div className={styles.when}>{e.date || <span className={styles.noDate}>Date inconnue</span>}</div>
          <div className={styles.entry}>
            <Link to={linkTo(e)} className={styles.entryCard}>
              {eventImage(e) && <EntityBanner src={eventImage(e)} className={styles.entryImage} />}
              <span className={styles.entryBody}>
                <span className={styles.entryHead}>
                  <span className={styles.entryName}>{e.name}</span>
                  {e.importance && <Badge color={importanceColor(e.importance)}>{e.importance}</Badge>}
                </span>
                {excerpt(e.description) && <span className={styles.excerpt}>{excerpt(e.description)}</span>}
                <EventMeta event={e} />
              </span>
            </Link>
            {onMove && (
              <span className={styles.order}>
                <Button variant="ghost" size="sm" iconOnly icon={ArrowUp} aria-label={`Placer « ${e.name} » plus tôt`} disabled={i === 0 || moving} onClick={() => onMove(i, -1)} />
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={ArrowDown}
                  aria-label={`Placer « ${e.name} » plus tard`}
                  disabled={i === events.length - 1 || moving}
                  onClick={() => onMove(i, 1)}
                />
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Galerie : illustration, nom, date, importance. */
export function EventGallery({ events, linkTo }) {
  return (
    <ul className={styles.gallery}>
      {events.map((e) => (
        <li key={e.id}>
          <Link to={linkTo(e)} className={styles.card} style={{ ...entityColorVars(e.colors), '--tone': importanceColor(e.importance) || 'var(--border)' }}>
            <EntityBanner src={eventImage(e)} className={styles.cardImage} />
            <span className={styles.cardBody}>
              <span className={styles.cardDate}>{e.date || 'Date inconnue'}</span>
              <span className={styles.entryName}>{e.name}</span>
              {e.importance && <Badge color={importanceColor(e.importance)}>{e.importance}</Badge>}
              <EventMeta event={e} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Colonnes du tableau des événements (voir EntityTable). `showGroups` : module Groupes actif. */
export const eventColumns = ({ linkTo, showGroups }) =>
  [
    { key: 'name', label: 'Événement', sortKey: 'name', required: true, render: (e) => <NameCell to={linkTo(e)}>{e.name}</NameCell> },
    { key: 'chrono', label: 'Chronologie', sortKey: 'chrono', render: (e) => e.date || dash, edit: { field: 'date', type: 'text' } },
    {
      key: 'importance', label: 'Importance', sortKey: 'importance',
      render: (e) => (e.importance ? <Badge color={importanceColor(e.importance)}>{e.importance}</Badge> : dash),
      edit: { field: 'importance', type: 'enum', options: IMPORTANCE },
    },
    {
      key: 'stories', label: 'Histoires',
      render: (e) => {
        const stories = eventStories(e);
        return stories.length ? stories.map((s) => s.name).join(', ') : dash;
      },
    },
    {
      key: 'characters', label: 'Personnages',
      render: (e) => {
        const cast = people(e);
        return cast.length ? <AvatarStack members={cast.slice(0, 4)} total={cast.length} className={styles.stack} /> : dash;
      },
    },
    { key: 'places', label: 'Lieux', render: (e) => (e.places?.length ? e.places.map((p) => p.name).join(', ') : dash) },
    showGroups && { key: 'groups', label: 'Groupes', render: (e) => (e.groups?.length ? e.groups.map((g) => g.name).join(', ') : dash) },
  ].filter(Boolean);
