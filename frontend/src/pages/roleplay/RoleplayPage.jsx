import { IMG } from '@/api/client';
import { Link, useOutletContext, useSearchParams } from 'react-router';
import { CornerDownRight, MessagesSquare, Search } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { useRoleplayOverview } from '@/api/roleplay';
import { Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { normalizeText } from '@/components/entity/useListState';
import { AvatarStack, EntityBanner } from '@/components/entity/EntityBanner';
import { placeImage } from '@/config/places';
import { entityColorVars } from '@/theme/universeTheme';
import cards from '@/components/places/PlaceViews.module.scss';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { SceneCard } from '@/components/roleplay/SceneCard';
import { formatRpDate } from '@/components/roleplay/rpMarkup';
import styles from '@/components/roleplay/Roleplay.module.scss';
import { plural, universePath } from '@/utils/universe';
import page from '../Page.module.scss';

// Filtre des fils (?fils=) : tous les lieux, ceux qui ont des messages, ceux qui n'en ont pas
const THREAD_FILTERS = ['tous', 'actifs', 'vides'];

/**
 * Roleplay d'un univers (/roleplay) : tous les lieux et leur fil (les plus récemment actifs d'abord,
 * puis les autres par ordre alphabétique), filtrables et cherchables, et les scènes.
 */
export default function RoleplayPage() {
  const { universe } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const filter = THREAD_FILTERS.includes(params.get('fils')) ? params.get('fils') : 'tous';
  const query = params.get('q') || '';
  const setParam = (key, value, fallback = '') =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === fallback) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  const { data: overview, isPending, error } = useRoleplayOverview(universe.id);
  const { data: places = [] } = useEntityList('places', universe.id);
  const { data: characters = [] } = useEntityList('characters', universe.id);
  const placesById = new Map(places.map((p) => [p.id, p]));
  const charactersById = new Map(characters.map((c) => [c.id, c]));

  // Tous les lieux, avec l'activité de leur fil
  const activity = new Map((overview?.places || []).map((p) => [p.placeId, p]));
  const threads = places
    .map((place) => ({ place, parent: placesById.get(place.parentId), ...activity.get(place.id) }))
    .sort((a, b) => (b.lastAt ? new Date(b.lastAt) : 0) - (a.lastAt ? new Date(a.lastAt) : 0) || a.place.name.localeCompare(b.place.name, 'fr'));
  const activeCount = threads.filter((t) => t.count).length;
  const q = normalizeText(query.trim());
  const shown = threads.filter((t) => {
    if (filter === 'actifs' && !t.count) return false;
    if (filter === 'vides' && t.count) return false;
    return !q || normalizeText(`${t.place.name} ${t.parent?.name || ''}`).includes(q);
  });
  const filterOptions = [
    { value: 'tous', label: `Tous (${threads.length})` },
    { value: 'actifs', label: `Avec messages (${activeCount})` },
    { value: 'vides', label: `Sans messages (${threads.length - activeCount})` },
  ];

  return (
    <main className={`${page.main} ${page.mainSpaced}`}>
      <h1 className={page.title}>Roleplay</h1>
      <p className={page.lead}>
        Un fil par lieu, où l’on peut faire évoluer nos personnages et créer des histoires. Les messages peuvent ensuite être regroupés en scènes, rattachables aux épisodes.
      </p>

      {isPending ? (
        <Spinner label="Chargement…" />
      ) : error ? (
        <EmptyState title="Impossible de charger le roleplay">{error.message}</EmptyState>
      ) : (
        <div className={styles.overview}>
          <section aria-labelledby="rp-places">
            <div className={styles.sectionHead}>
              <h2 id="rp-places">Fils des lieux</h2>
            </div>
            {places.length === 0 ? (
              <EmptyState icon={MessagesSquare} title="Aucun lieu pour l’instant">
                Créez des lieux pour y ouvrir des fils de roleplay.
              </EmptyState>
            ) : (
              <>
                <div className={styles.threadToolbar}>
                  <div className={styles.threadSearch}>
                    <Search aria-hidden />
                    <Input
                      type="search"
                      value={query}
                      onChange={(e) => setParam('q', e.target.value)}
                      placeholder="Chercher un lieu…"
                      aria-label="Chercher un lieu"
                    />
                  </div>
                  <Segmented label="Afficher" options={filterOptions} value={filter} onChange={(v) => setParam('fils', v, 'tous')} />
                </div>
                {shown.length === 0 ? (
                  <p className={styles.meta}>
                    {filter === 'actifs' && !q ? 'Aucun fil n’a encore de message : ouvrez un lieu pour lancer le premier roleplay.' : 'Aucun lieu ne correspond.'}
                  </p>
                ) : (
                  // Mêmes cartes que la galerie des lieux ; en pied, les personnages du fil (les plus récents d'abord)
                  <ul className={cards.gallery}>
                    {shown.map((t) => {
                      const speakers = (t.characterIds || []).map((id) => charactersById.get(id)).filter(Boolean);
                      return (
                        <li key={t.place.id}>
                          <Link to={universePath(universe, `roleplay/lieux/${t.place.id}`)} className={cards.card} style={entityColorVars(t.place.colors)}>
                            <span className={cards.visual}>
                              <EntityBanner src={placeImage(t.place, IMG.card)} className={cards.image} />
                              <span className={cards.shade} aria-hidden />
                              <span className={cards.titleBlock}>
                                <span className={cards.name}>{t.place.name}</span>
                                {t.parent && (
                                  <span className={cards.parent}>
                                    <CornerDownRight aria-hidden /> {t.parent.name}
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className={cards.footer}>
                              <AvatarStack members={speakers.slice(0, 4)} total={speakers.length} />
                              <span className={styles.meta}>
                                {t.unread > 0 && (
                                  <span className={styles.unreadDot} title={`${plural(t.unread, 'message non lu', 'messages non lus')}`}>
                                    <span className="sr-only">{plural(t.unread, 'message non lu', 'messages non lus')} · </span>
                                  </span>
                                )}
                                {t.count ? formatRpDate(t.lastAt) : 'Aucun message'}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="rp-scenes">
            <div className={styles.sectionHead}>
              <h2 id="rp-scenes">Scènes</h2>
              <Link to={universePath(universe, 'roleplay/scenes')}>Toutes les scènes</Link>
            </div>
            {overview.scenes.length === 0 ? (
              <p className={styles.meta}>
                Aucune scène. Créez-en une depuis la page Scènes, ou, dans un fil, sélectionnez des messages avec le bouton « Scènes » pour les regrouper.
              </p>
            ) : (
              <div className={styles.sceneList}>
                {overview.scenes.map((s) => (
                  <SceneCard key={s.id} universe={universe} scene={s} place={placesById.get(s.placeId)} charactersById={charactersById} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
