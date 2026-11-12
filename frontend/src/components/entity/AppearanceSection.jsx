import { uploadUrl } from '@/api/client';
import { COLOR_ROLES } from '@/theme/themes';
import { ColorInput } from '@/components/ui/ColorInput';
import { Field } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { FormSection } from '@/components/universe/UniverseForm';
import form from './EntityForm.module.scss';

const DEFAULT_BACKGROUND_COLOR = '#3b3f4a';
// Pas d'option « Aucun » : le mode Image sans image choisie (ou image retirée) donne une page sans fond
const BACKGROUND_MODES = [
  { value: 'image', label: 'Image' },
  { value: 'color', label: 'Couleur' },
];

/**
 * Section « Apparence » d'une entité (groupe, lieu) : 3 couleurs (vides = celles de l'univers)
 * et fond de la page (image, par défaut, ou couleur).
 * `state` : { form: { colors, backgroundMode, backgroundColor }, update, images, setImage } ;
 * `savedBackground` : chemin de l'image de fond enregistrée ; `subject` : « du groupe », « du lieu »...
 * `showColors={false}` : fond seul (ex. épisode) ; `title` / `description` remplacent les textes par défaut.
 */
export function AppearanceSection({ state, savedBackground, subject, showColors = true, title = 'Apparence', description }) {
  const { form: f, update, images, setImage } = state;
  const toast = useToast();
  return (
    <FormSection
      id="apparence"
      title={title}
      description={description ?? `Les couleurs et le fond de la page ${subject}. Une couleur laissée vide reprend celle de l’univers.`}
    >
      {showColors && (
        <div className={form.colors}>
          {COLOR_ROLES.map((role) => (
            <Field key={role.key} label={role.label} hint={role.hint}>
              {(props) => (
                <ColorInput
                  {...props}
                  value={f.colors[role.key]}
                  onChange={(color) => update({ colors: { ...f.colors, [role.key]: color } })}
                  onReset={() => update({ colors: { ...f.colors, [role.key]: null } })}
                />
              )}
            </Field>
          ))}
        </div>
      )}
      <fieldset className={form.fieldset}>
        {showColors && <legend className={form.legend}>Fond</legend>}
        <Segmented
          label="Type de fond"
          options={BACKGROUND_MODES}
          value={f.backgroundMode}
          onChange={(backgroundMode) => update({ backgroundMode, backgroundColor: f.backgroundColor || DEFAULT_BACKGROUND_COLOR })}
        />
        {f.backgroundMode === 'color' && (
          <ColorInput value={f.backgroundColor} fallback={DEFAULT_BACKGROUND_COLOR} onChange={(backgroundColor) => update({ backgroundColor })} aria-label="Couleur de fond" />
        )}
        {f.backgroundMode === 'image' && (
          <ImagePicker
            label="Image de fond"
            aspect="16 / 9"
            className={form.background}
            currentUrl={uploadUrl(savedBackground)}
            value={images.background}
            onChange={(v) => setImage('background', v)}
            onError={toast.error}
          />
        )}
      </fieldset>
    </FormSection>
  );
}
