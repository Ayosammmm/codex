import { Link, useNavigate } from 'react-router';
import { MapPin, Ruler } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown } from '@/components/ui/icons';
import { creatureImage, formatSize, temperamentColor } from '@/config/creatures';
import { Badge } from '@/components/ui/Badge';
import { cx } from '@/components/ui/cx';
import { EntityBanner } from '@/components/entity/EntityBanner';
import list from '@/components/entity/ListViews.module.scss';
import { entityColorVars } from '@/theme/universeTheme';
import styles from './CreatureViews.module.scss';

/** Galerie : illustration en portrait avec le rang, nom, tempérament, taille et habitats. */
export function CreatureGallery({ creatures, linkTo, showRanks }) {
  return (
    <ul className={styles.gallery}>
      {creatures.map((c) => (
        <li key={c.id}>
          <Link to={linkTo(c)} className={styles.card} style={entityColorVars(c.colors)}>
            <span className={styles.visual}>
              <EntityBanner src={creatureImage(c)} className={styles.image} />
              {showRanks && c.powerRank && (
                <span className={styles.rank}>
                  <Badge color={c.powerRank.color}>{c.powerRank.name}</Badge>
                </span>
              )}
            </span>
            <span className={styles.body}>
              <span className={styles.name}>{c.name}</span>
              {c.temperament && (
                <span className={styles.temperament} style={{ '--tone': temperamentColor(c.temperament) }}>
                  {c.temperament}
                </span>
              )}
              <span className={styles.meta}>
                {formatSize(c) && (
                  <span>
                    <Ruler aria-hidden /> {formatSize(c)}
                  </span>
                )}
                {c.habitats?.length > 0 && (
                  <span>
                    <MapPin aria-hidden />
                    <span className={styles.truncate}>{c.habitats.map((p) => p.name).join(', ')}</span>
                  </span>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
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
export function CreaturesTable({ creatures, linkTo, sort, onSort, fill = false, showRanks }) {
  const navigate = useNavigate();
  return (
    <div className={cx(list.tableWrap, fill && list.tableFill)}>
      <table className={list.table}>
        <thead>
          <tr>
            <SortHeader label="Créature" sortKey="name" sort={sort} onSort={onSort} />
            {showRanks && <SortHeader label="Rang" sortKey="rank" sort={sort} onSort={onSort} />}
            <SortHeader label="Taille" sortKey="size" sort={sort} onSort={onSort} />
            <th>Régime</th>
            <SortHeader label="Tempérament" sortKey="temperament" sort={sort} onSort={onSort} />
            <SortHeader label="Intelligence" sortKey="intelligence" sort={sort} onSort={onSort} />
            <th>Habitats</th>
          </tr>
        </thead>
        <tbody>
          {creatures.map((c) => (
            // Toute la ligne est cliquable ; le lien du nom reste la cible clavier
            <tr key={c.id} onClick={() => navigate(linkTo(c))} style={entityColorVars(c.colors)}>
              <td>
                <span className={list.nameCell}>
                  <EntityBanner src={creatureImage(c)} className={styles.rowThumb} />
                  <Link to={linkTo(c)} className={list.rowName} onClick={(e) => e.stopPropagation()}>
                    {c.name}
                  </Link>
                </span>
              </td>
              {showRanks && <td>{c.powerRank ? <Badge color={c.powerRank.color}>{c.powerRank.name}</Badge> : dash}</td>}
              <td>{formatSize(c) || dash}</td>
              <td>{c.diet || dash}</td>
              <td>{c.temperament ? <Badge color={temperamentColor(c.temperament)}>{c.temperament}</Badge> : dash}</td>
              <td>{c.intelligence != null ? `${c.intelligence}/10` : dash}</td>
              <td>{c.habitats?.length ? c.habitats.map((p) => p.name).join(', ') : dash}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
