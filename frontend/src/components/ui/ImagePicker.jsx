import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, RefreshCw } from 'lucide-react';
import { Trash2 } from '@/components/ui/icons';
import { Button } from './Button';
import { cx } from './cx';
import styles from './ImagePicker.module.scss';

const MAX_SIZE = 5 * 1024 * 1024; // aligné sur la limite du backend

/**
 * Choix d'une image (clic ou glisser-déposer) avec aperçu.
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

  const pick = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return onError?.('Le fichier doit être une image.');
    if (file.size > MAX_SIZE) return onError?.('L’image ne doit pas dépasser 5 Mo.');
    onChange(file);
  };

  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.heading}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
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
            Cliquer ou déposer une image
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
