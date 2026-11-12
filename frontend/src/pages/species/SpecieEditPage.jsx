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
import { SpecieDangerZone, SpecieForm } from '@/components/species/SpecieForm';
import { useSpecieForm } from '@/components/species/useSpecieForm';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { SpecieLoader } from './SpecieLoader';
import { useSpeciesReferences } from './useSpeciesReferences';

/** Création (/especes/nouveau) et édition (/especes/:specieId/modifier) d'une espèce. */
export default function SpecieEditPage() {
  const { universe } = useOutletContext();
  const { specieId } = useParams();
  const { canCreate, canEdit } = usePermissions();
  if (!specieId) return canCreate ? <SpecieEditor key="new" universe={universe} specie={null} /> : <Forbidden backTo={universePath(universe, 'especes')} />;
  // `key` : formulaire neuf quand on passe d'une espèce à une autre
  return <SpecieLoader>
      {(specie) =>
        canEdit('specie', specie.id) ? <SpecieEditor key={specie.id} universe={universe} specie={specie} /> : <Forbidden backTo={universePath(universe, `especes/${specie.id}`)} />
      }
    </SpecieLoader>;
}

function SpecieEditor({ universe, specie }) {
  const isNew = !specie;
  const listPath = universePath(universe, 'especes');
  const sheetPath = (id) => universePath(universe, `especes/${id}`);
  const navigate = useNavigate();
  const toast = useToast();
  const state = useSpecieForm(specie);
  const { options, species } = useSpeciesReferences(universe);
  const save = useSaveEntity('species');
  const remove = useDeleteEntity('species');
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
    const { values, images } = state.toSubmit(universe.id);
    save.mutate(
      { id: specie?.id, values, images },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${saved.name} » a été créée.` : 'Espèce enregistrée.');
          // On reste dans l'édition ; une nouvelle espèce passe sur son adresse d'édition
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
    remove.mutate(specie.id, {
      onSuccess: () => {
        toast.success(`« ${specie.name} » a été supprimée.`);
        guard.allowNextNavigation();
        navigate(listPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  const refs = { ...options, allSpecies: species.data };
  // Fond et couleurs suivent la saisie en direct
  const backgroundImage = useImagePreview(specie?.background, state.images.background);
  const { backgroundMode, backgroundColor, colors } = state.form;

  return (
    <EntityThemeZone
      universe={universe}
      colors={colors}
      background={backgroundMode === 'image' ? backgroundImage : null}
      backgroundColor={backgroundMode === 'color' ? backgroundColor : null}
    >
      <main className={page.main}>
        <Link to={isNew ? listPath : sheetPath(specie.id)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? 'Espèces' : 'Retour à la fiche'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouvelle espèce' : specie.name}</h1>
        <p className={page.lead}>{isNew ? `Ajouter une espèce à « ${universe.name} ».` : 'Modifier la fiche de l’espèce.'}</p>

        <form onSubmit={submit} noValidate>
          <SpecieForm
            specie={specie}
            state={state}
            refs={refs}
            errors={errors}
            editors={!isNew && <EditorsSection entityType="specie" entityId={specie.id} />}
            dangerZone={
              !isNew && <SpecieDangerZone onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>} />
            }
          />

          <FormActionBar visible={isNew || state.isDirty || save.isPending} message={!isNew && 'Modifications non enregistrées'}>
            <Button variant="ghost" onClick={() => (isNew ? navigate(listPath) : state.reset())} disabled={save.isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending}>
              {isNew ? 'Créer l’espèce' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title="Supprimer l’espèce ?"
            description={`« ${specie.name} », ses images et son album photo seront supprimés définitivement. Ses sous-espèces et ses personnages sont conservés.`}
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
