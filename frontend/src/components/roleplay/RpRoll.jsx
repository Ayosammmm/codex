import { Coins, Dices, ImageIcon, Music } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import { describeRoll } from './rpCommands';
import styles from './Roleplay.module.scss';

const ICONS = { dice: Dices, coin: Coins, background: ImageIcon, ambience: Music };

/** Icône d'une commande (dés, pièce, fond, ambiance). */
export function CommandIcon({ kind, className }) {
  const Icon = ICONS[kind] || Dices;
  return <Icon aria-hidden className={className} />;
}

/**
 * Résultat d'une commande de hasard d'un message (/d20, /pileface), tiré par le serveur.
 * Un d20 seul qui fait 20 ou 1 est mis en valeur (réussite / échec critique).
 */
export function RpRoll({ roll }) {
  if (roll?.type !== 'dice' && roll?.type !== 'coin') return null;
  const kind = roll.type;
  const crit = kind === 'dice' && roll.count === 1 && roll.sides === 20 ? (roll.rolls[0] === 20 ? 'critSuccess' : roll.rolls[0] === 1 ? 'critFail' : null) : null;

  return (
    <div className={cx(styles.roll, crit && styles[crit])} role="img" aria-label={describeRoll(roll)}>
      <span className={styles.rollIcon}>
        <CommandIcon kind={kind} />
      </span>
      {kind === 'dice' && (
        <>
          <span className={styles.rollExpr}>{roll.expr}</span>
          {(roll.rolls.length > 1 || roll.modifier !== 0) && (
            <span className={styles.rollDetail} aria-hidden>
              {roll.rolls.map((r, i) => (
                <span key={i} className={cx(styles.rollDie, r === roll.sides && styles.rollMax, r === 1 && styles.rollMin)}>{r}</span>
              ))}
              {roll.modifier !== 0 && <span className={styles.rollMod}>{roll.modifier > 0 ? `+${roll.modifier}` : `−${Math.abs(roll.modifier)}`}</span>}
            </span>
          )}
          <span className={styles.rollTotal} aria-hidden>{roll.total}</span>
          {crit && <span className={styles.rollCrit} aria-hidden>{crit === 'critSuccess' ? 'Réussite critique !' : 'Échec critique !'}</span>}
        </>
      )}
      {kind === 'coin' && (
        <>
          <span className={styles.rollExpr}>Pile ou face</span>
          <span className={styles.rollTotal} aria-hidden>{roll.result === 'pile' ? 'Pile' : 'Face'}</span>
        </>
      )}
    </div>
  );
}
