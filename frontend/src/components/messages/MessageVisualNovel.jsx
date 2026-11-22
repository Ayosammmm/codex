import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play, RotateCcw, X } from '@/components/ui/icons';
import { IMG, uploadUrl } from '@/api/client';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { characterName } from '@/config/characters';
import { AmbientSound } from '@/components/sound/AmbientSound';
import { soundName } from '@/components/sound/soundFiles';
import { isHexColor, readableTextOn } from '@/theme/color';
import { cx } from '@/components/ui/cx';
import { parseRp, shoutLevel } from './markup';
import { MessageText } from './Message';
import { messageSpeakers } from './unknownSpeakers';
import { MessageRoll } from './MessageRoll';
import { MessageBackdrop } from './MessageBackdrop';
import { activeEffects } from './commands';
import styles from './Messages.module.scss';

// Volume des sons des messages, joués par-dessus l'ambiance
const MESSAGE_SOUND_VOLUME = 0.8;

/** Messages lus : sans le HRP, ni les commandes /fond… sans texte (elles s'appliquent en passant). */
const readableMessages = (messages) => messages.filter((m) => !m.isHrp && !(m.effect && !m.content.trim() && !m.roll));

/**
 * Étapes de lecture : chaque passage d'un message (dialogue, action, pensée…) est lu à part.
 * [{ message, segment (null : message sans texte, ex. un jet seul), first, last, number (n° du message) }]
 */
function readingSteps(messages) {
  return readableMessages(messages).flatMap((message, number) => {
    const segments = parseRp(message.content, { plain: message.characterIds.length ? 'dialogue' : 'narration' }).filter((s) => s.type !== 'hrp');
    if (!segments.length) return [{ message, segment: null, first: true, last: true, number }];
    return segments.map((segment, i) => ({ message, segment, first: i === 0, last: i === segments.length - 1, number }));
  });
}

// Passage en texte simple (sans bulle) : style selon son type, plus appuyé selon les « ! »
const LINE_STYLES = { narration: 'vnNarrationLine', dialogue: 'vnDialogue', action: 'vnAction', thought: 'vnThought', whisper: 'vnWhisper', sound: 'vnSound' };

// Libellés par défaut : lecture d'une scène de roleplay
const SCENE_LABELS = { previous: 'Scène précédente', next: 'Scène suivante', end: 'Fin de la scène' };

/**
 * Lecture de messages en « visual novel », en plein écran (scène de roleplay, récit d'épisode…) : un passage à la fois
 * (dialogue, action, pensée… d'un message, en texte simple) dans une boîte de dialogue, les personnages qui parlent
 * en grand au-dessus, sur le fond.
 * - Avancer : clic, →, Espace, Entrée ; reculer : ←, Retour arrière ; fermer : Échap.
 * - Fond et ambiance : `backdrop` ({ image, color } : fond d'origine, celui du lieu ou de l'épisode) et `ambience`
 *   (son d'origine, ou null), changés par les commandes /fond, /ambiance… au fil de la lecture
 *   (`effectsBefore` : ceux en vigueur avant le premier message).
 * - Image d'un message : affichée pendant la lecture de ses passages ; jet de dés : avec son dernier passage.
 * - `previous` / `next` ({ href, title } ou null) : lectures voisines (scènes, épisodes), libellées par `labels`.
 * - Son d'un message (module « Son ») : lancé à son premier passage, par-dessus l'ambiance, et joué en boucle jusqu'au son
 *   d'un autre message ; petit bouton pause en bas à gauche.
 */
export function MessageVisualNovel({ title, messages, effectsBefore, backdrop, ambience: baseAmbience, charactersById, soundOn, previous, next, labels: customLabels, onClose }) {
  const labels = { ...SCENE_LABELS, ...customLabels };
  const steps = readingSteps(messages);
  const messageCount = steps.length ? steps[steps.length - 1].number + 1 : 0;
  const [index, setIndex] = useState(0);
  const ended = index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];
  const current = step?.message;

  // --- Fond et ambiance en vigueur au message lu ---
  // Commandes déjà passées, dans l'ordre de lecture (un message inséré n'a pas forcément l'id le plus petit)
  const reached = current ? messages.slice(0, messages.indexOf(current) + 1) : [];
  const effects = activeEffects(effectsBefore, reached.filter((m) => m.effect), Infinity);
  const background =
    effects.background === 'place' ? backdrop?.image : effects.background === 'none' ? null : uploadUrl(effects.background.imagePath);
  const ambience = !soundOn ? null : effects.ambience === 'place' ? baseAmbience : effects.ambience === 'none' ? null : uploadUrl(effects.ambience.soundPath);

  // --- Son du message : lancé à son arrivée, en boucle, mis en pause avec le petit bouton ---
  const sfxRef = useRef(null);
  const [sfx, setSfx] = useState(null); // { state: 'playing' | 'paused', name }
  const playFor = (message) => {
    const audio = sfxRef.current;
    if (!soundOn || !audio || !message?.soundPath || message.effect) return;
    audio.src = uploadUrl(message.soundPath);
    audio.dataset.name = soundName(message.soundPath);
    audio.volume = MESSAGE_SOUND_VOLUME;
    audio.play().catch(() => {});
  };
  const toggleSfx = () => {
    const audio = sfxRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  // Premier message : son lancé à l'ouverture (l'ouverture vient d'un clic, le navigateur l'autorise)
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    playFor(steps[0]?.message);
  });

  const go = (next) => {
    const target = Math.max(0, Math.min(steps.length, next));
    if (target === index) return;
    setIndex(target);
    // Premier passage d'un message, en avançant (ou en recommençant depuis la fin) : revenir en arrière ne relance pas les sons
    const upcoming = steps[target];
    if (upcoming?.first && (target > index || ended)) playFor(upcoming.message);
  };

  // Clavier (réabonné à chaque rendu : `go` et `index` à jour)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      // Bouton qui a le focus : Espace / Entrée le cliquent déjà
      if (e.target.closest?.('button') && (e.key === ' ' || e.key === 'Enter')) return;
      if (['ArrowRight', ' ', 'Enter', 'PageDown'].includes(e.key)) go(index + 1);
      else if (['ArrowLeft', 'Backspace', 'PageUp'].includes(e.key)) go(index - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'Escape') onClose();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Page derrière : pas de défilement pendant la lecture
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const speakers = current ? messageSpeakers(charactersById, current) : [];
  const narration = !speakers.length;
  const tint = speakers.find((c) => isHexColor(c.colors?.primary))?.colors.primary;
  const image = current && !current.effect && current.imagePath ? uploadUrl(current.imagePath) : null;
  const stop = (e) => e.stopPropagation();

  // Plein écran : la navigation de l'univers (sidebar, barre du haut) est masquée tant que la lecture est ouverte
  useEffect(() => {
    document.documentElement.classList.add('vn-open');
    return () => document.documentElement.classList.remove('vn-open');
  }, []);

  return (
    <div className={styles.vn} role="dialog" aria-modal="true" aria-label={`Visual novel : ${title}`} onClick={() => !ended && go(index + 1)}>
      <MessageBackdrop image={background} color={effects.background === 'place' ? backdrop?.color : null} vivid />

      <header className={styles.vnTop} onClick={stop}>
        <span className={styles.vnTitle}>{title}</span>
        <span className={styles.vnProgress}>{ended ? messageCount : (step?.number ?? 0) + 1} / {messageCount}</span>
        {soundOn && (
        <>
          <AmbientSound src={ambience} />
          <p className={styles.vnSfxName}><ChevronLeft aria-hidden /> Ambiance</p>
        </>
      )}

      {/* Son du message : discret, en bas à gauche, tant qu'il n'est pas terminé */}
      {/* En boucle, jusqu'au son d'un autre message ou à la fermeture */}
      <audio
        ref={sfxRef}
        loop
        preload="auto"
        onPlay={(e) => setSfx({ state: 'playing', name: e.currentTarget.dataset.name })}
        onPause={(e) => !e.currentTarget.ended && setSfx({ state: 'paused', name: e.currentTarget.dataset.name })}
        onEnded={() => setSfx(null)}
      />
      {sfx && (
        <>
        <p className={styles.vnSfxName}>| Audio : {sfx.name}<ChevronRight aria-hidden /></p>
        <button
          type="button"
          className={styles.vnSfx}
          onClick={(e) => {
            e.stopPropagation();
            toggleSfx();
          }}
          aria-label={sfx.state === 'playing' ? `Mettre en pause : ${sfx.name}` : `Reprendre : ${sfx.name}`}
          title={sfx.state === 'playing' ? `Pause · ${sfx.name}` : `Reprendre · ${sfx.name}`}
        >
          
          {sfx.state === 'playing' ? <Pause aria-hidden /> : <Play aria-hidden />}
        </button>
        </>
      )}
        {previous && (
          <Link to={previous.href} className={styles.vnIconButton} aria-label={`${labels.previous} : ${previous.title}`} title={`${labels.previous} : ${previous.title}`}>
            <ChevronsLeft aria-hidden />
          </Link>
        )}
        {next && (
          <Link to={next.href} className={styles.vnIconButton} aria-label={`${labels.next} : ${next.title}`} title={`${labels.next} : ${next.title}`}>
            <ChevronsRight aria-hidden />
          </Link>
        )}
        <button type="button" className={styles.vnIconButton} onClick={onClose} aria-label="Fermer le visual novel (Échap)" title="Fermer (Échap)">
          <X aria-hidden />
        </button>
      </header>

      {!ended && current && (
        <>
          {/* Personnages qui parlent */}
          <div className={styles.vnSprites} aria-hidden>
            {speakers.map((c) => (
              <CharacterAvatar key={`${current.id}-${c.id}`} character={c} className={styles.vnSprite} />
            ))}
          </div>

          {/* Image envoyée avec le message : le temps de sa lecture */}
          {image && (
            <div key={`img-${current.id}`} className={styles.vnImage}>
              <img src={image} alt="Image du message" />
            </div>
          )}

          <section key={current.id} className={cx(styles.vnBox, narration && styles.vnNarration)} style={tint ? { '--vn-tint': tint, '--vn-tint-fg': readableTextOn(tint) } : undefined} aria-live="polite">
            {!narration && (
              <p className={styles.vnName}>
                {speakers.map((c, i) => (
                  <Fragment key={c.id}>
                    {i > 0 && ' & '}
                    {characterName(c)}
                    {/* Autre forme que la forme par défaut : son nom, entre parenthèses */}
                    {c.formId && <span className={styles.vnFormName}> ({c.formName || 'Forme sans nom'})</span>}
                  </Fragment>
                ))}
              </p>
            )}
            {step.segment && (
              <p
                key={index}
                className={cx(styles.vnLine, styles[LINE_STYLES[step.segment.type]], shoutLevel(step.segment) > 0 && styles[`vnShout${shoutLevel(step.segment)}`])}
              >
                <MessageText text={step.segment.text} />
              </p>
            )}
            {step.last && current.roll && <MessageRoll roll={current.roll} />}
            <div className={styles.vnNav} onClick={stop}>
              <button type="button" className={styles.vnIconButton} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Message précédent (←)" title="Précédent (←)">
                <ChevronLeft aria-hidden />
              </button>
              <button type="button" className={styles.vnIconButton} onClick={() => go(index + 1)} aria-label="Message suivant (→)" title="Suivant (→, Espace)">
                <ChevronRight aria-hidden />
              </button>
            </div>
          </section>
        </>
      )}

      {ended && (
        <section className={cx(styles.vnBox, styles.vnEnd)} onClick={stop}>
          <p className={styles.vnName}>{labels.end}</p>
          <p>{title}</p>
          {next && (
            <Link to={next.href} className={cx(styles.vnTextButton, styles.vnNextScene)}>
              <span>
                <span className={styles.sceneNavLabel}>{labels.next}</span>
                <span className={styles.sceneNavTitle}>{next.title}</span>
              </span>
              <ChevronRight aria-hidden />
            </Link>
          )}
          <div className={styles.vnEndActions}>
            {previous && (
              <Link to={previous.href} className={styles.vnTextButton} title={previous.title}>
                <ChevronLeft aria-hidden /> {labels.previous}
              </Link>
            )}
            <button type="button" className={styles.vnTextButton} onClick={() => go(0)}>
              <RotateCcw aria-hidden /> Revoir
            </button>
            <button type="button" className={styles.vnTextButton} onClick={onClose}>
              <X aria-hidden /> Fermer
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
