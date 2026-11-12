import { isHexColor } from '@/theme/color';
import { entityColorVars, universeThemeProps } from '@/theme/universeTheme';
import styles from './EntityThemeZone.module.scss';

/**
 * Zone d'une entité (personnage, groupe) : ses couleurs (--entity-*, aucune si non définies ;
 * les boutons gardent sinon celles de l'univers) et son fond fixé derrière le contenu :
 * image (`background`, URL) ou, à défaut, couleur (`backgroundColor`).
 * Utilisée par les fiches et par les pages d'édition.
 */
export function EntityThemeZone({ universe, colors, background, backgroundColor, children }) {
  const theme = universeThemeProps(universe, colors);
  const backdrop = background
    ? { '--zone-bg': `url("${background}") center / cover no-repeat fixed` }
    : isHexColor(backgroundColor)
      ? { '--zone-bg': backgroundColor }
      : null;

  return (
    <div {...theme} className={styles.root} style={{ ...theme.style, ...entityColorVars(colors), ...backdrop }}>
      {backdrop && <div aria-hidden className={styles.backdrop} />}
      {children}
    </div>
  );
}
