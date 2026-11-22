import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowDown, ArrowUp, Check, EyeOff, Play } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { useEpisodeMessageMutations, useEpisodeMessages } from '@/api/messages';
import { characterName } from '@/config/characters';
import { episodeBackdrop } from '@/config/stories';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { Message } from '@/components/messages/Message';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { MessageVisualNovel } from '@/components/messages/MessageVisualNovel';
import { continuesMessage } from '@/components/messages/markup';
import { speakerOf } from '@/components/messages/unknownSpeakers';
import messageStyles from '@/components/messages/Messages.module.scss';
import { universePath } from '@/utils/universe';
import sheet from '@/components/entity/SheetSection.module.scss';
import { cx } from '@/components/ui/cx';
import styles from './EpisodeNarrative.module.scss';

/*
 * Récit d'un épisode, en messages (système commun avec le roleplay : components/messages, api/messages.js).
 * Il se lit sur la fiche de l'épisode, en fil ou en visual novel, que le module Roleplay soit actif ou non,
 * et s'écrit dans l'édition de l'épisode.
 */

const EPISODE_LABELS = { previous: 'Épisode précédent', next: 'Épisode suivant', end: 'Fin de l’épisode' };

const useCharactersById = (universeId) => {
  const { data: characters = [] } = useEntityList('characters', universeId);
  return { characters, charactersById: useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]) };
};

/** Messages à la suite (`manage(message)` : props de modification, ou rien en lecture). */
function MessageList({ universe, messages, charactersById, hideHrp, manage }) {
  const visible = hideHrp ? messages.filter((m) => !m.isHrp) : messages;
  return visible.map((m, i) => (
    <Message
      key={m.id}
      universe={universe}
      message={m}
      charactersById={charactersById}
      hideHrp={hideHrp}
      continued={continuesMessage(visible[i - 1], m)}
      {...manage?.(m)}
    />
  ));
}

/**
 * Fiche épisode : le récit en messages, avec la lecture en visual novel (`?vue=vn`), qui enchaîne sur les épisodes
 * voisins de l'histoire. `episodes` : épisodes de l'histoire dans l'ordre. Rien si le récit n'a aucun message.
 */
export function EpisodeNarrative({ universe, story, episode, episodes, soundOn, children }) {
  const { data, isPending } = useEpisodeMessages(episode.id);
  const { charactersById } = useCharactersById(universe.id);
  const [hideHrp, setHideHrp] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const messages = data?.messages || [];
  const readable = messages.some((m) => !m.isHrp);
  const visualNovel = searchParams.get('vue') === 'vn' && readable;
  const setVisualNovel = (on) =>
    setSearchParams((params) => {
      if (on) params.set('vue', 'vn');
      else params.delete('vue');
      return params;
    });

  if (isPending) return <Spinner label="Chargement du récit…" />;
  if (!messages.length) return children ?? null;

  const index = episodes.findIndex((e) => e.id === episode.id);
  const neighbour = (e) => e && { href: `${universePath(universe, `histoires/${story.id}/episodes/${e.id}`)}?vue=vn`, title: e.title };
  const backdrop = episodeBackdrop(episode, story);

  return (
    <section id="recit" aria-labelledby="recit-title" className={styles.narrative}>
      <div className={styles.head}>
        <h2 id="recit-title" className={cx(sheet.sectionTitle, styles.title)}>Récit</h2>
        <div className={styles.tools}>
          {messages.some((m) => m.isHrp) && (
            <Button size="sm" variant={hideHrp ? 'primary' : 'secondary'} icon={EyeOff} aria-pressed={hideHrp} onClick={() => setHideHrp((v) => !v)}>
              {hideHrp ? 'HRP masqué' : 'Masquer le HRP'}
            </Button>
          )}
          <Button size="sm" variant="primary" icon={Play} disabled={!readable} onClick={() => setVisualNovel(true)}>
            Visual novel
          </Button>
        </div>
      </div>
      <div className={messageStyles.reading}>
        <MessageList universe={universe} messages={messages} charactersById={charactersById} hideHrp={hideHrp} />
      </div>

      {visualNovel && (
        <MessageVisualNovel
          key={episode.id}
          title={episode.title}
          messages={messages}
          effectsBefore={data.effectsBefore}
          backdrop={{ image: backdrop.background, color: backdrop.backgroundColor }}
          ambience={null}
          charactersById={charactersById}
          soundOn={soundOn}
          previous={index > 0 ? neighbour(episodes[index - 1]) : null}
          next={index >= 0 ? neighbour(episodes[index + 1]) : null}
          labels={EPISODE_LABELS}
          onClose={() => setVisualNovel(false)}
        />
      )}
    </section>
  );
}

/**
 * Édition d'un épisode : écriture du récit, message par message, au nom de n'importe quel personnage de l'univers
 * (ceux de l'épisode en premier). Les messages sont enregistrés à l'envoi, indépendamment du formulaire.
 * Sans titre : à placer dans une section du formulaire.
 * `castIds` : personnages de l'épisode.
 */
export function EpisodeNarrativeEditor({ universe, episode, castIds = [], soundOn }) {
  const toast = useToast();
  const { data, isPending } = useEpisodeMessages(episode.id);
  const { characters, charactersById } = useCharactersById(universe.id);
  const mutations = useEpisodeMessageMutations(episode.id);
  const playable = useMemo(() => {
    const cast = new Set(castIds);
    return [...characters].sort((a, b) => Number(cast.has(b.id)) - Number(cast.has(a.id)) || characterName(a).localeCompare(characterName(b), 'fr'));
  }, [characters, castIds]);
  const messages = data?.messages || [];
  // Point d'insertion : { id, where: 'before' | 'after' } (saisie affichée à côté de ce message), ou null
  const [insertion, setInsertion] = useState(null);
  const send = (sent, position) =>
    mutations.createMany.mutateAsync({ ...sent, ...position }).catch((err) => {
      toast.error(err.message);
      throw err;
    });
  const composerProps = {
    characters: playable,
    storageKey: `codex.messageSpeakers.episode.${episode.id}`,
    onError: toast.error,
    sending: mutations.createMany.isPending,
    soundEnabled: soundOn,
  };

  /** Saisie insérée avant / après un message : la suite s'écrit à la suite des messages insérés, jusqu'à « Terminer ». */
  const insertionComposer = (m) => {
    const author = m.characterIds.map((id) => speakerOf(charactersById, id)).filter(Boolean).map(characterName).join(' & ') || 'la narration';
    return (
      <div className={styles.insertion}>
        <div className={styles.insertionHead}>
          <span>
            {insertion.where === 'before' ? 'Insérer avant' : 'Insérer après'} le message de {author}
          </span>
          <Button size="sm" variant="ghost" icon={Check} onClick={() => setInsertion(null)}>
            Terminer
          </Button>
        </div>
        <MessageComposer
          key={`${insertion.where}-${m.id}`}
          {...composerProps}
          onSend={(sent) =>
            send(sent, { [insertion.where]: insertion.id }).then((created) => {
              // « Après » : les messages suivants vont après le dernier inséré ; « avant » : toujours juste avant ce message
              if (insertion.where === 'after' && created.length) setInsertion({ id: created[created.length - 1].id, where: 'after' });
            })
          }
        />
      </div>
    );
  };

  return (
    <div className={styles.editor}>
      <div className={messageStyles.reading}>
        {isPending ? (
          <Spinner label="Chargement du récit…" />
        ) : messages.length === 0 ? (
          <p className={messageStyles.empty}>Aucun message pour l’instant.</p>
        ) : (
          <MessageList
            universe={universe}
            messages={messages}
            charactersById={charactersById}
            hideHrp={false}
            manage={(m) => ({
              // Qui peut modifier l'épisode gère tout son récit (vérifié aussi par le serveur)
              canManage: true,
              extraActions: (
                <>
                  <button type="button" onClick={() => setInsertion({ id: m.id, where: 'before' })} aria-label="Insérer un message avant" title="Insérer avant">
                    <ArrowUp aria-hidden />
                  </button>
                  <button type="button" onClick={() => setInsertion({ id: m.id, where: 'after' })} aria-label="Insérer un message après" title="Insérer après">
                    <ArrowDown aria-hidden />
                  </button>
                </>
              ),
              before: insertion?.where === 'before' && insertion.id === m.id ? insertionComposer(m) : null,
              after: insertion?.where === 'after' && insertion.id === m.id ? insertionComposer(m) : null,
              onSave: (content) => mutations.update.mutateAsync({ id: m.id, data: { content } }).catch((err) => toast.error(err.message)),
              onDelete: () => {
                if (window.confirm('Supprimer ce message du récit ?')) mutations.remove.mutate(m.id, { onError: (err) => toast.error(err.message) });
              },
            })}
          />
        )}
      </div>
      <div className={messageStyles.sceneComposer}>
        {/* À la fin du récit */}
        <MessageComposer key={episode.id} {...composerProps} onSend={(sent) => send(sent)} />
      </div>
    </div>
  );
}
