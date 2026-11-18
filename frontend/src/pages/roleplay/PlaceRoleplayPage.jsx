import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Clapperboard, EyeOff, X } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { uploadUrl } from '@/api/client';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { useMarkPlaceRead, usePlaceMessages, useRoleplayMutations, useRoleplayOverview, useRoleplaySocket, useSceneMutations } from '@/api/roleplay';
import { useAuth, usePermissions } from '@/auth/auth';
import { characterName } from '@/config/characters';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { RpComposer } from '@/components/roleplay/RpComposer';
import { AmbientSound } from '@/components/sound/AmbientSound';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { RpMessage } from '@/components/roleplay/RpMessage';
import { continuesMessage } from '@/components/roleplay/rpMarkup';
import { activeEffects } from '@/components/roleplay/rpCommands';
import { RpBackdrop } from '@/components/roleplay/RpBackdrop';
import styles from '@/components/roleplay/Roleplay.module.scss';
import { universePath } from '@/utils/universe';

// Volume des sons joués à l'arrivée d'un message (chaque lecteur se règle ensuite à part)
const ARRIVING_SOUND_VOLUME = 0.5;

const HRP_KEY = 'codex.rpHideHrp';
const readHideHrp = () => {
  try {
    return localStorage.getItem(HRP_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Fil de roleplay d'un lieu (/roleplay/lieux/:placeId) : messages en direct, masquage du HRP, et mode « scènes » pour regrouper des messages. Fond et couleurs : ceux du lieu.
 * `?message=<id>` (liens « est arrivé depuis… » / « est parti vers… ») : remonte le fil jusqu'à ce message et le met en évidence.
 * Mise en scène : les commandes /fond, /ambiance, /fin-fond, /fin-ambiance changent le fond et l'ambiance quand le
 * lecteur arrive à leur hauteur en défilant (ligne de lecture aux 70 % de la hauteur ; en bas du fil, tout s'applique).
 * Module « Son » : ambiance du lieu en boucle (sinon son thème), et sons des messages joués à leur arrivée.
 */
export default function PlaceRoleplayPage() {
  const { universe } = useOutletContext();
  const { placeId } = useParams();
  const { user } = useAuth();
  const { canCreate, canEdit, isAdmin } = usePermissions();
  const toast = useToast();

  const { data: places = [], isPending: placesPending } = useEntityList('places', universe.id);
  const { data: characters = [] } = useEntityList('characters', universe.id);
  const place = places.find((p) => p.id === Number(placeId));
  const placesById = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const charactersById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const playable = useMemo(
    () => characters.filter((c) => canEdit('character', c.id)).sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr')),
    [characters, canEdit],
  );

  useRoleplaySocket(placeId);
  const thread = usePlaceMessages(placeId);
  const { messages } = thread;
  const mutations = useRoleplayMutations(Number(placeId));

  // --- Son : ambiance du lieu, et sons des nouveaux messages des autres joués à leur arrivée ---
  const soundOn = isModuleEnabled(getModulesState(universe), 'sound');
  const ambientSrc = soundOn && place ? uploadUrl(place.ambientSound || place.themeSound) : null;
  const lastHeard = useRef(null); // dernier message déjà « entendu » (null : fil pas encore chargé)
  useEffect(() => {
    if (!thread.isSuccess) return;
    const top = messages.length ? messages[messages.length - 1].id : 0;
    // Ouverture du fil : les messages déjà là ne sont pas joués
    if (lastHeard.current === null) {
      lastHeard.current = top;
      return;
    }
    for (const m of messages) {
      // Son d'une commande /ambiance : c'est l'ambiance qui change, il n'est pas joué en plus
      if (m.id <= lastHeard.current || !m.soundPath || m.effect || m.author?.id === user?.id) continue;
      if (soundOn) {
        const sound = new Audio(uploadUrl(m.soundPath));
        sound.volume = ARRIVING_SOUND_VOLUME;
        sound.play().catch(() => {});
      }
    }
    lastHeard.current = Math.max(lastHeard.current, top);
  }, [thread.isSuccess, messages, soundOn, user]);
  const { data: overview } = useRoleplayOverview(universe.id);
  const scenes = (overview?.scenes || []).filter((s) => s.placeId === Number(placeId));
  const scenesById = new Map(scenes.map((s) => [s.id, s]));

  const [hideHrp, setHideHrp] = useState(readHideHrp);
  // Messages affichés (HRP masqué ou non) : base du regroupement et des plages de sélection
  const visible = hideHrp ? messages.filter((m) => !m.isHrp) : messages;
  const toggleHrp = () => {
    setHideHrp((v) => {
      try {
        localStorage.setItem(HRP_KEY, v ? '0' : '1');
      } catch {
        /* préférence non mémorisée */
      }
      return !v;
    });
  };

  // --- Défilement : en bas à l'ouverture et à chaque nouveau message (si on y était déjà) ---
  const scrollerRef = useRef(null);
  const nearBottom = useRef(true);
  const restoreFrom = useRef(null); // hauteur avant le chargement de messages plus anciens
  const lastId = messages[messages.length - 1]?.id;
  useMarkPlaceRead(universe.id, placeId, lastId);
  const firstId = messages[0]?.id;

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (restoreFrom.current != null) {
      el.scrollTop = el.scrollHeight - restoreFrom.current;
      restoreFrom.current = null;
    } else if (nearBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lastId, firstId, hideHrp]);

  // --- Mise en scène : dernier message atteint par la lecture (Infinity : bas du fil, tout s'applique) ---
  const [reachedId, setReachedId] = useState(Infinity);
  const effectMessages = messages.filter((m) => m.effect);
  const updateReached = (el) => {
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) return setReachedId(Infinity);
    const line = el.getBoundingClientRect().top + el.clientHeight * 0.7;
    let reached = 0;
    for (const m of effectMessages) {
      const node = document.getElementById(`rp-msg-${m.id}`);
      if (node && node.getBoundingClientRect().top <= line) reached = m.id;
    }
    setReachedId(reached);
  };
  // Fond / ambiance en vigueur avant les messages chargés (commandes dans des pages plus anciennes), puis commandes atteintes
  const effects = activeEffects(thread.data?.pages.at(-1)?.effectsBefore, effectMessages, reachedId);
  const backgroundImage =
    effects.background === 'place' ? uploadUrl(place?.background) : effects.background === 'none' ? null : uploadUrl(effects.background.imagePath);
  const ambience = effects.ambience === 'place' ? ambientSrc : effects.ambience === 'none' || !soundOn ? null : uploadUrl(effects.ambience.soundPath);

  const onScroll = () => {
    const el = scrollerRef.current;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    updateReached(el);
  };

  const loadOlder = () => {
    restoreFrom.current = scrollerRef.current.scrollHeight;
    thread.fetchNextPage();
  };

  // --- Message ciblé par un lien (?message=…) : pages plus anciennes chargées jusqu'à lui, puis défilement ---
  const [searchParams, setSearchParams] = useSearchParams();
  const targetId = Number(searchParams.get('message')) || null;
  const { isSuccess, isFetchingNextPage, hasNextPage, fetchNextPage } = thread;
  useEffect(() => {
    if (!targetId || !isSuccess || isFetchingNextPage) return;
    nearBottom.current = false; // pas de retour automatique en bas pendant la recherche
    const found = messages.some((m) => m.id === targetId);
    if (!found && hasNextPage && messages[0]?.id > targetId) {
      fetchNextPage();
      return;
    }
    // Trouvé (ou introuvable : supprimé entre-temps) : le paramètre est retiré de l'adresse
    setSearchParams((params) => {
      params.delete('message');
      return params;
    }, { replace: true });
    if (!found) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`rp-msg-${targetId}`);
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.classList.add(styles.highlighted);
      el.addEventListener('animationend', () => el.classList.remove(styles.highlighted), { once: true });
    });
  }, [targetId, isSuccess, isFetchingNextPage, hasNextPage, fetchNextPage, messages, setSearchParams]);

  // --- Mode « scènes » : sélection de messages ---
  const [sceneMode, setSceneModeState] = useState(false);
  const [selected, setSelected] = useState(new Set());
  // Quitter le mode « scènes » vide la sélection
  const setSceneMode = (next) => {
    const value = typeof next === 'function' ? next(sceneMode) : next;
    if (!value) setSelected(new Set());
    anchor.current = null;
    setSceneModeState(value);
  };
  const anchor = useRef(null);
  const [newScene, setNewScene] = useState(false);
  const sceneMutations = useSceneMutations();

  // Clic : coche / décoche un message. Maj+clic : toute la plage depuis le dernier message cliqué
  // prend l'état du message cliqué (comme dans la plupart des applications).
  const toggleSelect = (message, shift) => {
    // Plage calculée ici, avant de déplacer l'ancre (la mise à jour d'état s'exécute plus tard)
    const from = visible.findIndex((m) => m.id === anchor.current);
    const to = visible.findIndex((m) => m.id === message.id);
    const range = shift && from !== -1 && to !== -1 ? visible.slice(Math.min(from, to), Math.max(from, to) + 1) : [message];
    const on = !selected.has(message.id);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of range) on ? next.add(m.id) : next.delete(m.id);
      return next;
    });
    anchor.current = message.id;
  };

  const selectedIds = [...selected];
  const run = (promise, success) =>
    promise
      .then(() => {
        toast.success(success);
        setSceneMode(false);
      })
      .catch((err) => toast.error(err.message));

  const addToScene = (sceneId) =>
    run(sceneMutations.update.mutateAsync({ id: sceneId, data: { addMessageIds: selectedIds } }), `Messages ajoutés à « ${scenesById.get(sceneId)?.title} ».`);

  const removeFromScenes = () => {
    const byScene = new Map();
    for (const m of messages) if (selected.has(m.id) && m.sceneId) byScene.set(m.sceneId, [...(byScene.get(m.sceneId) || []), m.id]);
    run(
      Promise.all([...byScene].map(([id, ids]) => sceneMutations.update.mutateAsync({ id, data: { removeMessageIds: ids } }))),
      'Messages retirés de leur scène.',
    );
  };

  const send = (data) =>
    mutations.createMany.mutateAsync(data).then(
      () => {
        nearBottom.current = true;
      },
      (err) => {
        toast.error(err.message);
        throw err;
      },
    );

  if (placesPending) return <Spinner label="Chargement…" />;
  if (!place) {
    return (
      <main className={styles.thread}>
        <EmptyState title="Lieu introuvable" action={<Button as={Link} to={universePath(universe, 'roleplay')}>Retour au roleplay</Button>}>
          Ce lieu n’existe pas ou a été supprimé.
        </EmptyState>
      </main>
    );
  }

  return (
    <EntityThemeZone universe={universe} colors={place.colors}>
      <RpBackdrop image={backgroundImage} color={effects.background === 'place' ? place.backgroundColor : null} />
      <main className={styles.thread}>
        <header className={styles.threadHeader}>
          <Button as={Link} to={universePath(universe, 'roleplay')} variant="ghost" size="sm" iconOnly icon={ArrowLeft} aria-label="Retour au roleplay" />
          <div className={styles.threadTitle}>
            <h1>{place.name}</h1>
            <Link to={universePath(universe, `lieux/${place.id}`)}>Fiche du lieu</Link>
          </div>
          <div className={styles.threadFilters}>
            {soundOn && <AmbientSound src={ambience} />}
            <Button size="sm" variant={hideHrp ? 'primary' : 'secondary'} icon={EyeOff} aria-pressed={hideHrp} onClick={toggleHrp}>
              {hideHrp ? 'HRP masqué' : 'Masquer le HRP'}
            </Button>
            {canCreate && (
              <Button size="sm" icon={Clapperboard} aria-pressed={sceneMode} variant={sceneMode ? 'primary' : 'secondary'} onClick={() => setSceneMode((v) => !v)}>
                Éditeur de scènes
              </Button>
            )}
          </div>
        </header>

        <div ref={scrollerRef} className={styles.scroller} onScroll={onScroll}>
          <div className={styles.list}>
            {thread.hasNextPage && (
              <Button size="sm" variant="ghost" className={styles.loadMore} loading={thread.isFetchingNextPage} onClick={loadOlder}>
                Messages précédents
              </Button>
            )}
            {thread.isPending ? (
              <Spinner label="Chargement du fil…" />
            ) : thread.error ? (
              <p className={styles.empty}>{thread.error.message}</p>
            ) : messages.length === 0 ? (
              <p className={styles.empty}>
                Aucun message pour l’instant. Lancez la scène !
              </p>
            ) : (
              visible.map((m, i) => {
                const scene = m.sceneId ? scenesById.get(m.sceneId) : null;
                const startsScene = scene && visible[i - 1]?.sceneId !== m.sceneId;
                return (
                  <div key={m.id}>
                    {startsScene && (
                      <p className={styles.sceneDivider}>
                        <Link to={universePath(universe, `roleplay/scenes/${scene.id}`)}>Scène · {scene.title}</Link>
                      </p>
                    )}
                    <RpMessage
                      universe={universe}
                      message={m}
                      charactersById={charactersById}
                      placesById={placesById}
                      hideHrp={hideHrp}
                      // Une arrivée (notice au-dessus) ou un départ du message précédent coupe la suite
                      continued={continuesMessage(visible[i - 1], m) && !m.travels?.arrivals.length && !visible[i - 1].travels?.departures.length}
                      className={scene ? styles.inScene : undefined}
                      canManage={isAdmin || m.author?.id === user?.id}
                      onSave={(content) => mutations.update.mutateAsync({ id: m.id, data: { content } }).catch((err) => toast.error(err.message))}
                      onDelete={() => {
                        if (window.confirm('Supprimer ce message ?')) mutations.remove.mutate(m.id, { onError: (err) => toast.error(err.message) });
                      }}
                      selectable={sceneMode}
                      selected={selected.has(m.id)}
                      onSelect={(e) => toggleSelect(m, e.shiftKey)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {sceneMode ? (
          <div className={styles.selectionBar} role="status">
            <span className={styles.selectionCount}>
              {selected.size ? `${selected.size} message${selected.size > 1 ? 's' : ''} sélectionné${selected.size > 1 ? 's' : ''}` : 'Cochez des messages (Maj+clic : plusieurs à la suite)'}
            </span>
            <Button size="sm" variant="primary" disabled={!selected.size} onClick={() => setNewScene(true)}>
              Nouvelle scène
            </Button>
            {/* Scènes hors roleplay : écrites directement, elles ne reçoivent pas de messages du fil */}
            {scenes.some((s) => !s.standalone) && (
              <select
                aria-label="Ajouter à une scène"
                value=""
                disabled={!selected.size}
                onChange={(e) => e.target.value && addToScene(Number(e.target.value))}
              >
                <option value="">Ajouter à une scène…</option>
                {scenes.filter((s) => !s.standalone).map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            )}
            <Button size="sm" disabled={!messages.some((m) => selected.has(m.id) && m.sceneId)} onClick={removeFromScenes}>
              Retirer de la scène
            </Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => setSceneMode(false)}>
              Terminer
            </Button>
          </div>
        ) : canCreate ? (
          <RpComposer
            key={place.id}
            characters={playable}
            storageKey={`codex.rpSpeakers.${place.id}`}
            onSend={send}
            onError={toast.error}
            sending={mutations.createMany.isPending}
            soundEnabled={soundOn}
          />
        ) : (
          <p className={styles.readOnly}>Lecture seule : seuls les éditeurs et les admins peuvent écrire.</p>
        )}

        {newScene && (
          <NewSceneDialog
            onClose={() => setNewScene(false)}
            pending={sceneMutations.create.isPending}
            onCreate={({ title, description }) =>
              run(
                sceneMutations.create.mutateAsync({ placeId: place.id, title, description, messageIds: selectedIds }).then(() => setNewScene(false)),
                `Scène « ${title} » créée.`,
              )
            }
          />
        )}
      </main>
    </EntityThemeZone>
  );
}

function NewSceneDialog({ onClose, onCreate, pending }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Nouvelle scène"
      description="Les messages sélectionnés y seront regroupés. Une scène peut ensuite être rattachée à des épisodes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button variant="primary" loading={pending} disabled={!title.trim()} onClick={() => onCreate({ title: title.trim(), description })}>
            Créer la scène
          </Button>
        </>
      }
    >
      <Field label="Titre" required>
        {(props) => <Input {...props} value={title} autoFocus maxLength={255} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. L’arrivée du Corsaire" />}
      </Field>
      <Field label="Résumé">
        {(props) => <Input {...props} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Facultatif" />}
      </Field>
    </Dialog>
  );
}
