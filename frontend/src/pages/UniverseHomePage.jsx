import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { ArrowRight, Settings, Shuffle } from '@/components/ui/icons';
import { useEntityList, useUniverses } from '@/api/queries';
import { getModulesState, getNavModules, isModuleEnabled } from '@/config/modules';
import { CharacterGallery } from '@/components/characters/CharacterViews';
import { GroupGallery } from '@/components/groups/GroupViews';
import { PlaceGallery } from '@/components/places/PlaceViews';
import { Button } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { Expandable } from '@/components/ui/Expandable';
import { UniverseAvatar } from '@/components/universe/UniverseAvatar';
import { UniverseBanner } from '@/components/universe/UniverseCard';
import { plainText, universePath } from '@/utils/universe';
import styles from './UniverseHomePage.module.scss';
import { usePermissions } from '@/auth/auth';
import { newSeed, sample } from '@/utils/random';

/** Nombre de cartes tirées au hasard par section. */
const DISCOVER_COUNT = { characters: 5, groups: 4, places: 4 };

/** Accueil d'un univers : présentation et accès rapide aux modules actifs. */
export default function UniverseHomePage() {
  const { universe } = useOutletContext();
  const { isAdmin } = usePermissions();
  const { data: universes } = useUniverses();
  const stats = universes?.find((u) => u.id === universe.id)?.stats || {};
  const modulesState = getModulesState(universe);
  const modules = getNavModules(modulesState);

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <UniverseBanner universe={universe} className={styles.banner} />
        <div className={styles.identity}>
          <UniverseAvatar universe={universe} className={styles.avatar} />
          <h1 className={styles.name}>{universe.name}</h1>
          {isAdmin && (
            <Button as={Link} to={universePath(universe, 'parametres')} icon={Settings} size="sm">
              Paramètres
            </Button>
          )}
        </div>
        {plainText(universe.description) && (
          <Expandable className={styles.description}>
            <RichText html={universe.description} />
          </Expandable>
        )}
      </section>

      <Discover universe={universe} groupsOn={isModuleEnabled(modulesState, 'groups')} />

      <h2 className={styles.sectionTitle}>Contenu de l’univers</h2>
      <ul className={styles.modules}>
        {modules.map((m) => (
          <li key={m.key}>
            <Link to={universePath(universe, m.path)} className={styles.module}>
              <span className={styles.moduleIcon}>
                <m.icon aria-hidden />
              </span>
              <p className={styles.moduleLabel}>{m.navLabel || m.label}</p>
              {stats[m.key] !== undefined && <p className={styles.moduleCount}>{stats[m.key]}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

/** Personnages, groupes et lieux tirés au hasard, à re-mélanger d'un clic. */
function Discover({ universe, groupsOn }) {
  const [seed, setSeed] = useState(newSeed);
  const characters = useEntityList('characters', universe.id);
  const groups = useEntityList('groups', universe.id, { enabled: groupsOn });
  const places = useEntityList('places', universe.id);

  const picks = useMemo(
    () => ({
      characters: sample(characters.data, DISCOVER_COUNT.characters, seed),
      groups: groupsOn ? sample(groups.data, DISCOVER_COUNT.groups, seed + 1) : [],
      places: sample(places.data, DISCOVER_COUNT.places, seed + 2),
    }),
    [characters.data, groups.data, places.data, groupsOn, seed],
  );

  const total = picks.characters.length + picks.groups.length + picks.places.length;
  if (total === 0) return null;

  const to = (path) => (e) => universePath(universe, `${path}/${e.id}`);

  return (
    <section aria-labelledby="discover-title">
      <div className={styles.discoverHeader}>
        <h2 id="discover-title" className={styles.sectionTitle}>À (re)découvrir</h2>
        <Button icon={Shuffle} size="sm" variant="ghost" onClick={() => setSeed(newSeed())}>
          Mélanger
        </Button>
      </div>

      <DiscoverRow title="Personnages" universe={universe} path="personnages" items={picks.characters}>
        <CharacterGallery characters={picks.characters} linkTo={to('personnages')} />
      </DiscoverRow>
      <DiscoverRow title="Groupes" universe={universe} path="groupes" items={picks.groups}>
        <GroupGallery groups={picks.groups} linkTo={to('groupes')} />
      </DiscoverRow>
      <DiscoverRow title="Lieux" universe={universe} path="lieux" items={picks.places}>
        <PlaceGallery places={picks.places} linkTo={to('lieux')} />
      </DiscoverRow>
    </section>
  );
}

function DiscoverRow({ title, universe, path, items, children }) {
  if (!items.length) return null;
  return (
    <div className={styles.discoverRow}>
      <div className={styles.discoverRowHeader}>
        <h3 className={styles.discoverRowTitle}>{title}</h3>
        <Link to={universePath(universe, path)} className={styles.seeAll}>
          Tout voir <ArrowRight aria-hidden />
        </Link>
      </div>
      {children}
    </div>
  );
}
