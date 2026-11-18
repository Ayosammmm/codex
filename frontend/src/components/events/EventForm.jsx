import { CalendarClock } from '@/components/ui/icons';
import { IMG, uploadUrl } from '@/api/client';
import { IMPORTANCE, importanceColor } from '@/config/events';
import { Badge } from '@/components/ui/Badge';
import { Combobox } from '@/components/ui/Combobox';
import { Field, Input } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { RichTextEditor } from '@/components/ui/RichText';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { FormSection } from '@/components/universe/UniverseForm';
import { AppearanceSection } from '@/components/entity/AppearanceSection';
import { EntityBanner } from '@/components/entity/EntityBanner';
import form from '@/components/entity/EntityForm.module.scss';
import { useImagePreview } from '@/components/entity/useImagePreview';
import styles from './EventForm.module.scss';

const IMPORTANCE_OPTIONS = [{ value: '', label: 'Non précisée' }, ...IMPORTANCE];

/**
 * Formulaire complet d'un événement.
 * - `state` : useEventForm() ; `refs` : options (useNarrativeReferences) ; `modules` : { groups }
 */
export function EventForm({ event, state, refs, modules, errors, modFields, collections, editors, dangerZone }) {
  const { form: f, update, images, setImage } = state;
  const toast = useToast();
  const image = useImagePreview(event?.image, images.image);

  const sections = [
    { id: 'identite', label: 'Identité' },
    { id: 'image', label: 'Illustration' },
    { id: 'description', label: 'Description' },
    { id: 'protagonistes', label: 'Personnages et lieux' },
    { id: 'episodes', label: 'Épisodes' },
    { id: 'apparence', label: 'Apparence' },
    modFields && { id: 'champs-mods', label: 'Champs des mods' },
    collections && { id: 'collections', label: 'Collections' },
    editors && { id: 'editeurs', label: 'Éditeurs' },
  ].filter(Boolean);

  return (
    <div className={form.layout}>
      <div className={form.sections}>
        <FormSection id="identite" title="Identité" description="Un moment clé très précis, et son importance pour l’univers ou les personnages.">
          <Field label="Nom" required error={errors.name}>
            {(props) => <Input {...props} value={f.name} onChange={(e) => update({ name: e.target.value })} maxLength={255} placeholder="Ex. Le sacre de la reine Ysolde" />}
          </Field>
          <Field label="Date" hint="Texte libre : « An 302 », « La nuit du bal »… La place dans la frise se règle depuis la liste des événements.">
            {(props) => <Input {...props} value={f.date} onChange={(e) => update({ date: e.target.value })} maxLength={255} />}
          </Field>
          <fieldset className={form.fieldset}>
            <legend className={form.legend}>Importance</legend>
            <Segmented label="Importance" options={IMPORTANCE_OPTIONS} value={f.importance} onChange={(importance) => update({ importance })} />
          </fieldset>
        </FormSection>

        <FormSection id="image" title="Illustration" description="5 Mo maximum.">
          <ImagePicker label="Image" aspect="16 / 9" className={form.background} currentUrl={uploadUrl(event?.image, IMG.card)} value={images.image} onChange={(v) => setImage('image', v)} onError={toast.error} />
        </FormSection>

        <FormSection id="description" title="Description" description="Ce qui s’est passé, ses causes, ses conséquences…">
          <Field label="Description">
            {(props) => <RichTextEditor {...props} label="Description" minHeight="12rem" value={f.description} onChange={(description) => update({ description })} />}
          </Field>
        </FormSection>

        <FormSection
          id="protagonistes"
          title="Personnages et lieux"
          description="Ceux qui étaient présents à ce moment précis : un personnage d’un épisode n’assiste pas forcément à tous ses événements."
        >
          <Field label="Personnages présents">
            {(props) => <Combobox {...props} multiple options={refs.characters} value={f.characterIds} onChange={(characterIds) => update({ characterIds })} placeholder="Ajouter un personnage…" />}
          </Field>
          <Field label="Lieux">
            {(props) => <Combobox {...props} multiple options={refs.places} value={f.placeIds} onChange={(placeIds) => update({ placeIds })} placeholder="Ajouter un lieu…" />}
          </Field>
          {modules.groups && (
            <Field label="Groupes impliqués">
              {(props) => <Combobox {...props} multiple options={refs.groups} value={f.groupIds} onChange={(groupIds) => update({ groupIds })} placeholder="Ajouter un groupe…" />}
            </Field>
          )}
        </FormSection>

        <FormSection id="episodes" title="Épisodes" description="Les épisodes où survient cet événement, même dans des histoires différentes : il les relie.">
          <Field label="Épisodes">
            {(props) => <Combobox {...props} multiple options={refs.episodes} value={f.episodeIds} onChange={(episodeIds) => update({ episodeIds })} placeholder="Ajouter un épisode…" />}
          </Field>
        </FormSection>

        <AppearanceSection state={state} savedBackground={event?.background} subject="de l’événement" />

        {modFields}
        {collections}
        {editors}
        {dangerZone}
      </div>

      <aside className={form.aside} aria-label="Aperçu">
        <div className={form.asideSticky}>
          <div className={styles.preview} style={{ '--tone': importanceColor(f.importance) || 'var(--border)' }}>
            <EntityBanner src={image} className={styles.previewImage} />
            <span className={styles.previewBody}>
              <span className={styles.previewDate}>
                <CalendarClock aria-hidden /> {f.date.trim() || 'Date inconnue'}
              </span>
              <span className={styles.previewName}>{f.name.trim() || 'Nouvel événement'}</span>
              {f.importance && <Badge color={importanceColor(f.importance)}>{f.importance}</Badge>}
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

/** Zone de suppression d'un événement. */
export function EventDangerZone({ onDelete }) {
  return (
    <section aria-labelledby="danger-title" className={form.danger}>
      <div>
        <p id="danger-title" className={form.dangerTitle}>Supprimer l’événement</p>
        <p className={form.note}>Il est retiré des épisodes où il apparaît. Les personnages, lieux et groupes sont conservés.</p>
      </div>
      {onDelete}
    </section>
  );
}
