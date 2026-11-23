import { Badge } from '@/components/ui/Badge';
import { RichText } from '@/components/ui/RichText';
import { Tooltip } from '@/components/ui/Tooltip';
import { plainText } from '@/utils/universe';
import styles from './ReferenceBadge.module.scss';

/**
 * Étiquette d'une valeur de référentiel (alignement, rang de puissance…) : `item` = { name, color, description }.
 * Si la valeur a une description, elle s'affiche en infobulle au survol.
 * `focusable` : infobulle aussi au clavier (pas dans un lien, qui prend déjà le focus).
 */
export function ReferenceBadge({ item, focusable = false }) {
  if (!item) return null;
  const badge = <Badge color={item.color}>{item.name}</Badge>;
  if (!plainText(item.description)) return badge;
  return (
    <Tooltip
      wide
      focusable={focusable}
      className={styles.trigger}
      content={
        <span className={styles.tip}>
          <span className={styles.name}>{item.name}</span>
          <RichText html={item.description} className={styles.text} />
        </span>
      }
    >
      {badge}
    </Tooltip>
  );
}
