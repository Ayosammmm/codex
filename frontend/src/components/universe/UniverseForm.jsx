import { Check, Lock } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { MODULE_TREE } from '@/config/modules';
import { COLOR_ROLES, THEMES, getTheme } from '@/theme/themes';
import { Field, Input } from '@/components/ui/Field';
import { RichTextEditor } from '@/components/ui/RichText';
import { ColorInput } from '@/components/ui/ColorInput';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/components/ui/cx';
import { useToast } from '@/components/ui/Toast';
import { UniversePreview } from './UniversePreview';
import styles from './UniverseForm.module.scss';

// ---------------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------------

export function FormSection({ id, title, description, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 id={`${id}-title`} className={styles.sectionTitle}>{title}</h2>
        {description && <p className={styles.sectionDescription}>{description}</p>}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

/**
 * Formulaire complet : général, images, apparence, modules + aperçu en direct.
 * `state` vient de useUniverseForm().
 * `beforeAppearance` : sections insérées juste avant « Apparence » (ex. affichage dans les paramètres).
 * `extraSections` : sections supplémentaires en fin de formulaire (ex. actions dans les paramètres).
 */
export function UniverseForm({ universe, state, nameError, beforeAppearance, extraSections }) {
  const { form, update, images, setImage } = state;
  const toast = useToast();

  // Aperçu : image enregistrée, sauf si elle a été retirée (les fichiers choisis sont gérés par l'aperçu)
  const savedImage = (field) => (images[field] === null ? null : uploadUrl(universe?.[field]));

  return (
    <div className={styles.layout}>
      <div className={styles.sections}>
        <GeneralSection form={form} update={update} nameError={nameError} />
        <ImagesSection universe={universe} form={form} update={update} images={images} setImage={setImage} onError={toast.error} />
        {beforeAppearance}
        <AppearanceSection form={form} update={update} />
        <ModulesSection form={form} update={update} />
        {extraSections}
      </div>

      <aside className={styles.aside} aria-label="Aperçu">
        <div className={styles.asideSticky}>
          <p className={styles.asideLabel}>Aperçu</p>
          <UniversePreview form={form} images={images} savedImage={savedImage} />
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function GeneralSection({ form, update, nameError }) {
  return (
    <FormSection id="general" title="Général" description="Le nom et la présentation de votre univers.">
      <Field label="Nom" required error={nameError}>
        {(props) => (
          <Input {...props} value={form.name} onChange={(e) => update({ name: e.target.value })} maxLength={255} placeholder="Ex. Les Terres d’Ombreval" />
        )}
      </Field>
      <Field label="Description" hint="Quelques lignes pour situer l’univers : époque, ton, enjeux…">
        {(props) => (
          <RichTextEditor {...props} label="Description" value={form.description} onChange={(description) => update({ description })} />
        )}
      </Field>
    </FormSection>
  );
}

const BACKGROUND_MODES = [
  { value: 'none', label: 'Aucun' },
  { value: 'color', label: 'Couleur' },
  { value: 'image', label: 'Image' },
];

function ImagesSection({ universe, form, update, images, setImage, onError }) {
  const current = (field) => uploadUrl(universe?.[field]);
  return (
    <FormSection id="images" title="Images" description="Logo, bannière et fond d’ambiance de l’univers. 5 Mo maximum par image.">
      <div className={styles.imagesGrid}>
        <ImagePicker
          label="Logo"
          hint="Carré"
          aspect="1"
          currentUrl={current('logo')}
          value={images.logo}
          onChange={(v) => setImage('logo', v)}
          onError={onError}
        />
        <ImagePicker
          label="Bannière"
          hint="Format large, ex. 1600 × 400"
          aspect="4 / 1"
          dropClassName={styles.bannerDrop}
          currentUrl={current('banner')}
          value={images.banner}
          onChange={(v) => setImage('banner', v)}
          onError={onError}
        />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Fond</legend>
        <SegmentedControl
          name="background-mode"
          options={BACKGROUND_MODES}
          value={form.backgroundMode}
          onChange={(backgroundMode) => update({ backgroundMode })}
        />
        {form.backgroundMode === 'color' && (
          <ColorInput
            value={form.backgroundColor}
            fallback={getTheme(form.theme).colors.primary}
            onChange={(backgroundColor) => update({ backgroundColor })}
            aria-label="Couleur de fond"
          />
        )}
        {form.backgroundMode === 'image' && (
          <ImagePicker
            label="Image de fond"
            className={styles.backgroundImage}
            currentUrl={current('background')}
            value={images.background}
            onChange={(v) => setImage('background', v)}
            onError={onError}
          />
        )}
      </fieldset>
    </FormSection>
  );
}

function AppearanceSection({ form, update }) {
  const theme = getTheme(form.theme);
  return (
    <FormSection id="apparence" title="Apparence" description="Le style visuel de l’univers et ses couleurs.">
      <fieldset>
        <legend className={styles.legend}>Thème</legend>
        <div className={styles.themeGrid}>
          {THEMES.map((t) => {
            const selected = form.theme === t.key;
            return (
              <label
                key={t.key}
                className={cx(styles.themeOption, selected && styles.themeSelected, !t.available && styles.themeDisabled)}
              >
                <input
                  type="radio"
                  name="theme"
                  value={t.key}
                  checked={selected}
                  disabled={!t.available}
                  onChange={() => update({ theme: t.key })}
                />
                <ThemeSample theme={t} />
                <span className={styles.themeText}>
                  <span className={styles.themeName}>
                    {t.label}
                    {!t.available && <span className={styles.pill}>Bientôt</span>}
                    {t.alwaysDark && <span className={styles.pill}>Toujours sombre</span>}
                  </span>
                  <span className={styles.themeDescription}>{t.description}</span>
                </span>
                {selected && <Check className={styles.themeCheck} aria-hidden />}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className={cx(styles.legend, styles.legendTight)}>Couleurs</legend>
        <p className={styles.note}>Laissez la valeur par défaut pour suivre les couleurs du thème.</p>
        <div className={styles.colorList}>
          {COLOR_ROLES.map((role) => (
            <Field key={role.key} label={role.label} hint={role.hint}>
              {(props) => (
                <ColorInput
                  {...props}
                  value={form.colors[role.key]}
                  fallback={theme.colors[role.key]}
                  onChange={(color) => update({ colors: { ...form.colors, [role.key]: color } })}
                  onReset={() => update({ colors: { ...form.colors, [role.key]: null } })}
                />
              )}
            </Field>
          ))}
        </div>
      </fieldset>
    </FormSection>
  );
}

/**
 * Échantillon rendu DANS le thème (data-theme) : fond, texture, police des titres,
 * bordure, arrondi, ombre et couleurs par défaut du thème.
 */
function ThemeSample({ theme }) {
  return (
    <span
      aria-hidden
      data-theme={theme.key}
      className={styles.themeSample}
      style={{ '--primary': theme.colors.primary, '--secondary': theme.colors.secondary, '--tertiary': theme.colors.tertiary }}
    >
      <span className={styles.themeSampleTitle}>Aa</span>
      <span className={styles.themeSampleBar} />
    </span>
  );
}

function ModulesSection({ form, update }) {
  const setModule = (key, value) => update({ modules: { ...form.modules, [key]: value } });

  return (
    <FormSection
      id="modules"
      title="Modules"
      description="Activez uniquement ce dont votre univers a besoin : chaque module ajoute des pages et des champs. Désactiver un module masque ses données sans les supprimer."
    >
      <ul className={styles.moduleList}>
        {MODULE_TREE.map((mod) => {
          const parentOn = mod.core || form.modules[mod.key];
          return (
            <li key={mod.key}>
              <ModuleRow module={mod} checked={parentOn} onChange={(v) => setModule(mod.key, v)} />
              {mod.children.length > 0 && (
                <ul className={styles.subModules}>
                  {mod.children.map((child) => (
                    <li key={child.key}>
                      <ModuleRow
                        module={child}
                        checked={Boolean(form.modules[child.key])}
                        onChange={(v) => setModule(child.key, v)}
                        parentOff={!parentOn}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </FormSection>
  );
}

function ModuleRow({ module: mod, checked, onChange, parentOff = false }) {
  const disabled = mod.core || mod.comingSoon || parentOff;
  const id = `module-${mod.key}`;
  return (
    <div className={cx(styles.moduleRow, (mod.comingSoon || parentOff) && styles.moduleMuted)}>
      <span className={cx(styles.moduleIcon, checked && !parentOff && styles.moduleIconOn)}>
        <mod.icon aria-hidden />
      </span>
      <div className={styles.moduleText}>
        <label htmlFor={id} className={styles.moduleLabel}>
          {mod.label}
          {mod.core && (
            <span className={styles.pill}>
              <Lock aria-hidden /> Toujours actif
            </span>
          )}
          {mod.comingSoon && <span className={styles.pill}>Bientôt</span>}
        </label>
        <p className={styles.moduleDescription}>
          {mod.description}
          {parentOff && !mod.comingSoon && ' (nécessite le module parent)'}
        </p>
      </div>
      <Switch id={id} checked={mod.core ? true : checked && !parentOff} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function SegmentedControl({ name, options, value, onChange }) {
  return (
    <div role="radiogroup" className={styles.segmented}>
      {options.map((o) => (
        <label key={o.value} className={cx(styles.segment, value === o.value && styles.segmentActive)}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}
