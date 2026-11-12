import { Link } from 'react-router';
import { characterName } from '@/config/characters';
import { entityColorVars } from '@/theme/universeTheme';
import { universePath } from '@/utils/universe';
import { CharacterAvatar } from './CharacterAvatar';
import styles from './CharacterChip.module.scss';

/** Vignette cliquable d'un personnage (organigramme, originaires d'un lieu...). `note` : précision sous le titre. */
export function CharacterChip({ universe, character: c, note }) {
  return (
    <Link to={universePath(universe, `personnages/${c.id}`)} className={styles.chip} style={entityColorVars(c.colors)}>
      <CharacterAvatar character={c} round className={styles.avatar} />
      <span className={styles.name}>{characterName(c)}</span>
      {c.title && <span className={styles.title}>{c.title}</span>}
      {note && <span className={styles.title}>{note}</span>}
    </Link>
  );
}
