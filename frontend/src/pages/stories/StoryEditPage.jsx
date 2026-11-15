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
import { StoryDangerZone, StoryForm } from '@/components/stories/StoryForm';
import { useStoryForm } from '@/components/stories/useStoryForm';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { StoryLoader } from './StoryLoader';

/** Création (/histoires/nouveau) et édition (/histoires/:storyId/modifier) d'une histoire. */
export default function StoryEditPage() {
  const { universe } = useOutletContext();
  const { storyId } = useParams();
  const { canCreate, canEdit } = usePermissions();
  if (!storyId) return canCreate ? <StoryEditor key="new" universe={universe} story={null} /> : <Forbidden backTo={universePath(universe, 'histoires')} />;
  // `key` : formulaire neuf quand on passe d'une histoire à une autre
  return <StoryLoader>
      {(story) =>
        canEdit('story', story.id) ? <StoryEditor key={story.id} universe={universe} story={story} /> : <Forbidden backTo={universePath(universe, `histoires/${story.id}`)} />
      }
    </StoryLoader>;
}

function StoryEditor({ universe, story }) {
  const isNew = !story;
  const listPath = universePath(universe, 'histoires');
  const sheetPath = (id) => universePath(universe, `histoires/${id}`);
  const navigate = useNavigate();
  const toast = useToast();
  const state = useStoryForm(story);
  const save = useSaveEntity('stories');
  const { enabled: collectionsOn } = useCollectionFilter();
  const remove = useDeleteEntity('stories');
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const guard = useUnsavedChangesGuard(state.isDirty && !save.isPending);

  const submit = (e) => {
    e.preventDefault();
    const found = state.validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(found.name ? 'identite' : 'episodes')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const { values, images } = state.toSubmit(universe.id);
    save.mutate(
      { id: story?.id, values, images },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${saved.name} » a été créée.` : 'Histoire enregistrée.');
          // On reste dans l'édition ; une nouvelle histoire passe sur son adresse d'édition
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
    remove.mutate(story.id, {
      onSuccess: () => {
        toast.success(`« ${story.name} » a été supprimée.`);
        guard.allowNextNavigation();
        navigate(listPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  // Fond et couleurs suivent la saisie en direct
  const backgroundImage = useImagePreview(story?.background, state.images.background);
  const { backgroundMode, backgroundColor, colors } = state.form;

  return (
    <EntityThemeZone
      universe={universe}
      colors={colors}
      background={backgroundMode === 'image' ? backgroundImage : null}
      backgroundColor={backgroundMode === 'color' ? backgroundColor : null}
    >
      <main className={page.main}>
        <Link to={isNew ? listPath : sheetPath(story.id)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? 'Histoires' : 'Retour à l’histoire'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouvelle histoire' : story.name}</h1>
        <p className={page.lead}>{isNew ? `Ajouter une histoire à « ${universe.name} ».` : 'Modifier l’histoire et l’ordre de ses épisodes.'}</p>

        <form onSubmit={submit} noValidate>
          <StoryForm
            universe={universe}
            story={story}
            state={state}
            errors={errors}
            collections={!isNew && collectionsOn && <CollectionsSection universe={universe} entityType="story" entityId={story.id} />}
            editors={!isNew && <EditorsSection entityType="story" entityId={story.id} />}
            dangerZone={
              !isNew && <StoryDangerZone onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>} />
            }
          />

          <FormActionBar visible={isNew || state.isDirty || save.isPending} message={!isNew && 'Modifications non enregistrées'}>
            <Button variant="ghost" onClick={() => (isNew ? navigate(listPath) : state.reset())} disabled={save.isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending}>
              {isNew ? 'Créer l’histoire' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title="Supprimer l’histoire ?"
            description={`« ${story.name} » et ses épisodes seront supprimés définitivement. Les personnages, lieux et événements sont conservés.`}
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
