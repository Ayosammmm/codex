import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle } from 'lucide-react';
import { Trash2 } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { usePhotoMutations, usePhotos } from '@/api/queries';
import { Spinner } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import { toMemoryFile } from '@/components/ui/memoryFile';
import styles from './PhotoAlbum.module.scss';

const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Album photo d'une entité. Les ajouts et suppressions sont enregistrés immédiatement
 * (indépendamment du bouton « Enregistrer » du formulaire), tout comme les légendes (à la sortie du champ).
 */
export function PhotoAlbum({ entityType, entityId }) {
  const { data: photos = [], isPending } = usePhotos(entityType, entityId);
  const { upload, update, remove } = usePhotoMutations(entityType, entityId);
  const toast = useToast();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);

  const addFiles = async (fileList) => {
    const files = [...(fileList || [])];
    const valid = files.filter((f) => f.type.startsWith('image/') && f.size <= MAX_SIZE);
    if (valid.length < files.length) toast.error('Certains fichiers ont été ignorés (images de 5 Mo maximum).');
    setUploading((n) => n + valid.length);
    // Copie immédiate en mémoire : les envois sont successifs, les derniers fichiers
    // seraient sinon relus du disque bien après le dépôt (voir memoryFile.js)
    const copies = await Promise.allSettled(valid.map(toMemoryFile));
    for (const [i, file] of valid.entries()) {
      try {
        if (copies[i].status === 'rejected') throw copies[i].reason;
        await upload.mutateAsync(copies[i].value);
      } catch (err) {
        toast.error(`« ${file.name} » : ${err.message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const onDelete = (photo) => {
    if (!window.confirm('Supprimer cette photo de l’album ?')) return;
    remove.mutate(photo.id, { onError: (err) => toast.error(err.message) });
  };

  const saveCaption = (photo, caption) =>
    update.mutate(
      { photoId: photo.id, data: { caption } },
      { onSuccess: () => toast.success('Légende enregistrée.'), onError: (err) => toast.error(err.message) },
    );

  if (isPending) return <Spinner label="Chargement de l’album…" />;

  return (
    <ul className={styles.grid}>
      {photos.map((photo) => (
        <li key={photo.id} className={styles.item}>
          <div className={styles.photo}>
            <a href={uploadUrl(photo.imagePath)} target="_blank" rel="noreferrer" className={styles.photoLink} title="Ouvrir la photo">
              <img src={uploadUrl(photo.imagePath)} alt={photo.caption || ''} loading="lazy" />
            </a>
            <button type="button" className={styles.photoDelete} aria-label="Supprimer la photo" onClick={() => onDelete(photo)}>
              <Trash2 aria-hidden />
            </button>
          </div>
          <CaptionInput key={photo.caption ?? ''} photo={photo} onSave={(caption) => saveCaption(photo, caption)} />
        </li>
      ))}
      <li>
        <button
          type="button"
          className={cx(styles.add, dragging && styles.dragging)}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          disabled={uploading > 0}
        >
          {uploading > 0 ? <LoaderCircle aria-hidden style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus aria-hidden />}
          {uploading > 0 ? `Envoi (${uploading})…` : 'Ajouter des photos'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className={styles.hidden}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </li>
    </ul>
  );
}

/** Légende d'une photo : enregistrée en quittant le champ ou avec Entrée, si elle a changé. */
function CaptionInput({ photo, onSave }) {
  const [value, setValue] = useState(photo.caption || '');
  const commit = () => {
    const caption = value.trim();
    if (caption !== (photo.caption || '')) onSave(caption);
  };
  return (
    <input
      type="text"
      value={value}
      maxLength={255}
      placeholder="Ajouter une légende…"
      aria-label="Légende de la photo"
      className={styles.caption}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') setValue(photo.caption || '');
      }}
    />
  );
}
