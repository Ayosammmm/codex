import { Link } from 'react-router';
import { characterName } from '@/config/characters';
import { Badge } from '@/components/ui/Badge';
import { entityColorVars } from '@/theme/universeTheme';
import { CharacterAvatar } from './CharacterAvatar';
import { NameCell, dash } from '@/components/entity/EntityTable';
import list from '@/components/entity/ListViews.module.scss';
import styles from './CharacterViews.module.scss';

/** Étiquettes d'un personnage : statut, genre, alignement, rang (+ groupes / espèces si modules actifs). */
function CharacterBadges({ character, show }) {
  const c = character;
  return (
    <div className={styles.badges}>
      {c.statuses && <Badge color={c.statuses.color}>{c.statuses.name}</Badge>}
      {c.genders && <Badge color={c.genders.color}>{c.genders.name}</Badge>}
      {c.alignments && <Badge color={c.alignments.color}>{c.alignments.name}</Badge>}
      {show.ranks && c.power_ranks && <Badge color={c.power_ranks.color}>{c.power_ranks.name}</Badge>}
      {show.groups && c.groups?.map((g) => <Badge key={`g${g.id}`} color="var(--secondary)">{g.name}</Badge>)}
      {show.species && c.species?.map((s) => <Badge key={`s${s.id}`} color="var(--tertiary)">{s.name}</Badge>)}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Galerie façon carte à collectionner : illustration pleine carte, nom en haut, titre en bas. */
export function CharacterGallery({ characters, linkTo }) {
  return (
    <ul className={styles.gallery}>
      {characters.map((c) => (
        <li key={c.id}>
          <Link to={linkTo(c)} className={styles.tcg} style={entityColorVars(c.colors)}>
            <CharacterAvatar character={c} className={styles.tcgAvatar} />
            <span className={styles.tcgName}>{characterName(c)}</span>
            {c.title && <span className={styles.tcgTitle}>{c.title}</span>}
            <span className={styles.tcgShine} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------

export function CharacterCards({ characters, linkTo, show }) {
  return (
    <ul className={styles.cards}>
      {characters.map((c) => (
        <li key={c.id}>
          <Link to={linkTo(c)} className={styles.card} style={entityColorVars(c.colors)}>
            <CharacterAvatar character={c} className={styles.cardAvatar} />
            <span className={styles.cardBody}>
              <span className={styles.cardHeading}>
                <span className={styles.cardName}>{characterName(c)}</span>
                {c.age != null && c.age > 0 && <span className={styles.cardAge}>{c.age} ans</span>}
              </span>
              {c.title && <span className={styles.cardTitle}>{c.title}</span>}
              <CharacterBadges character={c} show={show} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------

/**
 * Colonnes du tableau des personnages (voir EntityTable).
 * `show` : modules actifs ({ ranks, groups, species }).
 */
export const characterColumns = ({ linkTo, show }) =>
  [
    {
      key: 'name', label: 'Personnage', sortKey: 'name', required: true, text: characterName,
      render: (c) => <NameCell to={linkTo(c)} visual={<CharacterAvatar character={c} round className={list.rowAvatar} />}>{characterName(c)}</NameCell>,
    },
    { key: 'title', label: 'Titre', render: (c) => c.title || dash, edit: { field: 'title', type: 'text' } },
    { key: 'age', label: 'Âge', sortKey: 'age', render: (c) => (c.age != null && c.age > 0 ? c.age : dash), edit: { field: 'age', type: 'number', min: 0 } },
    {
      key: 'gender', label: 'Genre', sortKey: 'gender',
      render: (c) => (c.genders ? <Badge color={c.genders.color}>{c.genders.name}</Badge> : dash),
      edit: { field: 'sexe_id', type: 'ref', criterion: 'gender' },
    },
    {
      key: 'status', label: 'Statut', sortKey: 'status',
      render: (c) => (c.statuses ? <Badge color={c.statuses.color}>{c.statuses.name}</Badge> : dash),
      edit: { field: 'statut_id', type: 'ref', criterion: 'status' },
    },
    {
      key: 'alignment', label: 'Alignement', sortKey: 'alignment',
      render: (c) => (c.alignments ? <Badge color={c.alignments.color}>{c.alignments.name}</Badge> : dash),
      edit: { field: 'alignment_id', type: 'ref', criterion: 'alignment' },
    },
    show.ranks && {
      key: 'rank', label: 'Rang', sortKey: 'rank',
      render: (c) => (c.power_ranks ? <Badge color={c.power_ranks.color}>{c.power_ranks.name}</Badge> : dash),
      edit: { field: 'rank_id', type: 'ref', criterion: 'rank' },
    },
    show.groups && {
      key: 'groups', label: 'Groupes', className: styles.badgeCell,
      render: (c) => (c.groups?.length ? <span className={styles.badges}>{c.groups.map((g) => <Badge key={g.id} color="var(--secondary)">{g.name}</Badge>)}</span> : dash),
    },
    show.species && {
      key: 'species', label: 'Espèces', className: styles.badgeCell,
      render: (c) => (c.species?.length ? <span className={styles.badges}>{c.species.map((s) => <Badge key={s.id} color="var(--tertiary)">{s.name}</Badge>)}</span> : dash),
    },
  ].filter(Boolean);
