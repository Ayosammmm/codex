import { Fragment, useEffect, useRef, useState } from 'react';
import { CircleHelp, Eye, ImagePlus, SendHorizontal, X } from '@/components/ui/icons';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { characterName } from '@/config/characters';
import { normalizeText } from '@/components/entity/useListState';
import { cx } from '@/components/ui/cx';
import { RpContent } from './RpMessage';
import { RP_MARKUP } from './rpMarkup';
import styles from './Roleplay.module.scss';

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
const segment = (characterIds = [], text = '') => ({ key: ++nextKey, characterIds, text });

/** « /ber » en cours de saisie juste avant le curseur : { start, query }, sinon null. */
function mentionAt(text, caret) {
  const before = text.slice(0, caret);
  const match = /(^|\s)\/([^\s/]*)$/.exec(before);
  return match ? { start: caret - match[2].length - 1, query: match[2] } : null;
}

/** Personnages dont un mot du nom (ou le nom complet) commence par la recherche. */
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
 * Saisie du roleplay, en lignes : chaque ligne est un message, au nom des personnages de ses badges
 * (sans badge : narration, ou HRP si tout est entre (( ))).
 * - « / » puis le début d'un nom propose les personnages jouables ; le choix ouvre une nouvelle ligne
 *   avec ce badge. Un « / » au tout début d'une ligne qui a déjà un badge ajoute un personnage au même groupe
 *   (« // » : plusieurs personnages parlent en même temps).
 * - Retour arrière en début de ligne : retire le dernier badge, puis fusionne avec la ligne précédente.
 * - Entrée envoie toutes les lignes d'un coup, Maj+Entrée va à la ligne.
 * - Une image peut être jointe (bouton, collage, glisser-déposer ; 5 Mo max), au dernier message.
 * Le groupe de la dernière ligne est repris pour le message suivant (mémorisé par lieu : `storageKey`).
 * `characters` : personnages que l'utilisateur peut jouer ; `onSend({ parts, image })` ; `onError(message)`.
 */
export function RpComposer({ characters, storageKey, onSend, onError, sending }) {
  const byId = new Map(characters.map((c) => [c.id, c]));
  const [segments, setSegments] = useState(() => [segment(readSpeakers(storageKey).filter((id) => byId.has(id)))]);
  const [mention, setMention] = useState(null); // { key, start, query, active }
  const [help, setHelp] = useState(false);
  const [preview, setPreview] = useState(false);
  const [image, setImage] = useState(null); // { file, url }
  const [dragging, setDragging] = useState(false);
  const inputs = useRef(new Map());
  const focusRequest = useRef(null); // { key, caret } appliqué après le rendu
  const fileRef = useRef(null);

  // Aperçu local de l'image : URL libérée quand elle change ou à la fermeture
  useEffect(() => () => image && URL.revokeObjectURL(image.url), [image]);

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

  const suggestions = mention ? matchCharacters(characters, mention.query) : [];

  const attach = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return onError?.('Seules les images peuvent être envoyées.');
    if (file.size > MAX_IMAGE_SIZE) return onError?.('Image trop lourde (5 Mo maximum).');
    setImage({ file, url: URL.createObjectURL(file) });
  };
  const imageFrom = (dataTransfer) => [...(dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'));

  const update = (key, patch) => setSegments((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const onChange = (seg, e) => {
    const { value, selectionStart } = e.target;
    update(seg.key, { text: value });
    const found = characters.length ? mentionAt(value, selectionStart) : null;
    setMention(found ? { key: seg.key, ...found, active: 0 } : null);
  };

  /** Choix d'un personnage pour le « /recherche » en cours. */
  const choose = (character) => {
    const index = segments.findIndex((s) => s.key === mention.key);
    const seg = segments[index];
    const el = inputs.current.get(seg.key);
    const caret = el ? el.selectionStart : mention.start + 1 + mention.query.length;
    const before = seg.text.slice(0, mention.start);
    const after = seg.text.slice(caret);
    setMention(null);

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
      // Début de ligne : retire le dernier badge, puis fusionne avec la ligne précédente
      if (seg.characterIds.length) {
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

  // Messages à envoyer : une ligne = un message (lignes vides ignorées ; l'image va au dernier)
  const parts = segments.map((s) => ({ content: s.text.trim(), characterIds: s.characterIds })).filter((p) => p.content);
  if (image && !parts.length) parts.push({ content: '', characterIds: segments[segments.length - 1].characterIds });
  const canSend = parts.length > 0 && !sending;

  const send = async () => {
    if (!canSend) return;
    try {
      await onSend({ parts, image: image?.file });
      // Le groupe de la dernière ligne est repris pour la suite
      const keep = segments[segments.length - 1].characterIds;
      writeSpeakers(storageKey, keep);
      const fresh = segment(keep);
      setSegments([fresh]);
      setImage(null);
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
          {RP_MARKUP.map((m) => (
            <div key={m.type} className={styles.helpRow}>
              <code>{m.hint}</code>
              <span className={styles.helpLabel}>{m.label}</span>
              <RpContent content={m.example} />
            </div>
          ))}
        </div>
      )}
      {preview && parts.some((p) => p.content) && (
        <div className={styles.preview} aria-label="Aperçu">
          {parts.filter((p) => p.content).map((p, i) => (
            <div key={i} className={styles.previewPart}>
              <p className={styles.previewSpeakers}>{p.characterIds.map((id) => characterName(byId.get(id))).join(' & ') || 'Narration'}</p>
              <RpContent content={p.content} plain={p.characterIds.length ? 'dialogue' : 'narration'} />
            </div>
          ))}
        </div>
      )}
      {image && (
        <div className={styles.attachment}>
          <span>
            <img src={image.url} alt="Image jointe" />
            <button type="button" onClick={() => setImage(null)} aria-label="Retirer l’image" title="Retirer l’image">
              <X aria-hidden />
            </button>
          </span>
        </div>
      )}
      <div className={cx(styles.composerRow, styles.inputRow)}>
        {/* Hors de la zone des lignes (qui défile), pour ne pas être coupée */}
        {mention && suggestions.length > 0 && (
          <ul className={styles.mentions} role="listbox" aria-label="Personnages">
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
                <CharacterAvatar character={c} round className={styles.mentionAvatar} />
                <span className={styles.mentionName}>{characterName(c)}</span>
                {c.title && <span className={styles.mentionTitle}>{c.title}</span>}
              </li>
            ))}
          </ul>
        )}
        <div className={styles.lines}>
          {segments.map((seg, index) => (
            <div key={seg.key} className={styles.line}>
              {seg.characterIds.length > 0 && (
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
                </span>
              )}
              <textarea
                ref={(el) => (el ? inputs.current.set(seg.key, el) : inputs.current.delete(seg.key))}
                className={styles.lineInput}
                value={seg.text}
                rows={Math.min(8, Math.max(1, seg.text.split('\n').length))}
                placeholder={
                  seg.characterIds.length
                    ? 'Ce qu’il dit *ce qu’il fait* (ce qu’il pense) ~ce qu’il chuchote~…'
                    : index === 0
                      ? characters.length
                        ? 'Narration… ou « / » pour faire parler un personnage'
                        : 'Narration ou ((HRP))…'
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
