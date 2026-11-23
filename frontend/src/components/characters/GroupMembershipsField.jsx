import { Link } from 'react-router';
import { Trash2 } from '@/components/ui/icons';
import { fallbackRole, groupRoles, roleRanker } from '@/config/groups';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/Select';
import { GroupLogo } from '@/components/groups/GroupLogo';
import { universePath } from '@/utils/universe';
import { useQuickCreate } from '@/components/entity/useQuickCreate';
// Même présentation que la liste des membres dans l'édition d'un groupe
import styles from '@/components/groups/MembersField.module.scss';

/**
 * Groupes d'un personnage et son rôle dans chacun : value = [{ groupId, role }].
 * `options` : groupes de l'univers ({ value, label, roles, group }, voir useCharacterReferences).
 * On ajoute un groupe par la recherche (rôle par défaut du groupe), puis on règle le rôle.
 * Un groupe absent de la liste peut être créé en tapant son nom (il reçoit les rôles par défaut).
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
  const createGroup = useQuickCreate('groups', universe.id);
  // Le groupe créé est ajouté ici directement : ses rôles ne sont pas encore dans `options`
  const create = async (name) => {
    // Déjà ajouté (les groupes choisis ne sont plus dans la liste proposée) : pas de doublon
    if (options.some((o) => taken.has(o.value) && o.label.trim().toLowerCase() === name.toLowerCase())) return null;
    const group = await createGroup(name);
    if (group) onChange([...value, { groupId: group.id, role: fallbackRole(groupRoles(group)) }]);
    return null;
  };
  const remove = (groupId) => onChange(value.filter((m) => m.groupId !== groupId));

  return (
    <div className={styles.root}>
      <Combobox id={id} {...aria} options={available} value={null} onChange={add} onCreate={create} createLabel={(n) => `Créer le groupe « ${n} »`} placeholder="Ajouter un groupe…" />

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
