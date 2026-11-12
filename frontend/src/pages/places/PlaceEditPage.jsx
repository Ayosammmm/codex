import { useState } from 'react';
import { usePermissions } from '@/auth/auth';
import { Forbidden } from '@/auth/RequireAuth';
import { EditorsSection } from '@/components/entity/EditorsSection';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router';
import { ArrowLeft, Trash2 } from '@/components/ui/icons';
import { useDeleteEntity, useSaveEntity } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { useImagePreview } from '@/components/entity/useImagePreview';
import { PlaceDangerZone, PlaceForm } from '@/components/places/PlaceForm';
import { usePlaceForm } from '@/components/places/usePlaceForm';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { PlaceLoader } from './PlaceLoader';
import { usePlaceReferences } from './usePlaceReferences';

/** Création (/lieux/nouveau) et édition (/lieux/:placeId/modifier) d'un lieu. */
export default function PlaceEditPage() {
  const { universe } = useOutletContext();
  const { placeId } = useParams();
  const { canCreate, canEdit } = usePermissions();
  if (!placeId) return canCreate ? <PlaceEditor key="new" universe={universe} place={null} /> : <Forbidden backTo={universePath(universe, 'lieux')} />;
  // `key` : formulaire neuf quand on passe d'un lieu à un autre
  return <PlaceLoader>
      {(place) =>
        canEdit('place', place.id) ? <PlaceEditor key={place.id} universe={universe} place={place} /> : <Forbidden backTo={universePath(universe, `lieux/${place.id}`)} />
      }
    </PlaceLoader>;
}

function PlaceEditor({ universe, place }) {
  const isNew = !place;
  const listPath = universePath(universe, 'lieux');
  const sheetPath = (id) => universePath(universe, `lieux/${id}`);
  const navigate = useNavigate();
  const toast = useToast();
  const state = usePlaceForm(place);
  const { options, places, modules } = usePlaceReferences(universe);
  const save = useSaveEntity('places');
  const remove = useDeleteEntity('places');
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const guard = useUnsavedChangesGuard(state.isDirty && !save.isPending);

  const submit = (e) => {
    e.preventDefault();
    const found = state.validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById('identite')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const { values, images } = state.toSubmit(universe.id, modules);
    save.mutate(
      { id: place?.id, values, images },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${saved.name} » a été créé.` : 'Lieu enregistré.');
          // On reste dans l'édition ; un nouveau lieu passe sur son adresse d'édition
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
    remove.mutate(place.id, {
      onSuccess: () => {
        toast.success(`« ${place.name} » a été supprimé.`);
        guard.allowNextNavigation();
        navigate(listPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  const refs = { ...options, allPlaces: places.data };
  // Fond et couleurs suivent la saisie en direct
  const backgroundImage = useImagePreview(place?.background, state.images.background);
  const { backgroundMode, backgroundColor, colors } = state.form;

  return (
    <EntityThemeZone
      universe={universe}
      colors={colors}
      background={backgroundMode === 'image' ? backgroundImage : null}
      backgroundColor={backgroundMode === 'color' ? backgroundColor : null}
    >
      <main className={page.main}>
        <Link to={isNew ? listPath : sheetPath(place.id)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? 'Lieux' : 'Retour à la fiche'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouveau lieu' : place.name}</h1>
        <p className={page.lead}>{isNew ? `Ajouter un lieu à « ${universe.name} ».` : 'Modifier la fiche du lieu.'}</p>

        <form onSubmit={submit} noValidate>
          <PlaceForm
            universe={universe}
            place={place}
            state={state}
            refs={refs}
            modules={modules}
            errors={errors}
            editors={!isNew && <EditorsSection entityType="place" entityId={place.id} />}
            dangerZone={
              !isNew && <PlaceDangerZone onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>} />
            }
          />

          <FormActionBar visible={isNew || state.isDirty || save.isPending} message={!isNew && 'Modifications non enregistrées'}>
            <Button variant="ghost" onClick={() => (isNew ? navigate(listPath) : state.reset())} disabled={save.isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending}>
              {isNew ? 'Créer le lieu' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title="Supprimer le lieu ?"
            description={`« ${place.name} », ses images et son album photo seront supprimés définitivement. Ses sous-lieux, originaires et groupes sont conservés.`}
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
