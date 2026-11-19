import { useMemo } from 'react';
import { Link } from 'react-router';
import { MapPin, Users } from '@/components/ui/icons';
import { IMG, uploadUrl } from '@/api/client';
import { Combobox } from '@/components/ui/Combobox';
import { Field, Input } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { RichTextEditor } from '@/components/ui/RichText';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { FormSection } from '@/components/universe/UniverseForm';
import { PhotoAlbum } from '@/components/characters/PhotoAlbum';
import { AppearanceSection } from '@/components/entity/AppearanceSection';
import { EntityBanner } from '@/components/entity/EntityBanner';
import form from '@/components/entity/EntityForm.module.scss';
import { descendantIds } from '@/components/entity/tree';
import { useImagePreview } from '@/components/entity/useImagePreview';
import { PlaceMapEditor } from './PlaceMapEditor';
import { plural, universePath } from '@/utils/universe';
import styles from './PlaceForm.module.scss';

/**
 * Formulaire complet d'un lieu.
 * - `state` : usePlaceForm() ; `refs` : options (usePlaceReferences) + `allPlaces`
 * - `modules` : { groups } ; `dangerZone` : zone de suppression (édition uniquement)
 */
export function PlaceForm({ universe, place, state, refs, modules, errors, sound, modFields, collections, editors, dangerZone }) {
  const { form: f, update, images, setImage } = state;
  const toast = useToast();
  const isEdit = Boolean(place?.id);
  // Aperçu : bannière, sinon image de fond (comme dans l'archive)
  const banner = useImagePreview(place?.banner, images.banner);
  const background = useImagePreview(place?.background, images.background);
  const mapPreview = useImagePreview(place?.mapImage, images.mapImage);
  const previewImage = banner || (f.backgroundMode === 'image' ? background : null);

  // Ni le lieu lui-même ni ses sous-lieux ne peuvent devenir son parent
  const placeId = place?.id;
  const { allPlaces, places: placeOptions } = refs;
  const parentOptions = useMemo(() => {
    const excluded = placeId ? descendantIds(placeId, allPlaces || []) : new Set();
    return placeOptions.filter((o) => !excluded.has(o.value));
  }, [placeId, allPlaces, placeOptions]);

  const typeLabel = refs.placeTypes.find((o) => String(o.value) === f.placeTypeId)?.label;
  const parentLabel = refs.places.find((o) => String(o.value) === f.parentId)?.label;
  const sections = [
    { id: 'identite', label: 'Identité' },
    { id: 'image', label: 'Image' },
    { id: 'presentation', label: 'Présentation' },
    { id: 'liens', label: 'Habitants et contrôle' },
    modules.map && { id: 'carte', label: 'Carte' },
    { id: 'apparence', label: 'Apparence' },
    { id: 'album', label: 'Album photo' },
    sound && { id: 'son', label: 'Son' },
    modFields && { id: 'champs-mods', label: 'Champs des mods' },
    collections && { id: 'collections', label: 'Collections' },
    editors && { id: 'editeurs', label: 'Éditeurs' },
  ].filter(Boolean);

  return (
    <div className={form.layout}>
      <div className={form.sections}>
        <FormSection id="identite" title="Identité" description="Le nom du lieu, sa nature et le lieu qui le contient.">
          <Field label="Nom" required error={errors.name}>
            {(props) => <Input {...props} value={f.name} onChange={(e) => update({ name: e.target.value })} maxLength={255} placeholder="Ex. La Taverne du Pendu" />}
          </Field>
          <div className={form.fields}>
            <Field
              label="Type"
              hint={
                refs.placeTypes.length === 0 ? (
                  <>
                    Aucun type.{' '}
                    <Link to={universePath(universe, 'types-de-lieux')} className={form.hintLink}>
                      Gérer les types de lieux
                    </Link>
                  </>
                ) : undefined
              }
            >
              {(props) => (
                <Select {...props} options={refs.placeTypes} value={f.placeTypeId} onChange={(placeTypeId) => update({ placeTypeId })} placeholder="Non renseigné" disabled={refs.placeTypes.length === 0} />
              )}
            </Field>
            <Field label="Lieu parent" hint="Le lieu qui contient celui-ci (ex. une ville dans un royaume).">
              {(props) => <Select {...props} options={parentOptions} value={f.parentId} onChange={(parentId) => update({ parentId })} placeholder="Aucun" />}
            </Field>
          </div>
        </FormSection>

        <FormSection id="image" title="Image" description="L’illustration du lieu. 5 Mo maximum.">
          <ImagePicker
            label="Bannière"
            hint="Format large, ex. 1800 × 600"
            aspect="3 / 1"
            currentUrl={uploadUrl(place?.banner, IMG.card)}
            value={images.banner}
            onChange={(v) => setImage('banner', v)}
            onError={toast.error}
          />
        </FormSection>

        <FormSection id="presentation" title="Présentation" description="Histoire, géographie, ambiance, particularités…">
          <Field label="Description">
            {(props) => <RichTextEditor {...props} label="Description" minHeight="10rem" value={f.description} onChange={(description) => update({ description })} />}
          </Field>
        </FormSection>

        <FormSection id="liens" title="Habitants et contrôle" description="Les personnages qui en sont originaires et les groupes qui le contrôlent. Les sous-lieux sont contrôlés aussi.">
          <Field label="Originaires" hint="Aussi modifiable depuis la fiche de chaque personnage (« Lieux d’origine »).">
            {(props) => (
              <Combobox {...props} multiple options={refs.characters} value={f.characterIds} onChange={(characterIds) => update({ characterIds })} placeholder="Ajouter un personnage…" />
            )}
          </Field>
          {modules.groups && (
            <Field label="Contrôlé par">
              {(props) => <Combobox {...props} multiple options={refs.groups} value={f.groupIds} onChange={(groupIds) => update({ groupIds })} placeholder="Ajouter un groupe…" />}
            </Field>
          )}
        </FormSection>

        {modules.map && (
          <FormSection id="carte" title="Carte" description="La carte de ce lieu, et la position de ses sous-lieux dessus.">
            <PlaceMapEditor place={place} places={refs.allPlaces || []} image={images.mapImage} onImageChange={(v) => setImage('mapImage', v)} mapPreview={mapPreview} />
          </FormSection>
        )}

        <AppearanceSection state={state} savedBackground={place?.background} subject="du lieu" />

        <FormSection id="album" title="Album photo" description="Les photos sont enregistrées dès leur ajout.">
          {isEdit ? <PhotoAlbum entityType="place" entityId={place.id} /> : <p className={form.note}>L’album sera disponible une fois le lieu créé.</p>}
        </FormSection>

        {sound}
        {modFields}
        {collections}
        {editors}
        {dangerZone}
      </div>

      <aside className={form.aside} aria-label="Aperçu">
        <div className={form.asideSticky}>
          <div className={styles.preview}>
            <span className={styles.previewVisual}>
              <EntityBanner src={previewImage} className={styles.previewImage} />
              <span className={styles.previewShade} aria-hidden />
              <span className={styles.previewName}>{f.name.trim() || 'Nouveau lieu'}</span>
            </span>
            <span className={styles.previewBody}>
              {typeLabel && <span>{typeLabel}</span>}
              {parentLabel && (
                <span>
                  <MapPin aria-hidden /> {parentLabel}
                </span>
              )}
              <span>
                <Users aria-hidden /> {plural(f.characterIds.length, 'originaire')}
              </span>
            </span>
          </div>
          <nav aria-label="Sections du formulaire" className={form.toc}>
            <p className={form.tocLabel}>Sections</p>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}

/** Zone de suppression d'un lieu. */
export function PlaceDangerZone({ onDelete }) {
  return (
    <section aria-labelledby="danger-title" className={form.danger}>
      <div>
        <p id="danger-title" className={form.dangerTitle}>Supprimer le lieu</p>
        <p className={form.note}>Les personnages et groupes liés ne sont pas supprimés. Les sous-lieux remontent au niveau du lieu parent.</p>
      </div>
      {onDelete}
    </section>
  );
}
