import { LoaderCircle } from '@/components/ui/icons';
import { cx } from './cx';
import styles from './Feedback.module.scss';

export function Spinner({ label = 'Chargement…', className }) {
  return (
    <div role="status" className={cx(styles.spinner, className)}>
      <LoaderCircle aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cx(styles.empty, className)}>
      {Icon && (
        <span className={styles.emptyIcon}>
          <Icon aria-hidden />
        </span>
      )}
      <h2 className={styles.emptyTitle}>{title}</h2>
      {children && <div className={styles.emptyText}>{children}</div>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}
