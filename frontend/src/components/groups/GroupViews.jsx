import { Link } from 'react-router';
import { CornerDownRight, Network, Users } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';
import { groupRoles, memberCount, memberRole, roleRanker } from '@/config/groups';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { entityColorVars } from '@/theme/universeTheme';
import { plural } from '@/utils/universe';
import { GroupLogo } from './GroupLogo';
import { NameCell, dash } from '@/components/entity/EntityTable';
import list from '@/components/entity/ListViews.module.scss';
import styles from './GroupViews.module.scss';

const MAX_AVATARS = 5;

/** Membres les plus haut placés d'abord (chefs, sous-chefs...), puis par nom. */
function leadingMembers(group) {
  const roles = groupRoles(group);
  const rank = roleRanker(roles);
  return [...(group.characters || [])]
    .sort((a, b) => rank(memberRole(a, roles)) - rank(memberRole(b, roles)) || characterName(a).localeCompare(characterName(b), 'fr'))
    .slice(0, MAX_AVATARS);
}

// ---------------------------------------------------------------------------

/** Galerie : bannière, logo, nom, type et aperçu des membres. */
export function GroupGallery({ groups, linkTo }) {
  return (
    <ul className={styles.gallery}>
      {groups.map((g) => {
        const count = memberCount(g);
        const subgroups = g.children?.length || 0;
        return (
          <li key={g.id}>
            <Link to={linkTo(g)} className={styles.card} style={entityColorVars(g.colors)}>
              <EntityBanner src={uploadUrl(g.banner)} className={styles.cardBanner} />
              <span className={styles.cardHead}>
                <GroupLogo group={g} className={styles.cardLogo} />
                {g.type && <span className={styles.cardType}>{g.type.name}</span>}
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardName}>{g.name}</span>
                {g.parent && (
                  <span className={styles.cardParent}>
                    <CornerDownRight aria-hidden /> {g.parent.name}
                  </span>
                )}
              </span>
              <span className={styles.cardFooter}>
                <AvatarStack members={leadingMembers(g)} total={count} />
                <span className={styles.cardStats}>
                  <span title="Membres">
                    <Users aria-hidden /> {count}
                  </span>
                  {subgroups > 0 && (
                    <span title="Sous-groupes">
                      <Network aria-hidden /> {subgroups}
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

/** Colonnes du tableau des groupes (voir EntityTable). */
export const groupColumns = ({ linkTo }) => [
  {
    key: 'name', label: 'Groupe', sortKey: 'name', required: true,
    render: (g) => <NameCell to={linkTo(g)} visual={<GroupLogo group={g} className={list.rowAvatar} />}>{g.name}</NameCell>,
  },
  { key: 'type', label: 'Type', sortKey: 'type', render: (g) => g.type?.name || dash, edit: { field: 'groupTypeId', type: 'ref', criterion: 'type' } },
  { key: 'parent', label: 'Groupe parent', sortKey: 'parent', render: (g) => g.parent?.name || dash, edit: { field: 'parentId', type: 'ref', criterion: 'parent' } },
  {
    key: 'members', label: 'Membres', sortKey: 'members',
    render: (g) => {
      const count = memberCount(g);
      return count > 0 ? (
        <span className={styles.membersCell}>
          <AvatarStack members={leadingMembers(g).slice(0, 3)} total={count} className={styles.rowStack} />
          {plural(count, 'membre')}
        </span>
      ) : (
        dash
      );
    },
  },
];
