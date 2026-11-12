import { Link, useNavigate } from 'react-router';
import { MapPin, Users } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown, CornerDownRight } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { childCount, nativeCount, placeImage } from '@/config/places';
import { cx } from '@/components/ui/cx';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { EntityTree } from '@/components/entity/EntityTree';
import list from '@/components/entity/ListViews.module.scss';
import { GroupLogo } from '@/components/groups/GroupLogo';
import { entityColorVars } from '@/theme/universeTheme';
import { plural } from '@/utils/universe';
import styles from './PlaceViews.module.scss';

const natives = (place, max) =>
  [...(place.characters || [])].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr')).slice(0, max);

/** Logos des groupes qui contrôlent un lieu. */
function ControllingGroups({ groups = [], max = 3 }) {
  if (!groups.length) return null;
  return (
    <span className={styles.groups} title={`Contrôlé par ${groups.map((g) => g.name).join(', ')}`}>
      {groups.slice(0, max).map((g) => (
        <GroupLogo key={g.id} group={g} round className={styles.groupLogo} />
      ))}
      {groups.length > max && <span className={styles.more}>+{groups.length - max}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------

/** Galerie : grande image du lieu, nom en surimpression, type, lieu parent et habitants. */
export function PlaceGallery({ places, linkTo }) {
  return (
    <ul className={styles.gallery}>
      {places.map((p) => {
        const count = nativeCount(p);
        const children = childCount(p);
        return (
          <li key={p.id}>
            <Link to={linkTo(p)} className={styles.card} style={entityColorVars(p.colors)}>
              <span className={styles.visual}>
                <EntityBanner src={placeImage(p)} className={styles.image} />
                <span className={styles.shade} aria-hidden />
                {p.type && <span className={styles.type}>{p.type.name}</span>}
                <span className={styles.titleBlock}>
                  <span className={styles.name}>{p.name}</span>
                  {p.parent && (
                    <span className={styles.parent}>
                      <CornerDownRight aria-hidden /> {p.parent.name}
                    </span>
                  )}
                </span>
              </span>
              <span className={styles.footer}>
                <AvatarStack members={natives(p, 4)} total={count} />
                <ControllingGroups groups={p.controllingGroups} />
                <span className={styles.stats}>
                  {count > 0 && (
                    <span title="Originaires">
                      <Users aria-hidden /> {count}
                    </span>
                  )}
                  {children > 0 && (
                    <span title="Sous-lieux">
                      <MapPin aria-hidden /> {children}
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

// ---------------------------------------------------------------------------

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
export function PlacesTable({ places, linkTo, sort, onSort, fill = false, showGroups }) {
  const navigate = useNavigate();
  return (
    <div className={cx(list.tableWrap, fill && list.tableFill)}>
      <table className={list.table}>
        <thead>
          <tr>
            <SortHeader label="Lieu" sortKey="name" sort={sort} onSort={onSort} />
            <SortHeader label="Type" sortKey="type" sort={sort} onSort={onSort} />
            <SortHeader label="Lieu parent" sortKey="parent" sort={sort} onSort={onSort} />
            <SortHeader label="Originaires" sortKey="natives" sort={sort} onSort={onSort} />
            {showGroups && <th>Contrôlé par</th>}
          </tr>
        </thead>
        <tbody>
          {places.map((p) => {
            const count = nativeCount(p);
            const image = placeImage(p);
            return (
              // Toute la ligne est cliquable ; le lien du nom reste la cible clavier
              <tr key={p.id} onClick={() => navigate(linkTo(p))} style={entityColorVars(p.colors)}>
                <td>
                  <span className={list.nameCell}>
                    <EntityBanner src={image} className={styles.rowThumb} />
                    <Link to={linkTo(p)} className={list.rowName} onClick={(e) => e.stopPropagation()}>
                      {p.name}
                    </Link>
                  </span>
                </td>
                <td>{p.type?.name || dash}</td>
                <td>{p.parent?.name || dash}</td>
                <td>
                  {count > 0 ? (
                    <span className={styles.nativesCell}>
                      <AvatarStack members={natives(p, 3)} total={count} className={styles.rowStack} />
                      {plural(count, 'personnage')}
                    </span>
                  ) : (
                    dash
                  )}
                </td>
                {showGroups && <td>{p.controllingGroups?.length ? p.controllingGroups.map((g) => g.name).join(', ') : dash}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Arborescence des lieux (voir EntityTree). */
export const PlaceTree = ({ places, linkTo }) => (
  <EntityTree
    items={places}
    linkTo={linkTo}
    image={placeImage}
    subtitle={(p) => p.type?.name}
    childNoun={['sous-lieu', 'sous-lieux']}
    members={(p) => natives(p, 3)}
    memberCount={nativeCount}
  />
);
