import { IMG, uploadUrl } from '@/api/client';
import { soundName } from '@/components/sound/soundFiles';
import { CommandIcon } from './RpRoll';
import styles from './Roleplay.module.scss';

const LABELS = {
  background: 'Nouveau fond',
  'background:none': 'Fond retiré',
  'background:reset': 'Retour au fond du lieu',
  ambience: 'Nouvelle ambiance',
  'ambience:none': 'Silence : ambiance coupée',
  'ambience:reset': 'Retour à l’ambiance du lieu',
};

/**
 * Commande de mise en scène d'un message (/fond, /ambiance, /fin-fond, /fin-ambiance) : ce qui change à partir d'ici.
 * L'image / le son du message sont le nouveau fond / la nouvelle ambiance (vignette, nom du son).
 */
export function RpEffect({ message }) {
  const { effect } = message;
  if (!LABELS[effect]) return null;
  const kind = effect.split(':')[0];
  return (
    <div className={styles.effect}>
      {effect === 'background' && message.imagePath ? (
        <img src={uploadUrl(message.imagePath, IMG.thumb)} alt="" loading="lazy" decoding="async" className={styles.effectThumb} />
      ) : (
        <span className={styles.rollIcon}>
          <CommandIcon kind={kind} />
        </span>
      )}
      <span className={styles.effectLabel}>{LABELS[effect]}</span>
      {effect === 'ambience' && message.soundPath && <span className={styles.rollDetail}>{soundName(message.soundPath)}</span>}
    </div>
  );
}
