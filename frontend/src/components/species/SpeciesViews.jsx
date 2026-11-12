import { Link, useNavigate } from 'react-router';
import { Dna, Users } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown, CornerDownRight } from '@/components/ui/icons';
import { childCount, memberCount, specieImage, specieMembers } from '@/config/species';
import { cx } from '@/components/ui/cx';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { EntityTree } from '@/components/entity/EntityTree';
import list from '@/components/entity/ListViews.module.scss';
import { entityColorVars } from '@/theme/universeTheme';
import { plural } from '@/utils/universe';
import styles from './SpeciesViews.module.scss';

/** Galerie : illustration en portrait, nom, espèce parente et personnages. */
export function SpeciesGallery({ species, linkTo }) {
  return (
    <ul className={styles.gallery}>
      {species.map((s) => {
        const count = memberCount(s);
        const children = childCount(s);
        return (
          <li key={s.id}>
            <Link to={linkTo(s)} className={styles.card} style={entityColorVars(s.colors)}>
              <EntityBanner src={specieImage(s)} className={styles.image} />
              <span className={styles.body}>
                <span className={styles.name}>{s.name}</span>
                {s.parent && (
                  <span className={styles.parent}>
                    <CornerDownRight aria-hidden /> {s.parent.name}
                  </span>
                )}
              </span>
              <span className={styles.footer}>
                <AvatarStack members={specieMembers(s, 4)} total={count} />
                <span className={styles.stats}>
                  {count > 0 && (
                    <span title="Personnages">
                      <Users aria-hidden /> {count}
                    </span>
                  )}
                  {children > 0 && (
                    <span title="Sous-espèces">
                      <Dna aria-hidden /> {children}
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
export function SpeciesTable({ species, linkTo, sort, onSort, fill = false }) {
  const navigate = useNavigate();
  return (
    <div className={cx(list.tableWrap, fill && list.tableFill)}>
      <table className={list.table}>
        <thead>
          <tr>
            <SortHeader label="Espèce" sortKey="name" sort={sort} onSort={onSort} />
            <SortHeader label="Espèce parente" sortKey="parent" sort={sort} onSort={onSort} />
            <SortHeader label="Personnages" sortKey="members" sort={sort} onSort={onSort} />
            <SortHeader label="Sous-espèces" sortKey="children" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {species.map((s) => {
            const count = memberCount(s);
            return (
              // Toute la ligne est cliquable ; le lien du nom reste la cible clavier
              <tr key={s.id} onClick={() => navigate(linkTo(s))} style={entityColorVars(s.colors)}>
                <td>
                  <span className={list.nameCell}>
                    <EntityBanner src={specieImage(s)} className={styles.rowThumb} />
                    <Link to={linkTo(s)} className={list.rowName} onClick={(e) => e.stopPropagation()}>
                      {s.name}
                    </Link>
                  </span>
                </td>
                <td>{s.parent?.name || dash}</td>
                <td>
                  {count > 0 ? (
                    <span className={styles.membersCell}>
                      <AvatarStack members={specieMembers(s, 3)} total={count} className={styles.rowStack} />
                      {plural(count, 'personnage')}
                    </span>
                  ) : (
                    dash
                  )}
                </td>
                <td>{childCount(s) || dash}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Arborescence des espèces et sous-espèces (voir EntityTree). */
export const SpeciesTree = ({ species, linkTo }) => (
  <EntityTree
    items={species}
    linkTo={linkTo}
    image={specieImage}
    childNoun={['sous-espèce', 'sous-espèces']}
    members={(s) => specieMembers(s, 3)}
    memberCount={memberCount}
  />
);
