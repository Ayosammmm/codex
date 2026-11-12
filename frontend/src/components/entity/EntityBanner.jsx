import { cx } from '@/components/ui/cx';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import styles from './EntityBanner.module.scss';

/** Bannière d'une entité : image (`src`), sinon dégradé de ses couleurs (--entity-*), sinon fond neutre. */
export function EntityBanner({ src, className }) {
  return (
    <span className={cx(styles.banner, className)} aria-hidden>
      {src && <img src={src} alt="" loading="lazy" decoding="async" />}
    </span>
  );
}

/** Pile d'avatars de personnages, avec « +N » pour les suivants. */
export function AvatarStack({ members, total, className }) {
  if (!members.length) return null;
  return (
    <span className={cx(styles.stack, className)}>
      {members.map((c) => (
        <CharacterAvatar key={c.id} character={c} round className={styles.stackAvatar} />
      ))}
      {total > members.length && <span className={styles.stackMore}>+{total - members.length}</span>}
    </span>
  );
}
