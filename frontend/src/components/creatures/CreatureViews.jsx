import { Link } from 'react-router';
import { MapPin, Ruler } from 'lucide-react';
import { ACTIVITY_CYCLES, DIETS, INTELLIGENCE_MAX, TEMPERAMENTS, creatureImage, formatSize, temperamentColor } from '@/config/creatures';
import { Badge } from '@/components/ui/Badge';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { NameCell, dash } from '@/components/entity/EntityTable';
import { entityColorVars } from '@/theme/universeTheme';
import styles from './CreatureViews.module.scss';

/** Galerie : illustration en portrait avec le rang, nom, tempérament, taille et habitats. */
export function CreatureGallery({ creatures, linkTo, showRanks }) {
  return (
    <ul className={styles.gallery}>
      {creatures.map((c) => (
        <li key={c.id}>
          <Link to={linkTo(c)} className={styles.card} style={entityColorVars(c.colors)}>
            <span className={styles.visual}>
              <EntityBanner src={creatureImage(c)} className={styles.image} />
              {showRanks && c.powerRank && (
                <span className={styles.rank}>
                  <Badge color={c.powerRank.color}>{c.powerRank.name}</Badge>
                </span>
              )}
            </span>
            <span className={styles.body}>
              <span className={styles.name}>{c.name}</span>
              {c.temperament && (
                <span className={styles.temperament} style={{ '--tone': temperamentColor(c.temperament) }}>
                  {c.temperament}
                </span>
              )}
              <span className={styles.meta}>
                {formatSize(c) && (
                  <span>
                    <Ruler aria-hidden /> {formatSize(c)}
                  </span>
                )}
                {c.habitats?.length > 0 && (
                  <span>
                    <MapPin aria-hidden />
                    <span className={styles.truncate}>{c.habitats.map((p) => p.name).join(', ')}</span>
                  </span>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Colonnes du tableau du bestiaire (voir EntityTable). `showRanks` : module Rangs actif. */
export const creatureColumns = ({ linkTo, showRanks }) =>
  [
    {
      key: 'name', label: 'Créature', sortKey: 'name', required: true,
      render: (c) => <NameCell to={linkTo(c)} visual={<EntityBanner src={creatureImage(c)} className={styles.rowThumb} />}>{c.name}</NameCell>,
    },
    showRanks && {
      key: 'rank', label: 'Rang', sortKey: 'rank',
      render: (c) => (c.powerRank ? <Badge color={c.powerRank.color}>{c.powerRank.name}</Badge> : dash),
      edit: { field: 'powerRankId', type: 'ref', criterion: 'rank' },
    },
    { key: 'size', label: 'Taille', sortKey: 'size', render: (c) => formatSize(c) || dash },
    { key: 'diet', label: 'Régime', render: (c) => c.diet || dash, edit: { field: 'diet', type: 'enum', options: DIETS } },
    {
      key: 'temperament', label: 'Tempérament', sortKey: 'temperament',
      render: (c) => (c.temperament ? <Badge color={temperamentColor(c.temperament)}>{c.temperament}</Badge> : dash),
      edit: { field: 'temperament', type: 'enum', options: TEMPERAMENTS },
    },
    {
      key: 'intelligence', label: 'Intelligence', sortKey: 'intelligence',
      render: (c) => (c.intelligence != null ? `${c.intelligence}/${INTELLIGENCE_MAX}` : dash),
      edit: { field: 'intelligence', type: 'number', min: 0, max: INTELLIGENCE_MAX },
    },
    {
      key: 'activity', label: 'Cycle d’activité', defaultHidden: true,
      render: (c) => c.activityCycle || dash,
      edit: { field: 'activityCycle', type: 'enum', options: ACTIVITY_CYCLES },
    },
    { key: 'habitats', label: 'Habitats', render: (c) => (c.habitats?.length ? c.habitats.map((p) => p.name).join(', ') : dash) },
  ].filter(Boolean);
