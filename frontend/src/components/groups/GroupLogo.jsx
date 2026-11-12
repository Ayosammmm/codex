import { uploadUrl } from '@/api/client';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';

/**
 * Logo d'un groupe, ou ses initiales (deux premiers mots) sur sa couleur principale.
 * `src` force l'image (aperçu du formulaire). Taille et forme via `className`.
 */
export function GroupLogo({ group, src, round, className }) {
  const [first = '', second = ''] = (group?.name || '').trim().split(/\s+/);
  return (
    <CharacterAvatar
      character={{ firstname: first, name: second, colors: group?.colors }}
      src={src !== undefined ? src : uploadUrl(group?.image) || null}
      round={round}
      className={className}
    />
  );
}
