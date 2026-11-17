/* eslint-disable react-refresh/only-export-components -- composants de champs et fonctions associées */
import { Fragment, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router';
import { ExternalLink } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { Badge } from '@/components/ui/Badge';
import { ColorInput } from '@/components/ui/ColorInput';
import { Combobox } from '@/components/ui/Combobox';
import { Field, Input } from '@/components/ui/Field';
import { RichText, RichTextEditor } from '@/components/ui/RichText';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { dash } from '@/components/entity/EntityTable';
import { plainText, universePath } from '@/utils/universe';
import { BASE_ENTITIES, entityLabel, entityPath, entityThumb, resourceOf } from './entityRefs';
import { useUniverseMods } from './modsContext';
import styles from './Mods.module.scss';

/**
 * Champs déclarés par les mods (types : text, richtext, number, boolean, date, select, multiselect,
 * color, url, ref). Valeurs telles qu'enregistrées par le serveur ; références : [{ type, id }].
 */

// ---------------------------------------------------------------------------
// Références
// ---------------------------------------------------------------------------

/** Cible d'un champ « ref » : { entityType, modId?, typeKey? } (`custom:<clé>` = type du même mod). */
export const refTarget = (field, modId) =>
  field.entity?.startsWith('custom:') ? { entityType: 'custom', modId, typeKey: field.entity.slice(7) } : { entityType: field.entity };

/** Entités pouvant être choisies pour un champ « ref ». */
function useRefCandidates(target) {
  const { universe } = useOutletContext();
  const { customEntities } = useUniverseMods();
  const resource = target.entityType === 'custom' ? null : resourceOf(target.entityType);
  const { data } = useEntityList(resource || 'characters', universe.id, { enabled: Boolean(resource) });
  return useMemo(() => {
    if (target.entityType !== 'custom') return data || [];
    return customEntities.filter((e) => e.modId === target.modId && e.typeKey === target.typeKey);
  }, [target.entityType, target.modId, target.typeKey, data, customEntities]);
}

/** Liste de liens vers les entités référencées. */
function RefValue({ field, modId, value }) {
  const { universe } = useOutletContext();
  const { typeOf } = useUniverseMods();
  const target = refTarget(field, modId);
  const candidates = useRefCandidates(target);
  const byId = new Map(candidates.map((e) => [e.id, e]));
  const items = (value || []).map((ref) => byId.get(ref.id)).filter(Boolean);
  if (!items.length) return dash;
  return (
    <span className={styles.refs}>
      {items.map((entity) => {
        const path = entityPath(target.entityType, entity, typeOf);
        const thumb = entityThumb(entity);
        const content = (
          <>
            {thumb && <img src={thumb} alt="" className={styles.refThumb} />}
            {entityLabel(target.entityType, entity)}
          </>
        );
        return path ? (
          <Link key={entity.id} to={universePath(universe, path)} className={styles.ref} onClick={(e) => e.stopPropagation()}>
            {content}
          </Link>
        ) : (
          <span key={entity.id} className={styles.ref}>{content}</span>
        );
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------------

const optionOf = (field, value) => field.options?.find((o) => o.value === value);
const formatNumber = (field, n) => `${String(n).replace('.', ',')}${field.unit ? ` ${field.unit}` : ''}`;
const formatDate = (value) => {
  const match = /^(-?\d+)-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};
const hostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

/** La valeur est-elle renseignée ? */
export const hasValue = (value) => value != null && value !== '' && !(Array.isArray(value) && !value.length);

/** Texte simple d'une valeur (recherche, aperçu). Les références ne sont pas résolues. */
export function valueText(field, value) {
  if (!hasValue(value)) return '';
  switch (field.type) {
    case 'richtext':
      return plainText(value);
    case 'number':
      return formatNumber(field, value);
    case 'boolean':
      return value ? 'Oui' : 'Non';
    case 'date':
      return formatDate(value);
    case 'select':
      return optionOf(field, value)?.label || value;
    case 'multiselect':
      return value.map((v) => optionOf(field, v)?.label || v).join(', ');
    case 'ref':
      return '';
    default:
      return String(value);
  }
}

/** Valeur d'un champ en lecture seule. `compact` : version courte (tableaux, cartes). */
export function FieldValue({ field, modId, value, compact = false }) {
  if (!hasValue(value)) return dash;
  switch (field.type) {
    case 'richtext':
      return compact ? <span className={styles.clamp}>{plainText(value)}</span> : <RichText html={value} />;
    case 'select': {
      const option = optionOf(field, value);
      return option?.color ? <Badge color={option.color}>{option.label}</Badge> : option?.label || value;
    }
    case 'multiselect':
      return (
        <span className={styles.badges}>
          {value.map((v) => {
            const option = optionOf(field, v);
            return <Badge key={v} color={option?.color}>{option?.label || v}</Badge>;
          })}
        </span>
      );
    case 'color':
      return (
        <span className={styles.color}>
          <span className={styles.swatch} style={{ background: value }} aria-hidden />
          {value}
        </span>
      );
    case 'url':
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className={styles.url} onClick={(e) => e.stopPropagation()}>
          {compact ? hostname(value) : value} <ExternalLink aria-hidden />
        </a>
      );
    case 'ref':
      return <RefValue field={field} modId={modId} value={value} />;
    default:
      return valueText(field, value);
  }
}

/** Liste de faits (dt / dd) pour une fiche : seuls les champs renseignés. `richtext` à part (voir RichFields). */
export function FieldFacts({ fields, modId, values, className, factClassName }) {
  const shown = fields.filter((f) => f.type !== 'richtext' && hasValue(values?.[f.key]));
  if (!shown.length) return null;
  return (
    <dl className={className}>
      {shown.map((f) => (
        <div key={f.key} className={factClassName}>
          <dt>{f.label}</dt>
          <dd>
            <FieldValue field={f} modId={modId} value={values[f.key]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Champs « texte riche » renseignés, chacun sous son titre. */
export function RichFields({ fields, values, headingClassName }) {
  const shown = fields.filter((f) => f.type === 'richtext' && hasValue(values?.[f.key]));
  return shown.map((f) => (
    <Fragment key={f.key}>
      <h3 className={headingClassName}>{f.label}</h3>
      <RichText html={values[f.key]} />
    </Fragment>
  ));
}

// ---------------------------------------------------------------------------
// Saisie
// ---------------------------------------------------------------------------

const BOOLEAN_OPTIONS = [
  { value: '', label: 'Non précisé' },
  { value: 'true', label: 'Oui' },
  { value: 'false', label: 'Non' },
];

function RefInput({ field, modId, value, onChange, ...props }) {
  const target = refTarget(field, modId);
  const candidates = useRefCandidates(target);
  const options = useMemo(
    () =>
      candidates
        .map((e) => ({ value: e.id, label: entityLabel(target.entityType, e), image: entityThumb(e) || undefined }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    [candidates, target.entityType],
  );
  const ids = (value || []).map((r) => r.id);
  const toRefs = (list) => list.map((id) => ({ type: target.entityType, id }));
  const noun = target.entityType === 'custom' ? 'une fiche' : BASE_ENTITIES[target.entityType]?.label.toLowerCase();
  return field.multiple ? (
    <Combobox {...props} multiple options={options} value={ids} onChange={(list) => onChange(toRefs(list))} placeholder={`Ajouter ${noun ? `: ${noun}` : ''}…`} />
  ) : (
    <Combobox {...props} options={options} value={ids[0] ?? null} onChange={(id) => onChange(id == null ? null : toRefs([id]))} placeholder="Choisir…" />
  );
}

/** Saisie d'une valeur selon le type du champ. `props` : id et attributs ARIA fournis par <Field>. */
export function FieldInput({ field, modId, value, onChange, ...props }) {
  switch (field.type) {
    case 'richtext':
      return <RichTextEditor {...props} label={field.label} minHeight="8rem" value={value || ''} onChange={onChange} />;
    case 'number':
      return (
        <Input
          {...props}
          type="number"
          inputMode="decimal"
          step="any"
          min={field.min}
          max={field.max}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
    case 'boolean':
      return (
        <Segmented
          label={field.label}
          options={BOOLEAN_OPTIONS}
          value={value == null ? '' : String(value)}
          onChange={(v) => onChange(v === '' ? null : v === 'true')}
        />
      );
    case 'date':
      return <Input {...props} type="date" value={value || ''} onChange={(e) => onChange(e.target.value || null)} />;
    case 'select':
      return <Select {...props} options={field.options} value={value ?? ''} onChange={(v) => onChange(v || null)} placeholder="Non précisé" />;
    case 'multiselect':
      return <Combobox {...props} multiple options={field.options} value={value || []} onChange={onChange} placeholder="Ajouter…" />;
    case 'color':
      return <ColorInput {...props} value={value || null} onChange={onChange} onReset={() => onChange(null)} />;
    case 'url':
      return <Input {...props} type="url" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />;
    case 'ref':
      return <RefInput {...props} field={field} modId={modId} value={value} onChange={onChange} />;
    default:
      return <Input {...props} value={value || ''} onChange={(e) => onChange(e.target.value)} maxLength={1000} />;
  }
}

/** Grille de champs à saisir. `values` / `onChange(key, value)`. */
export function FieldsGrid({ fields, modId, values, onChange }) {
  return (
    <div className={styles.fieldsGrid}>
      {fields.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          hint={[f.hint, f.type === 'number' && f.unit && `En ${f.unit}.`].filter(Boolean).join(' ') || undefined}
          className={f.type === 'richtext' ? styles.wide : undefined}
        >
          {(props) => <FieldInput {...props} field={f} modId={modId} value={values?.[f.key]} onChange={(v) => onChange(f.key, v)} />}
        </Field>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listes : colonnes, tris, filtres
// ---------------------------------------------------------------------------

/** Colonnes d'un tableau pour des champs de mods. `valuesOf(item)` : valeurs des champs de l'élément. */
export const fieldColumns = ({ fields, modId, valuesOf, sortable = false, keyPrefix = `mod:${modId}:` }) =>
  fields.map((f) => ({
    key: `${keyPrefix}${f.key}`,
    label: f.label,
    defaultHidden: !f.table,
    ...(sortable && SORTABLE.has(f.type) && { sortKey: `f_${f.key}` }),
    render: (item) => <FieldValue field={f} modId={modId} value={valuesOf(item)?.[f.key]} compact />,
  }));

const SORTABLE = new Set(['text', 'number', 'date', 'select', 'boolean', 'color', 'url']);
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

/** Tris sur les champs (valeurs absentes en dernier). */
export const fieldSorts = (fields, valuesOf) =>
  fields
    .filter((f) => SORTABLE.has(f.type))
    .map((f) => ({
      key: `f_${f.key}`,
      label: f.label,
      compare: (a, b) => {
        const va = valuesOf(a)?.[f.key];
        const vb = valuesOf(b)?.[f.key];
        if (!hasValue(va) || !hasValue(vb)) return hasValue(va) ? -1 : hasValue(vb) ? 1 : 0;
        if (f.type === 'number') return va - vb;
        if (f.type === 'select') return f.options.findIndex((o) => o.value === va) - f.options.findIndex((o) => o.value === vb);
        return collator.compare(valueText(f, va), valueText(f, vb));
      },
    }));

/** Critères de filtre et de regroupement (listes à choix et oui / non). */
export const fieldCriteria = (fields, valuesOf) =>
  fields
    .filter((f) => ['select', 'multiselect', 'boolean'].includes(f.type))
    .map((f) => ({
      key: `f_${f.key}`,
      label: f.label,
      noneLabel: `${f.label} non précisé`,
      options: f.type === 'boolean' ? BOOLEAN_OPTIONS.slice(1) : f.options,
      values: (item) => {
        const v = valuesOf(item)?.[f.key];
        if (!hasValue(v)) return [];
        return f.type === 'multiselect' ? v : [String(v)];
      },
    }));
