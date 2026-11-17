import { Layers, SquareCode } from '@/components/ui/icons';
import { BASE_ENTITIES } from './entityRefs';
import { modIcon } from './modIcons';
import styles from './Mods.module.scss';

/** Résumé de ce qu'apporte un mod : types de fiches, champs ajoutés, pages. */
export function ModContents({ mod }) {
  const fieldTargets = Object.entries(mod.fields || {});
  const items = [
    ...mod.entityTypes.map((t) => ({ key: `type-${t.key}`, Icon: modIcon(t.icon || mod.icon), text: t.plural })),
    ...fieldTargets.map(([type, fields]) => ({
      key: `fields-${type}`,
      Icon: Layers,
      text: `${fields.length} champ${fields.length > 1 ? 's' : ''} · ${BASE_ENTITIES[type]?.plural || type}`,
    })),
    ...mod.pages.map((p) => ({ key: `page-${p.key}`, Icon: p.icon ? modIcon(p.icon) : SquareCode, text: p.label })),
  ];
  if (!items.length) return null;
  return (
    <ul className={styles.modContents} aria-label="Contenu du mod">
      {items.map(({ key, Icon, text }) => (
        <li key={key}>
          <Icon aria-hidden /> {text}
        </li>
      ))}
    </ul>
  );
}
