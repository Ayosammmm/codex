import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { characterName } from '@/config/characters';
import { AmbientSound } from '@/components/sound/AmbientSound';
import { soundName } from '@/components/sound/soundFiles';
import { isHexColor } from '@/theme/color';
import { cx } from '@/components/ui/cx';
import { parseRp, shoutLevel } from './rpMarkup';
import { RpRoll } from './RpRoll';
import { RpBackdrop } from './RpBackdrop';
import { activeEffects } from './rpCommands';
import styles from './Roleplay.module.scss';

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

/**
 * Lecture d'une scène en « visual novel », en plein écran : un passage à la fois (dialogue, action, pensée… d'un message,
 * en texte simple) dans une boîte de dialogue, les personnages qui parlent en grand au-dessus, sur le fond du lieu.
 * - Avancer : clic, →, Espace, Entrée ; reculer : ←, Retour arrière ; fermer : Échap.
 * - Fond et ambiance : ceux du lieu, changés par les commandes /fond, /ambiance… au fil de la lecture
 *   (`scene.effectsBefore` : ceux en vigueur avant le début de la scène).
 * - Image d'un message : affichée pendant la lecture de ses passages ; jet de dés : avec son dernier passage.
 * - Son d'un message (module « Son ») : lancé à son premier passage, par-dessus l'ambiance ; petit bouton pause en bas à gauche.
 */
export function RpVisualNovel({ scene, place, charactersById, soundOn, onClose }) {
  const steps = readingSteps(scene.messages);
  const messageCount = steps.length ? steps[steps.length - 1].number + 1 : 0;
  const [index, setIndex] = useState(0);
  const ended = index >= steps.length;
  const step = steps[Math.min(index, steps.length - 1)];
  const current = step?.message;

  // --- Fond et ambiance en vigueur au message lu ---
  const effectMessages = scene.messages.filter((m) => m.effect);
  const effects = activeEffects(scene.effectsBefore, effectMessages, current?.id ?? 0);
  const background =
    effects.background === 'place' ? uploadUrl(place?.background) : effects.background === 'none' ? null : uploadUrl(effects.background.imagePath);
  const placeAmbience = uploadUrl(place?.ambientSound || place?.themeSound);
  const ambience = !soundOn ? null : effects.ambience === 'place' ? placeAmbience : effects.ambience === 'none' ? null : uploadUrl(effects.ambience.soundPath);

  // --- Son du message : lancé à son arrivée, mis en pause avec le petit bouton ---
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

  const speakers = current ? current.characterIds.map((id) => charactersById.get(id)).filter(Boolean) : [];
  const narration = !speakers.length;
  const tint = speakers.find((c) => isHexColor(c.colors?.primary))?.colors.primary;
  const image = current && !current.effect && current.imagePath ? uploadUrl(current.imagePath) : null;
  const stop = (e) => e.stopPropagation();

  return (
    <div className={styles.vn} role="dialog" aria-modal="true" aria-label={`Visual novel : ${scene.title}`} onClick={() => !ended && go(index + 1)}>
      <RpBackdrop image={background} color={effects.background === 'place' ? place?.backgroundColor : null} vivid />

      <header className={styles.vnTop} onClick={stop}>
        <span className={styles.vnTitle}>{scene.title}</span>
        <span className={styles.vnProgress}>{ended ? messageCount : (step?.number ?? 0) + 1} / {messageCount}</span>
        {soundOn && (
        <>
          <AmbientSound src={ambience} />
          <p className={styles.vnSfxName}><ChevronLeft aria-hidden /> Ambiance</p>
        </>
      )}

      {/* Son du message : discret, en bas à gauche, tant qu'il n'est pas terminé */}
      <audio
        ref={sfxRef}
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

          <section key={current.id} className={cx(styles.vnBox, narration && styles.vnNarration)} style={tint ? { '--vn-tint': tint } : undefined} aria-live="polite">
            {!narration && (
              <p className={styles.vnName}>
                {speakers.map((c, i) => (
                  <Fragment key={c.id}>
                    {i > 0 && ' & '}
                    {characterName(c)}
                  </Fragment>
                ))}
              </p>
            )}
            {step.segment && (
              <p
                key={index}
                className={cx(styles.vnLine, styles[LINE_STYLES[step.segment.type]], shoutLevel(step.segment) > 0 && styles[`vnShout${shoutLevel(step.segment)}`])}
              >
                {step.segment.text}
              </p>
            )}
            {step.last && current.roll && <RpRoll roll={current.roll} />}
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
          <p className={styles.vnName}>Fin de la scène</p>
          <p>{scene.title}</p>
          <div className={styles.vnEndActions}>
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
