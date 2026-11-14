import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { CircleAlert, HeartHandshake } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { DynamicCard } from '@/components/relations/DynamicCard';
import { DYNAMIC_TYPES, buildRelationGraph, detectDynamics } from '@/utils/dynamics';
import { plural, universePath } from '@/utils/universe';
import list from '../ListPage.module.scss';
import styles from './DynamicsPage.module.scss';

/**
 * Dynamiques de groupe repérées dans les relations de l'univers : triangles amoureux,
 * bandes et trios soudés, équilibres instables, ennemis communs, conflits, groupes divisés.
 */
export default function DynamicsPage() {
  const { universe } = useOutletContext();
  const groupsOn = isModuleEnabled(getModulesState(universe), 'groups');
  const characters = useEntityList('characters', universe.id);
  const groups = useEntityList('groups', universe.id, { enabled: groupsOn });
  const [type, setType] = useState('');

  const { dynamics, byId, relationCount } = useMemo(() => {
    const chars = characters.data || [];
    const graph = buildRelationGraph(chars);
    return {
      dynamics: detectDynamics(chars, groupsOn ? groups.data || [] : []),
      byId: new Map(chars.map((c) => [c.id, c])),
      relationCount: [...graph.values()].reduce((n, m) => n + m.size, 0) / 2,
    };
  }, [characters.data, groups.data, groupsOn]);

  const counts = Object.fromEntries(DYNAMIC_TYPES.map((t) => [t.key, dynamics.filter((d) => d.type === t.key).length]));
  const shown = type ? dynamics.filter((d) => d.type === type) : dynamics;

  return (
    <main className={`${list.main} ${styles.page}`}>
      <header className={list.header}>
        <div>
          <h1 className={list.title}>Dynamiques</h1>
          <p className={list.count}>
            {characters.data ? `${plural(dynamics.length, 'dynamique')} repérée${dynamics.length > 1 ? 's' : ''} dans ${plural(relationCount, 'relation')}` : '…'}
          </p>
        </div>
      </header>

      <p className={styles.intro}>
        Les dynamiques sont déduites des relations entre personnages : le <strong>ton</strong> de chaque relation (ou, à défaut, son archétype) indique si le lien
        est positif ou négatif. Trois personnages forment un trio stable quand leurs liens s’accordent, et instable quand un lien contredit les deux autres.
      </p>

      {characters.isPending ? (
        <Spinner label="Analyse des relations…" />
      ) : characters.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger les personnages" action={<Button onClick={() => characters.refetch()}>Réessayer</Button>}>
          {characters.error.message}
        </EmptyState>
      ) : dynamics.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="Aucune dynamique pour l’instant"
          action={
            <Button as={Link} to={universePath(universe, 'personnages')} variant="primary">
              Voir les personnages
            </Button>
          }
        >
          Ajoutez des relations entre personnages, avec leur archétype et leur ton : les triangles amoureux, trios soudés, ennemis communs et conflits
          apparaîtront ici. {relationCount > 0 && `(${plural(relationCount, 'relation')} pour le moment.)`}
        </EmptyState>
      ) : (
        <>
          <div className={styles.filters} role="group" aria-label="Filtrer par type de dynamique">
            <button type="button" className={cx(styles.filter, !type && styles.filterActive)} onClick={() => setType('')} aria-pressed={!type}>
              Toutes <span>{dynamics.length}</span>
            </button>
            {DYNAMIC_TYPES.filter((t) => counts[t.key]).map((t) => (
              <button
                key={t.key}
                type="button"
                className={cx(styles.filter, type === t.key && styles.filterActive)}
                style={{ '--dynamic': t.color }}
                onClick={() => setType(type === t.key ? '' : t.key)}
                aria-pressed={type === t.key}
                title={t.description}
              >
                {t.label} <span>{counts[t.key]}</span>
              </button>
            ))}
          </div>
          <ul className={styles.list}>
            {shown.map((d) => (
              <li key={d.key}>
                <DynamicCard universe={universe} dynamic={d} byId={byId} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
