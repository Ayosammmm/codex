import { useEntityEditors, useEditorAccounts } from '@/api/users';
import { useAuth } from '@/auth/auth';
import { Combobox } from '@/components/ui/Combobox';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { FormSection } from '@/components/universe/UniverseForm';
import form from './EntityForm.module.scss';

/**
 * Éditeurs liés à une entité : ils peuvent la modifier (notes Obsidian « Utilisateurs »).
 * Enregistré dès chaque changement, indépendamment du bouton « Enregistrer » (comme l'album photo).
 * type : character, place, group, specie, creature, story, event.
 */
export function EditorsSection({ entityType, entityId, subject = 'cette fiche' }) {
  const { user } = useAuth();
  const toast = useToast();
  const accounts = useEditorAccounts();
  const { query, save } = useEntityEditors(entityType, entityId);

  const options = (accounts.data || []).map((u) => ({ value: u.id, label: u.displayName, description: `@${u.username}` }));
  const value = (query.data || []).map((u) => u.id);

  const onChange = (userIds) => {
    // Un éditeur qui se retire perd l'accès à la fiche : on le prévient
    if (user.role === 'editor' && value.includes(user.id) && !userIds.includes(user.id)) {
      if (!window.confirm('Vous retirer des éditeurs ? Vous ne pourrez plus modifier cette fiche.')) return;
    }
    save.mutate(userIds, {
      onSuccess: () => toast.success('Éditeurs mis à jour.'),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <FormSection id="editeurs" title="Éditeurs" description={`Les comptes éditeurs liés à ${subject} peuvent la modifier. Enregistré immédiatement.`}>
      <Field
        label="Éditeurs liés"
        hint={accounts.data?.length === 0 ? 'Aucun compte éditeur pour le moment.' : 'Les admins peuvent toujours tout modifier.'}
        error={query.error?.message}
      >
        {(props) => (
          <Combobox
            {...props}
            multiple
            options={options}
            value={value}
            onChange={onChange}
            placeholder={query.isPending ? 'Chargement…' : 'Ajouter un éditeur…'}
            emptyText="Aucun éditeur"
          />
        )}
      </Field>
      {save.isPending && <p className={form.note}>Enregistrement…</p>}
    </FormSection>
  );
}
