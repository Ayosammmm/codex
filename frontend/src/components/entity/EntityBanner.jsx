import { cx } from '@/components/ui/cx';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { ImageZoom } from './ImageZoom';
import styles from './EntityBanner.module.scss';

/**
 * Bannière d'une entité : image (`src`), sinon dégradé de ses couleurs (--entity-*), sinon fond neutre.
 * `zoom` (URL de l'image d'origine, HD) : la bannière devient cliquable et s'ouvre en grand ; `label` la nomme.
 */
export function EntityBanner({ src, zoom, label, className }) {
  if (src && zoom) {
    return (
      <ImageZoom src={zoom} label={label} fill className={cx(styles.banner, className)}>
        <img src={src} alt="" loading="lazy" decoding="async" />
      </ImageZoom>
    );
  }
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
