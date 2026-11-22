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
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles, Trash2 } from '@/components/ui/icons';
import { useCharacterFormMutations, useDeleteEntity, useSaveEntity } from '@/api/queries';
import { characterName } from '@/config/characters';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { CharacterDangerZone, CharacterForm } from '@/components/characters/CharacterForm';
import { useCharacterForm } from '@/components/characters/useCharacterForm';
import { CharacterFormSwitcher } from '@/components/characters/CharacterFormSwitcher';
import { DEFAULT_FORM_NAME, TEMPORAL, characterInForm, findForm, isPastForm, pastForms } from '@/components/characters/characterForms';
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
  const [evolveName, setEvolveName] = useState(null); // nom de l’époque à créer (dialogue « Faire évoluer » ouvert)
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

  const createdForm = (saved) => {
    const known = new Set((character.forms || []).map((f) => f.id));
    return (saved.forms || []).find((f) => !known.has(f.id));
  };

  // Transformation (à la suite des autres) ou époque (la plus ancienne)
  const addForm = (formType) =>
    formMutations.add.mutate(
      { formType },
      {
        onSuccess: (saved) => {
          const created = createdForm(saved);
          toast.success(
            formType === TEMPORAL
              ? `« ${formLabel(created)} » a été ajoutée comme époque la plus ancienne : une copie de la forme par défaut, sans les images.`
              : `« ${formLabel(created)} » a été ajoutée : une copie de la forme par défaut, sans les images.`,
          );
          if (created) goToForm(created.id);
        },
        onError: (err) => toast.error(err.message),
      },
    );

  // Faire évoluer : la forme par défaut est copiée (images comprises) en époque la plus récente, puis perd ses images
  const onEvolve = () =>
    formMutations.evolve.mutate(
      { formName: evolveName.trim() },
      {
        onSuccess: (saved) => {
          setEvolveName(null);
          toast.success(`« ${formLabel(createdForm(saved))} » rejoint les époques. Ajoutez le nouveau portrait et le nouveau fond.`);
        },
        onError: (err) => toast.error(err.message),
      },
    );

  // Chronologie d’une époque : échange avec sa voisine plus ancienne (-1) ou plus récente (+1)
  const past = pastForms(character);
  const pastIndex = isForm && isPastForm(form) ? past.findIndex((f) => f.id === form.id) : -1;
  const movePast = (delta) => {
    const ids = past.map((f) => f.id);
    [ids[pastIndex], ids[pastIndex + delta]] = [ids[pastIndex + delta], ids[pastIndex]];
    formMutations.reorder.mutate(ids, { onError: (err) => toast.error(err.message) });
  };

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
            actions={
              !isForm && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Sparkles}
                  onClick={() => setEvolveName(character.formName || '')}
                  disabled={state.isDirty || formMutations.evolve.isPending}
                  title={state.isDirty ? 'Enregistrez d’abord vos modifications' : 'Garder la forme actuelle dans le passé, puis lui donner une nouvelle apparence'}
                >
                  Faire évoluer
                </Button>
              )
            }
          />
        )}
        {pastIndex >= 0 && past.length > 1 && (
          <div className={page.formChronology}>
            <span>
              Époque {pastIndex + 1} sur {past.length}, de la plus ancienne à la plus récente
            </span>
            <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => movePast(-1)} disabled={pastIndex === 0 || state.isDirty || formMutations.reorder.isPending}>
              Plus ancienne
            </Button>
            <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => movePast(1)} disabled={pastIndex === past.length - 1 || state.isDirty || formMutations.reorder.isPending}>
              Plus récente
            </Button>
          </div>
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
        {!isNew && !isForm && (
          <Dialog
            open={evolveName !== null}
            onClose={() => setEvolveName(null)}
            dismissible={!formMutations.evolve.isPending}
            size="sm"
            title="Faire évoluer le personnage ?"
            description="La forme actuelle est gardée telle quelle, images comprises, comme époque la plus récente. Elle perd ensuite son portrait et son fond, pour accueillir sa nouvelle apparence."
            footer={
              <>
                <Button variant="ghost" onClick={() => setEvolveName(null)} disabled={formMutations.evolve.isPending}>Annuler</Button>
                <Button variant="primary" icon={Sparkles} onClick={onEvolve} loading={formMutations.evolve.isPending}>Faire évoluer</Button>
              </>
            }
          >
            <Field label="Nom de l’époque accomplie" hint="Ex. : Enfance, Avant la guerre…">
              {(field) => (
                <Input
                  {...field}
                  value={evolveName ?? ''}
                  onChange={(e) => setEvolveName(e.target.value)}
                  placeholder={`Époque ${past.length + 1}`}
                  maxLength={255}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onEvolve())}
                />
              )}
            </Field>
          </Dialog>
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
