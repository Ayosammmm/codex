import { useId, useState } from 'react';
import { useSaveEntity } from '@/api/queries';
import { DEFAULT_REFERENCE_COLOR } from '@/config/references';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ColorInput } from '@/components/ui/ColorInput';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';
import { RichTextEditor } from '@/components/ui/RichText';
import { useToast } from '@/components/ui/Toast';
import { plainText } from '@/utils/universe';
import styles from './References.module.scss';

/**
 * Création / modification d'un élément de référentiel dans une fenêtre.
 * `item` : élément modifié, ou null pour en créer un. Monté à chaque ouverture (`key`), il repart de zéro.
 */
export function ReferenceDialog({ open, onClose, universe, resource, config, item }) {
  const formId = useId();
  const toast = useToast();
  const save = useSaveEntity(resource);
  const isNew = !item;
  const hasColor = config.fields.includes('color');
  const hasDescription = config.fields.includes('description');
  const [name, setName] = useState(item?.name || '');
  const [color, setColor] = useState(item?.color || DEFAULT_REFERENCE_COLOR);
  const [description, setDescription] = useState(item?.description || '');
  const [error, setError] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom est requis.');
      return;
    }
    const values = { universe_id: universe.id, name: name.trim() };
    if (hasColor) values.color = color;
    if (hasDescription) values.description = plainText(description) ? description : '';
    save.mutate(
      { id: item?.id, values },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${saved.name} » a été ajouté.` : 'Modifications enregistrées.');
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!save.isPending}
      size="sm"
      title={isNew ? config.newLabel : `Modifier « ${item.name} »`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>Annuler</Button>
          <Button type="submit" form={formId} variant="primary" loading={save.isPending}>
            {isNew ? 'Ajouter' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className={styles.dialogForm} noValidate>
        <Field label="Nom" required error={error}>
          {(props) => (
            <Input
              {...props}
              autoFocus
              value={name}
              maxLength={255}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          )}
        </Field>
        {hasColor && (
          <Field label="Couleur" hint="Utilisée pour les étiquettes et les regroupements.">
            {(props) => <ColorInput {...props} value={color} onChange={setColor} />}
          </Field>
        )}
        {hasDescription && (
          <Field label="Description">
            {(props) => <RichTextEditor {...props} label="Description" minHeight="6rem" value={description} onChange={setDescription} />}
          </Field>
        )}
        {hasColor && name.trim() && (
          <p className={styles.preview}>
            Aperçu : <Badge color={color}>{name.trim()}</Badge>
          </p>
        )}
      </form>
    </Dialog>
  );
}
