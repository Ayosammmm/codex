import { useState } from 'react';
import { useDeleteUniverse, useDuplicateUniverse } from '@/api/queries';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import styles from './UniverseDialogs.module.scss';

export function DuplicateUniverseDialog({ universe, onClose, onDone }) {
  const duplicate = useDuplicateUniverse();
  const [name, setName] = useState(universe ? `${universe.name} (copie)` : '');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    duplicate.mutate({ id: universe.id, name: name.trim() }, { onSuccess: onDone });
  };

  return (
    <Dialog
      open={Boolean(universe)}
      onClose={onClose}
      dismissible={!duplicate.isPending}
      title="Dupliquer l’univers"
      description="Toutes les entités, leurs liens et leurs images seront copiés dans un nouvel univers."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={duplicate.isPending}>Annuler</Button>
          <Button variant="primary" type="submit" form="duplicate-form" loading={duplicate.isPending}>
            Dupliquer
          </Button>
        </>
      }
    >
      <form id="duplicate-form" onSubmit={submit}>
        <Field label="Nom de la copie" required error={duplicate.error?.message}>
          {(props) => <Input {...props} value={name} onChange={(e) => setName(e.target.value)} autoFocus />}
        </Field>
      </form>
    </Dialog>
  );
}

export function DeleteUniverseDialog({ universe, onClose, onDone }) {
  const remove = useDeleteUniverse();
  const [confirmation, setConfirmation] = useState('');

  const matches = universe && confirmation.trim() === universe.name.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!matches) return;
    remove.mutate(universe.id, { onSuccess: () => onDone(universe) });
  };

  return (
    <Dialog
      open={Boolean(universe)}
      onClose={onClose}
      dismissible={!remove.isPending}
      size="sm"
      title="Supprimer l’univers ?"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={remove.isPending}>Annuler</Button>
          <Button variant="danger" type="submit" form="delete-form" disabled={!matches} loading={remove.isPending}>
            Supprimer définitivement
          </Button>
        </>
      }
    >
      {universe && (
        <form id="delete-form" onSubmit={submit} className={styles.deleteForm}>
          <p className={styles.warning}>
            <strong>{universe.name}</strong> et tout son contenu (personnages, lieux, groupes,
            histoires, images…) seront supprimés. Cette action est irréversible : pensez à l’exporter avant.
          </p>
          <Field label={`Tapez « ${universe.name} » pour confirmer`} error={remove.error?.message}>
            {(props) => (
              <Input {...props} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" autoFocus />
            )}
          </Field>
        </form>
      )}
    </Dialog>
  );
}
