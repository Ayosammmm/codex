import { useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, EyeOff, Pencil, Play } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { useScene, useSceneNeighbours } from '@/api/roleplay';
import { usePermissions } from '@/auth/auth';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { RpMessage } from '@/components/roleplay/RpMessage';
import { RpVisualNovel } from '@/components/roleplay/RpVisualNovel';
import { continuesMessage, formatRpDate } from '@/components/roleplay/rpMarkup';
import styles from '@/components/roleplay/Roleplay.module.scss';
import { plural, universePath } from '@/utils/universe';
import page from '../Page.module.scss';

/**
 * Lecture d'une scène (/roleplay/scenes/:sceneId), sans modification : titre, épisodes, messages et suppression
 * se modifient dans l'édition (RpSceneEditPage, bouton « Modifier »), y compris l'écriture d'une scène hors roleplay.
 * `?vue=vn` : lecture en visual novel, en plein écran (voir RpVisualNovel).
 * `?histoire=<id>` : scène lue depuis une histoire ; les scènes précédente / suivante sont alors celles de l'histoire
 * (ordre des épisodes), sinon celles de l'univers dans l'ordre chronologique.
 */
export default function RpScenePage() {
  const { universe } = useOutletContext();
  const { sceneId } = useParams();
  const { canCreate } = usePermissions();
  const storiesOn = isModuleEnabled(getModulesState(universe), 'stories');
  const soundOn = isModuleEnabled(getModulesState(universe), 'sound');
  const [searchParams, setSearchParams] = useSearchParams();
  const visualNovel = searchParams.get('vue') === 'vn';
  const storyId = Number(searchParams.get('histoire')) || null;
  const { data: neighbours } = useSceneNeighbours(sceneId, storyId);
  // Lien vers une autre scène : même contexte (histoire), même vue (visual novel ou non)
  const sceneHref = (id, { vn = visualNovel } = {}) => {
    const params = new URLSearchParams();
    if (neighbours?.story) params.set('histoire', neighbours.story.id);
    if (vn) params.set('vue', 'vn');
    const query = params.toString();
    return `${universePath(universe, `roleplay/scenes/${id}`)}${query ? `?${query}` : ''}`;
  };
  const setVisualNovel = (on) =>
    setSearchParams((params) => {
      if (on) params.set('vue', 'vn');
      else params.delete('vue');
      return params;
    });
  const { data: scene, isPending, error } = useScene(sceneId);
  const { data: places = [] } = useEntityList('places', universe.id);
  const { data: characters = [] } = useEntityList('characters', universe.id);
  const { data: episodes = [] } = useEntityList('episodes', universe.id, { enabled: storiesOn });
  const [hideHrp, setHideHrp] = useState(true);

  if (isPending) return <Spinner label="Chargement de la scène…" />;
  if (error) {
    return (
      <main className={page.narrow}>
        <EmptyState title="Scène introuvable" action={<Button as={Link} to={universePath(universe, 'roleplay')}>Retour au roleplay</Button>}>
          {error.message}
        </EmptyState>
      </main>
    );
  }

  const place = places.find((p) => p.id === scene.placeId);
  const visible = hideHrp ? scene.messages.filter((m) => !m.isHrp) : scene.messages;
  const charactersById = new Map(characters.map((c) => [c.id, c]));
  const placesById = new Map(places.map((p) => [p.id, p]));
  const episodeLabel = (e) => [e.stories?.[0]?.name, e.title].filter(Boolean).join(' — ');

  return (
    <main className={`${page.main} ${page.mainSpaced}`}>
      <Link to={universePath(universe, 'roleplay/scenes')} className={page.backLink}>
        <ArrowLeft aria-hidden /> Scènes
      </Link>
      <div className={styles.sceneHeader}>
        <div className={styles.sceneHeaderText}>
          <h1 className={page.title}>{scene.title}</h1>
          <p className={styles.meta}>
            {place && (
              <Link to={universePath(universe, `roleplay/lieux/${place.id}`)}>{place.name}</Link>
            )}
            {scene.standalone && <span className={styles.sceneTag}>Hors roleplay</span>}
            {' · '}
            {plural(scene.messageCount, 'message')}
            {scene.firstAt && ` · du ${formatRpDate(scene.firstAt)} au ${formatRpDate(scene.lastAt)}`}
          </p>
          {scene.description && <p className={page.lead}>{scene.description}</p>}
        </div>
        <Button size="sm" variant={hideHrp ? 'primary' : 'secondary'} icon={EyeOff} aria-pressed={hideHrp} onClick={() => setHideHrp((v) => !v)}>
          {hideHrp ? 'HRP masqué' : 'Masquer le HRP'}
        </Button>
        <Button size="sm" variant="primary" icon={Play} disabled={!scene.messages.some((m) => !m.isHrp)} onClick={() => setVisualNovel(true)}>
          Visual novel
        </Button>
        {canCreate && <Button size="sm" icon={Pencil} as={Link} to={universePath(universe, `roleplay/scenes/${scene.id}/modifier`)}>Modifier</Button>}
      </div>

      {storiesOn && scene.episodeIds.length > 0 && (
        <p className={styles.sceneEpisodes}>
          <span className={styles.meta}>Épisodes :</span>
          {scene.episodeIds.map((id) => {
            const e = episodes.find((x) => x.id === id);
            if (!e) return null;
            return (
              <Link key={id} to={universePath(universe, `histoires/${e.stories?.[0]?.id}/episodes/${e.id}`)}>
                {episodeLabel(e)}
              </Link>
            );
          })}
        </p>
      )}

      <div className={styles.reading}>
        {scene.messages.length === 0 && scene.standalone ? (
          <p className={styles.empty}>
            Cette scène hors roleplay n’est pas encore écrite.{canCreate && ' Pour l’écrire, cliquez sur « Modifier ».'}
          </p>
        ) : scene.messages.length === 0 ? (
          <p className={styles.empty}>
            Cette scène ne contient encore aucun message. Pour l’alimenter, ouvrez le fil{' '}
            {place ? <Link to={universePath(universe, `roleplay/lieux/${place.id}`)}>{place.name}</Link> : 'du lieu'}, sélectionnez des messages
            avec « Éditeur de scènes » et ajoutez-les à « {scene.title} ».
          </p>
        ) : (
          visible.map((m, i) => (
            <RpMessage
              key={m.id}
              universe={universe}
              message={m}
              charactersById={charactersById}
              placesById={placesById}
              hideHrp={hideHrp}
              continued={continuesMessage(visible[i - 1], m) && !m.travels?.arrivals.length && !visible[i - 1].travels?.departures.length}
            />
          ))
        )}
      </div>

      <SceneNav universe={universe} neighbours={neighbours} sceneHref={sceneHref} />

      {visualNovel && scene.messages.some((m) => !m.isHrp) && (
        <RpVisualNovel
          key={scene.id}
          scene={scene}
          place={place}
          charactersById={charactersById}
          soundOn={soundOn}
          previous={neighbours?.previous}
          next={neighbours?.next}
          sceneHref={(id) => sceneHref(id, { vn: true })}
          onClose={() => setVisualNovel(false)}
        />
      )}

    </main>
  );
}

/** Scènes précédente et suivante (de l'histoire lue, ou de l'univers), sous la scène. */
function SceneNav({ universe, neighbours, sceneHref }) {
  if (!neighbours || (!neighbours.previous && !neighbours.next)) return null;
  const { story, previous, next, position, total } = neighbours;
  const detail = (s) => s.episode?.title;
  return (
    <nav className={styles.sceneNav} aria-label="Scènes précédente et suivante">
      <p className={styles.sceneNavContext}>
        {story ? (
          <>
            Histoire <Link to={universePath(universe, `histoires/${story.id}`)}>{story.name}</Link>
          </>
        ) : (
          'Scènes de l’univers'
        )}
        {` · scène ${position} / ${total}`}
      </p>
      <div className={styles.sceneNavLinks}>
        {previous ? (
          <Link to={sceneHref(previous.id)} className={styles.sceneNavLink}>
            <ChevronLeft aria-hidden />
            <span>
              <span className={styles.sceneNavLabel}>Scène précédente</span>
              <span className={styles.sceneNavTitle}>{previous.title}</span>
              {detail(previous) && <span className={styles.sceneNavDetail}>{detail(previous)}</span>}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={sceneHref(next.id)} className={`${styles.sceneNavLink} ${styles.sceneNavNext}`}>
            <span>
              <span className={styles.sceneNavLabel}>Scène suivante</span>
              <span className={styles.sceneNavTitle}>{next.title}</span>
              {detail(next) && <span className={styles.sceneNavDetail}>{detail(next)}</span>}
            </span>
            <ChevronRight aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  );
}
