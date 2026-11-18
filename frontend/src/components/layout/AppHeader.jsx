import { Link } from 'react-router';
import { ColorModeToggle } from './ColorModeToggle';
import { UserMenu } from './UserMenu';
import { cx } from '@/components/ui/cx';
import styles from './Layout.module.scss';

export function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cx(styles.brandMark, className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--primary)" />
      <path d="M9 8h9a5 5 0 0 1 5 5v11H14a5 5 0 0 1-5-5z" fill="none" stroke="var(--primary-fg)" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M13 13h6M13 17h6" stroke="var(--tertiary)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** En-tête de l'application (hors univers). `children` : contenu central optionnel (fil d'Ariane...). */
export function AppHeader({ children }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link to="/" className={styles.brand}>
          <BrandMark />
          <span className={styles.brandName}>Codex</span>
        </Link>
        <div className={styles.headerSlot}>{children}</div>
        <ColorModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
