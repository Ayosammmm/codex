import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import styles from './Sound.module.scss';

const formatTime = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––');

/**
 * Petit lecteur audio : lecture / pause, progression (cliquable), durée, volume.
 * `loop` : lecture en boucle (thèmes musicaux) ; `label` : titre affiché à côté ;
 * `autoPlay` : lancé dès l'affichage, si le navigateur l'autorise (sinon il reste à l'arrêt).
 * `volume` (0 à 1) : volume de départ ; chaque lecteur se règle ensuite indépendamment.
 */
export function SoundPlayer({ src, label, loop = false, volume = 1, autoPlay = false, className }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(NaN);
  const [level, setLevel] = useState(volume);
  const lastLevel = useRef(level || 0.5); // volume rendu par le bouton après une coupure

  useEffect(() => {
    if (ref.current) ref.current.volume = level;
    if (level > 0) lastLevel.current = level;
  }, [level, src]);

  // Lecture automatique (refusée par certains navigateurs tant que la page n'a pas reçu de clic)
  useEffect(() => {
    if (autoPlay && src) ref.current?.play().catch(() => {});
  }, [autoPlay, src]);

  const toggle = () => {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };

  return (
    <div className={cx(styles.player, className)}>
      <audio
        ref={ref}
        src={src}
        loop={loop}
        preload="metadata"
        // Autre fichier : retour au début, à l'arrêt
        onLoadStart={() => {
          setPlaying(false);
          setTime(0);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <button type="button" className={styles.playButton} onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'} title={playing ? 'Pause' : 'Lecture'}>
        {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
      </button>
      <div className={styles.track}>
        {label && <span className={styles.label}>{label}</span>}
        <input
          type="range"
          min={0}
          max={Number.isFinite(duration) ? duration : 0}
          step="any"
          value={time}
          onChange={(e) => {
            if (ref.current) ref.current.currentTime = Number(e.target.value);
          }}
          aria-label="Position dans le son"
          className={styles.progress}
        />
      </div>
      <span className={styles.time}>
        {formatTime(time)} / {formatTime(duration)}
      </span>
      <span className={styles.volume}>
        <button
          type="button"
          onClick={() => setLevel(level > 0 ? 0 : lastLevel.current)}
          aria-label={level > 0 ? 'Couper le son' : 'Remettre le son'}
          title={level > 0 ? 'Couper le son' : 'Remettre le son'}
        >
          {level > 0 ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          aria-label="Volume"
          title={`Volume : ${Math.round(level * 100)} %`}
        />
      </span>
    </div>
  );
}
