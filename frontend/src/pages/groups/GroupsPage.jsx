import { Link, useOutletContext } from 'react-router';
import { Building2, CircleAlert, Plus } from '@/components/ui/icons';
import { SORTS, searchText } from '@/config/groups';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { GroupedSections } from '@/components/entity/GroupedSections';
import { ListToolbar } from '@/components/entity/ListToolbar';
import { groupItems, useListState } from '@/components/entity/useListState';
import { GroupGallery, groupColumns } from '@/components/groups/GroupViews';
import { EntityTable } from '@/components/entity/EntityTable';
import { TableControls } from '@/components/entity/TableControls';
import { useTableState } from '@/components/entity/useTableState';
import { useEditorsColumn } from '@/components/entity/useEditorsColumn';
import { plural, universePath } from '@/utils/universe';
import styles from '../ListPage.module.scss';
import { useGroupReferences } from './useGroupReferences';
import { usePermissions } from '@/auth/auth';

const VIEWS = ['gallery', 'table'];

/** Archive des groupes d'un univers : recherche, tri, filtres, regroupement, galerie ou tableau. */
export default function GroupsPage() {
  const { canCreate } = usePermissions();
  const { universe } = useOutletContext();
  const { groups, criteria } = useGroupReferences(universe);
  const list = useListState(groups.data || [], { sorts: SORTS, criteria, searchText, views: VIEWS, storageKey: 'almanach:groups-view' });
  const { state, actions, results } = list;

  const linkTo = (g) => universePath(universe, `groupes/${g.id}`);
  const editorsColumn = useEditorsColumn('group');
  const columns = [...groupColumns({ linkTo }), editorsColumn];
  const table = useTableState({ storageKey: 'almanach:groups-columns', columns, items: results, entityType: 'group' });
  const groupCriterion = criteria.find((c) => c.key === state.groupBy);
  // Tableau seul : la page tient dans l'écran et seul le tableau défile
  const fitScreen = state.view === 'table' && !groupCriterion && results.length > 0;

  const renderView = (items) =>
    state.view === 'table' ? (
      <EntityTable items={items} columns={columns} linkTo={linkTo} sort={{ key: state.sort, dir: state.dir }} onSort={actions.sortBy} fill={fitScreen} table={table} />
    ) : (
      <GroupGallery groups={items} linkTo={linkTo} />
    );

  const newButton = canCreate && (
    <Button as={Link} to={universePath(universe, 'groupes/nouveau')} variant="primary" icon={Plus}>
      Nouveau groupe
    </Button>
  );
  const total = groups.data?.length ?? 0;

  return (
    <main className={cx(styles.main, fitScreen && styles.fitScreen)}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Groupes</h1>
          {groups.data && (
            <p className={styles.count} aria-live="polite">
              {results.length === total ? plural(total, 'groupe') : `${results.length} sur ${plural(total, 'groupe')}`}
            </p>
          )}
        </div>
        {newButton}
      </header>

      {groups.isPending ? (
        <Spinner label="Chargement des groupes…" />
      ) : groups.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger les groupes" action={<Button onClick={() => groups.refetch()}>Réessayer</Button>}>
          {groups.error.message}
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState icon={Building2} title="Aucun groupe pour l’instant" action={newButton}>
          Familles, guildes, équipages… Créez le premier groupe de « {universe.name} ».
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
            searchPlaceholder="Rechercher par nom, type, membre…"
            searchLabel="Rechercher un groupe"
          />
          <div className={styles.content}>
            {state.view === 'table' && results.length > 0 && (
              <TableControls table={table} columns={columns} criteria={criteria} resource="groups" noun={['groupe', 'groupes']} />
            )}
            {results.length === 0 ? (
              <div className={styles.noResult}>
                <p>Aucun groupe ne correspond à ces critères.</p>
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
