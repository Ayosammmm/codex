import { IMG } from '@/api/client';
import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import { entityColorVars } from '@/theme/universeTheme';
import { plural } from '@/utils/universe';
import { AvatarStack, EntityBanner } from './EntityBanner';
import styles from './EntityTree.module.scss';

/**
 * Arborescence d'entités imbriquées par `parentId` (lieux, espèces...). Un élément dont le parent
 * n'est pas dans la liste (filtrée) devient une racine. Chaque branche se replie.
 * - `image(item)` : vignette ; `subtitle(item)` : précision à côté du nom
 * - `childNoun` : [singulier, pluriel] des enfants ; `members(item)` / `memberCount(item)` : personnages liés
 */
export function EntityTree({ items, linkTo, image, subtitle, childNoun, members, memberCount }) {
  const ids = new Set(items.map((i) => i.id));
  const childrenOf = new Map();
  for (const item of items) {
    const parent = ids.has(item.parentId) ? item.parentId : null;
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(item);
  }
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggle = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderLevel = (parentId, depth) => (
    <ul className={depth === 0 ? styles.tree : styles.branch}>
      {(childrenOf.get(parentId) || []).map((item) => {
        const kids = childrenOf.get(item.id) || [];
        const open = !collapsed.has(item.id);
        const count = memberCount?.(item) || 0;
        return (
          <li key={item.id}>
            <div className={styles.node} style={entityColorVars(item.colors)}>
              {kids.length > 0 ? (
                <button
                  type="button"
                  className={cx(styles.toggle, open && styles.toggleOpen)}
                  aria-expanded={open}
                  aria-label={open ? `Replier ${item.name}` : `Déplier ${item.name}`}
                  onClick={() => toggle(item.id)}
                >
                  <ChevronRight aria-hidden />
                </button>
              ) : (
                <span className={styles.toggleSpacer} />
              )}
              <EntityBanner src={image(item, IMG.thumb)} className={styles.nodeThumb} />
              <Link to={linkTo(item)} className={styles.nodeName}>
                {item.name}
              </Link>
              {subtitle?.(item) && <span className={styles.nodeType}>{subtitle(item)}</span>}
              <span className={styles.nodeMeta}>
                {kids.length > 0 && plural(kids.length, ...childNoun)}
                {count > 0 && <AvatarStack members={members(item)} total={count} className={styles.stack} />}
              </span>
            </div>
            {kids.length > 0 && open && renderLevel(item.id, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  return <div className={styles.treeWrap}>{renderLevel(null, 0)}</div>;
}
