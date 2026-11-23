import styles from './TraitQuestions.module.scss';

/** Contenu de l'infobulle d'un trait : les questions à se poser sur le personnage. */
export function TraitQuestions({ trait }) {
  return (
    <span className={styles.tip}>
      <span className={styles.title}>
        {trait.weakness} / {trait.strength}
      </span>
      <span className={styles.questions}>
        {trait.questions.map((q) => (
          <span key={q} className={styles.question}>{q}</span>
        ))}
      </span>
    </span>
  );
}

