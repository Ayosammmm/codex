import { IMG } from '@/api/client';
import { Fragment } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from '@/components/ui/icons';
import { usePhotos } from '@/api/queries';
import { RichText } from '@/components/ui/RichText';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { PhotoGallery } from '@/components/entity/PhotoGallery';
import { SheetSection } from '@/components/entity/SheetSection';
import { entityColorVars } from '@/theme/universeTheme';
import { plainText, universePath } from '@/utils/universe';
import styles from '@/components/entity/InfoboxSheet.module.scss';
import { childSummary, customImage } from './CustomEntityViews';
import { FieldValue, hasValue } from './modFields';
import { typeNoun } from './nouns';
import mods from './Mods.module.scss';

/**
 * Fiche d'une entité de mod en lecture seule : encadré (illustration, lignée, champs) à gauche ;
 * présentation, champs longs, descendants et album à droite.
 */
export function CustomEntitySheet({ universe, type, entity: e, ancestors, children, actions }) {
  const { data: photos = [] } = usePhotos('custom', e.id);
  const linkTo = (item) => universePath(universe, `${type.basePath}/${item.id}`);
  const shortFields = type.fields.filter((f) => f.type !== 'richtext' && hasValue(e.data?.[f.key]));
  const longFields = type.fields.filter((f) => f.type === 'richtext' && hasValue(e.data?.[f.key]));
  const hasDescription = Boolean(plainText(e.description));
  const isEmpty = !hasDescription && !longFields.length && !children.length && !photos.length;

  const facts = [
    ancestors.length > 0 && {
      key: 'lineage',
      label: 'Lignée',
      value: (
        <span className={styles.lineage}>
          {ancestors.map((a, i) => (
            <Fragment key={a.id}>
              {i > 0 && <ChevronRight aria-hidden />}
              <Link to={linkTo(a)} className={styles.factLink}>{a.name}</Link>
            </Fragment>
          ))}
        </span>
      ),
    },
    ...shortFields.map((f) => ({ key: f.key, label: f.label, value: <FieldValue field={f} modId={type.modId} value={e.data[f.key]} /> })),
  ].filter(Boolean);

  return (
    <div className={styles.sheet}>
      <aside className={styles.aside}>
        <header className={styles.header}>
          <h1 className={styles.name}>{e.name}</h1>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
        <div className={styles.infobox}>
          <EntityBanner src={customImage(e, IMG.large)} zoom={customImage(e)} label={`Image de ${e.name}`} className={styles.portrait} />
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>Type</dt>
              <dd className={mods.typeFact}>
                <type.Icon aria-hidden /> {type.label}
              </dd>
            </div>
            {facts.map((f) => (
              <div key={f.key} className={styles.fact}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>

      <div className={styles.content}>
        {isEmpty && <p className={styles.empty}>{typeNoun(type).this.replace(/^./, (c) => c.toUpperCase())} n’a pas encore de présentation.</p>}

        {hasDescription && (
          <SheetSection id="presentation">
            <RichText html={e.description} />
          </SheetSection>
        )}

        {longFields.map((f) => (
          <SheetSection key={f.key} id={`champ-${f.key}`} title={f.label}>
            <RichText html={e.data[f.key]} />
          </SheetSection>
        ))}

        {children.length > 0 && (
          <SheetSection id="descendants" title={type.plural}>
            <ul className={styles.subspecies}>
              {children.map((child) => (
                <li key={child.id}>
                  <Link to={linkTo(child)} className={styles.sub} style={entityColorVars(child.colors)}>
                    <EntityBanner src={customImage(child, IMG.avatar)} className={styles.subThumb} />
                    <span className={styles.subText}>
                      <span className={styles.subName}>{child.name}</span>
                      {childSummary(type, child) && <span className={styles.subMeta}>{childSummary(type, child)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SheetSection>
        )}

        {photos.length > 0 && (
          <SheetSection id="album" title="Album photo">
            <PhotoGallery photos={photos} name={e.name} />
          </SheetSection>
        )}
      </div>
    </div>
  );
}
