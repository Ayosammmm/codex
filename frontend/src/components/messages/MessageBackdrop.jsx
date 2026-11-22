import { useState } from 'react';
import { isHexColor } from '@/theme/color';
import { cx } from '@/components/ui/cx';
import styles from './Messages.module.scss';

/**
 * Fond d'un fil de roleplay, fixé derrière le contenu (comme celui de EntityThemeZone) : image (`image`, URL),
 * sinon couleur (`color`), sinon le fond du thème. À chaque changement (commande /fond…), le nouveau fond
 * apparaît en fondu par-dessus l'ancien. `vivid` : sans le voile qui garde le texte lisible (visual novel).
 */
export function MessageBackdrop({ image, color, vivid = false }) {
  const bg = image ? `url("${image}") center / cover no-repeat fixed` : isHexColor(color) ? color : 'var(--bg)';
  const [layers, setLayers] = useState({ current: bg, previous: null });
  // Nouveau fond : l'ancien reste dessous le temps du fondu
  if (layers.current !== bg) setLayers({ current: bg, previous: layers.current });

  return (
    <>
      {layers.previous && <div aria-hidden className={cx(styles.rpBackdrop, vivid && styles.rpBackdropVivid)} style={{ '--zone-bg': layers.previous }} />}
      <div
        key={layers.current}
        aria-hidden
        className={cx(styles.rpBackdrop, vivid && styles.rpBackdropVivid, layers.previous && styles.rpBackdropIn)}
        style={{ '--zone-bg': layers.current }}
        onAnimationEnd={() => setLayers((l) => ({ ...l, previous: null }))}
      />
    </>
  );
}
