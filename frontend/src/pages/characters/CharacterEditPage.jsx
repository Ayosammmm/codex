import { SoundFormSection } from '@/components/sound/SoundSections';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { useMemo, useState } from 'react';
import { usePermissions } from '@/auth/auth';
import { Forbidden } from '@/auth/RequireAuth';
import { EditorsSection } from '@/components/entity/EditorsSection';
import { ModFieldsFormSection } from '@/mods/ModFieldsSections';
import { useModFieldsToc } from '@/mods/useModFieldColumns';
import { CollectionsSection } from '@/components/collections/CollectionsSection';
import { useCollectionFilter } from '@/components/collections/collectionFilter';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Trash2 } from '@/components/ui/icons';
import { useCharacterFormMutations, useDeleteEntity, useSaveEntity } from '@/api/queries';
import { characterName } from '@/config/characters';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { CharacterDangerZone, CharacterForm } from '@/components/characters/CharacterForm';
import { useCharacterForm } from '@/components/characters/useCharacterForm';
import { CharacterFormSwitcher } from '@/components/characters/CharacterFormSwitcher';
import { DEFAULT_FORM_NAME, characterInForm, findForm } from '@/components/characters/characterForms';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { useImagePreview } from '@/components/entity/useImagePreview';
import { CharacterLoader } from './CharacterLoader';
import { useCharacterReferences } from './useCharacterReferences';

/**
 * Création (/personnages/nouveau) et édition (/personnages/:characterId/modifier) d'un personnage.
 * `?forme=id` : édition d'une autre forme du personnage (sans paramètre : la forme par défaut).
 */
export default function CharacterEditPage() {
  const { universe } = useOutletContext();
  const { characterId } = useParams();
  const [params] = useSearchParams();
  const { canCreate, canEdit } = usePermissions();
  if (!characterId) return canCreate ? <CharacterEditor key="new" universe={universe} character={null} /> : <Forbidden backTo={universePath(universe, 'personnages')} />;
  // `key` : formulaire neuf quand on passe d'un personnage (ou d'une forme) à un autre
  return <CharacterLoader>
      {(character) => {
        if (!canEdit('character', character.id)) return <Forbidden backTo={universePath(universe, `personnages/${character.id}`)} />;
        const form = findForm(character, params.get('forme'));
        return <CharacterEditor key={`${character.id}-${form?.id ?? 'base'}`} universe={universe} character={character} form={form} />;
      }}
    </CharacterLoader>;
}

/** `form` : autre forme du personnage en cours d'édition (null : forme par défaut). */
function CharacterEditor({ universe, character, form = null }) {
  const isNew = !character;
  const isForm = Boolean(form);
  const listPath = universePath(universe, 'personnages');
  const sheetPath = (id) => universePath(universe, `personnages/${id}`);
  const backPath = isNew ? listPath : sheetPath(character.id) + (isForm ? `?forme=${form.id}` : '');
  const navigate = useNavigate();
  const toast = useToast();
  // Personnage tel qu'il apparaît dans la forme éditée (mémorisé : le formulaire repart de zéro s'il change)
  const entity = useMemo(() => characterInForm(character, form), [character, form]);
  const state = useCharacterForm(entity);
  const formMutations = useCharacterFormMutations(character?.id);
  const [, setParams] = useSearchParams();
  const [pendingForm, setPendingForm] = useState(null); // changement de forme à confirmer (modifications non enregistrées)
  const [confirmDeleteForm, setConfirmDeleteForm] = useState(false);
  const hasForms = (character?.forms?.length ?? 0) > 0;
  const formLabel = (f) => f?.formName || (f ? 'Forme sans nom' : character?.formName || DEFAULT_FORM_NAME);
  const soundOn = isModuleEnabled(getModulesState(universe), 'sound');
  const { options, modules, characters } = useCharacterReferences(universe);
  const save = useSaveEntity('characters');
  const { enabled: collectionsOn } = useCollectionFilter();
  const modFieldsOn = Boolean(useModFieldsToc('character'));
  const remove = useDeleteEntity('characters');
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saving = save.isPending || formMutations.save.isPending;
  const guard = useUnsavedChangesGuard(state.isDirty && !saving);

  // Changement de forme : par l'adresse (?forme=id), après confirmation s'il reste des modifications
  const goToForm = (value) => setParams(value ? { forme: String(value) } : {}, { replace: true });
  const selectForm = (value) => (state.isDirty ? setPendingForm(value) : goToForm(value));

  const addForm = () =>
    formMutations.add.mutate(
      {},
      {
        onSuccess: (saved) => {
          const known = new Set((character.forms || []).map((f) => f.id));
          const created = (saved.forms || []).find((f) => !known.has(f.id));
          toast.success(`« ${formLabel(created)} » a été ajoutée : une copie de la forme par défaut, sans les images.`);
          if (created) goToForm(created.id);
        },
        onError: (err) => toast.error(err.message),
      },
    );

  const onDeleteForm = () =>
    formMutations.remove.mutate(form.id, {
      onSuccess: () => {
        toast.success(`« ${formLabel(form)} » a été supprimée.`);
        setConfirmDeleteForm(false);
        goToForm('');
      },
      onError: (err) => toast.error(err.message),
    });

  const submit = (e) => {
    e.preventDefault();
    const found = state.validate();
    setErrors(found);
    if (Object.keys(found).length) {
      const target = found.identity || found.age ? 'identite' : 'relations';
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const { values, images } = state.toSubmit(modules, universe.id, { form: isForm });
    if (isForm) {
      formMutations.save.mutate(
        { formId: form.id, values, images },
        { onSuccess: () => toast.success('Forme enregistrée.'), onError: (err) => toast.error(err.message) },
      );
      return;
    }
    save.mutate(
      { id: character?.id, values, images },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${characterName(saved)} » a été créé.` : 'Personnage enregistré.');
          // On reste dans l'édition ; un nouveau personnage passe sur son adresse d'édition
          if (isNew) {
            guard.allowNextNavigation();
            navigate(sheetPath(saved.id) + '/modifier', { replace: true });
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const onDelete = () =>
    remove.mutate(character.id, {
      onSuccess: () => {
        toast.success(`« ${characterName(character)} » a été supprimé.`);
        guard.allowNextNavigation();
        navigate(listPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  const refs = { ...options, allCharacters: characters.data };
  // Fond et couleurs suivent la saisie en direct
  const background = useImagePreview(entity?.background, state.images.background);

  return (
    <EntityThemeZone universe={universe} colors={state.form.colors} background={background}>
      <main className={page.main}>
        <Link to={backPath} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? 'Personnages' : 'Retour à la fiche'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouveau personnage' : characterName(entity)}</h1>
        <p className={page.lead}>
          {isNew
            ? `Ajouter un personnage à « ${universe.name} ».`
            : isForm
              ? `Modifier la forme « ${formLabel(form)} ». Groupes, lieux, relations, album, collections et éditeurs sont communs à toutes les formes.`
              : 'Modifier la fiche du personnage.'}
        </p>

        {!isNew && (
          <CharacterFormSwitcher
            className={page.formSwitcher}
            character={character}
            value={form ? form.id : ''}
            onChange={selectForm}
            onAdd={addForm}
            adding={formMutations.add.isPending}
            addDisabled={state.isDirty}
            addTitle={state.isDirty ? 'Enregistrez d’abord vos modifications' : 'Copie de la forme par défaut (sans les images), à modifier ensuite'}
          />
        )}

        <form onSubmit={submit} noValidate>
          <CharacterForm
            universe={universe}
            character={entity}
            isForm={isForm}
            showFormName={isForm || hasForms}
            state={state}
            refs={refs}
            modules={modules}
            errors={errors}
            sound={soundOn && <SoundFormSection entity={entity} fields={[{ field: 'themeSound', label: 'Thème', hint: 'À écouter depuis sa fiche.' }]} images={state.images} setImage={(field, v) => state.setImages((imgs) => { const next = { ...imgs }; if (v === undefined) delete next[field]; else next[field] = v; return next; })} onError={toast.error} />}
            modFields={!isForm && modFieldsOn && <ModFieldsFormSection universe={universe} entityType="character" entityId={character?.id} />}
            collections={!isNew && !isForm && collectionsOn && <CollectionsSection universe={universe} entityType="character" entityId={character.id} />}
            editors={!isNew && !isForm && <EditorsSection entityType="character" entityId={character.id} />}
            dangerZone={
              isForm ? (
                <CharacterDangerZone
                  title="Supprimer cette forme"
                  note="Ses images et son thème seront aussi supprimés. Le personnage et ses autres formes sont conservés."
                  onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDeleteForm(true)}>Supprimer la forme</Button>}
                />
              ) : !isNew && (
                <CharacterDangerZone
                  onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>}
                />
              )
            }
          />

          <FormActionBar visible={isNew || state.isDirty || saving} message={!isNew && 'Modifications non enregistrées'}>
            <Button
              variant="ghost"
              onClick={() => (isNew ? navigate(listPath) : state.reset())}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {isNew ? 'Créer le personnage' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title="Supprimer le personnage ?"
            description={`« ${characterName(character)} », ses relations, son album photo et ses autres formes seront supprimés définitivement.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={remove.isPending}>Annuler</Button>
                <Button variant="danger" onClick={onDelete} loading={remove.isPending}>Supprimer définitivement</Button>
              </>
            }
          />
        )}
        {isForm && (
          <Dialog
            open={confirmDeleteForm}
            onClose={() => setConfirmDeleteForm(false)}
            dismissible={!formMutations.remove.isPending}
            size="sm"
            title="Supprimer cette forme ?"
            description={`« ${formLabel(form)} », ses images et son thème seront supprimés définitivement.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setConfirmDeleteForm(false)} disabled={formMutations.remove.isPending}>Annuler</Button>
                <Button variant="danger" onClick={onDeleteForm} loading={formMutations.remove.isPending}>Supprimer la forme</Button>
              </>
            }
          />
        )}
        <Dialog
          open={pendingForm !== null}
          onClose={() => setPendingForm(null)}
          size="sm"
          title="Changer de forme sans enregistrer ?"
          description="Les modifications de cette forme seront perdues."
          footer={
            <>
              <Button variant="ghost" onClick={() => setPendingForm(null)}>Rester</Button>
              <Button variant="danger" onClick={() => { const next = pendingForm; setPendingForm(null); goToForm(next); }}>Changer de forme</Button>
            </>
          }
        />
        {guard.dialog}
      </main>
    </EntityThemeZone>
  );
}
