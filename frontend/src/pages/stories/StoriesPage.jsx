import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router';
import { BookOpen, CircleAlert, Plus } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { GroupedSections } from '@/components/entity/GroupedSections';
import { ListToolbar } from '@/components/entity/ListToolbar';
import { groupItems, useListState } from '@/components/entity/useListState';
import { storyColumns, StoryGallery } from '@/components/stories/StoryViews';
import { EntityTable } from '@/components/entity/EntityTable';
import { TableControls } from '@/components/entity/TableControls';
import { useTableState } from '@/components/entity/useTableState';
import { useEditorsColumn } from '@/components/entity/useEditorsColumn';
import { useModFieldColumns } from '@/mods/useModFieldColumns';
import { useCollectionsColumn } from '@/components/collections/useCollectionsColumn';
import { plural, universePath } from '@/utils/universe';
import styles from '../ListPage.module.scss';
import { CRITERIA, SORTS, searchText } from '@/config/stories';
import { useNarrativeReferences } from './useNarrativeReferences';
import { usePermissions } from '@/auth/auth';

const VIEWS = ['gallery', 'table'];

/** Histoires d'un univers : recherche, tri, filtres, regroupement ; galerie ou tableau. */
export default function StoriesPage() {
  const { canCreate } = usePermissions();
  const { universe } = useOutletContext();
  const { stories, options } = useNarrativeReferences(universe);
  const criteria = useMemo(
    () => CRITERIA.map((c) => ({ ...c, options: options[c.resource] || [] })).filter((c) => c.options.length > 0),
    [options],
  );
  const list = useListState(stories.data || [], { sorts: SORTS, criteria, searchText, views: VIEWS, storageKey: 'codex:stories-view', entityType: 'story' });
  const { state, actions, results } = list;

  const linkTo = (s) => universePath(universe, `histoires/${s.id}`);
  const editorsColumn = useEditorsColumn('story');
  const collectionsColumn = useCollectionsColumn('story');
  const modColumns = useModFieldColumns('story');
  const columns = [...storyColumns({ linkTo }), ...modColumns, collectionsColumn, editorsColumn].filter(Boolean);
  const table = useTableState({ storageKey: 'codex:stories-columns', columns, items: results, entityType: 'story' });
  const groupCriterion = criteria.find((c) => c.key === state.groupBy);
  // Tableau seul : la page tient dans l'écran et seul le tableau défile
  const fitScreen = state.view === 'table' && !groupCriterion && results.length > 0;

  const renderView = (items) => {
    if (state.view === 'table') {
      return <EntityTable items={items} columns={columns} linkTo={linkTo} sort={{ key: state.sort, dir: state.dir }} onSort={actions.sortBy} fill={fitScreen} table={table} />;
    }
    return <StoryGallery stories={items} linkTo={linkTo} />;
  };

  const newButton = canCreate && (
    <Button as={Link} to={universePath(universe, 'histoires/nouveau')} variant="primary" icon={Plus}>
      Nouvelle histoire
    </Button>
  );
  const total = stories.data?.length ?? 0;

  return (
    <main className={cx(styles.main, fitScreen && styles.fitScreen)}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Histoires</h1>
          {stories.data && (
            <p className={styles.count} aria-live="polite">
              {results.length === total ? plural(total, 'histoire') : `${results.length} sur ${plural(total, 'histoire')}`}
            </p>
          )}
        </div>
        {newButton}
      </header>

      {stories.isPending ? (
        <Spinner label="Chargement des histoires…" />
      ) : stories.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger les histoires" action={<Button onClick={() => stories.refetch()}>Réessayer</Button>}>
          {stories.error.message}
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState icon={BookOpen} title="Aucune histoire pour l’instant" action={newButton}>
          Une quête, une saga, une intrigue… Créez la première histoire de « {universe.name} » et ses épisodes.
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
            searchPlaceholder="Rechercher par nom, épisode, personnage…"
            searchLabel="Rechercher une histoire"
          />
          <div className={styles.content}>
            {state.view === 'table' && results.length > 0 && (
              <TableControls table={table} columns={columns} criteria={criteria} resource="stories" noun={['histoire', 'histoires', 'f']} />
            )}
            {results.length === 0 ? (
              <div className={styles.noResult}>
                <p>Aucune histoire ne correspond à ces critères.</p>
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
