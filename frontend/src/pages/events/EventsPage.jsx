import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router';
import { CalendarClock, CircleAlert } from 'lucide-react';
import { Plus } from '@/components/ui/icons';
import { useReorderEntity } from '@/api/queries';
import { CRITERIA, SORTS, searchText } from '@/config/events';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { GroupedSections } from '@/components/entity/GroupedSections';
import { ListToolbar } from '@/components/entity/ListToolbar';
import { groupItems, useListState } from '@/components/entity/useListState';
import { EventGallery, EventTimeline, eventColumns } from '@/components/events/EventViews';
import { EntityTable } from '@/components/entity/EntityTable';
import { TableControls } from '@/components/entity/TableControls';
import { useTableState } from '@/components/entity/useTableState';
import { useEditorsColumn } from '@/components/entity/useEditorsColumn';
import { plural, universePath } from '@/utils/universe';
import styles from '../ListPage.module.scss';
import { useNarrativeReferences } from '../stories/useNarrativeReferences';
import { usePermissions } from '@/auth/auth';

const VIEWS = ['timeline', 'gallery', 'table'];

/** Événements d'un univers : frise chronologique (ordre réglable), galerie ou tableau. */
export default function EventsPage() {
  const { canCreate } = usePermissions();
  const { universe } = useOutletContext();
  const { events, options, modules } = useNarrativeReferences(universe);
  const criteria = useMemo(
    () =>
      CRITERIA.filter((c) => !c.module || modules[c.module])
        .map((c) => ({ ...c, options: c.options || options[c.resource] || [] }))
        .filter((c) => c.options.length > 0),
    [options, modules],
  );
  const list = useListState(events.data || [], { sorts: SORTS, criteria, searchText, views: VIEWS, storageKey: 'almanach:events-view' });
  const { state, actions, results } = list;
  const reorder = useReorderEntity('events', universe.id);
  const toast = useToast();

  const linkTo = (e) => universePath(universe, `evenements/${e.id}`);
  const editorsColumn = useEditorsColumn('event');
  const columns = [...eventColumns({ linkTo, showGroups: modules.groups }), editorsColumn];
  const table = useTableState({ storageKey: 'almanach:events-columns', columns, items: results, entityType: 'event' });
  const groupCriterion = criteria.find((c) => c.key === state.groupBy);
  const fitScreen = state.view === 'table' && !groupCriterion && results.length > 0;
  // L'ordre se règle sur la frise complète, dans l'ordre chronologique, sans recherche ni filtre
  const canReorder = state.sort === 'chrono' && state.dir === 'asc' && !state.q && !list.activeFilterCount && !groupCriterion;

  const move = (index, delta) => {
    const ids = results.map((e) => e.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids, { onError: (err) => toast.error(err.message) });
  };

  const renderView = (items) => {
    if (state.view === 'table') {
      return <EntityTable items={items} columns={columns} linkTo={linkTo} sort={{ key: state.sort, dir: state.dir }} onSort={actions.sortBy} fill={fitScreen} table={table} />;
    }
    if (state.view === 'gallery') return <EventGallery events={items} linkTo={linkTo} />;
    return <EventTimeline events={items} linkTo={linkTo} onMove={canCreate && canReorder && !groupCriterion ? move : undefined} moving={reorder.isPending} />;
  };

  const newButton = canCreate && (
    <Button as={Link} to={universePath(universe, 'evenements/nouveau')} variant="primary" icon={Plus}>
      Nouvel événement
    </Button>
  );
  const total = events.data?.length ?? 0;

  return (
    <main className={cx(styles.main, fitScreen && styles.fitScreen)}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Événements</h1>
          {events.data && (
            <p className={styles.count} aria-live="polite">
              {results.length === total ? plural(total, 'événement') : `${results.length} sur ${plural(total, 'événement')}`}
            </p>
          )}
        </div>
        {newButton}
      </header>

      {events.isPending ? (
        <Spinner label="Chargement des événements…" />
      ) : events.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger les événements" action={<Button onClick={() => events.refetch()}>Réessayer</Button>}>
          {events.error.message}
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucun événement pour l’instant" action={newButton}>
          Batailles, couronnements, rencontres… Les moments clés de « {universe.name} », reliés aux épisodes de vos histoires.
        </EmptyState>
      ) : (
        <>
          <ListToolbar
            state={state}
            actions={actions}
            criteria={criteria}
            activeFilterCount={list.activeFilterCount}
            sorts={SORTS}
            views={VIEWS}
            searchPlaceholder="Rechercher par nom, date, personnage, lieu…"
            searchLabel="Rechercher un événement"
          />
          {state.view === 'timeline' && !canReorder && results.length > 1 && (
            <p className={styles.hint}>Pour régler l’ordre de la frise, triez par chronologie (croissante) sans recherche ni filtre.</p>
          )}
          <div className={styles.content}>
            {state.view === 'table' && results.length > 0 && (
              <TableControls table={table} columns={columns} criteria={criteria} resource="events" noun={['événement', 'événements']} />
            )}
            {results.length === 0 ? (
              <div className={styles.noResult}>
                <p>Aucun événement ne correspond à ces critères.</p>
                <Button onClick={actions.clearFilters}>Effacer la recherche et les filtres</Button>
              </div>
            ) : groupCriterion ? (
              <GroupedSections groups={groupItems(results, groupCriterion, groupCriterion.options)} render={renderView} />
            ) : (
              renderView(results)
            )}
          </div>
        </>
      )}
    </main>
  );
}
