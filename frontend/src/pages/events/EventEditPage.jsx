import { useState } from 'react';
import { usePermissions } from '@/auth/auth';
import { Forbidden } from '@/auth/RequireAuth';
import { EditorsSection } from '@/components/entity/EditorsSection';
import { ModFieldsFormSection } from '@/mods/ModFieldsSections';
import { useModFieldsToc } from '@/mods/useModFieldColumns';
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
import { EventDangerZone, EventForm } from '@/components/events/EventForm';
import { useEventForm } from '@/components/events/useEventForm';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { useNarrativeReferences } from '../stories/useNarrativeReferences';
import { EventLoader } from './EventLoader';

/** Création (/evenements/nouveau) et édition (/evenements/:eventId/modifier) d'un événement. */
export default function EventEditPage() {
  const { universe } = useOutletContext();
  const { eventId } = useParams();
  const { canCreate, canEdit } = usePermissions();
  if (!eventId) return canCreate ? <EventEditor key="new" universe={universe} event={null} /> : <Forbidden backTo={universePath(universe, 'evenements')} />;
  // `key` : formulaire neuf quand on passe d'un événement à un autre
  return <EventLoader>
      {(event) =>
        canEdit('event', event.id) ? <EventEditor key={event.id} universe={universe} event={event} /> : <Forbidden backTo={universePath(universe, `evenements/${event.id}`)} />
      }
    </EventLoader>;
}

function EventEditor({ universe, event }) {
  const isNew = !event;
  const listPath = universePath(universe, 'evenements');
  const sheetPath = (id) => universePath(universe, `evenements/${id}`);
  const navigate = useNavigate();
  const toast = useToast();
  const state = useEventForm(event);
  const { options, modules } = useNarrativeReferences(universe);
  const save = useSaveEntity('events');
  const { enabled: collectionsOn } = useCollectionFilter();
  const modFieldsOn = Boolean(useModFieldsToc('event'));
  const remove = useDeleteEntity('events');
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
      { id: event?.id, values, images },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${saved.name} » a été créé.` : 'Événement enregistré.');
          // On reste dans l'édition ; un nouvel événement passe sur son adresse d'édition
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
    remove.mutate(event.id, {
      onSuccess: () => {
        toast.success(`« ${event.name} » a été supprimé.`);
        guard.allowNextNavigation();
        navigate(listPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  // Fond et couleurs suivent la saisie en direct
  const backgroundImage = useImagePreview(event?.background, state.images.background);
  const { backgroundMode, backgroundColor, colors } = state.form;

  return (
    <EntityThemeZone
      universe={universe}
      colors={colors}
      background={backgroundMode === 'image' ? backgroundImage : null}
      backgroundColor={backgroundMode === 'color' ? backgroundColor : null}
    >
      <main className={page.main}>
        <Link to={isNew ? listPath : sheetPath(event.id)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? 'Événements' : 'Retour à la fiche'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouvel événement' : event.name}</h1>
        <p className={page.lead}>{isNew ? `Ajouter un moment clé à « ${universe.name} ».` : 'Modifier la fiche de l’événement.'}</p>

        <form onSubmit={submit} noValidate>
          <EventForm
            event={event}
            state={state}
            refs={options}
            modules={modules}
            errors={errors}
            modFields={modFieldsOn && <ModFieldsFormSection universe={universe} entityType="event" entityId={event?.id} />}
            collections={!isNew && collectionsOn && <CollectionsSection universe={universe} entityType="event" entityId={event.id} />}
            editors={!isNew && <EditorsSection entityType="event" entityId={event.id} />}
            dangerZone={
              !isNew && <EventDangerZone onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>} />
            }
          />

          <FormActionBar visible={isNew || state.isDirty || save.isPending} message={!isNew && 'Modifications non enregistrées'}>
            <Button variant="ghost" onClick={() => (isNew ? navigate(listPath) : state.reset())} disabled={save.isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending}>
              {isNew ? 'Créer l’événement' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title="Supprimer l’événement ?"
            description={`« ${event.name} » sera supprimé définitivement et retiré des épisodes où il apparaît.`}
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
