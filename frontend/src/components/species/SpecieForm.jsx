import { useMemo } from 'react';
import { CornerDownRight, Users } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
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
import { plural } from '@/utils/universe';
import styles from './SpecieForm.module.scss';

/**
 * Formulaire complet d'une espèce.
 * - `state` : useSpecieForm() ; `refs` : options (useSpeciesReferences) + `allSpecies`
 * - `dangerZone` : zone de suppression (édition uniquement)
 */
export function SpecieForm({ specie, state, refs, errors, editors, dangerZone }) {
  const { form: f, update, images, setImage } = state;
  const toast = useToast();
  const isEdit = Boolean(specie?.id);
  const image = useImagePreview(specie?.image, images.image);

  // Ni l'espèce elle-même ni ses sous-espèces ne peuvent devenir sa parente
  const specieId = specie?.id;
  const { allSpecies, species: specieOptions } = refs;
  const parentOptions = useMemo(() => {
    const excluded = specieId ? descendantIds(specieId, allSpecies || []) : new Set();
    return specieOptions.filter((o) => !excluded.has(o.value));
  }, [specieId, allSpecies, specieOptions]);

  const parentLabel = refs.species.find((o) => String(o.value) === f.parentId)?.label;
  const sections = [
    { id: 'identite', label: 'Identité' },
    { id: 'presentation', label: 'Présentation' },
    { id: 'personnages', label: 'Personnages' },
    { id: 'apparence', label: 'Apparence' },
    { id: 'album', label: 'Album photo' },
    editors && { id: 'editeurs', label: 'Éditeurs' },
  ].filter(Boolean);

  return (
    <div className={form.layout}>
      <div className={form.sections}>
        <FormSection id="identite" title="Identité" description="Le nom de l’espèce, son illustration et l’espèce dont elle descend.">
          <div className={form.identity}>
            <ImagePicker
              label="Illustration"
              aspect="4 / 5"
              currentUrl={uploadUrl(specie?.image)}
              value={images.image}
              onChange={(v) => setImage('image', v)}
              onError={toast.error}
            />
            <div className={styles.fields}>
              <Field label="Nom" required error={errors.name}>
                {(props) => <Input {...props} value={f.name} onChange={(e) => update({ name: e.target.value })} maxLength={255} placeholder="Ex. Elfes des bois" />}
              </Field>
              <Field label="Espèce parente" hint="Pour une sous-espèce, une race ou une variante (ex. Elfes noirs → Elfes).">
                {(props) => <Select {...props} options={parentOptions} value={f.parentId} onChange={(parentId) => update({ parentId })} placeholder="Aucune" />}
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection id="presentation" title="Présentation" description="Apparence, origines, culture, capacités, faiblesses…">
          <Field label="Description">
            {(props) => <RichTextEditor {...props} label="Description" minHeight="12rem" value={f.description} onChange={(description) => update({ description })} />}
          </Field>
        </FormSection>

        <FormSection id="personnages" title="Personnages" description="Les personnages de cette espèce.">
          <Field label="Représentants" hint="Aussi modifiable depuis la fiche de chaque personnage (« Espèces »).">
            {(props) => (
              <Combobox {...props} multiple options={refs.characters} value={f.characterIds} onChange={(characterIds) => update({ characterIds })} placeholder="Ajouter un personnage…" />
            )}
          </Field>
        </FormSection>

        <AppearanceSection state={state} savedBackground={specie?.background} subject="de l’espèce" />

        <FormSection id="album" title="Album photo" description="Les photos sont enregistrées dès leur ajout.">
          {isEdit ? <PhotoAlbum entityType="specie" entityId={specie.id} /> : <p className={form.note}>L’album sera disponible une fois l’espèce créée.</p>}
        </FormSection>

        {editors}
        {dangerZone}
      </div>

      <aside className={form.aside} aria-label="Aperçu">
        <div className={form.asideSticky}>
          <div className={styles.preview}>
            <EntityBanner src={image} className={styles.previewImage} />
            <span className={styles.previewBody}>
              <span className={styles.previewName}>{f.name.trim() || 'Nouvelle espèce'}</span>
              {parentLabel && (
                <span className={styles.previewMeta}>
                  <CornerDownRight aria-hidden /> {parentLabel}
                </span>
              )}
              <span className={styles.previewMeta}>
                <Users aria-hidden /> {plural(f.characterIds.length, 'personnage')}
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

/** Zone de suppression d'une espèce. */
export function SpecieDangerZone({ onDelete }) {
  return (
    <section aria-labelledby="danger-title" className={form.danger}>
      <div>
        <p id="danger-title" className={form.dangerTitle}>Supprimer l’espèce</p>
        <p className={form.note}>Les personnages ne sont pas supprimés. Les sous-espèces remontent au niveau de l’espèce parente.</p>
      </div>
      {onDelete}
    </section>
  );
}
