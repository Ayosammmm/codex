import { Link } from 'react-router';
import { LogIn, LogOut, Sparkles } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { normalizeText } from '@/components/entity/useListState';
import { cx } from '@/components/ui/cx';
import { universePath } from '@/utils/universe';
import styles from '@/components/messages/Messages.module.scss';

// Genre du personnage (référence libre de l'univers) : accord « arrivée », « partie »
const isFeminine = (c) => /^(femme|femin|female|fille|woman|girl)/.test(normalizeText(c?.genders?.name || ''));

/** « Kazuo est arrivé », « Kazuo & Mei sont parties »… */
function sentence(characters, participle) {
  const names = characters.map(characterName).join(' & ');
  const plural = characters.length > 1;
  const suffix = `${characters.every(isFeminine) ? 'e' : ''}${plural ? 's' : ''}`;
  return `${names} ${plural ? 'sont' : 'est'} ${participle}${suffix}`;
}

/** Regroupe les déplacements par lieu : [{ placeId, messageId, characters }]. */
function byPlace(items, placeKey, messageKey, charactersById) {
  const groups = new Map();
  for (const item of items) {
    const character = charactersById.get(item.characterId);
    if (!character) continue;
    const key = item[placeKey] ?? 'new';
    if (!groups.has(key)) groups.set(key, { placeId: item[placeKey], messageId: item[messageKey], characters: [] });
    groups.get(key).characters.push(character);
  }
  return [...groups.values()];
}

/**
 * Notices de déplacement d'un message (calculées par le serveur, voir `travels` dans roleplayController.js) :
 * - kind="arrivals", avant le message : « Kazuo est arrivé ! » (toute première apparition) ou
 *   « Kazuo est arrivé depuis <lieu> », lien vers son dernier message là-bas ;
 * - kind="departures", après le message : « Kazuo est parti vers <lieu> », lien vers son message suivant.
 */
export function RpTravels({ universe, kind, items, charactersById, placesById }) {
  if (!items?.length) return null;
  const arrivals = kind === 'arrivals';
  const groups = byPlace(items, arrivals ? 'fromPlaceId' : 'toPlaceId', arrivals ? 'fromMessageId' : 'toMessageId', charactersById);
  if (!groups.length) return null;

  return groups.map((g) => {
    const place = g.placeId ? placesById.get(g.placeId) : null;
    const Icon = arrivals ? (g.placeId ? LogIn : Sparkles) : LogOut;
    const link = g.placeId && (
      <Link to={`${universePath(universe, `roleplay/lieux/${g.placeId}`)}?message=${g.messageId}`} className={styles.travelPlace}>
        {place?.name || 'un autre lieu'}
      </Link>
    );
    return (
      <p key={g.placeId ?? 'new'} className={cx(styles.travel, arrivals ? styles.travelIn : styles.travelOut)}>
        <Icon aria-hidden className={styles.travelIcon} />
        <span>
          {arrivals
            ? g.placeId
              ? <>{sentence(g.characters, 'arrivé')} depuis {link}</>
              : `${sentence(g.characters, 'arrivé')} !`
            : <>{sentence(g.characters, 'parti')} vers {link}</>}
        </span>
      </p>
    );
  });
}
