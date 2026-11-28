import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, BookOpen, CircleAlert, Puzzle, Trash2, Upload } from '@/components/ui/icons';
import { useInstallMod, useMods, useRemoveMod } from '@/api/mods';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import page from '@/pages/Page.module.scss';
import { ModContents } from './ModContents';
import { ModIcon } from './ModIcon';
import styles from './Mods.module.scss';
import { TITLE_LEVEL, usePageTitle } from '@/utils/usePageTitle';

const MANIFEST_EXAMPLE = `{
  "id": "artefacts",
  "name": "Artefacts",
  "version": "1.0.0",
  "description": "Objets de pouvoir et leurs porteurs.",
  "icon": "Gem",
  "entityTypes": [{
    "key": "artefact", "label": "Artefact", "plural": "Artefacts",
    "icon": "Gem", "hierarchy": false,
    "fields": [
      { "key": "rarete", "label": "Rareté", "type": "select", "card": true,
        "options": ["Commun", { "value": "legendaire", "label": "Légendaire", "color": "#d4a017" }] },
      { "key": "porteur", "label": "Porteur", "type": "ref", "entity": "character" },
      { "key": "puissance", "label": "Puissance", "type": "number", "min": 0, "max": 10 }
    ]
  }],
  "fields": {
    "character": [{ "key": "mana", "label": "Mana", "type": "number", "unit": "pts" }]
  },
  "pages": [{ "key": "forge", "label": "La forge", "icon": "Flame", "entry": "index.html" }]
}`;

/** Mods installés sur le serveur (/mods, super admins) : installation d'une archive ZIP, mise à jour, désinstallation. */
export default function ModsAdminPage() {
  const mods = useMods();
  const install = useInstallMod();
  const remove = useRemoveMod();
  const toast = useToast();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(null);

  usePageTitle('Mods', TITLE_LEVEL.page);

  const send = (file) => {
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      toast.error('Le mod doit être une archive .zip.');
      return;
    }
    install.mutate(file, {
      onSuccess: (mod) => toast.success(`Mod « ${mod.name} » v${mod.version} installé.`),
      onError: (err) => toast.error(err.message),
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    send(e.dataTransfer.files?.[0]);
  };

  const confirmRemove = () =>
    remove.mutate(removing.id, {
      onSuccess: () => {
        toast.success(`Mod « ${removing.name} » désinstallé.`);
        setRemoving(null);
      },
      onError: (err) => toast.error(err.message),
    });

  const list = mods.data || [];

  return (
    <>
      <AppHeader />
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to="/" className={page.backLink}>
          <ArrowLeft aria-hidden /> Univers
        </Link>
        <h1 className={page.title}>Mods</h1>
        <p className={page.lead}>
          Un mod ajoute des types de fiches, des champs aux fiches existantes ou des pages (jeux, outils). Une fois installé ici, chaque univers l’active dans ses paramètres.
        </p>

        <p className={styles.warning}>
          N’installez que des mods de confiance. Leurs pages s’exécutent isolées de l’application (sans accès à votre session),
          mais elles peuvent lire et écrire les données de l’univers avec les droits de la personne qui les utilise.
        </p>

        <div
          className={cx(styles.dropzone, dragging && styles.dropzoneActive)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <p className={styles.note}>Déposez l’archive .zip d’un mod ici. Un mod déjà installé (même « id ») est mis à jour ; ses données sont conservées.</p>
          <div className={styles.dropzoneActions}>
            <Button variant="primary" icon={Upload} loading={install.isPending} onClick={() => inputRef.current?.click()}>
              Installer un mod
            </Button>
            <Button as={Link} to="/mods/documentation" variant="ghost" icon={BookOpen}>
              Créer un mod
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(e) => {
              send(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {mods.isPending ? (
          <Spinner label="Chargement des mods…" />
        ) : mods.error ? (
          <EmptyState icon={CircleAlert} title="Impossible de charger les mods" action={<Button onClick={() => mods.refetch()}>Réessayer</Button>}>
            {mods.error.message}
          </EmptyState>
        ) : list.length === 0 ? (
          <EmptyState icon={Puzzle} title="Aucun mod installé">
            Installez une archive .zip contenant un manifest.json (voir le format ci-dessous).
          </EmptyState>
        ) : (
          <ul className={styles.modList}>
            {list.map((mod) => {
              return (
                <li key={mod.id} className={styles.modRow}>
                  <span className={cx(styles.modIcon, styles.modIconOn)}>
                    <ModIcon name={mod.icon} aria-hidden />
                  </span>
                  <div className={styles.modText}>
                    <p className={styles.modName}>
                      {mod.name}
                      <span className={styles.modVersion}>
                        {mod.id} · v{mod.version}
                        {mod.author && ` · ${mod.author}`}
                      </span>
                    </p>
                    {mod.description && <p className={styles.modDescription}>{mod.description}</p>}
                    <ModContents mod={mod} />
                  </div>
                  <Button variant="ghost" icon={Trash2} onClick={() => setRemoving(mod)}>
                    Désinstaller
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <section className={styles.docs} aria-labelledby="mods-format">
          <h2 id="mods-format">Format d’un mod</h2>
          <p className={styles.note}>
            Une archive .zip avec un <code>manifest.json</code> à la racine (ou dans un unique dossier). Les types de fiches et les champs
            sont affichés par Codex lui-même ; les pages (<code>entry</code>, fichier .html du mod) s’ouvrent dans une zone isolée et
            utilisent le SDK <code>/mod-files/codex-sdk.js</code>. Types de champs : text, richtext, number, boolean, date, select,
            multiselect, color, url, ref.
          </p>
          <pre>{MANIFEST_EXAMPLE}</pre>
          <Button as={Link} to="/mods/documentation" icon={BookOpen}>
            Documentation complète
          </Button>
        </section>
      </main>

      <Dialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        dismissible={!remove.isPending}
        size="sm"
        title="Désinstaller le mod ?"
        description={
          removing &&
          `« ${removing.name} » sera retiré du serveur et désactivé dans tous les univers. Les fiches et données créées avec lui sont conservées (masquées) et réapparaîtront si vous le réinstallez.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)} disabled={remove.isPending}>Annuler</Button>
            <Button variant="danger" onClick={confirmRemove} loading={remove.isPending}>Désinstaller</Button>
          </>
        }
      />
    </>
  );
}
