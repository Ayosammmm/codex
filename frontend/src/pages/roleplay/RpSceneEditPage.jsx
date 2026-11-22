import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router';
import { ArrowLeft, Check, Trash2 } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { useScene, useSceneMessageMutations, useSceneMutations } from '@/api/roleplay';
import { useAuth, usePermissions } from '@/auth/auth';
import { characterName } from '@/config/characters';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { RpMessage } from '@/components/roleplay/RpMessage';
import { continuesMessage } from '@/components/messages/markup';
import styles from '@/components/messages/Messages.module.scss';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';

/**
 * Édition d'une scène (/roleplay/scenes/:sceneId/modifier) : titre, résumé, épisodes, et ses messages.
 * - Scène du roleplay : ses messages sont ceux du fil du lieu ; les modifier ici les modifie aussi dans le fil.
 * - Scène hors roleplay : elle s'écrit ici, message par message (éditeur du roleplay).
 * Un message ne se modifie / supprime que par son auteur ou un admin. La page de la scène, elle, ne sert qu'à lire.
 */
export default function RpSceneEditPage() {
  const { universe } = useOutletContext();
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { canCreate, canEdit, isAdmin } = usePermissions();
  const storiesOn = isModuleEnabled(getModulesState(universe), 'stories');
  const soundOn = isModuleEnabled(getModulesState(universe), 'sound');

  const { data: scene, isPending, error } = useScene(sceneId);
  const { data: places = [] } = useEntityList('places', universe.id);
  const { data: characters = [] } = useEntityList('characters', universe.id);
  const { data: episodes = [] } = useEntityList('episodes', universe.id, { enabled: storiesOn });
  const mutations = useSceneMutations();
  const messageMutations = useSceneMessageMutations(Number(sceneId));
  // Personnages que l'on peut jouer (écriture d'une scène hors roleplay)
  const playable = useMemo(
    () => characters.filter((c) => canEdit('character', c.id)).sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr')),
    [characters, canEdit],
  );

  const viewHref = universePath(universe, `roleplay/scenes/${sceneId}`);
  if (isPending) return <Spinner label="Chargement de la scène…" />;
  if (error || !canCreate) {
    return (
      <main className={page.narrow}>
        <EmptyState
          title={error ? 'Scène introuvable' : 'Lecture seule'}
          action={<Button as={Link} to={error ? universePath(universe, 'roleplay/scenes') : viewHref}>{error ? 'Toutes les scènes' : 'Lire la scène'}</Button>}
        >
          {error ? error.message : 'Seuls les éditeurs et les admins peuvent modifier une scène.'}
        </EmptyState>
      </main>
    );
  }

  const place = places.find((p) => p.id === scene.placeId);
  const charactersById = new Map(characters.map((c) => [c.id, c]));
  const placesById = new Map(places.map((p) => [p.id, p]));
  const episodeOptions = episodes.map((e) => ({ value: e.id, label: [e.stories?.[0]?.name, e.title].filter(Boolean).join(' — ') }));
  const canDelete = isAdmin || scene.createdBy === user?.id;
  const { messages } = scene;

  const remove = () => {
    const consequence = scene.standalone ? 'Ses messages seront supprimés avec elle.' : 'Ses messages restent dans le fil du lieu.';
    if (!window.confirm(`Supprimer la scène « ${scene.title} » ? ${consequence}`)) return;
    mutations.remove.mutate(scene.id, {
      onSuccess: () => {
        toast.success('Scène supprimée.');
        navigate(universePath(universe, 'roleplay/scenes'), { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <main className={`${page.main} ${page.mainSpaced}`}>
      <Link to={viewHref} className={page.backLink}>
        <ArrowLeft aria-hidden /> {scene.title}
      </Link>
      <div className={styles.sceneHeader}>
        <div className={styles.sceneHeaderText}>
          <h1 className={page.title}>Modifier la scène</h1>
          <p className={styles.meta}>
            {place?.name}
            {scene.standalone && <span className={styles.sceneTag}>Hors roleplay</span>}
          </p>
        </div>
        {canDelete && <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={remove}>Supprimer</Button>}
        <Button size="sm" variant="primary" icon={Check} as={Link} to={viewHref}>Terminer</Button>
      </div>

      <SceneDetailsForm
        key={scene.id}
        scene={scene}
        episodeOptions={storiesOn ? episodeOptions : null}
        pending={mutations.update.isPending}
        onSave={(data) =>
          mutations.update.mutateAsync({ id: scene.id, data }).then(() => toast.success('Scène enregistrée.'), (err) => toast.error(err.message))
        }
      />

      <section aria-labelledby="scene-messages" className={styles.sceneEditMessages}>
        <div className={styles.sectionHead}>
          <h2 id="scene-messages">Messages</h2>
        </div>
        <p className={styles.meta}>
          {scene.standalone ? (
            'Écrivez la scène ci-dessous, au nom des personnages. Ses messages n’apparaissent pas dans le fil du lieu.'
          ) : (
            <>
              Ces messages viennent du fil{' '}
              {place ? <Link to={universePath(universe, `roleplay/lieux/${place.id}`)}>{place.name}</Link> : 'du lieu'} : les modifier ici les modifie
              aussi dans le fil. Pour en ajouter ou en retirer, ouvrez le fil puis « Éditeur de scènes ».
            </>
          )}
        </p>
        <div className={styles.reading}>
          {messages.length === 0 ? (
            <p className={styles.empty}>Aucun message pour l’instant.</p>
          ) : (
            messages.map((m, i) => (
              <RpMessage
                key={m.id}
                universe={universe}
                message={m}
                charactersById={charactersById}
                placesById={placesById}
                hideHrp={false}
                continued={continuesMessage(messages[i - 1], m) && !m.travels?.arrivals.length && !messages[i - 1].travels?.departures.length}
                canManage={isAdmin || m.author?.id === user?.id}
                onSave={(content) => messageMutations.update.mutateAsync({ id: m.id, data: { content } }).catch((err) => toast.error(err.message))}
                onDelete={() => {
                  const note = scene.standalone ? '' : ' Il sera aussi supprimé du fil du lieu.';
                  if (window.confirm(`Supprimer ce message ?${note}`)) messageMutations.remove.mutate(m.id, { onError: (err) => toast.error(err.message) });
                }}
              />
            ))
          )}
        </div>

        {scene.standalone && (
          <div className={styles.sceneComposer}>
            <MessageComposer
              key={scene.id}
              characters={playable}
              storageKey={`codex.rpSpeakers.scene.${scene.id}`}
              onSend={(data) =>
                messageMutations.createMany.mutateAsync(data).catch((err) => {
                  toast.error(err.message);
                  throw err;
                })
              }
              onError={toast.error}
              sending={messageMutations.createMany.isPending}
              soundEnabled={soundOn}
            />
          </div>
        )}
      </section>
    </main>
  );
}

/** Titre, résumé et épisodes de la scène (`episodeOptions` : null si le module Histoires est inactif). */
function SceneDetailsForm({ scene, episodeOptions, pending, onSave }) {
  const [title, setTitle] = useState(scene.title);
  const [description, setDescription] = useState(scene.description || '');
  const [episodeIds, setEpisodeIds] = useState(scene.episodeIds);
  const changed =
    title.trim() !== scene.title ||
    description.trim() !== (scene.description || '') ||
    (episodeOptions && [...episodeIds].sort().join() !== [...scene.episodeIds].sort().join());
  const submit = (e) => {
    e.preventDefault();
    onSave({ title: title.trim(), description, ...(episodeOptions && { episodeIds }) });
  };
  return (
    <form className={styles.sceneEditForm} onSubmit={submit}>
      <Field label="Titre" required>
        {(props) => <Input {...props} value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} />}
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
      <div>
        <Button type="submit" variant="primary" loading={pending} disabled={!title.trim() || !changed}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
