import { Trash2 } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { DEFAULT_EPISODE_ROLE, EPISODE_ROLES } from '@/config/stories';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Select } from '@/components/ui/Select';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import styles from '@/components/groups/MembersField.module.scss';

const ROLE_OPTIONS = EPISODE_ROLES.map((r) => ({ value: r.value, label: r.label }));

/**
 * Personnages d'un épisode : [{ characterId, role }] — principal, secondaire ou spectateur.
 * On ajoute un personnage par la recherche (secondaire par défaut), puis on règle sa place.
 */
export function CastField({ value, onChange, characterOptions, charactersById }) {
  const taken = new Set(value.map((m) => m.characterId));
  const available = characterOptions.filter((o) => !taken.has(o.value));
  const add = (characterId) => characterId && onChange([...value, { characterId, role: DEFAULT_EPISODE_ROLE }]);
  const counts = EPISODE_ROLES.map((r) => ({ ...r, count: value.filter((m) => m.role === r.value).length })).filter((r) => r.count);

  return (
    <div className={styles.root}>
      <Combobox options={available} value={null} onChange={add} placeholder="Ajouter un personnage…" aria-label="Ajouter un personnage à l’épisode" />
      {value.length === 0 ? (
        <p className={styles.empty}>Aucun personnage pour le moment.</p>
      ) : (
        <>
          <p className={styles.summary}>{counts.map((r) => `${r.label} : ${r.count}`).join(' · ')}</p>
          <ul className={styles.list}>
            {value.map((m) => {
              const character = charactersById.get(m.characterId);
              const name = character ? characterName(character) : 'Personnage introuvable';
              return (
                <li key={m.characterId} className={styles.row}>
                  <CharacterAvatar character={character} round className={styles.avatar} />
                  <span className={styles.text}>
                    <span className={styles.name}>{name}</span>
                    {character?.title && <span className={styles.title}>{character.title}</span>}
                  </span>
                  <Select
                    compact
                    options={ROLE_OPTIONS}
                    value={m.role}
                    onChange={(role) => onChange(value.map((x) => (x.characterId === m.characterId ? { ...x, role } : x)))}
                    aria-label={`Place de ${name} dans l’épisode`}
                    className={styles.role}
                  />
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    iconOnly
                    icon={Trash2}
                    aria-label={`Retirer ${name}`}
                    onClick={() => onChange(value.filter((x) => x.characterId !== m.characterId))}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
