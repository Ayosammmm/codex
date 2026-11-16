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
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { useImagePreview } from '@/components/entity/useImagePreview';
import { GroupDangerZone, GroupForm } from '@/components/groups/GroupForm';
import { useGroupForm } from '@/components/groups/useGroupForm';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { GroupLoader } from './GroupLoader';
import { useGroupReferences } from './useGroupReferences';

/** Création (/groupes/nouveau) et édition (/groupes/:groupId/modifier) d'un groupe. */
export default function GroupEditPage() {
  const { universe } = useOutletContext();
  const { groupId } = useParams();
  const { canCreate, canEdit } = usePermissions();
  if (!groupId) return canCreate ? <GroupEditor key="new" universe={universe} group={null} /> : <Forbidden backTo={universePath(universe, 'groupes')} />;
  // `key` : formulaire neuf quand on passe d'un groupe à un autre
  return <GroupLoader>
      {(group) =>
        canEdit('group', group.id) ? <GroupEditor key={group.id} universe={universe} group={group} /> : <Forbidden backTo={universePath(universe, `groupes/${group.id}`)} />
      }
    </GroupLoader>;
}

function GroupEditor({ universe, group }) {
  const isNew = !group;
  const listPath = universePath(universe, 'groupes');
  const sheetPath = (id) => universePath(universe, `groupes/${id}`);
  const navigate = useNavigate();
  const toast = useToast();
  const state = useGroupForm(group);
  const soundOn = isModuleEnabled(getModulesState(universe), 'sound');
  const { options, groups, characters } = useGroupReferences(universe);
  const save = useSaveEntity('groups');
  const { enabled: collectionsOn } = useCollectionFilter();
  const remove = useDeleteEntity('groups');
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const guard = useUnsavedChangesGuard(state.isDirty && !save.isPending);

  const submit = (e) => {
    e.preventDefault();
    const found = state.validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(found.name ? 'identite' : 'roles')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const { values, images } = state.toSubmit(universe.id);
    save.mutate(
      { id: group?.id, values, images },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${saved.name} » a été créé.` : 'Groupe enregistré.');
          // On reste dans l'édition ; un nouveau groupe passe sur son adresse d'édition
          if (isNew) {
            guard.allowNextNavigation();
            navigate(`${sheetPath(saved.id)}/modifier`, { replace: true });
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const onDelete = () =>
    remove.mutate(group.id, {
      onSuccess: () => {
        toast.success(`« ${group.name} » a été supprimé.`);
        guard.allowNextNavigation();
        navigate(listPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  const refs = { ...options, allGroups: groups.data, allCharacters: characters.data };
  // Fond et couleurs suivent la saisie en direct
  const backgroundImage = useImagePreview(group?.background, state.images.background);
  const { backgroundMode, backgroundColor, colors } = state.form;

  return (
    <EntityThemeZone
      universe={universe}
      colors={colors}
      background={backgroundMode === 'image' ? backgroundImage : null}
      backgroundColor={backgroundMode === 'color' ? backgroundColor : null}
    >
      <main className={page.main}>
        <Link to={isNew ? listPath : sheetPath(group.id)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? 'Groupes' : 'Retour à la fiche'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouveau groupe' : group.name}</h1>
        <p className={page.lead}>{isNew ? `Ajouter un groupe à « ${universe.name} ».` : 'Modifier la fiche du groupe.'}</p>

        <form onSubmit={submit} noValidate>
          <GroupForm
            universe={universe}
            group={group}
            state={state}
            refs={refs}
            errors={errors}
            sound={soundOn && <SoundFormSection entity={group} fields={[{ field: 'themeSound', label: 'Thème', hint: 'À écouter depuis sa fiche.' }]} images={state.images} setImage={state.setImage} onError={toast.error} />}
            collections={!isNew && collectionsOn && <CollectionsSection universe={universe} entityType="group" entityId={group.id} />}
            editors={!isNew && <EditorsSection entityType="group" entityId={group.id} />}
            dangerZone={
              !isNew && <GroupDangerZone onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>} />
            }
          />

          <FormActionBar visible={isNew || state.isDirty || save.isPending} message={!isNew && 'Modifications non enregistrées'}>
            <Button variant="ghost" onClick={() => (isNew ? navigate(listPath) : state.reset())} disabled={save.isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending}>
              {isNew ? 'Créer le groupe' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title="Supprimer le groupe ?"
            description={`« ${group.name} », ses images et son album photo seront supprimés définitivement. Ses membres et ses sous-groupes sont conservés.`}
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
