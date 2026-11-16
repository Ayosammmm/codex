import { useRef, useState } from 'react';
import { CircleHelp, Eye, SendHorizontal } from '@/components/ui/icons';
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

/**
 * Saisie d'un message : personnages au nom desquels on écrit (aucun = narration, ou HRP si tout est entre (( ))),
 * texte à balises.
 * Entrée envoie, Maj+Entrée va à la ligne. Les personnages choisis sont mémorisés par lieu (`storageKey`).
 * `characters` : personnages que l'utilisateur peut jouer.
 */
export function RpComposer({ characters, storageKey, onSend, sending }) {
  const playable = new Set(characters.map((c) => c.id));
  const [speakers, setSpeakers] = useState(() => readSpeakers(storageKey).filter((id) => playable.has(id)));
  const [text, setText] = useState('');
  const [help, setHelp] = useState(false);
  const [preview, setPreview] = useState(false);
  const inputRef = useRef(null);

  const options = characters.map((c) => ({ value: c.id, label: characterName(c), description: c.title || undefined, image: uploadUrl(c.avatar) }));

  const chooseSpeakers = (ids) => {
    setSpeakers(ids);
    writeSpeakers(storageKey, ids);
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    try {
      await onSend({ content, characterIds: speakers });
      setText('');
      inputRef.current?.focus();
    } catch {
      /* erreur affichée par la page ; le texte est conservé */
    }
  };

  return (
    <div className={styles.composer}>
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
      <div className={styles.composerRow}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={text}
          rows={Math.min(8, Math.max(2, text.split('\n').length))}
          placeholder="*action* « dialogue » (pensée) !!onomatopée!! ((HRP))"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          aria-label="Message"
        />
        <div className={styles.composerTools}>
          <button type="button" className={cx(styles.toolButton, help && styles.toolOn)} aria-pressed={help} onClick={() => setHelp((h) => !h)} title="Balises" aria-label="Afficher les balises">
            <CircleHelp aria-hidden />
          </button>
          <button type="button" className={cx(styles.toolButton, preview && styles.toolOn)} aria-pressed={preview} onClick={() => setPreview((p) => !p)} title="Aperçu" aria-label="Aperçu du message">
            <Eye aria-hidden />
          </button>
          <button type="button" className={styles.sendButton} onClick={send} disabled={!text.trim() || sending} aria-label="Envoyer" title="Envoyer (Entrée)">
            <SendHorizontal aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
