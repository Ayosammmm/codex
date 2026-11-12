import { Monitor, Moon, Sun } from 'lucide-react';
import { useColorMode } from '@/theme/ColorModeProvider';
import { cx } from '@/components/ui/cx';
import styles from './Layout.module.scss';

const OPTIONS = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Monitor },
];

/**
 * Choix clair / sombre / système. `showLabels` affiche le texte à côté des icônes.
 * `scope` ('app' | 'universe') : préférence modifiée ; par défaut celle de la page affichée.
 */
export function ColorModeToggle({ showLabels = false, scope }) {
  const { preference, setPreference } = useColorMode(scope);
  return (
    <div role="radiogroup" aria-label="Apparence" className={styles.modeToggle}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          title={showLabels ? undefined : label}
          onClick={() => setPreference(value)}
          className={cx(styles.modeOption, showLabels && styles.modeOptionLabeled)}
        >
          <Icon aria-hidden />
          <span className={showLabels ? undefined : 'sr-only'}>{label}</span>
        </button>
      ))}
    </div>
  );
}
