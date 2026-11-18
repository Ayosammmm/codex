import { useMemo } from 'react';
import { CornerDownRight } from '@/components/ui/icons';
import { IMG, uploadUrl } from '@/api/client';
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
import specieForm from '@/components/species/SpecieForm.module.scss';
import { FieldsGrid } from './modFields';
import { typeNoun } from './nouns';

/**
 * Formulaire d'une entité de mod : identité (illustration, nom, parent), champs du type, présentation,
 * apparence, album ; `collections`, `editors`, `dangerZone` : sections de l'édition uniquement.
 */
export function CustomEntityForm({ type, entity, state, siblings, errors, collections, editors, dangerZone }) {
  const { form: f, update, setField, images, setImage } = state;
  const toast = useToast();
  const isEdit = Boolean(entity?.id);
  const image = useImagePreview(entity?.image, images.image);
  const noun = typeNoun(type);

  // Ni l'entité elle-même ni ses descendantes ne peuvent devenir sa parente
  const entityId = entity?.id;
  const parentOptions = useMemo(() => {
    if (!type.hierarchy) return [];
    const excluded = entityId ? descendantIds(entityId, siblings) : new Set();
    return siblings
      .filter((e) => !excluded.has(e.id))
      .map((e) => ({ value: e.id, label: e.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [type.hierarchy, entityId, siblings]);
  const parentLabel = parentOptions.find((o) => String(o.value) === f.parentId)?.label;

  const sections = [
    { id: 'identite', label: 'Identité' },
    type.fields.length > 0 && { id: 'caracteristiques', label: 'Caractéristiques' },
    { id: 'presentation', label: 'Présentation' },
    { id: 'apparence', label: 'Apparence' },
    { id: 'album', label: 'Album photo' },
    collections && { id: 'collections', label: 'Collections' },
    editors && { id: 'editeurs', label: 'Éditeurs' },
  ].filter(Boolean);

  return (
    <div className={form.layout}>
      <div className={form.sections}>
        <FormSection id="identite" title="Identité" description={type.description || `Le nom et l’illustration de ${noun.this}.`}>
          <div className={form.identity}>
            <ImagePicker
              label="Illustration"
              aspect="4 / 5"
              currentUrl={uploadUrl(entity?.image, IMG.card)}
              value={images.image}
              onChange={(v) => setImage('image', v)}
              onError={toast.error}
            />
            <div className={specieForm.fields}>
              <Field label="Nom" required error={errors.name}>
                {(props) => <Input {...props} value={f.name} onChange={(e) => update({ name: e.target.value })} maxLength={255} />}
              </Field>
              {type.hierarchy && (
                <Field label={`${type.label} parent${type.feminine ? 'e' : ''}`} hint="Pour ranger les fiches en arborescence.">
                  {(props) => <Select {...props} options={parentOptions} value={f.parentId} onChange={(parentId) => update({ parentId })} placeholder="Aucun" />}
                </Field>
              )}
            </div>
          </div>
        </FormSection>

        {type.fields.length > 0 && (
          <FormSection id="caracteristiques" title="Caractéristiques" description={`Champs définis par le mod « ${type.mod.name} ».`}>
            <FieldsGrid fields={type.fields} modId={type.modId} values={f.data} onChange={setField} />
          </FormSection>
        )}

        <FormSection id="presentation" title="Présentation">
          <Field label="Description">
            {(props) => <RichTextEditor {...props} label="Description" minHeight="12rem" value={f.description} onChange={(description) => update({ description })} />}
          </Field>
        </FormSection>

        <AppearanceSection state={state} savedBackground={entity?.background} subject={`de ${noun.this}`} />

        <FormSection id="album" title="Album photo" description="Les photos sont enregistrées dès leur ajout.">
          {isEdit ? <PhotoAlbum entityType="custom" entityId={entity.id} /> : <p className={form.note}>L’album sera disponible une fois la fiche créée.</p>}
        </FormSection>

        {collections}
        {editors}
        {dangerZone}
      </div>

      <aside className={form.aside} aria-label="Aperçu">
        <div className={form.asideSticky}>
          <div className={specieForm.preview}>
            <EntityBanner src={image} className={specieForm.previewImage} />
            <span className={specieForm.previewBody}>
              <span className={specieForm.previewName}>{f.name.trim() || noun.new}</span>
              {parentLabel && (
                <span className={specieForm.previewMeta}>
                  <CornerDownRight aria-hidden /> {parentLabel}
                </span>
              )}
              <span className={specieForm.previewMeta}>
                <type.Icon aria-hidden /> {type.label}
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

/** Zone de suppression. */
export function CustomDangerZone({ type, onDelete }) {
  return (
    <section aria-labelledby="danger-title" className={form.danger}>
      <div>
        <p id="danger-title" className={form.dangerTitle}>Supprimer {typeNoun(type).this}</p>
        {type.hierarchy && <p className={form.note}>Ses descendants remontent au niveau de son parent.</p>}
      </div>
      {onDelete}
    </section>
  );
}
