import { useMemo } from 'react';
import { Link } from 'react-router';
import { IMG, uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';
import { Badge } from '@/components/ui/Badge';
import { ColorInput } from '@/components/ui/ColorInput';
import { Combobox } from '@/components/ui/Combobox';
import { Field, Input } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { RichTextEditor } from '@/components/ui/RichText';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { FormSection } from '@/components/universe/UniverseForm';
import { universePath } from '@/utils/universe';
import { COLOR_ROLES } from '@/theme/themes';
import { CharacterAvatar } from './CharacterAvatar';
import { PhotoAlbum } from './PhotoAlbum';
import { RelationsField } from './RelationsField';
import { DevelopmentField } from './DevelopmentField';
import { GroupMembershipsField } from './GroupMembershipsField';
import { TraitsField } from './TraitsField';
import { useImagePreview } from '@/components/entity/useImagePreview';
import styles from '@/components/entity/EntityForm.module.scss';

/**
 * Formulaire complet d'un personnage.
 * - `state`      : useCharacterForm()
 * - `refs`       : options des référentiels (useCharacterReferences)
 * - `modules`    : modules actifs { groups, species, personality, relations, powers, ranks }
 * - `dangerZone` : contenu de la zone de suppression (édition uniquement)
 */
export function CharacterForm({ universe, character, state, refs, modules, errors, sound, modFields, collections, editors, dangerZone }) {
  const { form, update, images, setImages } = state;
  const toast = useToast();
  const avatar = useImagePreview(character?.avatar, images.avatar);
  const isEdit = Boolean(character?.id);

  // Personnages de l'univers par id (avatars des relations)
  const charactersById = useMemo(() => new Map((refs.allCharacters || []).map((c) => [c.id, c])), [refs.allCharacters]);


  const pick = (list, id) => list.find((o) => String(o.value) === String(id));
  const badges = [
    pick(refs.statuses, form.statut_id),
    pick(refs.genders, form.sexe_id),
    pick(refs.alignments, form.alignment_id),
    modules.ranks && pick(refs.powerRanks, form.rank_id),
  ].filter(Boolean);

  const sections = [
    { id: 'identite', label: 'Identité' },
    { id: 'classification', label: 'Classification' },
    { id: 'appartenances', label: 'Appartenances' },
    { id: 'recit', label: 'Récit' },
    modules.personality && { id: 'personnalite', label: 'Personnalité' },
    modules.relations && { id: 'relations', label: 'Relations' },
    { id: 'apparence', label: 'Apparence' },
    { id: 'album', label: 'Album photo' },
    sound && { id: 'son', label: 'Son' },
    modFields && { id: 'champs-mods', label: 'Champs des mods' },
    collections && { id: 'collections', label: 'Collections' },
    editors && { id: 'editeurs', label: 'Éditeurs' },
  ].filter(Boolean);

  const referenceSelect = (key, label, options, refPath, refLabel) => (
    <Field
      label={label}
      hint={
        options.length === 0 ? (
          <>
            Aucun élément.{' '}
            <Link to={universePath(universe, refPath)} className={styles.hintLink}>
              Gérer les {refLabel}
            </Link>
          </>
        ) : undefined
      }
    >
      {(props) => (
        <Select {...props} options={options} value={form[key]} onChange={(v) => update({ [key]: v })} placeholder="Non renseigné" disabled={options.length === 0} />
      )}
    </Field>
  );

  return (
    <div className={styles.layout}>
      <div className={styles.sections}>
        <FormSection id="identite" title="Identité" description="Au moins un prénom ou un nom est requis.">
          <div className={styles.identity}>
            <ImagePicker
              label="Avatar"
              aspect="4 / 5"
              currentUrl={uploadUrl(character?.avatar, IMG.card)}
              value={images.avatar}
              onChange={(v) => setImages((imgs) => ({ ...imgs, avatar: v }))}
              onError={toast.error}
            />
            <div className={styles.fields}>
              <Field label="Prénom">
                {(props) => (
                  <Input {...props} aria-invalid={errors.identity ? true : undefined} value={form.firstname} onChange={(e) => update({ firstname: e.target.value })} autoComplete="off" />
                )}
              </Field>
              <Field label="Nom">
                {(props) => (
                  <Input {...props} aria-invalid={errors.identity ? true : undefined} value={form.name} onChange={(e) => update({ name: e.target.value })} autoComplete="off" />
                )}
              </Field>
              {errors.identity && <p className={styles.identityError} role="alert">{errors.identity}</p>}
              <Field label="Titre" hint="Fonction, surnom ou rôle : « Capitaine », « La Lame grise »…">
                {(props) => <Input {...props} value={form.title} onChange={(e) => update({ title: e.target.value })} />}
              </Field>
              <Field label="Âge" error={errors.age}>
                {(props) => (
                  <Input {...props} inputMode="numeric" value={form.age} onChange={(e) => update({ age: e.target.value.replace(/[^\d]/g, '') })} placeholder="Inconnu" />
                )}
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection id="classification" title="Classification" description="Valeurs issues des référentiels de l’univers.">
          <div className={styles.fields}>
            {referenceSelect('sexe_id', 'Genre', refs.genders, 'genres', 'genres')}
            {referenceSelect('statut_id', 'Statut', refs.statuses, 'statuts', 'statuts')}
            {referenceSelect('alignment_id', 'Alignement', refs.alignments, 'alignements', 'alignements')}
            {modules.ranks && referenceSelect('rank_id', 'Rang de puissance', refs.powerRanks, 'rangs', 'rangs')}
          </div>
        </FormSection>

        <FormSection id="appartenances" title="Appartenances" description="Les groupes, espèces et lieux auxquels le personnage est rattaché.">
          {modules.groups && (
            <Field label="Groupes" hint="Le rôle proposé dépend des rôles définis dans chaque groupe.">
              {(props) => <GroupMembershipsField {...props} universe={universe} options={refs.groups} value={form.groups} onChange={(groups) => update({ groups })} />}
            </Field>
          )}
          {modules.species && (
            <Field label="Espèces">
              {(props) => <Combobox {...props} multiple options={refs.species} value={form.specieIds} onChange={(specieIds) => update({ specieIds })} placeholder="Ajouter une espèce…" />}
            </Field>
          )}
          <Field label="Lieux d’origine">
            {(props) => <Combobox {...props} multiple options={refs.places} value={form.placeIds} onChange={(placeIds) => update({ placeIds })} placeholder="Ajouter un lieu…" />}
          </Field>
        </FormSection>

        <FormSection id="recit" title="Récit" description="Tout ce qui raconte le personnage.">
          {modules.powers && (
            <Field label="Pouvoirs et capacités">
              {(props) => <RichTextEditor {...props} label="Pouvoirs et capacités" value={form.powers} onChange={(powers) => update({ powers })} />}
            </Field>
          )}
          <Field label="Profil psychologique">
            {(props) => <RichTextEditor {...props} label="Profil psychologique" value={form.personality} onChange={(personality) => update({ personality })} />}
          </Field>
          <Field label="Histoire">
            {(props) => <RichTextEditor {...props} label="Histoire" minHeight="12rem" value={form.story} onChange={(story) => update({ story })} />}
          </Field>
          <Field label="Notes et extras">
            {(props) => <RichTextEditor {...props} label="Notes et extras" value={form.extras} onChange={(extras) => update({ extras })} />}
          </Field>
        </FormSection>

        {modules.personality && (
          <FormSection id="personnalite" title="Personnalité" description="L’évolution du personnage, puis les 24 forces de caractère et leurs faiblesses, regroupées en 6 vertus.">
            <DevelopmentField
              value={form.development}
              note={form.developmentNote}
              onChange={(development) => update({ development })}
              onNoteChange={(developmentNote) => update({ developmentNote })}
            />
            <TraitsField value={form.traits} onChange={(traits) => update({ traits })} />
          </FormSection>
        )}

        {modules.relations && (
          <FormSection id="relations" title="Relations" description="Les liens avec les autres personnages. Ils apparaissent sur les deux fiches.">
            <RelationsField
              value={form.relations}
              onChange={(relations) => update({ relations })}
              characterOptions={refs.characters}
              charactersById={charactersById}
              selfId={character?.id}
              errors={errors}
              newKey={state.newRelationKey}
            />
          </FormSection>
        )}

        <FormSection id="apparence" title="Apparence" description="Les couleurs et le fond de la fiche du personnage. Une couleur laissée vide reprend celle de l’univers.">
          <div className={styles.colors}>
            {COLOR_ROLES.map((role) => (
              <Field key={role.key} label={role.label} hint={role.hint}>
                {(props) => (
                  <ColorInput
                    {...props}
                    value={form.colors[role.key]}
                    onChange={(color) => update({ colors: { ...form.colors, [role.key]: color } })}
                    onReset={() => update({ colors: { ...form.colors, [role.key]: null } })}
                  />
                )}
              </Field>
            ))}
          </div>
          <ImagePicker
            label="Image de fond"
            aspect="16 / 9"
            className={styles.background}
            currentUrl={uploadUrl(character?.background, IMG.card)}
            value={images.background}
            onChange={(v) => setImages((imgs) => ({ ...imgs, background: v }))}
            onError={toast.error}
          />
        </FormSection>

        <FormSection id="album" title="Album photo" description="Les photos sont enregistrées dès leur ajout.">
          {isEdit ? (
            <PhotoAlbum entityType="character" entityId={character.id} />
          ) : (
            <p className={styles.note}>L’album sera disponible une fois le personnage créé.</p>
          )}
        </FormSection>

        {sound}
        {modFields}
        {collections}
        {editors}
        {dangerZone}
      </div>

      <aside className={styles.aside} aria-label="Aperçu">
        <div className={styles.asideSticky}>
          <div className={styles.preview}>
            <CharacterAvatar character={{ firstname: form.firstname, name: form.name }} src={avatar} className={styles.previewAvatar} />
            <div className={styles.previewBody}>
              <span className={styles.previewName}>{characterName(form)}</span>
              {form.title && <span className={styles.previewTitle}>{form.title}</span>}
              {badges.length > 0 && (
                <span className={styles.badges}>
                  {badges.map((b) => (
                    <Badge key={`${b.value}-${b.label}`} color={b.color}>{b.label}</Badge>
                  ))}
                </span>
              )}
            </div>
          </div>
          <nav aria-label="Sections du formulaire" className={styles.toc}>
            <p className={styles.tocLabel}>Sections</p>
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

/** Zone de suppression d'un personnage. */
export function CharacterDangerZone({ onDelete }) {
  return (
    <section aria-labelledby="danger-title" className={styles.danger}>
      <div>
        <p id="danger-title" className={styles.dangerTitle}>Supprimer le personnage</p>
        <p className={styles.note}>Ses relations et son album photo seront aussi supprimés.</p>
      </div>
      {onDelete}
    </section>
  );
}
