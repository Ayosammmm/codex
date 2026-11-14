import { LoaderCircle } from '@/components/ui/icons';
import { cx } from './cx';
import styles from './Button.module.scss';

const VARIANTS = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
  'danger-ghost': styles.dangerGhost,
};

/**
 * Bouton du design system.
 * - `as`   : composant à rendre (ex. Link) — par défaut <button>
 * - `icon` : icône lucide affichée avant le texte
 * - `iconOnly` : bouton carré ; fournir `aria-label`
 */
export function Button({
  as: Component = 'button',
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconOnly = false,
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  const isButton = Component === 'button';
  return (
    <Component
      {...(isButton ? { type: props.type || 'button', disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      className={cx(styles.button, VARIANTS[variant], styles[size], iconOnly && styles.iconOnly, className)}
      {...props}
    >
      {loading ? <LoaderCircle className={styles.spinner} aria-hidden /> : Icon && <Icon aria-hidden />}
      {iconOnly ? <span className="sr-only">{props['aria-label']}</span> : children}
    </Component>
  );
}
