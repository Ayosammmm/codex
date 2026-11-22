import { useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router';
import { ArrowRight, Clapperboard, Music, Pause, Play, Search } from '@/components/ui/icons';
import { IMG, uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { useRoleplayOverview, useSceneSounds } from '@/api/roleplay';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { characterName } from '@/config/characters';
import { placeImage } from '@/config/places';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { GroupLogo } from '@/components/groups/GroupLogo';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { normalizeText } from '@/components/entity/useListState';
import { SoundPlayer } from '@/components/sound/SoundPlayer';
import { soundName } from '@/components/sound/soundFiles';
import { cx } from '@/components/ui/cx';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { plural, universePath } from '@/utils/universe';
import list from '../ListPage.module.scss';
import styles from './SoundsPage.module.scss';

// Volume de départ du lecteur (comme sur les fiches)
const VOLUME = 0.2;

// Titre d'un son : nom du fichier d'origine, sans extension
const soundTitle = (path) => soundName(path).replace(/\.[^.]+$/, '') || 'Son';

const byContext = (a, b) => a.entity.localeCompare(b.entity, 'fr') || a.context.localeCompare(b.context, 'fr');

/**
 * Page « Sons » du module Son (/sons) : référence des thèmes musicaux de l'univers, en cartes.
 * - thèmes des personnages, des groupes (module Groupes) et des lieux (avec leur ambiance) ;
 * - sons joués dans les scènes de roleplay (module Roleplay) : ambiances (/ambiance) et sons joints.
 * Un clic sur une carte charge le son dans le lecteur collé en haut de la page (un second clic : pause / reprise).
 */
export default function SoundsPage() {
  const { universe } = useOutletContext();
  const state = getModulesState(universe);
  const groupsOn = isModuleEnabled(state, 'groups');
  const roleplayOn = isModuleEnabled(state, 'roleplay');
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef(null);

  const characters = useEntityList('characters', universe.id);
  const places = useEntityList('places', universe.id);
  const groups = useEntityList('groups', universe.id, { enabled: groupsOn });
  const overview = useRoleplayOverview(universe.id, { enabled: roleplayOn });
  const sceneSounds = useSceneSounds(universe.id, { enabled: roleplayOn });

  const queries = [characters, places, groupsOn && groups, roleplayOn && overview, roleplayOn && sceneSounds].filter(Boolean);
  const pending = queries.some((q) => q.isPending);
  const error = queries.find((q) => q.error)?.error;

  // Un son par carte : { key, path, title, context (« Thème de … »), entity, to, linkLabel, thumb(className) }
  const sound = (key, path, context, entity, to, linkLabel, thumb) => ({ key, path, title: soundTitle(path), context, entity, to, linkLabel, thumb });
  const scenesById = new Map((overview.data?.scenes || []).map((s) => [s.id, s]));
  const sections = [
    {
      key: 'characters',
      title: 'Personnages',
      sounds: (characters.data || [])
        .filter((c) => c.themeSound)
        .map((c) => {
          const name = characterName(c);
          const thumb = (cls) => <CharacterAvatar character={c} round className={cls} />;
          return sound(`c${c.id}`, c.themeSound, `Thème de ${name}`, name, universePath(universe, `personnages/${c.id}`), 'Voir la fiche', thumb);
        }),
    },
    groupsOn && {
      key: 'groups',
      title: 'Groupes',
      sounds: (groups.data || [])
        .filter((g) => g.themeSound)
        .map((g) => {
          const thumb = (cls) => <GroupLogo group={g} round className={cls} />;
          return sound(`g${g.id}`, g.themeSound, `Thème de ${g.name}`, g.name, universePath(universe, `groupes/${g.id}`), 'Voir la fiche', thumb);
        }),
    },
    {
      key: 'places',
      title: 'Lieux',
      sounds: (places.data || []).flatMap((p) => {
        const to = universePath(universe, `lieux/${p.id}`);
        const thumb = (cls) => <EntityBanner src={placeImage(p, IMG.avatar)} className={cx(cls, styles.square)} />;
        return [
          p.themeSound && sound(`p${p.id}-theme`, p.themeSound, `Thème de ${p.name}`, p.name, to, 'Voir la fiche', thumb),
          p.ambientSound && sound(`p${p.id}-ambience`, p.ambientSound, `Ambiance de ${p.name}`, p.name, to, 'Voir la fiche', thumb),
        ].filter(Boolean);
      }),
    },
    roleplayOn && {
      key: 'scenes',
      title: 'Scènes',
      sounds: (sceneSounds.data || [])
        .filter((m) => scenesById.has(m.sceneId))
        .map((m) => {
          const scene = scenesById.get(m.sceneId);
          const thumb = (cls) => (
            <span className={cx(cls, styles.square, styles.iconThumb)}>
              <Clapperboard aria-hidden />
            </span>
          );
          const context = `${m.kind === 'ambience' ? 'Ambiance' : 'Son'} de la scène ${scene.title}`;
          return sound(`m${m.id}`, m.soundPath, context, scene.title, universePath(universe, `roleplay/scenes/${scene.id}`), 'Voir la scène', thumb);
        }),
    },
  ]
    .filter(Boolean)
    .map((section) => ({ ...section, sounds: [...section.sounds].sort(byContext) }));

  const total = sections.reduce((n, s) => n + s.sounds.length, 0);

  // Recherche : titre du son, nom de l'entité ou de la scène, nature (« thème », « ambiance »)
  const q = normalizeText(query.trim());
  const matches = (s) => !q || normalizeText(`${s.title} ${s.context} ${soundName(s.path)}`).includes(q);
  const shown = sections.map((s) => ({ ...s, sounds: s.sounds.filter(matches) })).filter((s) => s.sounds.length);

  const setQuery = (value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );

  return (
    <main className={list.main}>
      <header className={list.header}>
        <div>
          <h1 className={list.title}>Sons</h1>
          <p className={list.count}>{pending ? '…' : plural(total, 'son')}</p>
        </div>
      </header>
      <p className={styles.intro}>
        Les musiques faisant l'identité sonore de l'univers.
      </p>

      {pending ? (
        <Spinner label="Chargement des sons…" />
      ) : error ? (
        <EmptyState title="Impossible de charger les sons">{error.message}</EmptyState>
      ) : total === 0 ? (
        <EmptyState icon={Music} title="Aucun son pour l’instant">
          Ajoutez un thème depuis le formulaire d’un personnage{groupsOn && ', d’un groupe'} ou d’un lieu
          {roleplayOn && ', ou une ambiance dans une scène avec la commande /ambiance'}.
        </EmptyState>
      ) : (
        <>
          {/* Lecteur collé en haut : le son de la dernière carte cliquée */}
          <div
            ref={playerRef}
            className={cx(styles.nowPlaying, current && styles.nowPlayingActive)}
            aria-live="polite"
            onPlayCapture={() => setPlaying(true)}
            onPauseCapture={() => setPlaying(false)}
          >
            {current ? (
              <>
                {current.thumb(styles.nowThumb)}
                <div className={styles.nowInfo}>
                  <span className={styles.nowContext}>{current.context}</span>
                  <Link to={current.to} className={styles.nowLink}>
                    {current.linkLabel} <ArrowRight aria-hidden />
                  </Link>
                </div>
                <SoundPlayer src={uploadUrl(current.path)} label={current.title} loop volume={VOLUME} autoPlay className={styles.nowPlayer} />
              </>
            ) : (
              <p className={styles.nowEmpty}>
                <Music aria-hidden /> Choisissez un son ci-dessous pour l’écouter.
              </p>
            )}
          </div>

          <div className={styles.search}>
            <Search aria-hidden />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un son, un personnage, un lieu…" aria-label="Chercher un son" />
          </div>

          {shown.length === 0 ? (
            <p className={list.noResult}>Aucun son ne correspond.</p>
          ) : (
            shown.map((section) => (
              <section key={section.key} className={styles.section} aria-labelledby={`sons-${section.key}`}>
                <h2 id={`sons-${section.key}`} className={styles.sectionTitle}>
                  {section.title} <span className={styles.sectionCount}>{section.sounds.length}</span>
                </h2>
                <ul className={styles.grid}>
                  {section.sounds.map((s) => {
                    const active = current?.key === s.key;
                    const live = active && playing;
                    return (
                      <li key={s.key}>
                        <button
                          type="button"
                          className={cx(styles.card, active && styles.cardActive)}
                          aria-pressed={active}
                          aria-label={`${live ? 'Mettre en pause' : 'Écouter'} : ${s.title}, ${s.context}`}
                          // Nouveau son dans le lecteur (lancé aussitôt), ou pause / reprise du son en cours
                          onClick={() => {
                            if (!active) return setCurrent(s);
                            const audio = playerRef.current?.querySelector('audio');
                            if (audio?.paused) audio.play().catch(() => {});
                            else audio?.pause();
                          }}
                        >
                          <span className={styles.cardVisual}>
                            {s.thumb(styles.cardThumb)}
                            <span className={styles.cardPlay}>{live ? <Pause aria-hidden /> : <Play aria-hidden />}</span>
                          </span>
                          <span className={styles.cardText}>
                            <span className={styles.cardTitle}>{s.title}</span>
                            <span className={styles.cardContext}>{s.context}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </main>
  );
}
