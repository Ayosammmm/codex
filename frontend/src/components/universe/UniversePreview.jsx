import { useEffect, useMemo } from 'react';
import { Users, MapPin } from 'lucide-react';
import { Plus } from '@/components/ui/icons';
import { universeThemeProps } from '@/theme/universeTheme';
import { getTheme } from '@/theme/themes';
import { plainText } from '@/utils/universe';
import { cx } from '@/components/ui/cx';
import { UniverseAvatar } from './UniverseAvatar';
import { UniverseBanner } from './UniverseCard';
import styles from './UniversePreview.module.scss';

/** URL d'aperçu d'une image du formulaire : fichier choisi, image enregistrée, ou rien. */
function usePreviewUrl(value, savedUrl) {
  const objectUrl = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => objectUrl && URL.revokeObjectURL(objectUrl), [objectUrl]);
  return objectUrl || savedUrl || null;
}

/** Miniature de l'univers avec le thème et les couleurs en cours d'édition. */
export function UniversePreview({ form, images, savedImage }) {
  const logo = usePreviewUrl(images.logo, savedImage('logo'));
  const banner = usePreviewUrl(images.banner, savedImage('banner'));
  const background = usePreviewUrl(images.background, savedImage('background'));

  const draft = { name: form.name || 'Nouvel univers', theme: form.theme, colors: form.colors };
  const backdrop =
    form.backgroundMode === 'image' && background
      ? { backgroundImage: `url("${background}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : form.backgroundMode === 'color'
        ? { backgroundColor: form.backgroundColor || getTheme(form.theme).colors.primary }
        : null;

  return (
    <div {...universeThemeProps(draft)} className={styles.preview}>
      {backdrop && <div aria-hidden className={styles.backdrop} style={backdrop} />}
      <div className={styles.content}>
        <UniverseBanner universe={draft} src={banner} className={styles.banner} />
        <div className={styles.body}>
          <UniverseAvatar universe={draft} src={logo} className={styles.avatar} />
          <p className={styles.name}>{draft.name}</p>
          <p className={styles.description}>{plainText(form.description) || 'La description de votre univers apparaîtra ici.'}</p>

          <div className={styles.tiles}>
            {[
              { icon: Users, label: 'Personnages' },
              { icon: MapPin, label: 'Lieux' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className={styles.tile}>
                <Icon aria-hidden />
                <p>{label}</p>
              </div>
            ))}
          </div>

          <div className={styles.samples}>
            <span className={styles.sampleButton}>
              <Plus aria-hidden /> Ajouter
            </span>
            <span className={cx(styles.tag, styles.tagSecondary)}>Étiquette</span>
            <span className={cx(styles.tag, styles.tagTertiary)}>Mise en avant</span>
          </div>
          <p className={styles.sampleText}>
            Un <span className={styles.sampleLink}>lien</span> dans le texte.
          </p>
        </div>
      </div>
    </div>
  );
}
