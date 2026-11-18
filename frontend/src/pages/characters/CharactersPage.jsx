import { Link, useOutletContext } from 'react-router';
import { CircleAlert, UserPlus, Users } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { ListToolbar } from '@/components/entity/ListToolbar';
import { CharacterCards, CharacterGallery, characterColumns } from '@/components/characters/CharacterViews';
import { EntityTable } from '@/components/entity/EntityTable';
import { TableControls } from '@/components/entity/TableControls';
import { useTableState } from '@/components/entity/useTableState';
import { useEditorsColumn } from '@/components/entity/useEditorsColumn';
import { useModFieldColumns } from '@/mods/useModFieldColumns';
import { useCollectionsColumn } from '@/components/collections/useCollectionsColumn';
import { GroupedSections } from '@/components/entity/GroupedSections';
import { characterSorts, groupCharacters, useCharacterList } from '@/components/characters/useCharacterList';
import { plural, universePath } from '@/utils/universe';
import { useCharacterReferences } from './useCharacterReferences';
import styles from '../ListPage.module.scss';
import { usePermissions } from '@/auth/auth';

/** Liste des personnages d'un univers : recherche, tri, filtres, regroupement, 3 vues. */
export default function CharactersPage() {
  const { canCreate } = usePermissions();
  const { universe } = useOutletContext();
  const { characters, criteria, modules } = useCharacterReferences(universe);
  const sorts = characterSorts(modules);
  const list = useCharacterList(characters.data || [], criteria, sorts);
  const { state, actions, results } = list;

  const linkTo = (c) => universePath(universe, `personnages/${c.id}`);
  const show = { groups: modules.groups, species: modules.species, ranks: modules.ranks };
  const editorsColumn = useEditorsColumn('character');
  const collectionsColumn = useCollectionsColumn('character');
  const modColumns = useModFieldColumns('character');
  const columns = [...characterColumns({ linkTo, show }), ...modColumns, collectionsColumn, editorsColumn].filter(Boolean);
  const table = useTableState({ storageKey: 'codex:characters-columns', columns, items: results, entityType: 'character' });
  const newButton = canCreate && (
    <Button as={Link} to={universePath(universe, 'personnages/nouveau')} variant="primary" icon={UserPlus}>
      Nouveau personnage
    </Button>
  );

  const groupCriterion = criteria.find((c) => c.key === state.groupBy);
  // Tableau seul : la page tient dans l'écran et seul le tableau défile
  const fitScreen = state.view === 'table' && !groupCriterion && results.length > 0;

  const renderView = (items) => {
    if (state.view === 'table') {
      return <EntityTable items={items} columns={columns} linkTo={linkTo} sort={{ key: state.sort, dir: state.dir }} onSort={actions.sortBy} fill={fitScreen} table={table} />;
    }
    if (state.view === 'cards') return <CharacterCards characters={items} linkTo={linkTo} show={show} />;
    return <CharacterGallery characters={items} linkTo={linkTo} />;
  };

  const total = characters.data?.length ?? 0;

  return (
    <main className={cx(styles.main, fitScreen && styles.fitScreen)}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Personnages</h1>
          {characters.data && (
            <p className={styles.count} aria-live="polite">
              {results.length === total ? plural(total, 'personnage') : `${results.length} sur ${plural(total, 'personnage')}`}
            </p>
          )}
        </div>
        {newButton}
      </header>

      {characters.isPending ? (
        <Spinner label="Chargement des personnages…" />
      ) : characters.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger les personnages" action={<Button onClick={() => characters.refetch()}>Réessayer</Button>}>
          {characters.error.message}
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState icon={Users} title="Aucun personnage pour l’instant" action={newButton}>
          Créez le premier habitant de « {universe.name} ».
        </EmptyState>
      ) : (
        <>
          <ListToolbar
            state={state}
            actions={actions}
            criteria={criteria}
            activeFilterCount={list.activeFilterCount}
            sorts={sorts}
            views={['gallery', 'cards', 'table']}
            searchPlaceholder="Rechercher par nom, titre, groupe…"
            searchLabel="Rechercher un personnage"
          />
          <div className={styles.content}>
            {state.view === 'table' && results.length > 0 && (
              <TableControls table={table} columns={columns} criteria={criteria} resource="characters" noun={['personnage', 'personnages']} />
            )}
            {results.length === 0 ? (
              <div className={styles.noResult}>
                <p>Aucun personnage ne correspond à ces critères.</p>
                <Button onClick={actions.clearFilters}>Effacer la recherche et les filtres</Button>
              </div>
            ) : groupCriterion ? (
              <GroupedSections groups={groupCharacters(results, groupCriterion, groupCriterion.options)} render={renderView} />
            ) : (
              renderView(results)
            )}
          </div>
        </>
      )}
    </main>
  );
}
