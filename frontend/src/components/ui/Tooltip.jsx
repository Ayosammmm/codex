import { useCallback, useEffect, useId, useRef } from 'react';
import { cx } from './cx';
import styles from './Tooltip.module.scss';

const GAP = 6; // écart entre l'élément et l'infobulle
const MARGIN = 8; // marge minimale avec les bords de la fenêtre

/**
 * Infobulle immédiate au survol, au focus ou au toucher de `children`.
 * Affichée dans la couche supérieure (API Popover) : jamais coupée par un conteneur
 * qui déborde, tout en héritant des couleurs et polices du thème de l'univers.
 * - `content`   : contenu de l'infobulle (rien → pas d'infobulle)
 * - `focusable` : rend l'élément atteignable au clavier (à éviter dans un lien ou un bouton)
 * - `wide`      : infobulle plus large (textes longs)
 * - `as`        : balise de l'élément déclencheur (span par défaut)
 */
export function Tooltip({ content, children, className, focusable = false, wide = false, as: Tag = 'span' }) {
  const id = useId();
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  // Après un clic dans l'élément (curseur que l'on fait glisser…), l'infobulle reste fermée jusqu'à la sortie
  const pressed = useRef(false);

  const hide = useCallback(() => {
    const tip = tipRef.current;
    if (tip?.matches(':popover-open')) tip.hidePopover();
  }, []);

  const show = useCallback(() => {
    const tip = tipRef.current;
    const trigger = triggerRef.current;
    if (!tip || !trigger || pressed.current) return;
    if (!tip.matches(':popover-open')) tip.showPopover();
    // Au-dessus, centrée ; en dessous s'il n'y a pas la place ; toujours dans la fenêtre
    const t = trigger.getBoundingClientRect();
    const { width, height } = tip.getBoundingClientRect();
    let top = t.top - height - GAP;
    if (top < MARGIN) top = Math.min(t.bottom + GAP, window.innerHeight - height - MARGIN);
    const left = Math.min(Math.max(MARGIN, t.left + t.width / 2 - width / 2), window.innerWidth - width - MARGIN);
    tip.style.top = `${Math.max(MARGIN, top)}px`;
    tip.style.left = `${Math.max(MARGIN, left)}px`;
  }, []);

  // Défilement ou redimensionnement : l'infobulle se ferme (sa position ne suit pas)
  useEffect(() => {
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [hide]);

  if (!content) return children;

  return (
    <Tag
      ref={triggerRef}
      className={cx(styles.trigger, className)}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={id}
      onPointerEnter={show}
      onPointerLeave={() => {
        pressed.current = false;
        hide();
      }}
      onPointerDown={() => {
        pressed.current = true;
        hide();
      }}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => e.key === 'Escape' && hide()}
    >
      {children}
      <span ref={tipRef} id={id} role="tooltip" popover="manual" className={cx(styles.tooltip, wide && styles.wide)}>
        {content}
      </span>
    </Tag>
  );
}
