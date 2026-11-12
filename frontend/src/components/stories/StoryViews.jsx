import { Link } from 'react-router';
import { CalendarRange, Clapperboard, Users } from 'lucide-react';
import { episodeCount, storyCharacters, storyImage, storyPeriod } from '@/config/stories';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { NameCell, dash } from '@/components/entity/EntityTable';
import { entityColorVars } from '@/theme/universeTheme';
import { plural } from '@/utils/universe';
import styles from './StoryViews.module.scss';

/** Galerie : couverture, nom, période, épisodes et personnages principaux. */
export function StoryGallery({ stories, linkTo }) {
  return (
    <ul className={styles.gallery}>
      {stories.map((s) => {
        const cast = storyCharacters(s);
        return (
          <li key={s.id}>
            <Link to={linkTo(s)} className={styles.card} style={entityColorVars(s.colors)}>
              <EntityBanner src={storyImage(s)} className={styles.cover} />
              <span className={styles.body}>
                <span className={styles.name}>{s.name}</span>
                {storyPeriod(s) && (
                  <span className={styles.period}>
                    <CalendarRange aria-hidden /> {storyPeriod(s)}
                  </span>
                )}
              </span>
              <span className={styles.footer}>
                <AvatarStack members={cast.slice(0, 5)} total={cast.length} />
                <span className={styles.stats}>
                  <span title="Épisodes">
                    <Clapperboard aria-hidden /> {episodeCount(s)}
                  </span>
                  {cast.length > 0 && (
                    <span title="Personnages">
                      <Users aria-hidden /> {cast.length}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Colonnes du tableau des histoires (voir EntityTable). */
export const storyColumns = ({ linkTo }) => [
  {
    key: 'name', label: 'Histoire', sortKey: 'name', required: true,
    render: (s) => <NameCell to={linkTo(s)} visual={<EntityBanner src={storyImage(s)} className={styles.rowThumb} />}>{s.name}</NameCell>,
  },
  { key: 'period', label: 'Période', render: (s) => storyPeriod(s) || dash },
  { key: 'start', label: 'Début', defaultHidden: true, render: (s) => s.startDate || dash, edit: { field: 'startDate', type: 'text' } },
  { key: 'end', label: 'Fin', defaultHidden: true, render: (s) => s.endDate || dash, edit: { field: 'endDate', type: 'text' } },
  { key: 'episodes', label: 'Épisodes', sortKey: 'episodes', render: (s) => plural(episodeCount(s), 'épisode') },
  {
    key: 'characters', label: 'Personnages', sortKey: 'characters',
    render: (s) => {
      const cast = storyCharacters(s);
      return cast.length > 0 ? (
        <span className={styles.castCell}>
          <AvatarStack members={cast.slice(0, 3)} total={cast.length} className={styles.rowStack} />
          {plural(cast.length, 'personnage')}
        </span>
      ) : (
        dash
      );
    },
  },
];
