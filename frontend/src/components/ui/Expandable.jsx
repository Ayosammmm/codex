import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from '@/components/ui/icons';
import { cx } from './cx';
import styles from './Expandable.module.scss';

/**
 * Contenu replié à une hauteur maximale, avec un bouton « Lire la suite » / « Réduire ».
 * Le bouton n'apparaît que si le contenu dépasse réellement (mesuré, y compris au redimensionnement).
 * `collapsedHeight` : hauteur repliée, en rem.
 */
export function Expandable({ children, collapsedHeight = 9, className, moreLabel = 'Lire la suite', lessLabel = 'Réduire' }) {
  const id = useId();
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [fullHeight, setFullHeight] = useState(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const limit = collapsedHeight * rem;
      setFullHeight(content.scrollHeight);
      setOverflowing(content.scrollHeight > limit + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [collapsedHeight]);

  const toggle = () => {
    // En repliant un long texte, on revient au début s'il est sorti de l'écran
    if (expanded && rootRef.current.getBoundingClientRect().top < 0) {
      rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setExpanded((v) => !v);
  };

  const collapsed = overflowing && !expanded;

  return (
    <div ref={rootRef} className={className}>
      <div
        id={id}
        className={cx(styles.viewport, expanded && styles.expanded, collapsed && styles.fade)}
        style={{
          '--collapsed-height': `${collapsedHeight}rem`,
          ...(fullHeight ? { '--full-height': `${fullHeight}px` } : {}),
        }}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      {overflowing && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={toggle}
          className={cx(styles.toggle, expanded && styles.toggleOpen)}
        >
          {expanded ? lessLabel : moreLabel}
          <ChevronDown aria-hidden />
        </button>
      )}
    </div>
  );
}
