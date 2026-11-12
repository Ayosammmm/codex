import { Plus, Trash2 } from '@/components/ui/icons';
import { commandsTransitively } from '@/config/groups';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Input } from '@/components/ui/Field';
import { newRoleKey } from './useGroupForm';
import styles from './RolesField.module.scss';

/**
 * Rôles d'un groupe : [{ key, name, commands: [clés] }].
 * Chaque rôle choisit les rôles qu'il commande directement ; un rôle peut avoir plusieurs supérieurs.
 * Un lien qui créerait une boucle (A commande B qui commande A) n'est pas proposé.
 * Un rôle encore attribué à des membres ne peut pas être supprimé.
 */
export function RolesField({ value, onChange, members, error }) {
  const memberCount = (key) => members.filter((m) => m.role === key).length;
  const label = (r) => r.name.trim() || 'Rôle sans nom';

  const updateRole = (key, patch) => onChange(value.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRole = (key) =>
    onChange(value.filter((r) => r.key !== key).map((r) => ({ ...r, commands: r.commands.filter((k) => k !== key) })));
  const addRole = () => onChange([...value, { key: newRoleKey(), name: '', commands: [] }]);

  return (
    <div className={styles.root}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <ul className={styles.list}>
        {value.map((role, i) => {
          const count = memberCount(role.key);
          const superiors = value.filter((r) => r.commands.includes(role.key));
          // Rôles commandables : ni lui-même, ni un rôle qui le commande déjà (directement ou non)
          const options = value
            .filter((r) => r.key !== role.key && !commandsTransitively(value, r.key, role.key))
            .map((r) => ({ value: r.key, label: label(r) }));
          return (
            <li key={role.key} className={styles.role}>
              <div className={styles.head}>
                <Input
                  value={role.name}
                  onChange={(e) => updateRole(role.key, { name: e.target.value })}
                  placeholder="Nom du rôle"
                  maxLength={60}
                  aria-label={`Nom du rôle ${i + 1}`}
                  aria-invalid={error && !role.name.trim() ? true : undefined}
                  className={styles.name}
                />
                <span className={styles.count}>{count > 0 ? `${count} membre${count > 1 ? 's' : ''}` : 'Aucun membre'}</span>
                <Button
                  variant="danger-ghost"
                  size="sm"
                  iconOnly
                  icon={Trash2}
                  aria-label={`Supprimer le rôle ${label(role)}`}
                  title={count > 0 ? 'Réattribuez d’abord ses membres à un autre rôle' : value.length === 1 ? 'Un groupe garde au moins un rôle' : 'Supprimer le rôle'}
                  disabled={count > 0 || value.length === 1}
                  onClick={() => removeRole(role.key)}
                />
              </div>
              <div className={styles.links}>
                <span className={styles.linkLabel}>Commande</span>
                <Combobox
                  multiple
                  options={options}
                  value={role.commands}
                  onChange={(commands) => updateRole(role.key, { commands })}
                  placeholder="Aucun rôle"
                  aria-label={`Rôles commandés par ${label(role)}`}
                />
              </div>
              <p className={styles.superiors}>
                {superiors.length ? `Sous les ordres de : ${superiors.map(label).join(', ')}` : 'Ne reçoit d’ordres de personne'}
              </p>
            </li>
          );
        })}
      </ul>
      <Button icon={Plus} size="sm" onClick={addRole} className={styles.add}>
        Ajouter un rôle
      </Button>
    </div>
  );
}
