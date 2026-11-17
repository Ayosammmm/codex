import { Link, useOutletContext } from 'react-router';
import { CircleAlert, PawPrint, Plus } from '@/components/ui/icons';
import { creatureSorts, searchText } from '@/config/creatures';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { GroupedSections } from '@/components/entity/GroupedSections';
import { ListToolbar } from '@/components/entity/ListToolbar';
import { groupItems, useListState } from '@/components/entity/useListState';
import { CreatureGallery, creatureColumns } from '@/components/creatures/CreatureViews';
import { EntityTable } from '@/components/entity/EntityTable';
import { TableControls } from '@/components/entity/TableControls';
import { useTableState } from '@/components/entity/useTableState';
import { useEditorsColumn } from '@/components/entity/useEditorsColumn';
import { useModFieldColumns } from '@/mods/useModFieldColumns';
import { useCollectionsColumn } from '@/components/collections/useCollectionsColumn';
import { plural, universePath } from '@/utils/universe';
import styles from '../ListPage.module.scss';
import { useCreatureReferences } from './useCreatureReferences';
import { usePermissions } from '@/auth/auth';

const VIEWS = ['gallery', 'table'];

/** Bestiaire d'un univers : recherche, tri, filtres, regroupement ; galerie ou tableau. */
export default function CreaturesPage() {
  const { canCreate } = usePermissions();
  const { universe } = useOutletContext();
  const { creatures, criteria, modules } = useCreatureReferences(universe);
  const sorts = creatureSorts(modules.ranks);
  const list = useListState(creatures.data || [], { sorts, criteria, searchText, views: VIEWS, storageKey: 'almanach:creatures-view', entityType: 'creature' });
  const { state, actions, results } = list;

  const linkTo = (c) => universePath(universe, `bestiaire/${c.id}`);
  const editorsColumn = useEditorsColumn('creature');
  const collectionsColumn = useCollectionsColumn('creature');
  const modColumns = useModFieldColumns('creature');
  const columns = [...creatureColumns({ linkTo, showRanks: modules.ranks }), ...modColumns, collectionsColumn, editorsColumn].filter(Boolean);
  const table = useTableState({ storageKey: 'almanach:creatures-columns', columns, items: results, entityType: 'creature' });
  const groupCriterion = criteria.find((c) => c.key === state.groupBy);
  // Tableau seul : la page tient dans l'écran et seul le tableau défile
  const fitScreen = state.view === 'table' && !groupCriterion && results.length > 0;

  const renderView = (items) => {
    if (state.view === 'table') {
      return <EntityTable items={items} columns={columns} linkTo={linkTo} sort={{ key: state.sort, dir: state.dir }} onSort={actions.sortBy} fill={fitScreen} table={table} />;
    }
    return <CreatureGallery showRanks={modules.ranks} creatures={items} linkTo={linkTo} />;
  };

  const newButton = canCreate && (
    <Button as={Link} to={universePath(universe, 'bestiaire/nouveau')} variant="primary" icon={Plus}>
      Nouvelle créature
    </Button>
  );
  const total = creatures.data?.length ?? 0;

  return (
    <main className={cx(styles.main, fitScreen && styles.fitScreen)}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Bestiaire</h1>
          {creatures.data && (
            <p className={styles.count} aria-live="polite">
              {results.length === total ? plural(total, 'créature') : `${results.length} sur ${plural(total, 'créature')}`}
            </p>
          )}
        </div>
        {newButton}
      </header>

      {creatures.isPending ? (
        <Spinner label="Chargement du bestiaire…" />
      ) : creatures.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger le bestiaire" action={<Button onClick={() => creatures.refetch()}>Réessayer</Button>}>
          {creatures.error.message}
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState icon={PawPrint} title="Aucune créature pour l’instant" action={newButton}>
          Bêtes, monstres, esprits… Créez la première créature de « {universe.name} ».
        </EmptyState>
      ) : (
        <>
          <ListToolbar
            state={state}
            actions={actions}
            criteria={criteria}
            activeFilterCount={list.activeFilterCount}
            sorts={sorts}
            views={VIEWS}
            searchPlaceholder="Rechercher par nom, rang, habitat…"
            searchLabel="Rechercher une créature"
          />
          <div className={styles.content}>
            {state.view === 'table' && results.length > 0 && (
              <TableControls table={table} columns={columns} criteria={criteria} resource="creatures" noun={['créature', 'créatures', 'f']} />
            )}
            {results.length === 0 ? (
              <div className={styles.noResult}>
                <p>Aucune créature ne correspond à ces critères.</p>
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
