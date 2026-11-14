import { Link } from 'react-router';
import { Copy, Download, Ellipsis, Settings, Trash2 } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { universeThemeProps } from '@/theme/universeTheme';
import { universePath } from '@/utils/universe';
import { Menu } from '@/components/ui/Menu';
import { cx } from '@/components/ui/cx';
import { UniverseAvatar } from './UniverseAvatar';
import styles from './UniverseCard.module.scss';

/** Bannière : image de l'univers, sinon un dégradé de ses couleurs. La hauteur est donnée par `className`. */
export function UniverseBanner({ universe, src, className }) {
  const image = src !== undefined ? src : uploadUrl(universe?.banner);
  return (
    <div className={cx(styles.banner, className)}>
      {image ? (
        <img src={image} alt="" className={styles.bannerMedia} />
      ) : (
        <div aria-hidden className={cx(styles.bannerMedia, styles.bannerGradient)} />
      )}
    </div>
  );
}

export function UniverseCard({ universe, actions }) {
  return (
    <article {...universeThemeProps(universe)} className={styles.card}>
      <UniverseBanner universe={universe} className={styles.cardBanner} />

      <div className={styles.menuSlot}>
        <Menu
          trigger={(props) => (
            <button type="button" {...props} aria-label={`Actions pour ${universe.name}`} className={styles.menuTrigger}>
              <Ellipsis aria-hidden />
            </button>
          )}
          items={[
            // Actions disponibles selon les droits (lecteurs et éditeurs : export seulement)
            actions.settings && { label: 'Paramètres', icon: Settings, onSelect: actions.settings },
            actions.duplicate && { label: 'Dupliquer', icon: Copy, onSelect: actions.duplicate },
            actions.export && { label: 'Exporter', icon: Download, onSelect: actions.export },
            actions.remove && { separator: true },
            actions.remove && { label: 'Supprimer', icon: Trash2, danger: true, onSelect: actions.remove },
          ]}
        />
      </div>

      <div className={styles.shade} aria-hidden />

      <div className={styles.identity}>
        <UniverseAvatar universe={universe} className={styles.avatar} />
        <div className={styles.heading}>
          <h2 className={styles.title}>
            <Link to={universePath(universe)} className={styles.link}>
              {universe.name}
            </Link>
          </h2>
          <span className={styles.accent} aria-hidden />
        </div>
      </div>
    </article>
  );
}
