import { Link } from 'react-router';
import { MapPin, Ruler } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import {
  ACTIVITY_CYCLES,
  DIETS,
  FLIGHT_BEHAVIORS,
  INTELLIGENCE_MAX,
  SIZE_UNITS,
  TEMPERAMENTS,
  temperamentColor,
} from '@/config/creatures';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { RichTextEditor } from '@/components/ui/RichText';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import { FormSection } from '@/components/universe/UniverseForm';
import { PhotoAlbum } from '@/components/characters/PhotoAlbum';
import { AppearanceSection } from '@/components/entity/AppearanceSection';
import { EntityBanner } from '@/components/entity/EntityBanner';
import form from '@/components/entity/EntityForm.module.scss';
import { useImagePreview } from '@/components/entity/useImagePreview';
import { universePath } from '@/utils/universe';
import styles from './CreatureForm.module.scss';

const PHYSICAL = [
  { key: 'speed', label: 'Vitesse', placeholder: 'Ex. 60 km/h, très rapide' },
  { key: 'physicalStrength', label: 'Force', placeholder: 'Ex. Soulève un cheval' },
  { key: 'endurance', label: 'Endurance', placeholder: 'Ex. Chasse des jours sans repos' },
  { key: 'robustness', label: 'Robustesse', placeholder: 'Ex. Écailles qui arrêtent les flèches' },
];

/**
 * Formulaire complet d'une créature.
 * - `state` : useCreatureForm() ; `refs` : options (useCreatureReferences) ; `modules` : { ranks }
 * - `dangerZone` : zone de suppression (édition uniquement)
 */
export function CreatureForm({ universe, creature, state, refs, modules, errors, collections, editors, dangerZone }) {
  const { form: f, update, images, setImage } = state;
  const toast = useToast();
  const isEdit = Boolean(creature?.id);
  const image = useImagePreview(creature?.image, images.image);
  const rank = modules.ranks ? refs.powerRanks.find((o) => String(o.value) === f.powerRankId) : null;
  const field = (key) => ({ value: f[key], onChange: (e) => update({ [key]: e.target.value }) });

  const sections = [
    { id: 'identite', label: 'Identité' },
    { id: 'morphologie', label: 'Morphologie' },
    { id: 'capacites', label: 'Capacités' },
    { id: 'comportement', label: 'Comportement' },
    { id: 'attaques', label: 'Attaques et détails' },
    { id: 'apparence', label: 'Apparence' },
    { id: 'album', label: 'Album photo' },
    collections && { id: 'collections', label: 'Collections' },
    editors && { id: 'editeurs', label: 'Éditeurs' },
  ].filter(Boolean);

  return (
    <div className={form.layout}>
      <div className={form.sections}>
        <FormSection id="identite" title="Identité" description="Le nom de la créature, son illustration, sa puissance et où elle vit.">
          <div className={form.identity}>
            <ImagePicker
              label="Illustration"
              aspect="4 / 5"
              currentUrl={uploadUrl(creature?.image)}
              value={images.image}
              onChange={(v) => setImage('image', v)}
              onError={toast.error}
            />
            <div className={styles.stack}>
              <Field label="Nom" required error={errors.name}>
                {(props) => <Input {...props} {...field('name')} maxLength={255} placeholder="Ex. Wyverne des marais" />}
              </Field>
              {modules.ranks && (
                <Field
                  label="Rang de puissance"
                  hint={
                    refs.powerRanks.length === 0 ? (
                      <>
                        Aucun rang.{' '}
                        <Link to={universePath(universe, 'rangs')} className={form.hintLink}>
                          Gérer les rangs
                        </Link>
                      </>
                    ) : undefined
                  }
                >
                  {(props) => (
                    <Select {...props} options={refs.powerRanks} value={f.powerRankId} onChange={(powerRankId) => update({ powerRankId })} placeholder="Non renseigné" disabled={!refs.powerRanks.length} />
                  )}
                </Field>
              )}
              <Field label="Habitats" hint="Les lieux où l’on rencontre cette créature.">
                {(props) => <Combobox {...props} multiple options={refs.places} value={f.placeIds} onChange={(placeIds) => update({ placeIds })} placeholder="Ajouter un lieu…" />}
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection id="morphologie" title="Morphologie" description="Gabarit et mode de vie.">
          <div className={form.fields}>
            <Field label="Taille moyenne">
              {(props) => (
                <span className={styles.size}>
                  <Input {...props} {...field('averageSize')} placeholder="Ex. 2,5" maxLength={50} />
                  <Segmented label="Unité de taille" options={SIZE_UNITS} value={f.sizeUnit} onChange={(sizeUnit) => update({ sizeUnit })} />
                </span>
              )}
            </Field>
            <Field label="Poids moyen (kg)" error={errors.averageWeight}>
              {(props) => <Input {...props} {...field('averageWeight')} inputMode="decimal" placeholder="Ex. 120" />}
            </Field>
            <Field label="Longévité (années)" error={errors.lifeExpectancy}>
              {(props) => <Input {...props} {...field('lifeExpectancy')} inputMode="numeric" placeholder="Inconnue" />}
            </Field>
            <Field label="Cycle d’activité">
              {(props) => <Select {...props} options={ACTIVITY_CYCLES} value={f.activityCycle} onChange={(activityCycle) => update({ activityCycle })} placeholder="Non renseigné" />}
            </Field>
            <Field label="Régime alimentaire">
              {(props) => <Select {...props} options={DIETS} value={f.diet} onChange={(diet) => update({ diet })} placeholder="Non renseigné" />}
            </Field>
          </div>
        </FormSection>

        <FormSection id="capacites" title="Capacités" description="Les aptitudes physiques, en quelques mots, et ce qui lui résiste ou la blesse.">
          <div className={form.fields}>
            {PHYSICAL.map((p) => (
              <Field key={p.key} label={p.label}>
                {(props) => <Input {...props} {...field(p.key)} maxLength={255} placeholder={p.placeholder} />}
              </Field>
            ))}
            <Field label="Résistances naturelles">
              {(props) => <Textarea {...props} {...field('naturalResistances')} rows={3} placeholder="Feu, poison…" />}
            </Field>
            <Field label="Faiblesses naturelles">
              {(props) => <Textarea {...props} {...field('naturalWeaknesses')} rows={3} placeholder="Argent, lumière du jour…" />}
            </Field>
          </div>
        </FormSection>

        <FormSection id="comportement" title="Comportement" description="Son attitude face aux autres et ses capacités de réflexion.">
          <div className={form.fields}>
            <Field label="Tempérament">
              {(props) => <Select {...props} options={TEMPERAMENTS} value={f.temperament} onChange={(temperament) => update({ temperament })} placeholder="Non renseigné" />}
            </Field>
            <Field label="Comportement de fuite">
              {(props) => <Select {...props} options={FLIGHT_BEHAVIORS} value={f.flightBehavior} onChange={(flightBehavior) => update({ flightBehavior })} placeholder="Non renseigné" />}
            </Field>
          </div>
          <IntelligenceField value={f.intelligence} onChange={(intelligence) => update({ intelligence })} />
        </FormSection>

        <FormSection id="attaques" title="Attaques et détails" description="Sa façon de combattre, et tout le reste : légendes, usages, rencontres…">
          <Field label="Attaques">
            {(props) => <RichTextEditor {...props} label="Attaques" value={f.attackTypes} onChange={(attackTypes) => update({ attackTypes })} />}
          </Field>
          <Field label="Informations complémentaires">
            {(props) => <RichTextEditor {...props} label="Informations complémentaires" minHeight="10rem" value={f.moreDetails} onChange={(moreDetails) => update({ moreDetails })} />}
          </Field>
        </FormSection>

        <AppearanceSection state={state} savedBackground={creature?.background} subject="de la créature" />

        <FormSection id="album" title="Album photo" description="Les photos sont enregistrées dès leur ajout.">
          {isEdit ? <PhotoAlbum entityType="creature" entityId={creature.id} /> : <p className={form.note}>L’album sera disponible une fois la créature créée.</p>}
        </FormSection>

        {collections}
        {editors}
        {dangerZone}
      </div>

      <aside className={form.aside} aria-label="Aperçu">
        <div className={form.asideSticky}>
          <div className={styles.preview}>
            <span className={styles.previewVisual}>
              <EntityBanner src={image} className={styles.previewImage} />
              {rank && (
                <span className={styles.previewRank}>
                  <Badge color={rank.color}>{rank.label}</Badge>
                </span>
              )}
            </span>
            <span className={styles.previewBody}>
              <span className={styles.previewName}>{f.name.trim() || 'Nouvelle créature'}</span>
              {f.temperament && <Badge color={temperamentColor(f.temperament)}>{f.temperament}</Badge>}
              {f.averageSize.trim() && (
                <span className={styles.previewMeta}>
                  <Ruler aria-hidden /> {f.averageSize.trim()} {f.sizeUnit}
                </span>
              )}
              {f.placeIds.length > 0 && (
                <span className={styles.previewMeta}>
                  <MapPin aria-hidden /> {f.placeIds.length} habitat{f.placeIds.length > 1 ? 's' : ''}
                </span>
              )}
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

/** Intelligence de 0 à 10 ; `null` = non renseignée (un clic sur le curseur la fixe). */
function IntelligenceField({ value, onChange }) {
  return (
    <div className={cx(styles.intelligence, value == null && styles.unset)}>
      <div className={styles.intelligenceHead}>
        <label htmlFor="creature-intelligence" className={styles.intelligenceLabel}>
          Intelligence
        </label>
        <span className={styles.intelligenceValue}>{value == null ? 'Non renseignée' : `${value}/${INTELLIGENCE_MAX}`}</span>
        {value != null && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Effacer
          </Button>
        )}
      </div>
      <input
        id="creature-intelligence"
        type="range"
        min={0}
        max={INTELLIGENCE_MAX}
        step={1}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={() => value == null && onChange(0)}
        className={styles.slider}
        aria-valuetext={value == null ? 'Non renseignée' : `${value} sur ${INTELLIGENCE_MAX}`}
      />
      <div className={styles.scale} aria-hidden>
        <span>Instinct pur</span>
        <span>Génie</span>
      </div>
    </div>
  );
}

/** Zone de suppression d'une créature. */
export function CreatureDangerZone({ onDelete }) {
  return (
    <section aria-labelledby="danger-title" className={form.danger}>
      <div>
        <p id="danger-title" className={form.dangerTitle}>Supprimer la créature</p>
        <p className={form.note}>Ses images et son album photo seront aussi supprimés.</p>
      </div>
      {onDelete}
    </section>
  );
}
