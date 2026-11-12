import { uploadUrl } from '@/api/client';
import { cx } from '@/components/ui/cx';
import { isHexColor } from '@/theme/color';
import styles from './CharacterAvatar.module.scss';

const hueFromText = (text = '') => [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);

const initialsOf = (c) =>
  [c?.firstname, c?.name]
    .filter(Boolean)
    .map((w) => w.trim()[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || '?';

/**
 * Avatar d'un personnage, ou ses initiales sur sa couleur principale (sinon une teinte stable dérivée de son nom).
 * La taille (largeur, hauteur, police) est donnée par `className`. `src` force l'image (aperçu).
 */
export function CharacterAvatar({ character, src, round = false, className, style }) {
  const image = src !== undefined ? src : uploadUrl(character?.avatar);
  return (
    <span
      className={cx(styles.avatar, round && styles.round, className)}
      style={{
        '--hue': hueFromText(`${character?.firstname}${character?.name}`),
        // Couleur principale du personnage, si définie, pour les initiales
        ...(isHexColor(character?.colors?.primary) && { '--avatar-tint': character.colors.primary }),
        ...style,
      }}
    >
      {image ? (
        <img src={image} alt="" className={styles.image} loading="lazy" decoding="async" />
      ) : (
        <span className={styles.initials}>{initialsOf(character)}</span>
      )}
    </span>
  );
}
