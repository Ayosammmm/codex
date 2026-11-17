import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSaveEntityMetadata } from '@/api/mods';
import { useToast } from '@/components/ui/Toast';
import { SheetSection } from '@/components/entity/SheetSection';
import { FormSection } from '@/components/universe/UniverseForm';
import { FieldValue, FieldsGrid, hasValue } from './modFields';
import { ModIcon } from './ModIcon';
import { useUniverseMods } from './modsContext';
import styles from './Mods.module.scss';

const SAVE_DELAY = 700;

/**
 * Champs ajoutés par les mods à une fiche de base (section de l'édition).
 * Enregistrés automatiquement à chaque changement, indépendamment du bouton « Enregistrer » (comme les collections).
 * Rien n'est affiché si aucun mod actif n'ajoute de champ à ce type de fiche.
 */
export function ModFieldsFormSection({ universe, entityType, entityId }) {
  const { fieldsFor } = useUniverseMods();
  const groups = fieldsFor(entityType);
  if (!groups.length) return null;
  return (
    <FormSection
      id="champs-mods"
      title="Champs des mods"
      description={entityId ? 'Champs ajoutés par les mods actifs. Enregistrés automatiquement.' : undefined}
    >
      {entityId ? (
        groups.map(({ mod, fields }) => (
          <ModFieldsBlock key={mod.id} universe={universe} entityType={entityType} entityId={entityId} mod={mod} fields={fields} showTitle={groups.length > 1} />
        ))
      ) : (
        <p className={styles.note}>Ces champs seront disponibles une fois la fiche créée.</p>
      )}
    </FormSection>
  );
}

function ModFieldsBlock({ universe, entityType, entityId, mod, fields, showTitle }) {
  const { metadataOf } = useUniverseMods();
  const saved = metadataOf(entityType, entityId)[mod.id] || {};
  const [values, setValues] = useState(saved);
  const [status, setStatus] = useState('idle');
  const save = useSaveEntityMetadata(universe.id);
  const toast = useToast();
  const pending = useRef(null);

  const flush = () => {
    if (!pending.current) return;
    const next = pending.current;
    pending.current = null;
    setStatus('saving');
    save.mutate(
      { entityType, entityId, modId: mod.id, values: next },
      {
        onSuccess: () => setStatus('saved'),
        onError: (err) => {
          setStatus('idle');
          toast.error(err.message);
        },
      },
    );
  };
  const flushRef = useRef(flush);
  useLayoutEffect(() => {
    flushRef.current = flush;
  });

  // Enregistrement différé (saisie au clavier) ; envoyé aussitôt si on quitte la page
  const timer = useRef(null);
  useEffect(() => () => {
    clearTimeout(timer.current);
    flushRef.current();
  }, []);

  const onChange = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // Champs vidés envoyés à null pour être effacés
      pending.current = Object.fromEntries(fields.map((f) => [f.key, next[f.key] ?? null]));
      return next;
    });
    setStatus('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), SAVE_DELAY);
  };

  return (
    <div className={styles.modBlock}>
      {showTitle && (
        <p className={styles.modBlockTitle}>
          <ModIcon name={mod.icon} aria-hidden /> {mod.name}
        </p>
      )}
      <FieldsGrid fields={fields} modId={mod.id} values={values} onChange={onChange} />
      <p className={styles.note} aria-live="polite">
        {status === 'saving' ? 'Enregistrement…' : status === 'saved' ? 'Enregistré.' : ' '}
      </p>
    </div>
  );
}

/** Sections de lecture d'une fiche de base : une par mod ayant des valeurs renseignées. */
export function ModFieldsSheetSections({ entityType, entityId }) {
  const { fieldsFor, metadataOf } = useUniverseMods();
  const all = metadataOf(entityType, entityId);
  return fieldsFor(entityType).map(({ mod, fields }) => {
    const values = all[mod.id] || {};
    const shown = fields.filter((f) => hasValue(values[f.key]));
    if (!shown.length) return null;
    const short = shown.filter((f) => f.type !== 'richtext');
    const long = shown.filter((f) => f.type === 'richtext');
    return (
      <SheetSection key={mod.id} id={`mod-${mod.id}`} title={mod.name}>
        {short.length > 0 && (
          <dl className={styles.facts}>
            {short.map((f) => (
              <div key={f.key} className={styles.fact}>
                <dt>{f.label}</dt>
                <dd>
                  <FieldValue field={f} modId={mod.id} value={values[f.key]} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        {long.map((f) => (
          <div key={f.key}>
            <h3 className={styles.richHeading}>{f.label}</h3>
            <FieldValue field={f} modId={mod.id} value={values[f.key]} />
          </div>
        ))}
      </SheetSection>
    );
  });
}
