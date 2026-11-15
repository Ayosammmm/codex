import { Link } from 'react-router';
import { useSetEntityCollections } from '@/api/collections';
import { usePermissions } from '@/auth/auth';
import { Combobox } from '@/components/ui/Combobox';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { FormSection } from '@/components/universe/UniverseForm';
import form from '@/components/entity/EntityForm.module.scss';
import { plainText, universePath } from '@/utils/universe';
import { useCollectionFilter } from './collectionFilter';

/**
 * Collections d'une entité (module « Collections »).
 * Enregistré dès chaque changement, indépendamment du bouton « Enregistrer » (comme les éditeurs).
 * entityType : character, place, group, specie, creature, story, event.
 */
export function CollectionsSection({ universe, entityType, entityId }) {
  const { collections, collectionIdsOf } = useCollectionFilter();
  const { isAdmin } = usePermissions();
  const toast = useToast();
  const save = useSetEntityCollections(universe.id, entityType, entityId);

  const options = collections.map((c) => ({
    value: c.id,
    label: c.name,
    color: c.color,
    description: plainText(c.description) || undefined,
  }));
  const value = collectionIdsOf(entityType, entityId);

  const onChange = (collectionIds) =>
    save.mutate(collectionIds, {
      onSuccess: () => toast.success('Collections mises à jour.'),
      onError: (err) => toast.error(err.message),
    });

  const manageLink = isAdmin && (
    <Link to={universePath(universe, 'collections')} className={form.hintLink}>Gérer les collections</Link>
  );

  return (
    <FormSection id="collections" title="Collections" description="Classez cette fiche dans des ensembles libres : saison, jeu, ère, « WIP »… Enregistré immédiatement.">
      <Field
        label="Collections"
        hint={
          collections.length === 0 ? (
            <>Aucune collection pour le moment.{manageLink && <> {manageLink}</>}</>
          ) : (
            manageLink
          )
        }
      >
        {(props) => (
          <Combobox
            {...props}
            multiple
            options={options}
            value={value}
            onChange={onChange}
            placeholder="Ajouter à une collection…"
            emptyText="Aucune collection"
          />
        )}
      </Field>
      {save.isPending && <p className={form.note}>Enregistrement…</p>}
    </FormSection>
  );
}
