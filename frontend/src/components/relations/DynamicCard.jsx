import { Link } from 'react-router';
import { characterName, relationLabel, relationRole, relationTone } from '@/config/characters';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { cx } from '@/components/ui/cx';
import { dynamicType } from '@/utils/dynamics';
import { universePath } from '@/utils/universe';
import styles from './DynamicCard.module.scss';

const list = (names) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} et ${names.at(-1)}`);

/** Phrase qui résume une dynamique (noms des personnages). */
function dynamicSentence(d, byId) {
  const n = (id) => characterName(byId.get(id));
  const others = d.members.filter((id) => id !== d.focus).map(n);
  switch (d.type) {
    case 'triangle':
      return `${n(d.focus)} est lié·e sentimentalement à ${list(others)}, qui ne le sont pas entre eux.`;
    case 'band':
      return `${list(d.members.map(n))} sont tous liés positivement.`;
    case 'trio':
      return `${list(d.members.map(n))} s’apprécient mutuellement.`;
    case 'torn':
      return `${n(d.focus)} apprécie ${list(others)}, qui s’opposent.`;
    case 'common-enemy':
      return `${list(others)}, alliés, s’opposent tous deux à ${n(d.focus)}.`;
    case 'conflict':
      return `${list(d.members.map(n))} s’opposent tous entre eux.`;
    case 'disciples':
      return `${list(others)}, liés hiérarchiquement à ${n(d.focus)}, s’opposent.`;
    case 'divided':
      return `Au sein de « ${d.group.name} », ${d.links.length} relation${d.links.length > 1 ? 's' : ''} conflictuelle${d.links.length > 1 ? 's' : ''}.`;
    default:
      return '';
  }
}

/**
 * Carte d'une dynamique : type, phrase de résumé, personnages et relations concernées.
 * `compact` : version courte (fiche personnage), sans le détail des relations.
 */
export function DynamicCard({ universe, dynamic: d, byId, compact = false }) {
  const type = dynamicType(d.type);
  return (
    <article className={cx(styles.card, compact && styles.compact)} style={{ '--dynamic': type.color }}>
      <p className={styles.type}>{type.label}</p>
      <p className={styles.sentence}>{dynamicSentence(d, byId)}</p>
      {!compact && (
        <>
          <ul className={styles.members}>
            {d.members.map((id) => {
              const c = byId.get(id);
              return (
                <li key={id}>
                  <Link to={universePath(universe, `personnages/${id}`)} className={cx(styles.member, id === d.focus && styles.focus)}>
                    <CharacterAvatar character={c} round className={styles.avatar} />
                    {characterName(c)}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className={styles.links}>
            {d.links.map(({ a, b, link }) => {
              const tone = relationTone(link.tone);
              // Nature à deux rôles : « Alice (Parent) — Bob (Enfant) »
              const named = (id) => {
                const role = relationRole(link, id);
                return role ? `${characterName(byId.get(id))} (${role})` : characterName(byId.get(id));
              };
              return (
                <li key={`${a}-${b}`} className={styles.link} data-sign={link.sign > 0 ? 'positive' : link.sign < 0 ? 'negative' : 'neutral'}>
                  <span className={styles.pair}>
                    {named(a)} — {named(b)}
                  </span>
                  <span className={styles.nature}>
                    {[relationLabel(link), tone?.label].filter(Boolean).join(' · ')}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </article>
  );
}
