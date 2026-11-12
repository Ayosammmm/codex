import { Link, useNavigate } from 'react-router';
import { Network, Users } from 'lucide-react';
import { ArrowDown, ArrowUp, ArrowUpDown, CornerDownRight } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';
import { groupRoles, memberCount, memberRole, roleRanker } from '@/config/groups';
import { cx } from '@/components/ui/cx';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { entityColorVars } from '@/theme/universeTheme';
import { plural } from '@/utils/universe';
import { GroupLogo } from './GroupLogo';
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
export function GroupsTable({ groups, linkTo, sort, onSort, fill = false }) {
  const navigate = useNavigate();
  return (
    <div className={cx(list.tableWrap, fill && list.tableFill)}>
      <table className={list.table}>
        <thead>
          <tr>
            <SortHeader label="Groupe" sortKey="name" sort={sort} onSort={onSort} />
            <SortHeader label="Type" sortKey="type" sort={sort} onSort={onSort} />
            <SortHeader label="Groupe parent" sortKey="parent" sort={sort} onSort={onSort} />
            <SortHeader label="Membres" sortKey="members" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const count = memberCount(g);
            return (
              // Toute la ligne est cliquable ; le lien du nom reste la cible clavier
              <tr key={g.id} onClick={() => navigate(linkTo(g))} style={entityColorVars(g.colors)}>
                <td>
                  <span className={list.nameCell}>
                    <GroupLogo group={g} className={list.rowAvatar} />
                    <Link to={linkTo(g)} className={list.rowName} onClick={(e) => e.stopPropagation()}>
                      {g.name}
                    </Link>
                  </span>
                </td>
                <td>{g.type?.name || dash}</td>
                <td>{g.parent?.name || dash}</td>
                <td>
                  {count > 0 ? (
                    <span className={styles.membersCell}>
                      <AvatarStack members={leadingMembers(g).slice(0, 3)} total={count} className={styles.rowStack} />
                      {plural(count, 'membre')}
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
