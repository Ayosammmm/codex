import { useState } from 'react';
import { MapPin, Undo2 } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { useSaveEntity } from '@/api/queries';
import { mapPins } from '@/config/places';
import { Button } from '@/components/ui/Button';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { useToast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import { MapViewer } from './MapViewer';
import styles from './PlaceMapEditor.module.scss';

/**
 * Carte d'un lieu (module Carte) : image de la carte (enregistrée avec le formulaire),
 * puis placement des sous-lieux — choisir un sous-lieu, cliquer sur la carte ; les repères se déplacent
 * en les faisant glisser. Les positions sont enregistrées immédiatement.
 */
export function PlaceMapEditor({ place, places, image, onImageChange, mapPreview }) {
  const toast = useToast();
  const save = useSaveEntity('places');
  const [selectedId, setSelectedId] = useState(null);
  const children = place ? places.filter((p) => p.parentId === place.id).sort((a, b) => a.name.localeCompare(b.name, 'fr')) : [];

  const setPosition = (id, x, y) =>
    save.mutate(
      { id, values: { mapX: x == null ? null : Math.round(x * 100) / 100, mapY: y == null ? null : Math.round(y * 100) / 100 } },
      { onError: (err) => toast.error(err.message) },
    );

  const placeSelected = (x, y) => {
    if (!selectedId) return;
    setPosition(selectedId, x, y);
    // Sous-lieu suivant encore à placer, pour enchaîner
    const next = children.find((c) => c.id !== selectedId && (c.mapX == null || c.mapY == null));
    setSelectedId(next?.id ?? null);
  };

  return (
    <div className={styles.root}>
      <ImagePicker
        label="Image de la carte"
        hint="Plan, carte dessinée… 5 Mo maximum"
        aspect="16 / 9"
        className={styles.picker}
        currentUrl={uploadUrl(place?.mapImage)}
        value={image}
        onChange={onImageChange}
        onError={toast.error}
      />

      {!place ? (
        <p className={styles.note}>Les sous-lieux se placent sur la carte une fois le lieu créé.</p>
      ) : !mapPreview ? (
        <p className={styles.note}>Ajoutez une image de carte pour y placer les sous-lieux.</p>
      ) : children.length === 0 ? (
        <p className={styles.note}>Ce lieu n’a pas encore de sous-lieu à placer sur sa carte.</p>
      ) : (
        <div className={styles.placement}>
          <div className={styles.list}>
            <p className={styles.listTitle}>Sous-lieux</p>
            <p className={styles.note}>Choisissez un sous-lieu puis cliquez sur la carte. Glissez un repère pour le déplacer.</p>
            <ul>
              {children.map((c) => {
                const placed = c.mapX != null && c.mapY != null;
                return (
                  <li key={c.id} className={cx(styles.item, c.id === selectedId && styles.itemSelected)}>
                    <button type="button" className={styles.itemMain} onClick={() => setSelectedId(c.id === selectedId ? null : c.id)} aria-pressed={c.id === selectedId}>
                      <MapPin aria-hidden className={placed ? styles.placed : styles.unplaced} />
                      <span className={styles.itemName}>{c.name}</span>
                      <span className={styles.itemStatus}>{c.id === selectedId ? 'Cliquez sur la carte' : placed ? 'Placé' : 'À placer'}</span>
                    </button>
                    {placed && (
                      <Button variant="ghost" size="sm" iconOnly icon={Undo2} aria-label={`Retirer ${c.name} de la carte`} title="Retirer de la carte" onClick={() => setPosition(c.id, null, null)} />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <MapViewer
            src={mapPreview}
            pins={mapPins(place, places)}
            editable
            placing={Boolean(selectedId)}
            selectedId={selectedId}
            onPlace={placeSelected}
            onMove={setPosition}
            label={`Carte de ${place.name}`}
            className={styles.map}
          />
        </div>
      )}
    </div>
  );
}
