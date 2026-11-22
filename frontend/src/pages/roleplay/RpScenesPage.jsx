import { useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router';
import { Clapperboard, Plus, Search } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { useRoleplayOverview, useSceneMutations } from '@/api/roleplay';
import { usePermissions } from '@/auth/auth';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { normalizeText } from '@/components/entity/useListState';
import { SceneCard } from '@/components/roleplay/SceneCard';
import styles from '@/components/messages/Messages.module.scss';
import { plural, universePath } from '@/utils/universe';
import page from '../Page.module.scss';

/**
 * Toutes les scènes de roleplay de l'univers (/roleplay/scenes), cherchables, filtrables par lieu.
 * Création d'une scène, de deux sortes :
 * - du roleplay : vide au départ, on y ajoute ensuite des messages depuis le fil du lieu (bouton « Éditeur de scènes ») ;
 * - hors roleplay (remake d'une scène iconique, scène d'avant le RP…) : elle s'écrit directement dans sa page.
 */
export default function RpScenesPage() {
  const { universe } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();
  const { canCreate } = usePermissions();
  const storiesOn = isModuleEnabled(getModulesState(universe), 'stories');
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const placeFilter = Number(params.get('lieu')) || null;
  const setParam = (key, value) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });

  const { data: overview, isPending, error } = useRoleplayOverview(universe.id);
  const { data: places = [] } = useEntityList('places', universe.id);
  const { data: characters = [] } = useEntityList('characters', universe.id);
  const { data: episodes = [] } = useEntityList('episodes', universe.id, { enabled: storiesOn });
  const { create } = useSceneMutations();
  const [creating, setCreating] = useState(false);

  const placesById = new Map(places.map((p) => [p.id, p]));
  const charactersById = new Map(characters.map((c) => [c.id, c]));
  const placeOptions = [...places].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((p) => ({ value: p.id, label: p.name, description: placesById.get(p.parentId)?.name }));
  const episodeOptions = episodes.map((e) => ({ value: e.id, label: [e.stories?.[0]?.name, e.title].filter(Boolean).join(' — ') }));

  const scenes = overview?.scenes || [];
  const q = normalizeText(query.trim());
  const shown = scenes.filter((s) => {
    if (placeFilter && s.placeId !== placeFilter) return false;
    return !q || normalizeText(`${s.title} ${s.description || ''} ${placesById.get(s.placeId)?.name || ''}`).includes(q);
  });

  const createScene = (data) =>
    create
      .mutateAsync(data)
      .then((scene) => {
        toast.success(`Scène « ${scene.title} » créée.`);
        navigate(universePath(universe, `roleplay/scenes/${scene.id}`));
      })
      .catch((err) => toast.error(err.message));

  return (
    <main className={`${page.main} ${page.mainSpaced}`}>
      <div className={styles.sceneHeader}>
        <div className={styles.sceneHeaderText}>
          <h1 className={page.title}>Scènes</h1>
          <p className={page.lead}>
            Les moments du roleplay, et des morceaux d'histoires que vous pouvez lire et revivre.
          </p>
        </div>
        {canCreate && places.length > 0 && (
          <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>
            Nouvelle scène
          </Button>
        )}
      </div>

      {isPending ? (
        <Spinner label="Chargement des scènes…" />
      ) : error ? (
        <EmptyState title="Impossible de charger les scènes">{error.message}</EmptyState>
      ) : scenes.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Aucune scène pour l’instant"
          action={canCreate && places.length > 0 && <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Nouvelle scène</Button>}
        >
          {places.length > 0 ? 'Créez une scène ici, ou regroupez des messages depuis le fil d’un lieu.' : 'Créez d’abord des lieux : chaque scène se déroule dans un lieu.'}
        </EmptyState>
      ) : (
        <>
          <div className={styles.threadToolbar}>
            <div className={styles.threadSearch}>
              <Search aria-hidden />
              <Input type="search" value={query} onChange={(e) => setParam('q', e.target.value)} placeholder="Chercher une scène…" aria-label="Chercher une scène" />
            </div>
            <div className={styles.sceneFilter}>
              <Combobox
                options={placeOptions}
                value={placeFilter}
                onChange={(v) => setParam('lieu', v)}
                placeholder="Tous les lieux"
                emptyText="Aucun lieu"
                aria-label="Filtrer par lieu"
              />
            </div>
          </div>
          <p className={styles.meta}>{plural(shown.length, 'scène')}</p>
          {shown.length === 0 ? (
            <p className={styles.meta}>Aucune scène ne correspond.</p>
          ) : (
            <div className={styles.sceneList}>
              {shown.map((s) => (
                <SceneCard key={s.id} universe={universe} scene={s} place={placesById.get(s.placeId)} charactersById={charactersById} />
              ))}
            </div>
          )}
        </>
      )}

      {creating && (
        <NewSceneDialog
          placeOptions={placeOptions}
          defaultPlaceId={placeFilter}
          episodeOptions={storiesOn ? episodeOptions : null}
          pending={create.isPending}
          onClose={() => setCreating(false)}
          onCreate={createScene}
        />
      )}
    </main>
  );
}

const KINDS = [
  { value: 'roleplay', label: 'Du roleplay' },
  { value: 'standalone', label: 'Hors roleplay' },
];

/**
 * Nouvelle scène : sorte, lieu (obligatoire), titre, résumé, épisodes (`episodeOptions` : null sans le module Histoires).
 * La scène est créée sans message : ils viennent ensuite du fil du lieu, ou sont écrits dans la scène (hors roleplay).
 */
function NewSceneDialog({ placeOptions, defaultPlaceId, episodeOptions, pending, onClose, onCreate }) {
  const [kind, setKind] = useState('roleplay');
  const [placeId, setPlaceId] = useState(defaultPlaceId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [episodeIds, setEpisodeIds] = useState([]);
  const valid = placeId && title.trim();
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Nouvelle scène"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!valid}
            onClick={() => onCreate({ placeId, title: title.trim(), description, standalone: kind === 'standalone', ...(episodeOptions && { episodeIds }) })}
          >
            Créer la scène
          </Button>
        </>
      }
    >
      <Segmented label="Sorte de scène" options={KINDS} value={kind} onChange={setKind} />
      <p className={styles.meta}>
        {kind === 'standalone'
          ? 'Vous pourrez écrire les dialogues et éléments pour cette scène après l\'avoir créée.'
          : 'Sélectionnez les messages dans le lieu concerné par le roleplay afin d\'enregistrer votre scène.'}
      </p>
      <Field label="Titre" required>
        {(props) => <Input {...props} value={title} autoFocus maxLength={255} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. L’arrivée du Corsaire" />}
      </Field>
      <Field label="Lieu" required hint={kind === 'standalone' ? 'Où se déroule la scène (son fond et son ambiance).' : 'Le fil où se déroule la scène.'}>
        {(props) => <Combobox {...props} options={placeOptions} value={placeId} onChange={setPlaceId} placeholder="Choisir un lieu…" emptyText="Aucun lieu" />}
      </Field>
      <Field label="Résumé">
        {(props) => <Input {...props} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Facultatif" />}
      </Field>
      {episodeOptions && (
        <Field label="Épisodes" hint="La scène apparaîtra sur la fiche de ces épisodes.">
          {(props) => (
            <Combobox {...props} multiple options={episodeOptions} value={episodeIds} onChange={setEpisodeIds} placeholder="Rattacher à un épisode…" emptyText="Aucun épisode" />
          )}
        </Field>
      )}
    </Dialog>
  );
}
