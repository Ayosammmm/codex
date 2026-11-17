import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import styles from './Sound.module.scss';

/**
 * Ambiance d'un fil : `src` joué en boucle dès l'ouverture, avec lecture / pause, son propre volume (50 % au départ)
 * et sa coupure. Rien si le lieu n'a pas de son.
 * Mise en pause par l'utilisateur : elle le reste quand l'ambiance change (commande /ambiance), jusqu'à « Lecture ».
 */
export function AmbientSound({ src }) {
  const ref = useRef(null);
  const [volume, setVolume] = useState(0.5);
  const lastVolume = useRef(0.5); // volume rendu par le bouton après une coupure
  const [playing, setPlaying] = useState(false); // état réel du lecteur (la lecture automatique peut être refusée)
  const pausedByUser = useRef(false);

  // Nouvelle ambiance : lecture automatique, sauf si l'utilisateur l'a mise en pause
  useEffect(() => {
    if (src && !pausedByUser.current) ref.current?.play().catch(() => {});
  }, [src]);

  const togglePlay = () => {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) {
      pausedByUser.current = false;
      audio.play().catch(() => {});
    } else {
      pausedByUser.current = true;
      audio.pause();
    }
  };

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
    if (volume > 0) lastVolume.current = volume;
  }, [volume]);

  if (!src) return null;
  const muted = volume === 0;

  return (
    <div className={styles.ambient}>
      <audio ref={ref} src={src} loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <button
        type="button"
        className={styles.ambientMute}
        onClick={togglePlay}
        aria-pressed={!playing}
        aria-label={playing ? 'Mettre l’ambiance en pause' : 'Lancer l’ambiance'}
        title={playing ? 'Mettre l’ambiance en pause' : 'Lancer l’ambiance'}
      >
        {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
      </button>
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
