import { Fragment, useEffect, useRef, useState } from 'react';
import { BookOpen, CircleHelp, Eye, ImagePlus, Music, SendHorizontal, X } from '@/components/ui/icons';
import { SoundPlayer } from '@/components/sound/SoundPlayer';
import { MAX_SOUND_SIZE, SOUND_ACCEPT, isSoundFile } from '@/components/sound/soundFiles';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { characterName } from '@/config/characters';
import { normalizeText } from '@/components/entity/useListState';
import { cx } from '@/components/ui/cx';
import { MessageContent } from './Message';
import { RP_MARKUP } from './markup';
import { useAutoGrow } from './autoGrow';
import { UNKNOWN_SPEAKERS, matchUnknowns } from './unknownSpeakers';
import { RP_COMMANDS, findCommand, looksLikeDice, matchCommands } from './commands';
import { CommandIcon } from './MessageRoll';
import styles from './Messages.module.scss';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // même limite que le serveur
const MAX_SUGGESTIONS = 8;

const readSpeakers = (key) => {
  try {
    const ids = JSON.parse(localStorage.getItem(key));
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};
const writeSpeakers = (key, ids) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* choix non mémorisé */
  }
};

let nextKey = 0;
// `command` : commande de hasard de la ligne (« d20 », « pileface »…), tirée par le serveur à l'envoi
const segment = (characterIds = [], text = '', command = null) => ({ key: ++nextKey, characterIds, text, command });

/** « /ber » en cours de saisie juste avant le curseur : { start, query }, sinon null. */
function mentionAt(text, caret) {
  const before = text.slice(0, caret);
  const match = /(^|\s)\/([^\s/]*)$/.exec(before);
  return match ? { start: caret - match[2].length - 1, query: match[2] } : null;
}

/** Personnages dont un mot du nom (ou le nom complet) commence par la recherche. */
// Suggestion « /narrateur » : nouvelle ligne de narration (sans personnage)
const NARRATOR = { narrator: true, id: 'narrateur' };
const matchesNarrator = (query) => ['narrateur', 'narration'].some((word) => word.startsWith(normalizeText(query)));

function matchCharacters(characters, query) {
  const q = normalizeText(query);
  return characters
    .filter((c) => {
      const name = normalizeText(characterName(c));
      return !q || name.startsWith(q) || name.split(/[\s'’-]+/).some((word) => word.startsWith(q));
    })
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Saisie de messages (roleplay, récit d'épisode), en lignes : chaque ligne est un message, au nom des personnages de ses badges
 * (sans badge : narration, ou HRP si tout est entre (( ))).
 * - « / » puis le début d'un nom propose les personnages jouables ; le choix ouvre une nouvelle ligne
 *   avec ce badge. Un « / » au tout début d'une ligne qui a déjà un badge ajoute un personnage au même groupe
 *   (« // » : plusieurs personnages parlent en même temps).
 * - Retour arrière en début de ligne : retire le dernier badge, puis fusionne avec la ligne précédente.
 * - Entrée envoie toutes les lignes d'un coup, Maj+Entrée va à la ligne.
 * - Une image peut être jointe (bouton, collage, glisser-déposer ; 5 Mo max), au dernier message ;
 *   de même pour un son (20 Mo max) si le module « Son » est actif (`soundEnabled`).
 * - « /d20 », « /2d6+1 », « /pileface » : jet de hasard (tiré par le serveur), au nom des personnages
 *   de la ligne ; le texte de la ligne devient un commentaire facultatif.
 * - « /fond » (avec l'image jointe), « /ambiance » (avec le son joint), « /fin-fond », « /fin-ambiance » : mise en scène,
 *   le fond / l'ambiance du fil changent quand le lecteur arrive à ce message.
 * Le groupe de la dernière ligne est repris pour le message suivant (mémorisé par fil : `storageKey`).
 * `characters` : personnages que l'utilisateur peut jouer ; `onSend({ parts, image, sound })` ; `onError(message)`.
 */
export function MessageComposer({ characters, storageKey, onSend, onError, sending, soundEnabled = false }) {
  // Personnages jouables, et les inconnus (« /??? »)
  const byId = new Map([...characters, ...UNKNOWN_SPEAKERS].map((c) => [c.id, c]));
  const [segments, setSegments] = useState(() => [segment(readSpeakers(storageKey).filter((id) => byId.has(id)))]);
  const [mention, setMention] = useState(null); // { key, start, query, active }
  const [help, setHelp] = useState(false);
  const [preview, setPreview] = useState(false);
  const [image, setImage] = useState(null); // { file, url }
  const [sound, setSound] = useState(null); // { file, url }
  const soundRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const inputs = useRef(new Map());
  const focusRequest = useRef(null); // { key, caret } appliqué après le rendu
  const fileRef = useRef(null);
  // Hauteur des lignes de saisie : celle de leur texte (useAutoGrow)
  useAutoGrow(() => inputs.current.values());

  // Aperçu local de l'image : URL libérée quand elle change ou à la fermeture
  useEffect(() => () => image && URL.revokeObjectURL(image.url), [image]);
  useEffect(() => () => sound && URL.revokeObjectURL(sound.url), [sound]);

  // Focus demandé par une action (nouvelle ligne, fusion...) : une fois la ligne affichée
  useEffect(() => {
    const request = focusRequest.current;
    if (!request) return;
    const el = inputs.current.get(request.key);
    if (!el) return;
    focusRequest.current = null;
    el.focus();
    const caret = request.caret === 'end' ? el.value.length : request.caret;
    el.setSelectionRange(caret, caret);
  });
  const focus = (key, caret = 'end') => {
    focusRequest.current = { key, caret };
  };
  // Ligne déjà affichée : focus immédiat
  const moveTo = (key, caret) => {
    const el = inputs.current.get(key);
    if (!el) return;
    el.focus();
    const at = caret === 'end' ? el.value.length : caret;
    el.setSelectionRange(at, at);
  };

  const suggestions = (() => {
    if (!mention) return [];
    const commands = matchCommands(mention.query, { sound: soundEnabled });
    const people = [...matchUnknowns(mention.query), ...(matchesNarrator(mention.query) ? [NARRATOR] : []), ...matchCharacters(characters, mention.query)];
    return looksLikeDice(mention.query) ? [...commands, ...people] : [...people, ...commands];
  })();

  // Image, ou son si le module « Son » est actif
  const attach = (file) => {
    if (!file) return;
    if (soundEnabled && isSoundFile(file)) {
      if (file.size > MAX_SOUND_SIZE) return onError?.('Son trop lourd (20 Mo maximum).');
      return setSound({ file, url: URL.createObjectURL(file) });
    }
    if (!file.type.startsWith('image/')) return onError?.(soundEnabled ? 'Seuls les images et les sons peuvent être envoyés.' : 'Seules les images peuvent être envoyées.');
    if (file.size > MAX_IMAGE_SIZE) return onError?.('Image trop lourde (5 Mo maximum).');
    setImage({ file, url: URL.createObjectURL(file) });
  };
  const imageFrom = (dataTransfer) =>
    [...(dataTransfer?.files || [])].find((f) => f.type.startsWith('image/') || (soundEnabled && isSoundFile(f)));

  const update = (key, patch) => setSegments((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const onChange = (seg, e) => {
    const { value, selectionStart } = e.target;
    update(seg.key, { text: value });
    const found = mentionAt(value, selectionStart);
    setMention(found ? { key: seg.key, ...found, active: 0 } : null);
  };

  /** Choix d'un personnage (ou du narrateur) pour le « /recherche » en cours. */
  const choose = (choice) => {
    const index = segments.findIndex((s) => s.key === mention.key);
    const seg = segments[index];
    const el = inputs.current.get(seg.key);
    const caret = el ? el.selectionStart : mention.start + 1 + mention.query.length;
    const before = seg.text.slice(0, mention.start);
    const after = seg.text.slice(caret);
    setMention(null);

    // Commande de hasard : en début de ligne, la ligne devient ce jet ; sinon une nouvelle ligne de jet commence,
    // au nom des mêmes personnages
    if (choice.command) {
      if (!before.trim()) {
        update(seg.key, { command: choice.command, text: after.replace(/^\s+/, '') });
        return focus(seg.key, 0);
      }
      const next = segment(seg.characterIds, after.replace(/^\s+/, ''), choice.command);
      setSegments((list) => [...list.slice(0, index), { ...seg, text: before.replace(/\s+$/, '') }, next, ...list.slice(index + 1)]);
      return focus(next.key, 0);
    }

    // Narrateur : la ligne devient de la narration (« / » en début de ligne), ou une ligne de narration commence
    if (choice.narrator) {
      if (!before.trim()) {
        update(seg.key, { characterIds: [], text: after.replace(/^\s+/, '') });
        return focus(seg.key, 0);
      }
      const next = segment([], after.replace(/^\s+/, ''));
      setSegments((list) => [...list.slice(0, index), { ...seg, text: before.replace(/\s+$/, '') }, next, ...list.slice(index + 1)]);
      return focus(next.key, 0);
    }

    const character = choice;
    // « / » en tout début de ligne : le personnage rejoint le groupe de cette ligne
    if (!before.trim()) {
      const characterIds = seg.characterIds.includes(character.id) ? seg.characterIds : [...seg.characterIds, character.id];
      update(seg.key, { characterIds, text: after.replace(/^\s+/, '') });
      return focus(seg.key, 0);
    }
    // Sinon : la ligne s'arrête là, une nouvelle commence avec ce badge
    const next = segment([character.id], after.replace(/^\s+/, ''));
    setSegments((list) => [...list.slice(0, index), { ...seg, text: before.replace(/\s+$/, '') }, next, ...list.slice(index + 1)]);
    focus(next.key, 0);
  };

  const removeCharacter = (seg, id) => {
    update(seg.key, { characterIds: seg.characterIds.filter((c) => c !== id) });
    focus(seg.key, 0);
  };

  const onKeyDown = (seg, index, e) => {
    if (e.nativeEvent.isComposing) return;
    // Suggestions ouvertes : navigation et choix au clavier
    if (mention?.key === seg.key && suggestions.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setMention((m) => ({ ...m, active: (m.active + step + suggestions.length) % suggestions.length }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        choose(suggestions[mention.active] || suggestions[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    const { selectionStart, selectionEnd, value } = e.target;
    const atStart = selectionStart === 0 && selectionEnd === 0;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (e.key === 'Backspace' && atStart) {
      // Début de ligne : retire le jet, puis le dernier badge, puis fusionne avec la ligne précédente
      if (seg.command) {
        e.preventDefault();
        update(seg.key, { command: null });
      } else if (seg.characterIds.length) {
        e.preventDefault();
        update(seg.key, { characterIds: seg.characterIds.slice(0, -1) });
      } else if (index > 0) {
        e.preventDefault();
        const prev = segments[index - 1];
        const joined = prev.text && seg.text ? `${prev.text} ${seg.text}` : prev.text + seg.text;
        setSegments((list) => list.filter((s) => s.key !== seg.key).map((s) => (s.key === prev.key ? { ...s, text: joined } : s)));
        focus(prev.key, prev.text.length);
      }
    } else if (e.key === 'ArrowUp' && atStart && index > 0) {
      e.preventDefault();
      moveTo(segments[index - 1].key, 'end');
    } else if (e.key === 'ArrowDown' && selectionStart === value.length && index < segments.length - 1) {
      e.preventDefault();
      moveTo(segments[index + 1].key, 0);
    }
  };

  // Messages à envoyer : une ligne = un message (lignes vides ignorées, sauf un jet ; image et son vont au dernier)
  const parts = segments
    .map((s) => ({ content: s.text.trim(), characterIds: s.characterIds, ...(s.command && { command: s.command }) }))
    .filter((p) => p.content || p.command);
  if ((image || sound) && !parts.length) parts.push({ content: '', characterIds: segments[segments.length - 1].characterIds });
  const canSend = parts.length > 0 && !sending;

  const send = async () => {
    if (!canSend) return;
    try {
      await onSend({ parts, image: image?.file, sound: sound?.file });
      // Le groupe de la dernière ligne est repris pour la suite
      const keep = segments[segments.length - 1].characterIds;
      writeSpeakers(storageKey, keep);
      const fresh = segment(keep);
      setSegments([fresh]);
      setImage(null);
      setSound(null);
      setMention(null);
      focus(fresh.key, 0);
    } catch {
      /* erreur affichée par la page ; le texte est conservé */
    }
  };

  return (
    <div
      className={cx(styles.composer, dragging && styles.dropping)}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false)}
      onDrop={(e) => {
        const file = imageFrom(e.dataTransfer);
        setDragging(false);
        if (!file) return;
        e.preventDefault();
        attach(file);
      }}
    >
      {help && (
        <div className={styles.help} role="note" aria-label="Balises du roleplay">
          <div className={styles.helpRow}>
            <code>/nom</code>
            <span className={styles.helpLabel}>Personnage</span>
            <span className={styles.helpText}>Nouvelle ligne à son nom · « // » au début d’une ligne : plusieurs personnages ensemble</span>
          </div>
          <div className={styles.helpRow}>
            <code>/???</code>
            <span className={styles.helpLabel}>Inconnu</span>
            <span className={styles.helpText}>Personnage inconnu (« ??? ») · jusqu’à {UNKNOWN_SPEAKERS.length} différents : « /??2 », « /??3 »…</span>
          </div>
          <div className={styles.helpRow}>
            <code>/narrateur</code>
            <span className={styles.helpLabel}>Narrateur</span>
            <span className={styles.helpText}>Nouvelle ligne de narration, sans personnage</span>
          </div>
          <div className={styles.helpRow}>
            <code>/d20 · /2d6+1</code>
            <span className={styles.helpLabel}>Dés</span>
            <span className={styles.helpText}>Jet tiré au hasard par le serveur ({RP_COMMANDS.filter((c) => c.kind === 'dice').map((c) => c.command).join(', ')}, ou n’importe quel « XdY+Z »)</span>
          </div>
          <div className={styles.helpRow}>
            <code>/pileface</code>
            <span className={styles.helpLabel}>Hasard</span>
            <span className={styles.helpText}>Pile ou face · le texte de la ligne sert de commentaire</span>
          </div>
          <div className={styles.helpRow}>
            <code>/fond · /fin-fond</code>
            <span className={styles.helpLabel}>Fond</span>
            <span className={styles.helpText}>Change le fond du fil avec l’image jointe (sans image : le retire) quand on arrive à ce message · /fin-fond : retour au fond de départ</span>
          </div>
          {soundEnabled && (
            <div className={styles.helpRow}>
              <code>/ambiance · /fin-ambiance</code>
              <span className={styles.helpLabel}>Ambiance</span>
              <span className={styles.helpText}>Change l’ambiance avec le son joint (sans son : silence) · /fin-ambiance : retour à celle de départ</span>
            </div>
          )}
          {RP_MARKUP.map((m) => (
            <div key={m.type} className={styles.helpRow}>
              <code>{m.hint}</code>
              <span className={styles.helpLabel}>{m.label}</span>
              {/* Exemples de dialogue (texte sans balise, « ! », onomatopée) : dans un message de personnage */}
              <MessageContent content={m.example} plain={m.type === 'narration' ? 'narration' : 'dialogue'} />
            </div>
          ))}
        </div>
      )}
      {preview && parts.some((p) => p.content || p.command) && (
        <div className={styles.preview} aria-label="Aperçu">
          {parts.filter((p) => p.content || p.command).map((p, i) => (
            <div key={i} className={styles.previewPart}>
              <p className={styles.previewSpeakers}>{p.characterIds.map((id) => characterName(byId.get(id))).join(' & ') || 'Narration'}</p>
              {p.command && <p className={styles.previewCommand}>Commande : /{p.command}</p>}
              {p.content && <MessageContent content={p.content} plain={p.characterIds.length ? 'dialogue' : 'narration'} />}
            </div>
          ))}
        </div>
      )}
      {(image || sound) && (
        <div className={cx(styles.attachment, styles.attachments)}>
          {image && (
            <span>
              <img src={image.url} alt="Image jointe" />
              <button type="button" onClick={() => setImage(null)} aria-label="Retirer l’image" title="Retirer l’image">
                <X aria-hidden />
              </button>
            </span>
          )}
          {sound && (
            <span className={styles.soundAttachment}>
              <SoundPlayer src={sound.url} label={sound.file.name} />
              <button type="button" onClick={() => setSound(null)} aria-label="Retirer le son" title="Retirer le son">
                <X aria-hidden />
              </button>
            </span>
          )}
        </div>
      )}
      <div className={cx(styles.composerRow, styles.inputRow)}>
        {/* Hors de la zone des lignes (qui défile), pour ne pas être coupée */}
        {mention && suggestions.length > 0 && (
          <ul className={styles.mentions} role="listbox" aria-label="Personnages et commandes">
            {suggestions.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === mention.active}
                className={cx(styles.mention, i === mention.active && styles.mentionActive)}
                // mousedown : avant que la zone de texte perde le focus
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
                onMouseEnter={() => setMention((m) => ({ ...m, active: i }))}
              >
                {c.command ? (
                  <>
                    <span className={cx(styles.mentionAvatar, styles.narratorIcon)}>
                      <CommandIcon kind={c.kind} />
                    </span>
                    <span className={styles.mentionName}>/{c.command}</span>
                    <span className={styles.mentionTitle}>{c.label}</span>
                  </>
                ) : c.narrator ? (
                  <>
                    <span className={cx(styles.mentionAvatar, styles.narratorIcon)}>
                      <BookOpen aria-hidden />
                    </span>
                    <span className={styles.mentionName}>Narrateur</span>
                    <span className={styles.mentionTitle}>Nouvelle ligne de narration</span>
                  </>
                ) : (
                  <>
                    <CharacterAvatar character={c} round className={styles.mentionAvatar} />
                    <span className={styles.mentionName}>{characterName(c)}</span>
                    {c.title && <span className={styles.mentionTitle}>{c.title}</span>}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className={styles.lines}>
          {segments.map((seg, index) => (
            <div key={seg.key} className={styles.line}>
              {(seg.characterIds.length > 0 || seg.command) && (
                <span className={styles.badges}>
                  {seg.characterIds.map((id, i) => {
                    const c = byId.get(id);
                    return (
                      <Fragment key={id}>
                        {i > 0 && <span className={styles.badgeAmp}>&</span>}
                        <span className={styles.badge}>
                          {c && <CharacterAvatar character={c} round className={styles.badgeAvatar} />}
                          {c ? characterName(c) : 'Personnage'}
                          <button type="button" onClick={() => removeCharacter(seg, id)} aria-label={`Retirer ${c ? characterName(c) : 'ce personnage'}`}>
                            <X aria-hidden />
                          </button>
                        </span>
                      </Fragment>
                    );
                  })}
                  {seg.command && (
                    <span className={cx(styles.badge, styles.commandBadge)}>
                      <CommandIcon kind={matchCommands(seg.command)[0]?.kind} className={styles.badgeIcon} />
                      /{seg.command}
                      <button type="button" onClick={() => { update(seg.key, { command: null }); focus(seg.key, 0); }} aria-label={`Retirer la commande /${seg.command}`}>
                        <X aria-hidden />
                      </button>
                    </span>
                  )}
                </span>
              )}
              <textarea
                ref={(el) => (el ? inputs.current.set(seg.key, el) : inputs.current.delete(seg.key))}
                className={styles.lineInput}
                value={seg.text}
                rows={1}
                placeholder={
                  seg.command
                    ? findCommand(seg.command)?.hint || 'Commentaire du jet (facultatif)…'
                    : seg.characterIds.length
                      ? 'Ce qu’il dit *ce qu’il fait* (ce qu’il pense) ~ce qu’il chuchote~…'
                      : index === 0
                        ? characters.length
                          ? 'Narration… ou « / » pour un personnage ou un jet (/d20)'
                          : 'Narration, ((HRP)) ou « /d20 »…'
                        : 'Narration…'
                }
                onChange={(e) => onChange(seg, e)}
                onKeyDown={(e) => onKeyDown(seg, index, e)}
                onBlur={() => setMention((m) => (m?.key === seg.key ? null : m))}
                onPaste={(e) => {
                  const file = imageFrom(e.clipboardData);
                  if (!file) return;
                  e.preventDefault();
                  attach(file);
                }}
                aria-label={seg.characterIds.length ? `Message de ${seg.characterIds.map((id) => characterName(byId.get(id))).join(' et ')}` : 'Narration'}
                aria-expanded={mention?.key === seg.key && suggestions.length > 0}
                aria-autocomplete="list"
              />
            </div>
          ))}
        </div>
        <div className={styles.composerTools}>
          <button type="button" className={styles.toolButton} onClick={() => fileRef.current?.click()} title="Joindre une image (ou coller, glisser-déposer)" aria-label="Joindre une image">
            <ImagePlus aria-hidden />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              attach(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {soundEnabled && (
            <>
              <button type="button" className={styles.toolButton} onClick={() => soundRef.current?.click()} title="Joindre un son (joué chez les autres à son arrivée)" aria-label="Joindre un son">
                <Music aria-hidden />
              </button>
              <input
                ref={soundRef}
                type="file"
                accept={SOUND_ACCEPT}
                hidden
                onChange={(e) => {
                  attach(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </>
          )}
          <button type="button" className={cx(styles.toolButton, help && styles.toolOn)} aria-pressed={help} onClick={() => setHelp((h) => !h)} title="Balises" aria-label="Afficher les balises">
            <CircleHelp aria-hidden />
          </button>
          <button type="button" className={cx(styles.toolButton, preview && styles.toolOn)} aria-pressed={preview} onClick={() => setPreview((p) => !p)} title="Aperçu" aria-label="Aperçu du message">
            <Eye aria-hidden />
          </button>
          <button type="button" className={styles.sendButton} onClick={send} disabled={!canSend} aria-label="Envoyer" title={parts.length > 1 ? `Envoyer ${parts.length} messages (Entrée)` : 'Envoyer (Entrée)'}>
            <SendHorizontal aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
