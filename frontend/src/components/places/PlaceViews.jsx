import { IMG } from '@/api/client';
import { Link } from 'react-router';
import { CornerDownRight, MapPin, Users } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { childCount, nativeCount, placeImage } from '@/config/places';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { EntityTree } from '@/components/entity/EntityTree';
import { NameCell, dash } from '@/components/entity/EntityTable';
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
                <EntityBanner src={placeImage(p, IMG.card)} className={styles.image} />
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

/** Colonnes du tableau des lieux (voir EntityTable). `showGroups` : module Groupes actif. */
export const placeColumns = ({ linkTo, showGroups }) =>
  [
    {
      key: 'name', label: 'Lieu', sortKey: 'name', required: true,
      render: (p) => <NameCell to={linkTo(p)} visual={<EntityBanner src={placeImage(p, IMG.thumb)} className={styles.rowThumb} />}>{p.name}</NameCell>,
    },
    { key: 'type', label: 'Type', sortKey: 'type', render: (p) => p.type?.name || dash, edit: { field: 'placeTypeId', type: 'ref', criterion: 'type' } },
    { key: 'parent', label: 'Lieu parent', sortKey: 'parent', render: (p) => p.parent?.name || dash, edit: { field: 'parentId', type: 'ref', criterion: 'parent' } },
    {
      key: 'natives', label: 'Originaires', sortKey: 'natives',
      render: (p) => {
        const count = nativeCount(p);
        return count > 0 ? (
          <span className={styles.nativesCell}>
            <AvatarStack members={natives(p, 3)} total={count} className={styles.rowStack} />
            {plural(count, 'personnage')}
          </span>
        ) : (
          dash
        );
      },
    },
    showGroups && {
      key: 'groups', label: 'Contrôlé par',
      render: (p) => (p.controllingGroups?.length ? p.controllingGroups.map((g) => g.name).join(', ') : dash),
    },
  ].filter(Boolean);

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
