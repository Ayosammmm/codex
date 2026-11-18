import { CharacterAvatar } from '@/components/characters/CharacterAvatar';

/**
 * Logo d'un groupe, ou ses initiales (deux premiers mots) sur sa couleur principale.
 * `src` force l'image (aperçu du formulaire). Taille et forme via `className`.
 */
export function GroupLogo({ group, src, round, className }) {
  const [first = '', second = ''] = (group?.name || '').trim().split(/\s+/);
  return (
    <CharacterAvatar
      // Chemin brut : l'avatar choisit lui-même la taille de la vignette
      character={{ firstname: first, name: second, colors: group?.colors, avatar: group?.image }}
      src={src}
      round={round}
      className={className}
    />
  );
}
