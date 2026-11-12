import { Link, useNavigate } from 'react-router';
import { CalendarRange, Clapperboard, Users } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown } from '@/components/ui/icons';
import { episodeCount, storyCharacters, storyImage, storyPeriod } from '@/config/stories';
import { cx } from '@/components/ui/cx';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import list from '@/components/entity/ListViews.module.scss';
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

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={cx(list.sortButton, !active && list.sortIdle)} onClick={() => onSort(sortKey)}>
        {label}
        <Icon aria-hidden />
      </button>
    </th>
  );
}

const dash = <span className={list.muted}>—</span>;

/** Tableau ; `fill` : occupe la hauteur restante du parent (flex) au lieu d'une hauteur fixe. */
export function StoriesTable({ stories, linkTo, sort, onSort, fill = false }) {
  const navigate = useNavigate();
  return (
    <div className={cx(list.tableWrap, fill && list.tableFill)}>
      <table className={list.table}>
        <thead>
          <tr>
            <SortHeader label="Histoire" sortKey="name" sort={sort} onSort={onSort} />
            <th>Période</th>
            <SortHeader label="Épisodes" sortKey="episodes" sort={sort} onSort={onSort} />
            <SortHeader label="Personnages" sortKey="characters" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {stories.map((s) => {
            const cast = storyCharacters(s);
            return (
              // Toute la ligne est cliquable ; le lien du nom reste la cible clavier
              <tr key={s.id} onClick={() => navigate(linkTo(s))} style={entityColorVars(s.colors)}>
                <td>
                  <span className={list.nameCell}>
                    <EntityBanner src={storyImage(s)} className={styles.rowThumb} />
                    <Link to={linkTo(s)} className={list.rowName} onClick={(e) => e.stopPropagation()}>
                      {s.name}
                    </Link>
                  </span>
                </td>
                <td>{storyPeriod(s) || dash}</td>
                <td>{plural(episodeCount(s), 'épisode')}</td>
                <td>
                  {cast.length > 0 ? (
                    <span className={styles.castCell}>
                      <AvatarStack members={cast.slice(0, 3)} total={cast.length} className={styles.rowStack} />
                      {plural(cast.length, 'personnage')}
                    </span>
                  ) : (
                    dash
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
