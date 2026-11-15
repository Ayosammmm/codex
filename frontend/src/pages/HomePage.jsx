import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CircleAlert, Library, Plus, Search, Upload } from '@/components/ui/icons';
import { useImportUniverse, useUniverses } from '@/api/queries';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { UniverseCard } from '@/components/universe/UniverseCard';
import { useUniverseActions } from '@/components/universe/useUniverseActions';
import { plainText, plural, universePath } from '@/utils/universe';
import styles from './HomePage.module.scss';
import { usePermissions } from '@/auth/auth';

export default function HomePage() {
  const { data: universes = [], isPending, error, refetch } = useUniverses();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const actions = useUniverseActions();
  const { isAdmin } = usePermissions();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return universes;
    return universes.filter((u) => `${u.name} ${plainText(u.description)}`.toLowerCase().includes(q));
  }, [universes, query]);

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>Vos univers</h1>
            <p className={styles.subtitle}>
              {isPending || error ? 'Encyclopédies de mondes fictifs… ou réels.' : universes.length ? plural(universes.length, 'univers', 'univers') : 'Aucun univers pour le moment.'}
            </p>
          </div>
          {isAdmin && (
            <div className={styles.actions}>
              <ImportButton />
              <Button as={Link} to="/nouvel-univers" variant="primary" icon={Plus}>
                Créer un univers
              </Button>
            </div>
          )}
        </div>

        {universes.length > 3 && (
          <div className={styles.search}>
            <Search aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un univers"
              aria-label="Rechercher un univers"
              className={styles.searchInput}
            />
          </div>
        )}

        <div className={styles.content}>
          {isPending ? (
            <Spinner label="Chargement des univers…" />
          ) : error ? (
            <EmptyState icon={CircleAlert} title="Impossible de charger les univers" action={<Button onClick={() => refetch()}>Réessayer</Button>}>
              {error.message} Vérifiez que le backend est démarré.
            </EmptyState>
          ) : universes.length === 0 ? (
            <EmptyState
              icon={Library}
              title="Commencez votre premier univers"
              action={isAdmin && <Button as={Link} to="/nouvel-univers" variant="primary" icon={Plus}>Créer un univers</Button>}
            >
              {isAdmin
                ? 'Un univers rassemble personnages, lieux, groupes et histoires, reliés entre eux. Vous pouvez aussi importer un univers exporté depuis Almanach.'
                : 'Un administrateur n’a pas encore créé d’univers.'}
            </EmptyState>
          ) : filtered.length === 0 ? (
            <p className={styles.noResult}>Aucun univers ne correspond à « {query} ».</p>
          ) : (
            <ul className={styles.grid}>
              {filtered.map((universe) => (
                <li key={universe.id}>
                  <UniverseCard
                      universe={universe}
                      actions={
                        isAdmin
                          ? {
                              settings: () => navigate(universePath(universe, 'parametres')),
                              duplicate: () => actions.duplicate(universe),
                              export: () => actions.export(universe),
                              remove: () => actions.remove(universe),
                            }
                          : { export: () => actions.export(universe) }
                      }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      {actions.dialogs}
    </>
  );
}

function ImportButton() {
  const inputRef = useRef(null);
  const importUniverse = useImportUniverse();
  const toast = useToast();

  const onFile = (file) => {
    if (!file) return;
    importUniverse.mutate(file, {
      onSuccess: (universe) => toast.success(`« ${universe.name} » a été importé.`),
      onError: (err) => toast.error(`Import impossible : ${err.message}`),
    });
  };

  return (
    <>
      <Button icon={Upload} loading={importUniverse.isPending} onClick={() => inputRef.current?.click()}>
        {importUniverse.isPending ? 'Import…' : 'Importer'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,.json,application/json"
        className={styles.hiddenInput}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}
