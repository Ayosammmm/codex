import { CalendarRange, Clapperboard } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { Field, Input } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { RichTextEditor } from '@/components/ui/RichText';
import { useToast } from '@/components/ui/Toast';
import { FormSection } from '@/components/universe/UniverseForm';
import { AppearanceSection } from '@/components/entity/AppearanceSection';
import { EntityBanner } from '@/components/entity/EntityBanner';
import form from '@/components/entity/EntityForm.module.scss';
import { useImagePreview } from '@/components/entity/useImagePreview';
import { plural } from '@/utils/universe';
import { EpisodesField } from './EpisodesField';
import styles from './StoryForm.module.scss';

/** Formulaire complet d'une histoire. `state` : useStoryForm() ; `dangerZone` : édition uniquement. */
export function StoryForm({ universe, story, state, errors, modFields, collections, editors, dangerZone }) {
  const { form: f, update, images, setImage } = state;
  const toast = useToast();
  const cover = useImagePreview(story?.image, images.image);
  const period = [f.startDate.trim(), f.endDate.trim()].filter(Boolean).join(' → ');

  const sections = [
    { id: 'identite', label: 'Identité' },
    { id: 'couverture', label: 'Couverture' },
    { id: 'presentation', label: 'Présentation' },
    { id: 'episodes', label: 'Épisodes' },
    { id: 'apparence', label: 'Apparence' },
    modFields && { id: 'champs-mods', label: 'Champs des mods' },
    collections && { id: 'collections', label: 'Collections' },
    editors && { id: 'editeurs', label: 'Éditeurs' },
  ].filter(Boolean);

  return (
    <div className={form.layout}>
      <div className={form.sections}>
        <FormSection id="identite" title="Identité" description="Le nom de l’histoire et sa place dans la chronologie de l’univers.">
          <Field label="Nom" required error={errors.name}>
            {(props) => <Input {...props} value={f.name} onChange={(e) => update({ name: e.target.value })} maxLength={255} placeholder="Ex. La Chute de la Couronne" />}
          </Field>
          <div className={form.fields}>
            <Field label="Début" hint="Texte libre : « An 302 », « Printemps de la guerre »…">
              {(props) => <Input {...props} value={f.startDate} onChange={(e) => update({ startDate: e.target.value })} maxLength={255} />}
            </Field>
            <Field label="Fin" hint="Laissez vide si l’histoire n’est pas terminée.">
              {(props) => <Input {...props} value={f.endDate} onChange={(e) => update({ endDate: e.target.value })} maxLength={255} />}
            </Field>
          </div>
        </FormSection>

        <FormSection id="couverture" title="Couverture" description="Affichée en tête de l’histoire et dans l’archive. 5 Mo maximum.">
          <ImagePicker
            label="Image"
            hint="Format large, ex. 1800 × 600"
            aspect="3 / 1"
            currentUrl={uploadUrl(story?.image)}
            value={images.image}
            onChange={(v) => setImage('image', v)}
            onError={toast.error}
          />
        </FormSection>

        <FormSection id="presentation" title="Présentation" description="Le résumé, les enjeux, le ton…">
          <Field label="Description">
            {(props) => <RichTextEditor {...props} label="Description" minHeight="10rem" value={f.description} onChange={(description) => update({ description })} />}
          </Field>
        </FormSection>

        <FormSection id="episodes" title="Épisodes" description="Une histoire est un regroupement d’épisodes, dans l’ordre du récit. Elle en contient au moins un.">
          <EpisodesField universe={universe} storyId={story?.id} value={f.episodes} onChange={(episodes) => update({ episodes })} error={errors.episodes} />
        </FormSection>

        <AppearanceSection state={state} savedBackground={story?.background} subject="de l’histoire" />

        {modFields}
        {collections}
        {editors}
        {dangerZone}
      </div>

      <aside className={form.aside} aria-label="Aperçu">
        <div className={form.asideSticky}>
          <div className={styles.preview}>
            <EntityBanner src={cover} className={styles.previewCover} />
            <span className={styles.previewBody}>
              <span className={styles.previewName}>{f.name.trim() || 'Nouvelle histoire'}</span>
              {period && (
                <span className={styles.previewMeta}>
                  <CalendarRange aria-hidden /> {period}
                </span>
              )}
              <span className={styles.previewMeta}>
                <Clapperboard aria-hidden /> {plural(f.episodes.length, 'épisode')}
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

/** Zone de suppression d'une histoire. */
export function StoryDangerZone({ onDelete }) {
  return (
    <section aria-labelledby="danger-title" className={form.danger}>
      <div>
        <p id="danger-title" className={form.dangerTitle}>Supprimer l’histoire</p>
        <p className={form.note}>Ses épisodes sont supprimés avec elle. Les personnages, lieux et événements sont conservés.</p>
      </div>
      {onDelete}
    </section>
  );
}
