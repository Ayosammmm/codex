import { Link } from 'react-router';
import { usePermissions } from '@/auth/auth';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/components/ui/cx';
import { FormSection } from '@/components/universe/UniverseForm';
import { ModContents } from './ModContents';
import { ModIcon } from './ModIcon';
import styles from './Mods.module.scss';

/**
 * Paramètres de l'univers : activation des mods installés sur le serveur.
 * `value` : { [modId]: true } ; désactiver un mod masque ses pages et ses champs sans supprimer les données.
 */
export function ModsSection({ mods, value, onChange }) {
  const { user } = usePermissions();
  const isSuperAdmin = user?.role === 'superadmin';
  const toggle = (id, on) => {
    const next = { ...value };
    if (on) next[id] = true;
    else delete next[id];
    onChange(next);
  };

  return (
    <FormSection
      id="mods"
      title="Mods"
      description="Les mods ajoutent des types de fiches, des champs aux fiches existantes ou des pages (jeux, outils). Désactiver un mod masque ses pages et ses champs sans supprimer les données."
    >
      {mods.length === 0 ? (
        <p className={styles.note}>
          Aucun mod n’est installé sur ce serveur.{' '}
          {isSuperAdmin ? <Link to="/mods">Installer un mod</Link> : 'Un super administrateur peut en installer.'}
        </p>
      ) : (
        <>
          <ul className={styles.modList}>
            {mods.map((mod) => {
              const on = value?.[mod.id] === true;
              const id = `mod-${mod.id}`;
              return (
                <li key={mod.id} className={styles.modRow}>
                  <span className={cx(styles.modIcon, on && styles.modIconOn)}>
                    <ModIcon name={mod.icon} aria-hidden />
                  </span>
                  <div className={styles.modText}>
                    <label htmlFor={id} className={styles.modName}>
                      {mod.name} <span className={styles.modVersion}>v{mod.version}{mod.author && ` · ${mod.author}`}</span>
                    </label>
                    {mod.description && <p className={styles.modDescription}>{mod.description}</p>}
                    <ModContents mod={mod} />
                  </div>
                  <Switch id={id} checked={on} onChange={(v) => toggle(mod.id, v)} />
                </li>
              );
            })}
          </ul>
          {isSuperAdmin && (
            <p className={styles.note}>
              <Link to="/mods">Gérer les mods installés</Link>
            </p>
          )}
        </>
      )}
    </FormSection>
  );
}
