import { Link, useOutletContext } from 'react-router';
import { CircleAlert, Dna } from 'lucide-react';
import { Plus } from '@/components/ui/icons';
import { SORTS, searchText } from '@/config/species';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { GroupedSections } from '@/components/entity/GroupedSections';
import { ListToolbar } from '@/components/entity/ListToolbar';
import { groupItems, useListState } from '@/components/entity/useListState';
import { SpeciesGallery, specieColumns, SpeciesTree } from '@/components/species/SpeciesViews';
import { EntityTable } from '@/components/entity/EntityTable';
import { TableControls } from '@/components/entity/TableControls';
import { useTableState } from '@/components/entity/useTableState';
import { useEditorsColumn } from '@/components/entity/useEditorsColumn';
import { plural, universePath } from '@/utils/universe';
import styles from '../ListPage.module.scss';
import { useSpeciesReferences } from './useSpeciesReferences';
import { usePermissions } from '@/auth/auth';

const VIEWS = ['gallery', 'tree', 'table'];

/** Archive des espèces d'un univers : recherche, tri, filtres, regroupement ; galerie, arborescence ou tableau. */
export default function SpeciesPage() {
  const { canCreate } = usePermissions();
  const { universe } = useOutletContext();
  const { species, criteria } = useSpeciesReferences(universe);
  const list = useListState(species.data || [], { sorts: SORTS, criteria, searchText, views: VIEWS, storageKey: 'almanach:species-view' });
  const { state, actions, results } = list;

  const linkTo = (s) => universePath(universe, `especes/${s.id}`);
  const editorsColumn = useEditorsColumn('specie');
  const columns = [...specieColumns({ linkTo }), editorsColumn];
  const table = useTableState({ storageKey: 'almanach:species-columns', columns, items: results, entityType: 'specie' });
  const groupCriterion = criteria.find((c) => c.key === state.groupBy);
  // Tableau seul : la page tient dans l'écran et seul le tableau défile
  const fitScreen = state.view === 'table' && !groupCriterion && results.length > 0;

  const renderView = (items) => {
    if (state.view === 'table') {
      return <EntityTable items={items} columns={columns} linkTo={linkTo} sort={{ key: state.sort, dir: state.dir }} onSort={actions.sortBy} fill={fitScreen} table={table} />;
    }
    if (state.view === 'tree') return <SpeciesTree species={items} linkTo={linkTo} />;
    return <SpeciesGallery species={items} linkTo={linkTo} />;
  };

  const newButton = canCreate && (
    <Button as={Link} to={universePath(universe, 'especes/nouveau')} variant="primary" icon={Plus}>
      Nouvelle espèce
    </Button>
  );
  const total = species.data?.length ?? 0;

  return (
    <main className={cx(styles.main, fitScreen && styles.fitScreen)}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Espèces</h1>
          {species.data && (
            <p className={styles.count} aria-live="polite">
              {results.length === total ? plural(total, 'espèce') : `${results.length} sur ${plural(total, 'espèce')}`}
            </p>
          )}
        </div>
        {newButton}
      </header>

      {species.isPending ? (
        <Spinner label="Chargement des espèces…" />
      ) : species.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger les espèces" action={<Button onClick={() => species.refetch()}>Réessayer</Button>}>
          {species.error.message}
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState icon={Dna} title="Aucune espèce pour l’instant" action={newButton}>
          Humains, elfes, dragons… Créez la première espèce de « {universe.name} ».
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
            searchPlaceholder="Rechercher par nom, espèce parente, personnage…"
            searchLabel="Rechercher une espèce"
          />
          <div className={styles.content}>
            {state.view === 'table' && results.length > 0 && (
              <TableControls table={table} columns={columns} criteria={criteria} resource="species" noun={['espèce', 'espèces', 'f']} />
            )}
            {results.length === 0 ? (
              <div className={styles.noResult}>
                <p>Aucune espèce ne correspond à ces critères.</p>
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
