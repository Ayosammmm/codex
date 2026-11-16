import { useEffect, useRef, useState } from 'react';
import { CircleHelp, Eye, ImagePlus, SendHorizontal, X } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';
import { Combobox } from '@/components/ui/Combobox';
import { cx } from '@/components/ui/cx';
import { RpContent } from './RpMessage';
import { RP_MARKUP } from './rpMarkup';
import styles from './Roleplay.module.scss';

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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // même limite que le serveur

/**
 * Saisie d'un message : personnages au nom desquels on écrit (aucun = narration, ou HRP si tout est entre (( ))),
 * texte à balises.
 * Une image peut être jointe : bouton, collage (Ctrl+V) ou glisser-déposer ; 5 Mo maximum.
 * Entrée envoie, Maj+Entrée va à la ligne. Les personnages choisis sont mémorisés par lieu (`storageKey`).
 * `characters` : personnages que l'utilisateur peut jouer ; `onError(message)` : image refusée.
 */
export function RpComposer({ characters, storageKey, onSend, onError, sending }) {
  const playable = new Set(characters.map((c) => c.id));
  const [speakers, setSpeakers] = useState(() => readSpeakers(storageKey).filter((id) => playable.has(id)));
  const [text, setText] = useState('');
  const [help, setHelp] = useState(false);
  const [preview, setPreview] = useState(false);
  const [image, setImage] = useState(null); // { file, url }
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  // Aperçu local de l'image : URL libérée quand elle change ou à la fermeture
  useEffect(() => () => image && URL.revokeObjectURL(image.url), [image]);

  const attach = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return onError?.('Seules les images peuvent être envoyées.');
    if (file.size > MAX_IMAGE_SIZE) return onError?.('Image trop lourde (5 Mo maximum).');
    setImage({ file, url: URL.createObjectURL(file) });
    inputRef.current?.focus();
  };
  const imageFrom = (dataTransfer) => [...(dataTransfer?.files || [])].find((f) => f.type.startsWith('image/'));

  const options = characters.map((c) => ({ value: c.id, label: characterName(c), description: c.title || undefined, image: uploadUrl(c.avatar) }));

  const chooseSpeakers = (ids) => {
    setSpeakers(ids);
    writeSpeakers(storageKey, ids);
  };

  const send = async () => {
    const content = text.trim();
    if ((!content && !image) || sending) return;
    try {
      await onSend({ content, characterIds: speakers, image: image?.file });
      setText('');
      setImage(null);
      inputRef.current?.focus();
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
          {RP_MARKUP.map((m) => (
            <div key={m.type} className={styles.helpRow}>
              <code>{m.hint}</code>
              <span className={styles.helpLabel}>{m.label}</span>
              <RpContent content={m.type === 'narration' ? m.example : m.example} />
            </div>
          ))}
        </div>
      )}
      {preview && text.trim() && (
        <div className={styles.preview} aria-label="Aperçu">
          <RpContent content={text} />
        </div>
      )}
      <div className={styles.composerRow}>
        <div className={styles.speakers}>
          <Combobox
            multiple
            options={options}
            value={speakers}
            onChange={chooseSpeakers}
            placeholder={characters.length ? 'Narration (aucun personnage)… ou choisir des personnages' : 'Aucun personnage jouable : vous écrivez de la narration ou du ((HRP))'}
            emptyText="Aucun personnage"
            aria-label="Personnages qui s’expriment"
          />
        </div>
      </div>
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
      <div className={styles.composerRow}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={text}
          rows={Math.min(8, Math.max(2, text.split('\n').length))}
          placeholder="*action* « dialogue » (pensée) !!onomatopée!! ((HRP))"
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const file = imageFrom(e.clipboardData);
            if (!file) return;
            e.preventDefault();
            attach(file);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          aria-label="Message"
        />
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
          <button type="button" className={styles.sendButton} onClick={send} disabled={(!text.trim() && !image) || sending} aria-label="Envoyer" title="Envoyer (Entrée)">
            <SendHorizontal aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
