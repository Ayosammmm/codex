import { useState } from 'react';
import { Link } from 'react-router';
import { Pencil, Trash2 } from '@/components/ui/icons';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { characterName } from '@/config/characters';
import { cx } from '@/components/ui/cx';
import { universePath } from '@/utils/universe';
import { formatRpDate, parseRp } from './rpMarkup';
import { RpImage } from './RpImage';
import styles from './Roleplay.module.scss';

/**
 * Texte d'un message découpé selon les balises : chaque passage (narration, action, dialogue, pensée,
 * onomatopée, HRP) est sur sa propre ligne. `hideHrp` retire les passages HRP.
 */
export function RpContent({ content, hideHrp = false }) {
  const segments = parseRp(content).filter((s) => !(hideHrp && s.type === 'hrp'));
  return (
    <div className={styles.content}>
      {segments.map((s, i) => (
        <p key={i} className={styles[s.type]}>
          {s.type === 'hrp' && <span className={styles.hrpTag}>HRP</span>}
          {s.text}
        </p>
      ))}
    </div>
  );
}

const shortTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/**
 * Un message du fil. Trois présentations :
 * - au nom de personnages : avatars, noms, rédacteur et heure ;
 * - sans personnage : narration, sans avatar ni nom (rédacteur et heure au survol) ;
 * - sans personnage et entièrement HRP : hors roleplay, au nom du joueur.
 * `continued` : suite d'un message du même rédacteur, avec les mêmes personnages : l'en-tête n'est pas répété
 * (heure au survol, dans la colonne des avatars).
 * - `canManage` : auteur ou admin (modifier / supprimer)
 * - `selectable` / `selected` / `onSelect(event)` : mode « scènes » (case à cocher ; un clic n'importe où sur
 *   le message la coche aussi, Maj+clic pour une plage)
 */
export function RpMessage({ universe, message, charactersById, hideHrp, continued = false, canManage, onSave, onDelete, selectable, selected, onSelect, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const speakers = message.characterIds.map((id) => charactersById.get(id)).filter(Boolean);
  const edited = new Date(message.updatedAt) - new Date(message.createdAt) > 2000;
  const authorName = message.author?.displayName || 'Compte supprimé';
  const narration = !speakers.length && !message.isHrp;
  const compact = continued || narration; // pas d'en-tête

  if (hideHrp && message.isHrp) return null;

  const save = async () => {
    const text = draft.trim();
    // Texte vide accepté si le message garde son image
    if ((!text && !message.imagePath) || text === message.content) return setEditing(false);
    await onSave(text);
    setEditing(false);
  };

  const timeTitle = [`${formatRpDate(message.createdAt)} · par ${authorName}`, edited && `modifié le ${formatRpDate(message.updatedAt)}`].filter(Boolean).join(' · ');
  const actions = canManage && !editing && !selectable && (
    <span className={cx(styles.actions, compact && styles.floatingActions)}>
      <button type="button" onClick={() => { setDraft(message.content); setEditing(true); }} aria-label="Modifier le message" title="Modifier">
        <Pencil aria-hidden />
      </button>
      <button type="button" onClick={onDelete} aria-label="Supprimer le message" title="Supprimer">
        <Trash2 aria-hidden />
      </button>
    </span>
  );
  const label = narration ? `Narration de ${authorName}` : `Message de ${speakers.map(characterName).join(' & ') || authorName}`;

  return (
    <article
      className={cx(
        styles.message,
        compact && styles.compact,
        narration && styles.narrationMessage,
        message.isHrp && styles.messageHrp,
        selectable && styles.selectable,
        selected && styles.selected,
        className,
      )}
      onClick={selectable ? (e) => !e.target.closest('a, input') && onSelect(e) : undefined}
      aria-label={label}
    >
      {selectable && (
        // onClick plutôt que onChange : l'événement porte la touche Maj
        <input type="checkbox" className={styles.select} checked={selected} onChange={() => {}} onClick={onSelect} aria-label="Sélectionner ce message" />
      )}
      <div className={styles.avatars}>
        {compact ? (
          <time className={styles.sideTime} dateTime={message.createdAt} title={timeTitle}>
            {shortTime.format(new Date(message.createdAt))}
          </time>
        ) : speakers.length ? (
          speakers.slice(0, 3).map((c) => <CharacterAvatar key={c.id} character={c} round className={styles.avatar} />)
        ) : (
          <span className={cx(styles.avatar, styles.playerAvatar)} aria-hidden>{authorName.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className={styles.body}>
        {!compact && (
          <header className={styles.header}>
            {speakers.length ? (
              <span className={styles.names}>
                {speakers.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && <span className={styles.amp}> & </span>}
                    <Link to={universePath(universe, `personnages/${c.id}`)} className={styles.name}>{characterName(c)}</Link>
                  </span>
                ))}
                <span className={styles.by}>par {authorName}</span>
              </span>
            ) : (
              <span className={styles.names}>
                <span className={styles.name}>{authorName}</span>
                <span className={styles.playerTag}>HRP</span>
              </span>
            )}
            <time className={styles.time} dateTime={message.createdAt} title={edited ? `Modifié le ${formatRpDate(message.updatedAt)}` : undefined}>
              {formatRpDate(message.createdAt)}
              {edited && ' · modifié'}
            </time>
            {actions}
          </header>
        )}
        {compact && actions}
        {editing ? (
          <div className={styles.editBox}>
            <textarea
              value={draft}
              autoFocus
              rows={Math.min(10, draft.split('\n').length + 1)}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  save();
                } else if (e.key === 'Escape') setEditing(false);
              }}
              aria-label="Modifier le message"
            />
            <p className={styles.editHint}>Entrée pour enregistrer · Échap pour annuler</p>
          </div>
        ) : (
          <>
            {message.content && <RpContent content={message.content} hideHrp={hideHrp} />}
            {message.imagePath && <RpImage path={message.imagePath} />}
          </>
        )}
      </div>
    </article>
  );
}
