import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2 } from '@/components/ui/icons';
import { Button } from './Button';
import { cx } from './cx';
import { toMemoryFile } from './memoryFile';
import styles from './ImagePicker.module.scss';

const MAX_SIZE = 5 * 1024 * 1024; // aligné sur la limite du backend

/** Première image du presse-papiers d'un événement `paste` (capture d'écran, « Copier l'image »...). */
const clipboardImage = (e) => {
  for (const item of e.clipboardData?.items || []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile();
  }
  return null;
};

/**
 * Choix d'une image (clic, glisser-déposer ou collage) avec aperçu.
 * Le collage (Ctrl+V) vise le champ survolé ou sélectionné : plusieurs champs peuvent cohabiter.
 * - currentUrl : image enregistrée
 * - value      : File choisi (nouvelle image) | null (image retirée) | undefined (inchangée)
 * - aspect     : ratio CSS de la zone (ex. '1', '4 / 1')
 * - dropClassName : classes supplémentaires de la zone (ex. hauteur fixe en grand écran)
 */
export function ImagePicker({ label, hint, currentUrl, value, onChange, aspect = '16 / 9', className, dropClassName, onError }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const fileUrl = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => fileUrl && URL.revokeObjectURL(fileUrl), [fileUrl]);

  const preview = value === null ? null : fileUrl || currentUrl;

  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return onError?.('Le fichier doit être une image.');
    if (file.size > MAX_SIZE) return onError?.('L’image ne doit pas dépasser 5 Mo.');
    // L'envoi n'a lieu qu'à l'enregistrement du formulaire : on garde une copie en mémoire
    try {
      onChange(await toMemoryFile(file));
    } catch (err) {
      onError?.(err.message);
    }
  };

  // Collage : actif tant que le champ est survolé ou a le focus
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });
  useEffect(() => {
    if (!hovered && !focused) return;
    const onPaste = (e) => {
      const file = clipboardImage(e);
      if (!file) return; // texte : collage normal (ex. dans un champ voisin)
      e.preventDefault();
      pickRef.current(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [hovered, focused]);

  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.heading}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-keyshortcuts="Control+V"
        title="Cliquer, déposer ou coller (Ctrl+V) une image"
        onDragOver={(e) => (e.preventDefault(), setDragging(true))}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        aria-label={preview ? `Remplacer : ${label}` : `Ajouter : ${label}`}
        style={{ '--aspect': aspect }}
        className={cx(styles.drop, dragging && styles.dragging, preview && !dragging && styles.filled, dropClassName)}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className={styles.image} />
            <span className={styles.replace}>
              <RefreshCw aria-hidden /> Remplacer
            </span>
          </>
        ) : (
          <span className={styles.empty}>
            <ImagePlus aria-hidden />
            Cliquer, déposer ou coller une image
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hidden}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {preview && (
        <Button variant="danger-ghost" size="sm" icon={Trash2} className={styles.remove} onClick={() => onChange(null)}>
          Retirer
        </Button>
      )}
    </div>
  );
}
