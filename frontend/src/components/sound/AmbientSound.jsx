import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import styles from './Sound.module.scss';

/**
 * Ambiance d'un fil : `src` joué en boucle dès l'ouverture, avec son propre volume (50 % au départ) et
 * sa coupure. Rien si le lieu n'a pas de son.
 */
export function AmbientSound({ src }) {
  const ref = useRef(null);
  const [volume, setVolume] = useState(0.5);
  const lastVolume = useRef(0.5); // volume rendu par le bouton après une coupure

  // Nouvelle ambiance : lecture automatique
  useEffect(() => {
    if (src) ref.current?.play().catch(() => {});
  }, [src]);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
    if (volume > 0) lastVolume.current = volume;
  }, [volume]);

  if (!src) return null;
  const muted = volume === 0;

  return (
    <div className={styles.ambient}>
      <audio ref={ref} src={src} loop preload="auto" />
      <button
        type="button"
        className={cx(styles.ambientMute, muted && styles.ambientMuted)}
        onClick={() => setVolume(muted ? lastVolume.current : 0)}
        aria-pressed={muted}
        aria-label={muted ? 'Remettre l’ambiance' : 'Couper l’ambiance'}
        title={muted ? 'Remettre l’ambiance' : 'Couper l’ambiance'}
      >
        {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className={styles.ambientVolume}
        aria-label="Volume de l’ambiance"
        title={`Ambiance : ${Math.round(volume * 100)} %`}
      />
    </div>
  );
}
