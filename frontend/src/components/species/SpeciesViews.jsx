import { Link } from 'react-router';
import { CornerDownRight, Dna, Users } from '@/components/ui/icons';
import { childCount, memberCount, specieImage, specieMembers } from '@/config/species';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { EntityTree } from '@/components/entity/EntityTree';
import { NameCell, dash } from '@/components/entity/EntityTable';
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

/** Colonnes du tableau des espèces (voir EntityTable). */
export const specieColumns = ({ linkTo }) => [
  {
    key: 'name', label: 'Espèce', sortKey: 'name', required: true,
    render: (s) => <NameCell to={linkTo(s)} visual={<EntityBanner src={specieImage(s)} className={styles.rowThumb} />}>{s.name}</NameCell>,
  },
  { key: 'parent', label: 'Espèce parente', sortKey: 'parent', render: (s) => s.parent?.name || dash, edit: { field: 'parentId', type: 'ref', criterion: 'parent' } },
  {
    key: 'members', label: 'Personnages', sortKey: 'members',
    render: (s) => {
      const count = memberCount(s);
      return count > 0 ? (
        <span className={styles.membersCell}>
          <AvatarStack members={specieMembers(s, 3)} total={count} className={styles.rowStack} />
          {plural(count, 'personnage')}
        </span>
      ) : (
        dash
      );
    },
  },
  { key: 'children', label: 'Sous-espèces', sortKey: 'children', render: (s) => childCount(s) || dash },
];

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
