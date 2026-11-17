/* eslint-disable react-refresh/only-export-components -- vues et colonnes d'une même famille */
import { Link } from 'react-router';
import { CornerDownRight } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { EntityTree } from '@/components/entity/EntityTree';
import { NameCell, dash } from '@/components/entity/EntityTable';
import { entityColorVars } from '@/theme/universeTheme';
import { plural } from '@/utils/universe';
import { FieldValue, fieldColumns, hasValue } from './modFields';
import gallery from '@/components/species/SpeciesViews.module.scss';
import styles from './Mods.module.scss';

export const customImage = (e) => uploadUrl(e?.image);
export const childCount = (e) => e.children?.length || 0;
const valuesOf = (e) => e.data;

/** Galerie : illustration en portrait, nom, parent et champs « carte » du type. */
export function CustomGallery({ type, items, linkTo }) {
  const cardFields = type.fields.filter((f) => f.card);
  return (
    <ul className={gallery.gallery}>
      {items.map((e) => {
        const shown = cardFields.filter((f) => hasValue(e.data?.[f.key]));
        return (
          <li key={e.id}>
            <Link to={linkTo(e)} className={gallery.card} style={entityColorVars(e.colors)}>
              <EntityBanner src={customImage(e)} className={gallery.image} />
              <span className={gallery.body}>
                <span className={gallery.name}>{e.name}</span>
                {e.parent && (
                  <span className={gallery.parent}>
                    <CornerDownRight aria-hidden /> {e.parent.name}
                  </span>
                )}
                {shown.length > 0 && (
                  <span className={styles.cardFields}>
                    {shown.map((f) => (
                      <span key={f.key} className={styles.cardField}>
                        <span className={styles.cardLabel}>{f.label}</span>
                        <FieldValue field={f} modId={type.modId} value={e.data[f.key]} compact />
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Colonnes du tableau : nom, parent (si hiérarchie), champs du type. */
export const customColumns = ({ type, linkTo }) => [
  {
    key: 'name', label: type.label, sortKey: 'name', required: true,
    render: (e) => <NameCell to={linkTo(e)} visual={<EntityBanner src={customImage(e)} className={gallery.rowThumb} />}>{e.name}</NameCell>,
  },
  type.hierarchy && {
    key: 'parent', label: `${type.label} parent${type.feminine ? 'e' : ''}`, sortKey: 'parent',
    render: (e) => e.parent?.name || dash,
    edit: { field: 'parentId', type: 'ref', criterion: 'parent' },
  },
  type.hierarchy && { key: 'children', label: 'Descendants directs', sortKey: 'children', defaultHidden: true, render: (e) => childCount(e) || dash },
  ...fieldColumns({ fields: type.fields, modId: type.modId, valuesOf, sortable: true, keyPrefix: 'field:' }),
].filter(Boolean);

/** Arborescence (types hiérarchiques). */
export const CustomTree = ({ type, items, linkTo }) => (
  <EntityTree
    items={items}
    linkTo={linkTo}
    image={customImage}
    childNoun={[type.label.toLowerCase(), type.plural.toLowerCase()]}
  />
);

/** Résumé d'une entité pour les listes de descendants d'une fiche. */
export const childSummary = (type, e) => {
  const count = childCount(e);
  return count ? plural(count, type.label.toLowerCase(), type.plural.toLowerCase()) : null;
};
