import { Link } from 'react-router';
import { Trash2 } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { fallbackRole, roleRanker } from '@/config/groups';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/Select';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { universePath } from '@/utils/universe';
import { newMemberKey } from './useGroupForm';
import styles from './MembersField.module.scss';

/**
 * Membres d'un groupe : [{ key, characterId, role }] ; `roles` : rôles du groupe (formulaire).
 * On ajoute un personnage par la recherche (rôle « Membre » par défaut), puis on règle son rôle.
 */
export function MembersField({ universe, value, onChange, roles, characterOptions, charactersById }) {
  const taken = new Set(value.map((m) => m.characterId));
  const available = characterOptions.filter((o) => !taken.has(o.value));

  // Rôles du plus haut au plus bas
  const rank = roleRanker(roles);
  const sortedRoles = [...roles].sort((a, b) => rank(a.key) - rank(b.key));
  const roleOptions = sortedRoles.map((r) => ({ value: r.key, label: r.name.trim() || 'Rôle sans nom' }));

  const add = (characterId) => characterId && onChange([...value, { key: newMemberKey(), characterId, role: fallbackRole(roles) }]);
  const updateRow = (key, patch) => onChange(value.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  const removeRow = (key) => onChange(value.filter((m) => m.key !== key));

  const counts = sortedRoles.map((r) => ({ name: r.name, count: value.filter((m) => m.role === r.key).length })).filter((r) => r.count);

  return (
    <div className={styles.root}>
      <Combobox
        options={available}
        value={null}
        onChange={add}
        placeholder="Ajouter un personnage…"
        aria-label="Ajouter un membre"
      />

      {value.length === 0 ? (
        <p className={styles.empty}>Aucun membre pour le moment.</p>
      ) : (
        <>
          <p className={styles.summary}>{counts.map((r) => `${r.name} : ${r.count}`).join(' · ')}</p>
          <ul className={styles.list}>
            {value.map((m) => {
              const character = charactersById.get(m.characterId);
              const name = character ? characterName(character) : 'Personnage introuvable';
              return (
                <li key={m.key} className={styles.row}>
                  <CharacterAvatar character={character} round className={styles.avatar} />
                  <span className={styles.text}>
                    <Link to={universePath(universe, `personnages/${m.characterId}`)} className={styles.name} target="_blank" rel="noreferrer">
                      {name}
                    </Link>
                    {character?.title && <span className={styles.title}>{character.title}</span>}
                  </span>
                  <Select
                    compact
                    options={roleOptions}
                    value={m.role}
                    onChange={(role) => updateRow(m.key, { role })}
                    aria-label={`Rôle de ${name}`}
                    className={styles.role}
                  />
                  <Button variant="danger-ghost" size="sm" iconOnly icon={Trash2} aria-label={`Retirer ${name}`} onClick={() => removeRow(m.key)} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
