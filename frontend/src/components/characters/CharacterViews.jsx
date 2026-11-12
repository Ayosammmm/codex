import { Link, useNavigate } from 'react-router';
import { ArrowDown, ArrowUp, ArrowUpDown } from '@/components/ui/icons';
import { characterName } from '@/config/characters';
import { Badge } from '@/components/ui/Badge';
import { cx } from '@/components/ui/cx';
import { entityColorVars } from '@/theme/universeTheme';
import { CharacterAvatar } from './CharacterAvatar';
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

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={cx(list.sortButton, !active && list.sortIdle)} onClick={() => onSort(sortKey)}>
        {label}
        <Icon aria-hidden />
      </button>
    </th>
  );
}

const dash = <span className={list.muted}>—</span>;

/** `fill` : le tableau occupe la hauteur restante de son parent (flex) au lieu d'une hauteur fixe. */
export function CharactersTable({ characters, linkTo, show, sort, onSort, fill = false }) {
  const navigate = useNavigate();
  return (
    <div className={cx(list.tableWrap, fill && list.tableFill)}>
      <table className={list.table}>
        <thead>
          <tr>
            <SortHeader label="Personnage" sortKey="name" sort={sort} onSort={onSort} />
            <th>Titre</th>
            <SortHeader label="Âge" sortKey="age" sort={sort} onSort={onSort} />
            <SortHeader label="Genre" sortKey="gender" sort={sort} onSort={onSort} />
            <SortHeader label="Statut" sortKey="status" sort={sort} onSort={onSort} />
            <SortHeader label="Alignement" sortKey="alignment" sort={sort} onSort={onSort} />
            {show.ranks && <SortHeader label="Rang" sortKey="rank" sort={sort} onSort={onSort} />}
            {show.groups && <th>Groupes</th>}
            {show.species && <th>Espèces</th>}
          </tr>
        </thead>
        <tbody>
          {characters.map((c) => (
            // Toute la ligne est cliquable ; le lien du nom reste la cible clavier
            <tr key={c.id} onClick={() => navigate(linkTo(c))} style={entityColorVars(c.colors)}>
              <td>
                <span className={list.nameCell}>
                  <CharacterAvatar character={c} round className={list.rowAvatar} />
                  <Link to={linkTo(c)} className={list.rowName} onClick={(e) => e.stopPropagation()}>
                    {characterName(c)}
                  </Link>
                </span>
              </td>
              <td>{c.title || dash}</td>
              <td>{c.age != null && c.age > 0 ? c.age : dash}</td>
              <td>{c.genders ? <Badge color={c.genders.color}>{c.genders.name}</Badge> : dash}</td>
              <td>{c.statuses ? <Badge color={c.statuses.color}>{c.statuses.name}</Badge> : dash}</td>
              <td>{c.alignments ? <Badge color={c.alignments.color}>{c.alignments.name}</Badge> : dash}</td>
              {show.ranks && <td>{c.power_ranks ? <Badge color={c.power_ranks.color}>{c.power_ranks.name}</Badge> : dash}</td>}
              {show.groups && (
                <td className={styles.badgeCell}>
                  {c.groups?.length ? <span className={styles.badges}>{c.groups.map((g) => <Badge key={g.id} color="var(--secondary)">{g.name}</Badge>)}</span> : dash}
                </td>
              )}
              {show.species && (
                <td className={styles.badgeCell}>
                  {c.species?.length ? <span className={styles.badges}>{c.species.map((s) => <Badge key={s.id} color="var(--tertiary)">{s.name}</Badge>)}</span> : dash}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
