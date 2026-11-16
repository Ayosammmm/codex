import { useEffect, useMemo, useRef, useState } from 'react';
import { Music } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import { SoundPlayer } from './SoundPlayer';
import { MAX_SOUND_SIZE, SOUND_ACCEPT, isSoundFile, soundName } from './soundFiles';
import styles from './Sound.module.scss';

/**
 * Choix d'un son dans un formulaire, sur le modèle d'ImagePicker :
 * `value` : File (nouveau) | null (retiré) | undefined (inchangé) ; `currentUrl` : son enregistré.
 * Bouton ou glisser-déposer ; 20 Mo maximum. Le son choisi s'écoute avant d'enregistrer.
 */
export function SoundPicker({ label, hint, currentUrl, value, onChange, onError, loop = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const fileUrl = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => fileUrl && URL.revokeObjectURL(fileUrl), [fileUrl]);
  const src = value === null ? null : fileUrl || currentUrl;
  const name = value instanceof File ? value.name : soundName(currentUrl);

  const pick = (file) => {
    if (!file) return;
    if (!isSoundFile(file)) return onError?.('Le fichier doit être un son (mp3, ogg, wav…).');
    if (file.size > MAX_SOUND_SIZE) return onError?.('Le son ne doit pas dépasser 20 Mo.');
    onChange(file);
  };

  return (
    <div className={styles.picker}>
      <div className={styles.pickerHead}>
        <span className={styles.pickerLabel}>{label}</span>
        {hint && <span className={styles.pickerHint}>{hint}</span>}
      </div>
      {src ? (
        <div className={styles.pickerCurrent}>
          <SoundPlayer src={src} label={name} loop={loop} />
          <div className={styles.pickerActions}>
            <button type="button" onClick={() => inputRef.current?.click()}>Remplacer</button>
            <button type="button" onClick={() => onChange(currentUrl && value instanceof File ? undefined : null)}>
              {currentUrl && value instanceof File ? 'Annuler' : 'Retirer'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={cx(styles.drop, dragging && styles.dragging)}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
        >
          <Music aria-hidden />
          <span>Choisir ou déposer un son</span>
          <span className={styles.pickerHint}>mp3, ogg, wav… · 20 Mo max</span>
        </button>
      )}
      {value === null && currentUrl && (
        <p className={styles.pickerHint}>
          Le son sera retiré à l’enregistrement.{' '}
          <button type="button" className={styles.linkButton} onClick={() => onChange(undefined)}>Garder</button>
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={SOUND_ACCEPT}
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
