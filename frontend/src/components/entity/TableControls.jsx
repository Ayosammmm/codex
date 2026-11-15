import { useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Columns3, ListChecks, PencilLine, Trash2, X } from '@/components/ui/icons';
import { RESOURCES } from '@/api/resources';
import { universeKeys } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/auth';
import { Combobox } from '@/components/ui/Combobox';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { plural } from '@/utils/universe';
import { rowLabel } from './EntityTable';
import styles from './TableControls.module.scss';

const CONCURRENCY = 4;

/** Accord d'un participe avec le nom (`noun[2] === 'f'` : féminin) : « modifiées », « sélectionné »... */
const agree = (noun, count) => (noun[2] === 'f' ? 'e' : '') + (count > 1 ? 's' : '');

/** Applique `fn` à chaque élément, quelques requêtes à la fois. Renvoie { ok, failed: [{ item, error }] }. */
async function runAll(items, fn) {
  const failed = [];
  let ok = 0;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(fn));
    results.forEach((r, j) => (r.status === 'fulfilled' ? ok++ : failed.push({ item: batch[j], error: r.reason })));
  }
  return { ok, failed };
}

/** Options d'une colonne modifiable : liste fixe, ou celles du critère de filtre correspondant. */
const editOptions = (edit, criteria) => edit.options || criteria.find((c) => c.key === edit.criterion)?.options || [];

/** Valeur envoyée à l'API ('' = champ vidé). */
/** Champ à plusieurs valeurs (éditeurs...) : ajout, retrait ou remplacement. */
const MULTI_MODES = [
  { value: 'add', label: 'Ajouter' },
  { value: 'remove', label: 'Retirer' },
  { value: 'replace', label: 'Remplacer par' },
];

/** Nouvelle liste d'un champ multiple pour un élément, selon le mode choisi. */
const nextValues = (current, { mode, ids }) => {
  if (mode === 'replace') return ids;
  if (mode === 'remove') return current.filter((id) => !ids.includes(id));
  return [...new Set([...current, ...ids])];
};

const toApiValue = (edit, raw) => {
  if (raw === '' || raw == null) return null;
  if (edit.type === 'ref' || edit.type === 'number') return Number(raw);
  return edit.type === 'text' ? String(raw).trim() || null : raw;
};

// ---------------------------------------------------------------------------

/** Liste des colonnes à cocher, dans un panneau déroulant. */
function ColumnPicker({ columns, state }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hideable = columns.filter((c) => !c.required);

  return (
    <div ref={rootRef} className={styles.picker}>
      <Button size="sm" icon={Columns3} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        Colonnes
      </Button>
      {open && (
        <div id={panelId} role="group" aria-label="Colonnes affichées" className={styles.panel}>
          {hideable.map((c) => (
            <label key={c.key} className={styles.option}>
              <input type="checkbox" checked={state.isVisible(c)} onChange={() => state.toggle(c)} />
              {c.label}
            </label>
          ))}
          {!state.isDefault && (
            <button type="button" className={styles.reset} onClick={state.reset}>
              Colonnes par défaut
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Fenêtre « Modifier un champ » : une colonne, une valeur, appliquée à toute la sélection. */
function BulkEditDialog({ open, onClose, columns, criteria, count, noun, onApply, pending }) {
  const editable = columns.filter((c) => c.edit);
  const [key, setKey] = useState(editable[0]?.key || '');
  const [value, setValue] = useState('');
  const [multi, setMulti] = useState({ mode: 'add', ids: [] });
  const column = editable.find((c) => c.key === key) || editable[0];

  if (!column) return null;
  const { edit } = column;
  const options = editOptions(edit, criteria);
  const numberError =
    edit.type === 'number' && value !== '' && (!Number.isFinite(Number(value)) || (edit.min != null && Number(value) < edit.min) || (edit.max != null && Number(value) > edit.max))
      ? `Nombre attendu${edit.min != null && edit.max != null ? ` entre ${edit.min} et ${edit.max}` : ''}.`
      : null;

  const submit = (e) => {
    e.preventDefault();
    if (numberError) return;
    onApply(column, edit.type === 'multi' ? multi : toApiValue(edit, value));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!pending}
      title="Modifier un champ"
      description={`Appliqué ${count > 1 ? `aux ${plural(count, noun[0], noun[1])} sélectionné${agree(noun, count)}` : 'à l’élément sélectionné'}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button
            variant="primary"
            type="submit"
            form="bulk-edit"
            disabled={pending || Boolean(numberError) || (edit.type === 'multi' && multi.mode !== 'replace' && !multi.ids.length)}
          >
            {pending ? 'Application…' : 'Appliquer'}
          </Button>
        </>
      }
    >
      <form id="bulk-edit" onSubmit={submit} className={styles.form}>
        <Field label="Champ">
          {(props) => (
            <Select
              {...props}
              options={editable.map((c) => ({ value: c.key, label: c.label }))}
              value={column.key}
              onChange={(k) => {
                setKey(k);
                setValue('');
                setMulti({ mode: 'add', ids: [] });
              }}
            />
          )}
        </Field>
        {edit.type === 'multi' ? (
          <>
            <Segmented label="Opération" options={MULTI_MODES} value={multi.mode} onChange={(mode) => setMulti((m) => ({ ...m, mode }))} />
            <Field label={column.label} hint={multi.mode === 'replace' ? 'Laisser vide pour tout retirer.' : undefined}>
              {(props) => (
                <Combobox
                  {...props}
                  multiple
                  options={options}
                  value={multi.ids}
                  onChange={(ids) => setMulti((m) => ({ ...m, ids }))}
                  placeholder="Rechercher…"
                  emptyText={edit.emptyText}
                />
              )}
            </Field>
          </>
        ) : (
        <Field label="Nouvelle valeur" hint={edit.type === 'text' || edit.type === 'number' ? 'Laisser vide pour effacer le champ.' : undefined} error={numberError}>
          {(props) =>
            edit.type === 'text' || edit.type === 'number' ? (
              <Input {...props} type={edit.type === 'number' ? 'number' : 'text'} min={edit.min} max={edit.max} value={value} onChange={(e) => setValue(e.target.value)} />
            ) : (
              <Select {...props} options={options} value={value} onChange={setValue} placeholder="— Vider le champ —" />
            )
          }
        </Field>
        )}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

/**
 * Barre au-dessus d'un tableau d'entités : choix des colonnes et actions sur la sélection
 * (modifier un champ, supprimer). Chaque élément est enregistré par sa propre requête :
 * les droits sont vérifiés par le serveur pour chacun, et les échecs sont signalés.
 * - `table`    : useTableState ; `columns` : colonnes du tableau ; `criteria` : critères de filtre (options)
 * - `resource` : clé de RESOURCES (characters, places...) ; `noun` : ['personnage', 'personnages'] (+ 'f' si féminin)
 */
export function TableControls({ table, columns, criteria = [], resource, noun }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const [dialog, setDialog] = useState(null); // 'edit' | 'delete' | null
  const [pending, setPending] = useState(false);
  const { selected, clear, enabled, active, toggleActive } = table.selection;
  const count = selected.length;
  const canEditFields = columns.some((c) => c.edit);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['entities'] });
    queryClient.invalidateQueries({ queryKey: universeKeys.list() }); // compteurs
    queryClient.invalidateQueries({ queryKey: ['editors'] });
    queryClient.invalidateQueries({ queryKey: ['auth'] }); // droits d'un éditeur qui s'est retiré
  };

  const report = ({ ok, failed }, verb) => {
    if (ok) toast.success(`${plural(ok, noun[0], noun[1])} ${verb}${agree(noun, ok)}.`);
    if (failed.length) {
      toast.error(`${plural(failed.length, 'échec')} : ${failed[0].error?.message || 'erreur inconnue'}`);
    }
  };

  const applyEdit = async (column, value) => {
    const { edit } = column;
    const save =
      edit.type === 'multi'
        ? (item) => edit.save(item, nextValues(edit.current(item), value))
        : (item) => RESOURCES[resource].update(item.id, { [edit.field]: value });
    // Un éditeur qui se retire perd l'accès aux fiches concernées : on le prévient
    if (column.key === 'editors' && user?.role === 'editor') {
      const losing = selected.filter((item) => edit.current(item).includes(user.id) && !nextValues(edit.current(item), value).includes(user.id));
      if (losing.length && !window.confirm(`Vous retirer des éditeurs de ${plural(losing.length, noun[0], noun[1])} ? Vous ne pourrez plus modifier ${losing.length > 1 ? 'ces fiches' : 'cette fiche'}.`)) return;
    }
    setPending(true);
    const result = await runAll(selected, save);
    setPending(false);
    refresh();
    report(result, 'modifié');
    if (!result.failed.length) setDialog(null);
  };

  const applyDelete = async () => {
    setPending(true);
    const result = await runAll(selected, (item) => RESOURCES[resource].remove(item.id));
    setPending(false);
    refresh();
    report(result, 'supprimé');
    queryClient.removeQueries({ queryKey: ['entities', resource, 'detail'] });
    clear();
    setDialog(null);
  };

  return (
    <div className={styles.bar}>
      {count > 0 ? (
        <div className={styles.selection} role="status">
          <span className={styles.count}>
            {plural(count, noun[0], noun[1])} <span className={styles.muted}>sélectionné{agree(noun, count)}</span>
          </span>
          {canEditFields && (
            <Button size="sm" icon={PencilLine} onClick={() => setDialog('edit')}>
              Modifier un champ
            </Button>
          )}
          <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={() => setDialog('delete')}>
            Supprimer
          </Button>
          <Button size="sm" variant="ghost" icon={X} onClick={clear}>
            Désélectionner
          </Button>
        </div>
      ) : (
        active && <p className={styles.hint}>Cochez des lignes pour les modifier ou les supprimer ensemble (Maj+clic : plusieurs à la suite).</p>
      )}
      <span className={styles.spacer} />
      {enabled && (
        <Button size="sm" icon={ListChecks} aria-pressed={active} onClick={toggleActive} className={active ? styles.toggleOn : undefined}>
          Sélection multiple
        </Button>
      )}
      <ColumnPicker columns={columns} state={table.columns} />

      {/* `key` : formulaire remis à zéro à chaque ouverture */}
      {dialog === 'edit' && (
        <BulkEditDialog
          key={count}
          open
          onClose={() => setDialog(null)}
          columns={columns}
          criteria={criteria}
          count={count}
          noun={noun}
          onApply={applyEdit}
          pending={pending}
        />
      )}
      <Dialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        dismissible={!pending}
        size="sm"
        title={`Supprimer ${plural(count, noun[0], noun[1])} ?`}
        description="Cette action est définitive : les fiches, leurs images et leurs liens seront supprimés."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={pending}>Annuler</Button>
            <Button variant="danger" icon={Trash2} onClick={applyDelete} disabled={pending}>
              {pending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </>
        }
      >
        <ul className={styles.names}>
          {selected.slice(0, 8).map((item) => (
            <li key={item.id}>{rowLabel(columns, item)}</li>
          ))}
          {count > 8 && <li className={styles.muted}>et {count - 8} autre{count - 8 > 1 ? 's' : ''}…</li>}
        </ul>
      </Dialog>
    </div>
  );
}
