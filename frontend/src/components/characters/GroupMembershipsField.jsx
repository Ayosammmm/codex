import { Link } from 'react-router';
import { Trash2 } from '@/components/ui/icons';
import { fallbackRole, roleRanker } from '@/config/groups';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/Select';
import { GroupLogo } from '@/components/groups/GroupLogo';
import { universePath } from '@/utils/universe';
// Même présentation que la liste des membres dans l'édition d'un groupe
import styles from '@/components/groups/MembersField.module.scss';

/**
 * Groupes d'un personnage et son rôle dans chacun : value = [{ groupId, role }].
 * `options` : groupes de l'univers ({ value, label, roles, group }, voir useCharacterReferences).
 * On ajoute un groupe par la recherche (rôle par défaut du groupe), puis on règle le rôle.
 */
export function GroupMembershipsField({ universe, value, onChange, options = [], id, ...aria }) {
  const byId = new Map(options.map((o) => [o.value, o]));
  const taken = new Set(value.map((m) => m.groupId));
  const available = options.filter((o) => !taken.has(o.value));

  const add = (groupId) => {
    if (!groupId) return;
    onChange([...value, { groupId, role: fallbackRole(byId.get(groupId)?.roles || []) }]);
  };
  const setRole = (groupId, role) => onChange(value.map((m) => (m.groupId === groupId ? { ...m, role } : m)));
  const remove = (groupId) => onChange(value.filter((m) => m.groupId !== groupId));

  return (
    <div className={styles.root}>
      <Combobox id={id} {...aria} options={available} value={null} onChange={add} placeholder="Ajouter un groupe…" />

      {value.length > 0 && (
        <ul className={styles.list}>
          {value.map((m) => {
            const option = byId.get(m.groupId);
            const name = option?.label || 'Groupe introuvable';
            // Rôles du plus haut au plus bas
            const roles = option?.roles || [];
            const rank = roleRanker(roles);
            const roleOptions = [...roles]
              .sort((a, b) => rank(a.key) - rank(b.key))
              .map((r) => ({ value: r.key, label: r.name.trim() || 'Rôle sans nom' }));
            return (
              <li key={m.groupId} className={styles.row}>
                <GroupLogo group={option?.group} round className={styles.avatar} />
                <span className={styles.text}>
                  <Link to={universePath(universe, `groupes/${m.groupId}`)} className={styles.name} target="_blank" rel="noreferrer">
                    {name}
                  </Link>
                </span>
                {roleOptions.length > 0 && (
                  <Select
                    compact
                    options={roleOptions}
                    value={m.role}
                    onChange={(role) => setRole(m.groupId, role)}
                    aria-label={`Rôle dans ${name}`}
                    className={styles.role}
                  />
                )}
                <Button variant="danger-ghost" size="sm" iconOnly icon={Trash2} aria-label={`Retirer de ${name}`} onClick={() => remove(m.groupId)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
