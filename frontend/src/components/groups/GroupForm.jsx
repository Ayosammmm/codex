import { useMemo } from 'react';
import { Link } from 'react-router';
import { Users } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { Combobox } from '@/components/ui/Combobox';
import { Field, Input } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { RichTextEditor } from '@/components/ui/RichText';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { FormSection } from '@/components/universe/UniverseForm';
import { PhotoAlbum } from '@/components/characters/PhotoAlbum';
import { useImagePreview } from '@/components/entity/useImagePreview';
import form from '@/components/entity/EntityForm.module.scss';
import { plural, universePath } from '@/utils/universe';
import { GroupLogo } from './GroupLogo';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { AppearanceSection } from '@/components/entity/AppearanceSection';
import { descendantIds } from '@/components/entity/tree';
import { MembersField } from './MembersField';
import { RolesField } from './RolesField';
import styles from './GroupForm.module.scss';


/**
 * Formulaire complet d'un groupe.
 * - `state` : useGroupForm() ; `refs` : options (useGroupReferences) + `allGroups`, `allCharacters`
 * - `dangerZone` : zone de suppression (édition uniquement)
 */
export function GroupForm({ universe, group, state, refs, errors, sound, modFields, collections, editors, dangerZone }) {
  const { form: f, update, images, setImage } = state;
  const toast = useToast();
  const isEdit = Boolean(group?.id);

  const logo = useImagePreview(group?.image, images.image);
  const banner = useImagePreview(group?.banner, images.banner);
  const charactersById = useMemo(() => new Map((refs.allCharacters || []).map((c) => [c.id, c])), [refs.allCharacters]);
  // Ni le groupe lui-même ni ses descendants ne peuvent devenir son parent
  const groupId = group?.id;
  const { allGroups, groups: groupOptions } = refs;
  const parentOptions = useMemo(() => {
    const excluded = groupId ? descendantIds(groupId, allGroups || []) : new Set();
    return groupOptions.filter((o) => !excluded.has(o.value));
  }, [groupId, allGroups, groupOptions]);

  const typeLabel = refs.groupTypes.find((o) => String(o.value) === f.groupTypeId)?.label;
  const sections = [
    { id: 'identite', label: 'Identité' },
    { id: 'images', label: 'Logo et bannière' },
    { id: 'presentation', label: 'Présentation' },
    { id: 'roles', label: 'Rôles' },
    { id: 'membres', label: 'Membres' },
    { id: 'lieux', label: 'Lieux contrôlés' },
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
        <FormSection id="identite" title="Identité" description="Le nom du groupe, sa nature et le groupe plus grand auquel il appartient.">
          <Field label="Nom" required error={errors.name}>
            {(props) => <Input {...props} value={f.name} onChange={(e) => update({ name: e.target.value })} maxLength={255} placeholder="Ex. La Compagnie du Corbeau" />}
          </Field>
          <div className={form.fields}>
            <Field
              label="Type"
              hint={
                refs.groupTypes.length === 0 ? (
                  <>
                    Aucun type.{' '}
                    <Link to={universePath(universe, 'types-de-groupes')} className={form.hintLink}>
                      Gérer les types de groupes
                    </Link>
                  </>
                ) : undefined
              }
            >
              {(props) => (
                <Select {...props} options={refs.groupTypes} value={f.groupTypeId} onChange={(groupTypeId) => update({ groupTypeId })} placeholder="Non renseigné" disabled={refs.groupTypes.length === 0} />
              )}
            </Field>
            <Field label="Groupe parent" hint="Le groupe fera partie de celui-ci (ex. une famille dans un clan).">
              {(props) => <Select {...props} options={parentOptions} value={f.parentId} onChange={(parentId) => update({ parentId })} placeholder="Aucun" />}
            </Field>
          </div>
        </FormSection>

        <FormSection id="images" title="Logo et bannière" description="5 Mo maximum par image.">
          <div className={styles.imagesGrid}>
            <ImagePicker label="Logo" hint="Carré" aspect="1" currentUrl={uploadUrl(group?.image)} value={images.image} onChange={(v) => setImage('image', v)} onError={toast.error} />
            <ImagePicker label="Bannière" hint="Format large, ex. 1600 × 400" aspect="4 / 1" dropClassName={styles.bannerDrop} currentUrl={uploadUrl(group?.banner)} value={images.banner} onChange={(v) => setImage('banner', v)} onError={toast.error} />
          </div>
        </FormSection>

        <FormSection id="presentation" title="Présentation" description="Histoire, objectifs, fonctionnement du groupe…">
          <Field label="Description">
            {(props) => <RichTextEditor {...props} label="Description" minHeight="10rem" value={f.description} onChange={(description) => update({ description })} />}
          </Field>
        </FormSection>

        <FormSection id="roles" title="Rôles" description="La hiérarchie du groupe : chaque rôle peut commander directement un ou plusieurs autres rôles. L’organigramme suit ces liens.">
          <RolesField value={f.roles} onChange={(roles) => update({ roles })} members={f.members} error={errors.roles} />
        </FormSection>

        <FormSection id="membres" title="Membres" description="Les personnages du groupe et leur rôle.">
          <MembersField
            universe={universe}
            value={f.members}
            onChange={(members) => update({ members })}
            roles={f.roles}
            characterOptions={refs.characters}
            charactersById={charactersById}
          />
        </FormSection>

        <FormSection id="lieux" title="Lieux contrôlés" description="Les territoires ou bâtiments sous l’autorité du groupe. Leurs sous-lieux sont contrôlés aussi.">
          <Field label="Lieux">
            {(props) => <Combobox {...props} multiple options={refs.places} value={f.placeIds} onChange={(placeIds) => update({ placeIds })} placeholder="Ajouter un lieu…" />}
          </Field>
        </FormSection>

        <AppearanceSection state={state} savedBackground={group?.background} subject="du groupe" />

        <FormSection id="album" title="Album photo" description="Les photos sont enregistrées dès leur ajout.">
          {isEdit ? <PhotoAlbum entityType="group" entityId={group.id} /> : <p className={form.note}>L’album sera disponible une fois le groupe créé.</p>}
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
            <EntityBanner src={banner} className={styles.previewBanner} />
            <div className={styles.previewBody}>
              <GroupLogo group={{ name: f.name, colors: f.colors }} src={logo} className={styles.previewLogo} />
              <span className={styles.previewName}>{f.name.trim() || 'Nouveau groupe'}</span>
              {typeLabel && <span className={styles.previewType}>{typeLabel}</span>}
              <span className={styles.previewMembers}>
                <Users aria-hidden /> {plural(f.members.length, 'membre')}
              </span>
            </div>
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

/** Zone de suppression d'un groupe. */
export function GroupDangerZone({ onDelete }) {
  return (
    <section aria-labelledby="danger-title" className={form.danger}>
      <div>
        <p id="danger-title" className={form.dangerTitle}>Supprimer le groupe</p>
        <p className={form.note}>Les personnages ne sont pas supprimés. Les sous-groupes remontent au niveau du groupe parent.</p>
      </div>
      {onDelete}
    </section>
  );
}
