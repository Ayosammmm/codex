import { Link, useOutletContext } from 'react-router';
import { CircleAlert, MapPin } from 'lucide-react';
import { Plus } from '@/components/ui/icons';
import { SORTS, searchText } from '@/config/places';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { GroupedSections } from '@/components/entity/GroupedSections';
import { ListToolbar } from '@/components/entity/ListToolbar';
import { groupItems, useListState } from '@/components/entity/useListState';
import { MapExplorer } from '@/components/places/MapExplorer';
import { PlaceGallery, PlaceTree, PlacesTable } from '@/components/places/PlaceViews';
import { plural, universePath } from '@/utils/universe';
import styles from '../ListPage.module.scss';
import { usePlaceReferences } from './usePlaceReferences';
import { usePermissions } from '@/auth/auth';


/** Archive des lieux d'un univers : recherche, tri, filtres, regroupement ; galerie, arborescence ou tableau. */
export default function PlacesPage() {
  const { canCreate } = usePermissions();
  const { universe } = useOutletContext();
  const { places, criteria, modules } = usePlaceReferences(universe);
  // Vue « Carte » avec le module Carte
  const VIEWS = modules.map ? ['gallery', 'tree', 'map', 'table'] : ['gallery', 'tree', 'table'];
  const list = useListState(places.data || [], { sorts: SORTS, criteria, searchText, views: VIEWS, storageKey: 'almanach:places-view' });
  const { state, actions, results } = list;

  const linkTo = (p) => universePath(universe, `lieux/${p.id}`);
  const groupCriterion = criteria.find((c) => c.key === state.groupBy);
  // Tableau seul : la page tient dans l'écran et seul le tableau défile
  const fitScreen = state.view === 'table' && !groupCriterion && results.length > 0;

  const renderView = (items) => {
    if (state.view === 'table') {
      return (
        <PlacesTable
          places={items}
          linkTo={linkTo}
          sort={{ key: state.sort, dir: state.dir }}
          onSort={actions.sortBy}
          fill={fitScreen}
          showGroups={modules.groups}
        />
      );
    }
    if (state.view === 'tree') return <PlaceTree places={items} linkTo={linkTo} />;
    // La carte montre toute la hiérarchie (la recherche et les filtres ne s'y appliquent pas)
    if (state.view === 'map') return <MapExplorer universe={universe} places={places.data || []} linkTo={linkTo} />;
    return <PlaceGallery places={items} linkTo={linkTo} />;
  };

  const newButton = canCreate && (
    <Button as={Link} to={universePath(universe, 'lieux/nouveau')} variant="primary" icon={Plus}>
      Nouveau lieu
    </Button>
  );
  const total = places.data?.length ?? 0;

  return (
    <main className={cx(styles.main, fitScreen && styles.fitScreen)}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Lieux</h1>
          {places.data && (
            <p className={styles.count} aria-live="polite">
              {results.length === total ? plural(total, 'lieu', 'lieux') : `${results.length} sur ${plural(total, 'lieu', 'lieux')}`}
            </p>
          )}
        </div>
        {newButton}
      </header>

      {places.isPending ? (
        <Spinner label="Chargement des lieux…" />
      ) : places.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger les lieux" action={<Button onClick={() => places.refetch()}>Réessayer</Button>}>
          {places.error.message}
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState icon={MapPin} title="Aucun lieu pour l’instant" action={newButton}>
          Continents, villes, tavernes… Créez le premier lieu de « {universe.name} ».
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
            searchPlaceholder="Rechercher par nom, type, groupe…"
            searchLabel="Rechercher un lieu"
          />
          <div className={styles.content}>
            {results.length === 0 ? (
              <div className={styles.noResult}>
                <p>Aucun lieu ne correspond à ces critères.</p>
                <Button onClick={actions.clearFilters}>Effacer la recherche et les filtres</Button>
              </div>
            ) : groupCriterion && state.view !== 'map' ? (
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
