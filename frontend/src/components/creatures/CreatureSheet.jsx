import { Fragment } from 'react';
import { Link } from 'react-router';
import { usePhotos } from '@/api/queries';
import {
  INTELLIGENCE_MAX,
  creatureImage,
  flightLabel,
  formatLife,
  formatSize,
  formatWeight,
  temperamentColor,
} from '@/config/creatures';
import { Badge } from '@/components/ui/Badge';
import { RichText } from '@/components/ui/RichText';
import { EntityBanner } from '@/components/entity/EntityBanner';
import layout from '@/components/entity/InfoboxSheet.module.scss';
import { PhotoGallery } from '@/components/entity/PhotoGallery';
import { SheetSection } from '@/components/entity/SheetSection';
import { plainText, universePath } from '@/utils/universe';
import styles from './CreatureSheet.module.scss';

const PHYSICAL = [
  { key: 'speed', label: 'Vitesse' },
  { key: 'physicalStrength', label: 'Force' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'robustness', label: 'Robustesse' },
];

/** Texte saisi en simple texte (v2) ou en texte riche : affiché dans les deux cas. */
function FlexibleText({ value }) {
  if (/<[a-z][\s\S]*>/i.test(value)) return <RichText html={value} />;
  return <p className={styles.plain}>{value}</p>;
}

/**
 * Fiche d'une créature en lecture seule : encadré (illustration, rang, morphologie, habitats) à gauche ;
 * capacités, comportement, résistances, attaques, détails et album à droite.
 */
export function CreatureSheet({ universe, creature: c, modules = {}, actions }) {
  const { data: photos = [] } = usePhotos('creature', c.id);
  const physical = PHYSICAL.filter((p) => c[p.key]?.trim());
  const hasBehavior = c.temperament || c.flightBehavior || c.intelligence != null;
  const resistances = plainText(c.naturalResistances) || c.naturalResistances?.trim();
  const weaknesses = plainText(c.naturalWeaknesses) || c.naturalWeaknesses?.trim();

  const facts = [
    modules.ranks && c.powerRank && { label: 'Rang', value: <Badge color={c.powerRank.color}>{c.powerRank.name}</Badge> },
    formatSize(c) && { label: 'Taille', value: formatSize(c) },
    formatWeight(c) && { label: 'Poids', value: formatWeight(c) },
    formatLife(c) && { label: 'Longévité', value: formatLife(c) },
    c.activityCycle && { label: 'Activité', value: c.activityCycle },
    c.diet && { label: 'Régime', value: c.diet },
    c.habitats?.length > 0 && {
      label: c.habitats.length > 1 ? 'Habitats' : 'Habitat',
      value: c.habitats.map((p, i) => (
        <Fragment key={p.id}>
          {i > 0 && ', '}
          <Link to={universePath(universe, `lieux/${p.id}`)} className={layout.factLink}>
            {p.name}
          </Link>
        </Fragment>
      )),
    },
  ].filter(Boolean);

  const isEmpty =
    !physical.length && !hasBehavior && !resistances && !weaknesses && !plainText(c.attackTypes) && !plainText(c.moreDetails) && !photos.length;

  return (
    <div className={layout.sheet}>
      <aside className={layout.aside}>
        <header className={layout.header}>
          <h1 className={layout.name}>{c.name}</h1>
          {actions && <div className={layout.actions}>{actions}</div>}
        </header>
        <div className={layout.infobox}>
          <EntityBanner src={creatureImage(c)} className={layout.portrait} />
          {facts.length > 0 && (
            <dl className={layout.facts}>
              {facts.map((f) => (
                <div key={f.label} className={layout.fact}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </aside>

      <div className={layout.content}>
        {isEmpty && <p className={layout.empty}>Cette créature n’a encore ni capacités, ni comportement, ni description.</p>}

        {physical.length > 0 && (
          <SheetSection id="capacites" title="Capacités physiques">
            <dl className={styles.stats}>
              {physical.map((p) => (
                <div key={p.key} className={styles.stat}>
                  <dt>{p.label}</dt>
                  <dd>{c[p.key]}</dd>
                </div>
              ))}
            </dl>
          </SheetSection>
        )}

        {hasBehavior && (
          <SheetSection id="comportement" title="Comportement">
            <div className={styles.behavior}>
              {c.temperament && (
                <div className={styles.behaviorItem}>
                  <span className={styles.behaviorLabel}>Tempérament</span>
                  <Badge color={temperamentColor(c.temperament)}>{c.temperament}</Badge>
                </div>
              )}
              {c.flightBehavior && (
                <div className={styles.behaviorItem}>
                  <span className={styles.behaviorLabel}>Fuite</span>
                  <span>{flightLabel(c.flightBehavior)}</span>
                </div>
              )}
              {c.intelligence != null && (
                <div className={`${styles.behaviorItem} ${styles.intelligence}`}>
                  <span className={styles.behaviorLabel}>Intelligence</span>
                  <span
                    className={styles.meter}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={INTELLIGENCE_MAX}
                    aria-valuenow={c.intelligence}
                    aria-label="Intelligence"
                  >
                    <span style={{ '--amount': c.intelligence / INTELLIGENCE_MAX }} />
                  </span>
                  <span className={styles.meterValue}>
                    {c.intelligence}/{INTELLIGENCE_MAX}
                  </span>
                </div>
              )}
            </div>
          </SheetSection>
        )}

        {(resistances || weaknesses) && (
          <SheetSection id="resistances" title="Résistances et faiblesses">
            <div className={styles.columns}>
              {resistances && (
                <div className={`${styles.column} ${styles.strong}`}>
                  <p className={styles.columnTitle}>Résistances naturelles</p>
                  <FlexibleText value={c.naturalResistances} />
                </div>
              )}
              {weaknesses && (
                <div className={`${styles.column} ${styles.weak}`}>
                  <p className={styles.columnTitle}>Faiblesses naturelles</p>
                  <FlexibleText value={c.naturalWeaknesses} />
                </div>
              )}
            </div>
          </SheetSection>
        )}

        {plainText(c.attackTypes) && (
          <SheetSection id="attaques" title="Attaques">
            <RichText html={c.attackTypes} />
          </SheetSection>
        )}

        {plainText(c.moreDetails) && (
          <SheetSection id="details" title="Informations complémentaires">
            <RichText html={c.moreDetails} />
          </SheetSection>
        )}

        {photos.length > 0 && (
          <SheetSection id="album" title="Album photo">
            <PhotoGallery photos={photos} name={c.name} />
          </SheetSection>
        )}
      </div>
    </div>
  );
}
