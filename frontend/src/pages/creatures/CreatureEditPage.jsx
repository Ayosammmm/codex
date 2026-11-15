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
import { CreatureDangerZone, CreatureForm } from '@/components/creatures/CreatureForm';
import { useCreatureForm } from '@/components/creatures/useCreatureForm';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { CreatureLoader } from './CreatureLoader';
import { useCreatureReferences } from './useCreatureReferences';

/** Création (/bestiaire/nouveau) et édition (/bestiaire/:creatureId/modifier) d'une créature. */
export default function CreatureEditPage() {
  const { universe } = useOutletContext();
  const { creatureId } = useParams();
  const { canCreate, canEdit } = usePermissions();
  if (!creatureId) return canCreate ? <CreatureEditor key="new" universe={universe} creature={null} /> : <Forbidden backTo={universePath(universe, 'bestiaire')} />;
  // `key` : formulaire neuf quand on passe d'une créature à une autre
  return <CreatureLoader>
      {(creature) =>
        canEdit('creature', creature.id) ? <CreatureEditor key={creature.id} universe={universe} creature={creature} /> : <Forbidden backTo={universePath(universe, `bestiaire/${creature.id}`)} />
      }
    </CreatureLoader>;
}

function CreatureEditor({ universe, creature }) {
  const isNew = !creature;
  const listPath = universePath(universe, 'bestiaire');
  const sheetPath = (id) => universePath(universe, `bestiaire/${id}`);
  const navigate = useNavigate();
  const toast = useToast();
  const state = useCreatureForm(creature);
  const { options, modules } = useCreatureReferences(universe);
  const save = useSaveEntity('creatures');
  const { enabled: collectionsOn } = useCollectionFilter();
  const remove = useDeleteEntity('creatures');
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const guard = useUnsavedChangesGuard(state.isDirty && !save.isPending);

  const submit = (e) => {
    e.preventDefault();
    const found = state.validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(found.name ? 'identite' : 'morphologie')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const { values, images } = state.toSubmit(universe.id, modules);
    save.mutate(
      { id: creature?.id, values, images },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${saved.name} » a été créée.` : 'Créature enregistrée.');
          // On reste dans l'édition ; une nouvelle créature passe sur son adresse d'édition
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
    remove.mutate(creature.id, {
      onSuccess: () => {
        toast.success(`« ${creature.name} » a été supprimée.`);
        guard.allowNextNavigation();
        navigate(listPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  const refs = options;
  // Fond et couleurs suivent la saisie en direct
  const backgroundImage = useImagePreview(creature?.background, state.images.background);
  const { backgroundMode, backgroundColor, colors } = state.form;

  return (
    <EntityThemeZone
      universe={universe}
      colors={colors}
      background={backgroundMode === 'image' ? backgroundImage : null}
      backgroundColor={backgroundMode === 'color' ? backgroundColor : null}
    >
      <main className={page.main}>
        <Link to={isNew ? listPath : sheetPath(creature.id)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? 'Bestiaire' : 'Retour à la fiche'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouvelle créature' : creature.name}</h1>
        <p className={page.lead}>{isNew ? `Ajouter une créature au bestiaire de « ${universe.name} ».` : 'Modifier la fiche de la créature.'}</p>

        <form onSubmit={submit} noValidate>
          <CreatureForm
            universe={universe}
            creature={creature}
            state={state}
            refs={refs}
            modules={modules}
            errors={errors}
            collections={!isNew && collectionsOn && <CollectionsSection universe={universe} entityType="creature" entityId={creature.id} />}
            editors={!isNew && <EditorsSection entityType="creature" entityId={creature.id} />}
            dangerZone={
              !isNew && <CreatureDangerZone onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>} />
            }
          />

          <FormActionBar visible={isNew || state.isDirty || save.isPending} message={!isNew && 'Modifications non enregistrées'}>
            <Button variant="ghost" onClick={() => (isNew ? navigate(listPath) : state.reset())} disabled={save.isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending}>
              {isNew ? 'Créer la créature' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title="Supprimer la créature ?"
            description={`« ${creature.name} », ses images et son album photo seront supprimés définitivement.`}
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
