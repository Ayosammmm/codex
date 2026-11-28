import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useLocation } from 'react-router';
import { ArrowLeft, CircleAlert, Pencil, Plus, PowerOff, Trash2 } from '@/components/ui/icons';
import { useDeleteEntity, useEntity, useSaveEntity } from '@/api/queries';
import { usePermissions } from '@/auth/auth';
import { Forbidden } from '@/auth/RequireAuth';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { CollectionsSection } from '@/components/collections/CollectionsSection';
import { useCollectionFilter } from '@/components/collections/collectionFilter';
import { useCollectionsColumn } from '@/components/collections/useCollectionsColumn';
import { EditorsSection } from '@/components/entity/EditorsSection';
import { EntityTable } from '@/components/entity/EntityTable';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { GroupedSections } from '@/components/entity/GroupedSections';
import { ListToolbar } from '@/components/entity/ListToolbar';
import { TableControls } from '@/components/entity/TableControls';
import { entityAncestors } from '@/components/entity/tree';
import { useEditorsColumn } from '@/components/entity/useEditorsColumn';
import { useImagePreview } from '@/components/entity/useImagePreview';
import { groupItems, useListState } from '@/components/entity/useListState';
import { useTableState } from '@/components/entity/useTableState';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { uploadUrl } from '@/api/client';
import { plainText, plural, universePath } from '@/utils/universe';
import page from '@/pages/Page.module.scss';
import listPage from '@/pages/ListPage.module.scss';
import { CustomDangerZone, CustomEntityForm } from './CustomEntityForm';
import { CustomEntitySheet } from './CustomEntitySheet';
import { CustomGallery, CustomTree, childCount, customColumns } from './CustomEntityViews';
import { ModPageHost } from './ModPageHost';
import { fieldCriteria, fieldSorts, valueText } from './modFields';
import { useUniverseMods } from './modsContext';
import { typeNoun } from './nouns';
import { useCustomEntityForm } from './useCustomEntityForm';
import { TITLE_LEVEL, usePageTitle } from '@/utils/usePageTitle';

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byText = (get) => (a, b) => collator.compare(get(a) || '￿', get(b) || '￿');
const valuesOf = (e) => e.data;

/** Résout le type ou la page de mod de l'URL (/mods/:modId/:modPath) ; message si indisponible. */
function useModSection() {
  const { universe } = useOutletContext();
  const { modId, modPath } = useParams();
  const { ready, findTypeByPath, findPageByPath, installed } = useUniverseMods();
  const type = findTypeByPath(modId, modPath);
  const modPage = type ? null : findPageByPath(modId, modPath);
  usePageTitle(type?.plural || modPage?.label, TITLE_LEVEL.section);
  let fallback = null;
  if (!ready) fallback = <Spinner label="Chargement des mods…" />;
  else if (!type && !modPage) {
    const mod = installed.find((m) => m.id === modId);
    fallback = (
      <main className={page.narrow}>
        <EmptyState
          icon={mod ? PowerOff : CircleAlert}
          title={mod ? 'Mod désactivé' : 'Page introuvable'}
          action={<Button as={Link} to={universePath(universe, mod ? 'parametres#mods' : '')} variant="primary">{mod ? 'Gérer les mods' : 'Accueil de l’univers'}</Button>}
        >
          {mod
            ? `Activez le mod « ${mod.name} » dans les paramètres de l’univers pour accéder à cette page. Les données existantes sont conservées.`
            : 'Ce mod n’est pas installé, ou cette page n’existe pas.'}
        </EmptyState>
      </main>
    );
  }
  return { universe, type, modPage, fallback };
}

/** /mods/:modId/:modPath : archive d'un type d'entité, ou page de code du mod. */
export function ModSectionPage() {
  const { universe, type, modPage, fallback } = useModSection();
  if (fallback) return fallback;
  if (modPage) return <ModPageHost key={modPage.id} universe={universe} modPage={modPage} />;
  return <CustomEntitiesList key={type.id} universe={universe} type={type} />;
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

function CustomEntitiesList({ universe, type }) {
  const { canCreate } = usePermissions();
  const { customEntities, customLoading } = useUniverseMods();
  const items = customEntities.filter((e) => e.modId === type.modId && e.typeKey === type.key);
  const noun = typeNoun(type);

  const sorts = [
    { key: 'name', label: 'Nom', compare: byText((e) => e.name) },
    ...(type.hierarchy ? [
      { key: 'parent', label: 'Parent', compare: byText((e) => e.parent?.name) },
      { key: 'children', label: 'Nombre de descendants', compare: (a, b) => childCount(b) - childCount(a) },
    ] : []),
    ...fieldSorts(type.fields, valuesOf),
  ];
  const criteria = [
    type.hierarchy && {
      key: 'parent', label: 'Parent', noneLabel: 'Sans parent',
      values: (e) => [e.parentId],
      options: items.map((e) => ({ value: e.id, label: e.name })).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    },
    ...fieldCriteria(type.fields, valuesOf),
  ].filter((c) => c && c.options.length > 0);
  const searchText = (e) => [e.name, e.parent?.name, plainText(e.description), ...type.fields.map((f) => valueText(f, e.data?.[f.key]))].join(' ');
  const views = type.hierarchy ? ['gallery', 'tree', 'table'] : ['gallery', 'table'];

  const list = useListState(items, { sorts, criteria, searchText, views, storageKey: `codex:custom-view:${type.id}`, entityType: 'custom' });
  const { state, actions, results } = list;
  const linkTo = (e) => universePath(universe, `${type.basePath}/${e.id}`);
  const editorsColumn = useEditorsColumn('custom');
  const collectionsColumn = useCollectionsColumn('custom');
  const columns = [...customColumns({ type, linkTo }), collectionsColumn, editorsColumn].filter(Boolean);
  const table = useTableState({ storageKey: `codex:custom-columns:${type.id}`, columns, items: results, entityType: 'custom' });
  const groupCriterion = criteria.find((c) => c.key === state.groupBy);
  const fitScreen = state.view === 'table' && !groupCriterion && results.length > 0;

  const renderView = (shown) => {
    if (state.view === 'table') {
      return <EntityTable items={shown} columns={columns} linkTo={linkTo} sort={{ key: state.sort, dir: state.dir }} onSort={actions.sortBy} fill={fitScreen} table={table} />;
    }
    if (state.view === 'tree') return <CustomTree type={type} items={shown} linkTo={linkTo} />;
    return <CustomGallery type={type} items={shown} linkTo={linkTo} />;
  };

  const newButton = canCreate && (
    <Button as={Link} to={universePath(universe, `${type.basePath}/nouveau`)} variant="primary" icon={Plus}>
      {noun.new}
    </Button>
  );
  const pluralLower = type.plural.toLowerCase();
  const singularLower = type.label.toLowerCase();

  return (
    <main className={cx(listPage.main, fitScreen && listPage.fitScreen)}>
      <header className={listPage.header}>
        <div>
          <h1 className={listPage.title}>{type.plural}</h1>
          {!customLoading && (
            <p className={listPage.count} aria-live="polite">
              {results.length === items.length
                ? plural(items.length, singularLower, pluralLower)
                : `${results.length} sur ${plural(items.length, singularLower, pluralLower)}`}
            </p>
          )}
        </div>
        {newButton}
      </header>

      {customLoading ? (
        <Spinner label="Chargement…" />
      ) : items.length === 0 ? (
        <EmptyState icon={type.Icon} title={`Aucun${type.feminine ? 'e' : ''} ${singularLower} pour l’instant`} action={newButton}>
          {type.description || `Créez la première fiche de « ${universe.name} ».`}
        </EmptyState>
      ) : (
        <>
          <ListToolbar
            state={state}
            actions={actions}
            criteria={criteria}
            activeFilterCount={list.activeFilterCount}
            sorts={sorts}
            views={views}
            searchPlaceholder="Rechercher…"
            searchLabel={`Rechercher : ${pluralLower}`}
          />
          <div className={listPage.content}>
            {state.view === 'table' && results.length > 0 && (
              <TableControls table={table} columns={columns} criteria={criteria} resource="customEntities" noun={[singularLower, pluralLower, ...(type.feminine ? ['f'] : [])]} />
            )}
            {results.length === 0 ? (
              <div className={listPage.noResult}>
                <p>Aucune fiche ne correspond à ces critères.</p>
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

// ---------------------------------------------------------------------------
// Fiche
// ---------------------------------------------------------------------------

/** Charge l'entité de l'URL (:entityId) et vérifie qu'elle est bien du type de la page. */
function CustomEntityLoader({ universe, type, children }) {
  const { entityId } = useParams();
  const { data: entity, isPending, isPlaceholderData, error } = useEntity('customEntities', entityId, { universeId: universe.id });
  usePageTitle(entity?.name);
  // Édition : le formulaire attend la fiche complète (voir EntityLoader)
  const editing = useLocation().pathname.endsWith('/modifier');
  if (isPending || (editing && isPlaceholderData)) return <Spinner label="Chargement de la fiche…" />;
  const wrongType = entity && (entity.modId !== type.modId || entity.typeKey !== type.key);
  if (error || !entity || wrongType) {
    const notFound = wrongType || error?.status === 404;
    return (
      <main className={page.narrow}>
        <EmptyState
          icon={CircleAlert}
          title={notFound ? 'Fiche introuvable' : 'Impossible de charger la fiche'}
          action={<Button as={Link} to={universePath(universe, type.basePath)} variant="primary">{type.plural}</Button>}
        >
          {notFound ? 'Cette fiche n’existe pas ou a été supprimée.' : error?.message}
        </EmptyState>
      </main>
    );
  }
  return children(entity);
}

/** /mods/:modId/:modPath/:entityId */
export function CustomEntityPage() {
  const { universe, type, modPage, fallback } = useModSection();
  if (fallback) return fallback;
  if (modPage) return <ModPageHost key={modPage.id} universe={universe} modPage={modPage} />;
  return (
    <CustomEntityLoader universe={universe} type={type}>
      {(entity) => <CustomEntityView key={entity.id} universe={universe} type={type} entity={entity} />}
    </CustomEntityLoader>
  );
}

function CustomEntityView({ universe, type, entity }) {
  const { canEdit } = usePermissions();
  const { customEntities } = useUniverseMods();
  const siblings = customEntities.filter((e) => e.modId === type.modId && e.typeKey === type.key);
  const children = siblings.filter((e) => e.parentId === entity.id).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <EntityThemeZone tinted universe={universe} colors={entity.colors} background={uploadUrl(entity.background)} backgroundColor={entity.backgroundColor}>
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to={universePath(universe, type.basePath)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {type.plural}
        </Link>
        <div className={page.belowBack}>
          <CustomEntitySheet
            universe={universe}
            type={type}
            entity={entity}
            ancestors={type.hierarchy ? entityAncestors(entity, siblings) : []}
            children={children}
            actions={
              canEdit('custom', entity.id) && (
                <Button as={Link} to={universePath(universe, `${type.basePath}/${entity.id}/modifier`)} variant="primary" icon={Pencil}>
                  Modifier
                </Button>
              )
            }
          />
        </div>
      </main>
    </EntityThemeZone>
  );
}

// ---------------------------------------------------------------------------
// Édition
// ---------------------------------------------------------------------------

/** /mods/:modId/:modPath/nouveau et /mods/:modId/:modPath/:entityId/modifier */
export function CustomEntityEditPage() {
  const { universe, type, fallback } = useModSection();
  const { entityId } = useParams();
  const { canCreate, canEdit } = usePermissions();
  if (fallback) return fallback;
  if (!type) return <Forbidden backTo={universePath(universe)}>Cette page ne se modifie pas.</Forbidden>;
  if (!entityId) {
    return canCreate ? <CustomEntityEditor key="new" universe={universe} type={type} entity={null} /> : <Forbidden backTo={universePath(universe, type.basePath)} />;
  }
  return (
    <CustomEntityLoader universe={universe} type={type}>
      {(entity) =>
        canEdit('custom', entity.id) ? (
          <CustomEntityEditor key={entity.id} universe={universe} type={type} entity={entity} />
        ) : (
          <Forbidden backTo={universePath(universe, `${type.basePath}/${entity.id}`)} />
        )
      }
    </CustomEntityLoader>
  );
}

function CustomEntityEditor({ universe, type, entity }) {
  const isNew = !entity;
  const listPath = universePath(universe, type.basePath);
  const sheetPath = (id) => universePath(universe, `${type.basePath}/${id}`);
  const navigate = useNavigate();
  const toast = useToast();
  const noun = typeNoun(type);
  const state = useCustomEntityForm(entity, type);
  const { customEntities } = useUniverseMods();
  const siblings = customEntities.filter((e) => e.modId === type.modId && e.typeKey === type.key);
  const save = useSaveEntity('customEntities');
  const remove = useDeleteEntity('customEntities');
  const { enabled: collectionsOn } = useCollectionFilter();
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const guard = useUnsavedChangesGuard(state.isDirty && !save.isPending);

  const submit = (e) => {
    e.preventDefault();
    const found = state.validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById('identite')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const { values, images } = state.toSubmit(universe.id);
    save.mutate(
      { id: entity?.id, values, images },
      {
        onSuccess: (saved) => {
          toast.success(isNew ? `« ${saved.name} » a été ${noun.done('créé')}.` : 'Fiche enregistrée.');
          if (isNew) {
            guard.allowNextNavigation();
            navigate(`${sheetPath(saved.id)}/modifier`, { replace: true });
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const onDelete = () =>
    remove.mutate(entity.id, {
      onSuccess: () => {
        toast.success(`« ${entity.name} » a été ${noun.done('supprimé')}.`);
        guard.allowNextNavigation();
        navigate(listPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  const backgroundImage = useImagePreview(entity?.background, state.images.background);
  const { backgroundMode, backgroundColor, colors } = state.form;

  return (
    <EntityThemeZone
      universe={universe}
      colors={colors}
      background={backgroundMode === 'image' ? backgroundImage : null}
      backgroundColor={backgroundMode === 'color' ? backgroundColor : null}
    >
      <main className={page.main}>
        <Link to={isNew ? listPath : sheetPath(entity.id)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? type.plural : 'Retour à la fiche'}
        </Link>
        <h1 className={page.title}>{isNew ? noun.new : entity.name}</h1>
        <p className={page.lead}>{isNew ? `Ajouter une fiche à « ${universe.name} ».` : `Modifier la fiche (${type.label.toLowerCase()}).`}</p>

        <form onSubmit={submit} noValidate>
          <CustomEntityForm
            type={type}
            entity={entity}
            state={state}
            siblings={siblings}
            errors={errors}
            collections={!isNew && collectionsOn && <CollectionsSection universe={universe} entityType="custom" entityId={entity.id} />}
            editors={!isNew && <EditorsSection entityType="custom" entityId={entity.id} subject={noun.this} />}
            dangerZone={!isNew && <CustomDangerZone type={type} onDelete={<Button variant="danger" icon={Trash2} onClick={() => setConfirmDelete(true)}>Supprimer</Button>} />}
          />

          <FormActionBar visible={isNew || state.isDirty || save.isPending} message={!isNew && 'Modifications non enregistrées'}>
            <Button variant="ghost" onClick={() => (isNew ? navigate(listPath) : state.reset())} disabled={save.isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending}>
              {isNew ? 'Créer la fiche' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title={`Supprimer ${noun.this} ?`}
            description={`« ${entity.name} », ses images et son album photo seront supprimés définitivement.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={remove.isPending}>Annuler</Button>
                <Button variant="danger" onClick={onDelete} loading={remove.isPending}>Supprimer définitivement</Button>
              </>
            }
          />
        )}
        {guard.dialog}
      </main>
    </EntityThemeZone>
  );
}
