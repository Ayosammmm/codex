import { SoundFormSection } from '@/components/sound/SoundSections';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { useState } from 'react';
import { usePermissions } from '@/auth/auth';
import { Forbidden } from '@/auth/RequireAuth';
import { EditorsSection } from '@/components/entity/EditorsSection';
import { CollectionsSection } from '@/components/collections/CollectionsSection';
import { useCollectionFilter } from '@/components/collections/collectionFilter';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router';
import { ArrowLeft, Trash2 } from '@/components/ui/icons';
import { useDeleteEntity, useSaveEntity } from '@/api/queries';
import { characterName } from '@/config/characters';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { CharacterDangerZone, CharacterForm } from '@/components/characters/CharacterForm';
import { useCharacterForm } from '@/components/characters/useCharacterForm';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { useImagePreview } from '@/components/entity/useImagePreview';
import { CharacterLoader } from './CharacterLoader';
import { useCharacterReferences } from './useCharacterReferences';

/** Création (/personnages/nouveau) et édition (/personnages/:characterId/modifier) d'un personnage. */
export default function CharacterEditPage() {
  const { universe } = useOutletContext();
  const { characterId } = useParams();
  const { canCreate, canEdit } = usePermissions();
  if (!characterId) return canCreate ? <CharacterEditor key="new" universe={universe} character={null} /> : <Forbidden backTo={universePath(universe, 'personnages')} />;
  // `key` : formulaire neuf quand on passe d'un personnage à un autre
  return <CharacterLoader>
      {(character) =>
        canEdit('character', character.id) ? <CharacterEditor key={character.id} universe={universe} character={character} /> : <Forbidden backTo={universePath(universe, `personnages/${character.id}`)} />
      }
    </CharacterLoader>;
}

function CharacterEditor({ universe, character }) {
  const isNew = !character;
  const listPath = universePath(universe, 'personnages');
  const sheetPath = (id) => universePath(universe, `personnages/${id}`);
  const backPath = isNew ? listPath : sheetPath(character.id);
  const navigate = useNavigate();
  const toast = useToast();
  const state = useCharacterForm(character);
  const soundOn = isModuleEnabled(getModulesState(universe), 'sound');
  const { options, modules, characters } = useCharacterReferences(universe);
  const save = useSaveEntity('characters');
  const { enabled: collectionsOn } = useCollectionFilter();
  const remove = useDeleteEntity('characters');
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const guard = useUnsavedChangesGuard(state.isDirty && !save.isPending);

  const submit = (e) => {
    e.preventDefault();
    const found = state.validate();
    setErrors(found);
    if (Object.keys(found).length) {
      const target = found.identity || found.age ? 'identite' : 'relations';
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const { values, images } = state.toSubmit(modules, universe.id);
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
  const background = useImagePreview(character?.background, state.images.background);

  return (
    <EntityThemeZone universe={universe} colors={state.form.colors} background={background}>
      <main className={page.main}>
        <Link to={backPath} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? 'Personnages' : 'Retour à la fiche'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouveau personnage' : characterName(character)}</h1>
        <p className={page.lead}>{isNew ? `Ajouter un personnage à « ${universe.name} ».` : 'Modifier la fiche du personnage.'}</p>

        <form onSubmit={submit} noValidate>
          <CharacterForm
            universe={universe}
            character={character}
            state={state}
            refs={refs}
            modules={modules}
            errors={errors}
            sound={soundOn && <SoundFormSection entity={character} fields={[{ field: 'themeSound', label: 'Thème', hint: 'À écouter depuis sa fiche.' }]} images={state.images} setImage={(field, v) => state.setImages((imgs) => { const next = { ...imgs }; if (v === undefined) delete next[field]; else next[field] = v; return next; })} onError={toast.error} />}
            collections={!isNew && collectionsOn && <CollectionsSection universe={universe} entityType="character" entityId={character.id} />}
            editors={!isNew && <EditorsSection entityType="character" entityId={character.id} />}
            dangerZone={
              !isNew && (
                <CharacterDangerZone
                  onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>}
                />
              )
            }
          />

          <FormActionBar visible={isNew || state.isDirty || save.isPending} message={!isNew && 'Modifications non enregistrées'}>
            <Button
              variant="ghost"
              onClick={() => (isNew ? navigate(listPath) : state.reset())}
              disabled={save.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending}>
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
            description={`« ${characterName(character)} », ses relations et son album photo seront supprimés définitivement.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={remove.isPending}>Annuler</Button>
                <Button variant="danger" onClick={onDelete} loading={remove.isPending}>Supprimer définitivement</Button>
              </>
            }
          />
        )}
        {guard.dialog}
      </main>
    </EntityThemeZone>
  );
}
