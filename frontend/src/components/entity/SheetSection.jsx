import styles from './SheetSection.module.scss';

/** Section titrée d'une fiche (ancre `id`). */
export function SheetSection({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={styles.section}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}
