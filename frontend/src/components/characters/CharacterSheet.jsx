import { IMG, uploadUrl } from '@/api/client';
import { Fragment, useMemo } from 'react';
import { Link } from 'react-router';
import { TrendingUp } from '@/components/ui/icons';
import { usePhotos } from '@/api/queries';
import {
  TRAIT_GROUPS,
  TRAIT_MAX,
  characterName,
  developmentType,
  relationLabel,
  relationRole,
  relationTone,
} from '@/config/characters';
import { groupRoles, memberRole, roleName } from '@/config/groups';
import { Badge } from '@/components/ui/Badge';
import { RichText } from '@/components/ui/RichText';
import { cx } from '@/components/ui/cx';
import { entityColorVars } from '@/theme/universeTheme';
import { plainText, universePath } from '@/utils/universe';
import { PhotoGallery } from '@/components/entity/PhotoGallery';
import { ImageZoom } from '@/components/entity/ImageZoom';
import { ModFieldsSheetSections } from '@/mods/ModFieldsSections';
import { SheetSection } from '@/components/entity/SheetSection';
import { DynamicCard } from '@/components/relations/DynamicCard';
import { CharacterAppearances } from './CharacterAppearances';
import { CharacterRoleplaySection } from '@/components/roleplay/RoleplaySections';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterTraits } from './CharacterTraits';
import styles from './CharacterSheet.module.scss';

const STORY_FIELDS = [
  { key: 'powers', id: 'pouvoirs', label: 'Pouvoirs et capacités', module: 'powers' },
  { key: 'personality', id: 'psychologie', label: 'Profil psychologique' },
  { key: 'story', id: 'histoire', label: 'Histoire' },
  { key: 'extras', id: 'notes', label: 'Notes et extras' },
];

/** Relations dans les deux sens, sans doublon (le lien saisi sur cette fiche l'emporte). */
function mergeRelations(character) {
  const byId = new Map();
  for (const c of [...(character.relatedCharacters || []), ...(character.relatedToCharacters || [])]) {
    if (c.id !== character.id && !byId.has(c.id)) byId.set(c.id, { ...c, link: c.CharacterRelation || {} });
  }
  return [...byId.values()].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr'));
}

/**
 * Fiche d'un personnage en lecture seule.
 * - `modules` : modules actifs { groups, species, personality, relations, powers, ranks, roleplay }
 * - `actions` : boutons affichés en haut de la fiche (ex. « Modifier »)
 */
export function CharacterSheet({ universe, character: c, modules, actions, stories = [], events = [], dynamics = null, sound = null }) {
  const { data: photos = [] } = usePhotos('character', c.id);
  const relations = useMemo(() => (modules.relations ? mergeRelations(c) : []), [c, modules.relations]);
  const story = STORY_FIELDS.filter((f) => (!f.module || modules[f.module]) && plainText(c[f.key]));
  const traitsSet = modules.personality && TRAIT_GROUPS.some((g) => g.traits.some((t) => c[t.key] != null));
  const development = modules.personality ? developmentType(c.development) : null;
  const showPersonality = traitsSet || Boolean(development);
  const isEmpty = story.length === 0 && !showPersonality && relations.length === 0 && photos.length === 0;

  const facts = [
    c.age != null && c.age > 0 && { label: 'Âge', value: `${c.age} ans` },
    c.genders && { label: 'Genre', value: <Badge color={c.genders.color}>{c.genders.name}</Badge> },
    c.statuses && { label: 'Statut', value: <Badge color={c.statuses.color}>{c.statuses.name}</Badge> },
    c.alignments && { label: 'Alignement', value: <Badge color={c.alignments.color}>{c.alignments.name}</Badge> },
    modules.ranks && c.power_ranks && { label: 'Rang', value: <Badge color={c.power_ranks.color}>{c.power_ranks.name}</Badge> },
    modules.groups && c.groups?.length > 0 && {
      label: c.groups.length > 1 ? 'Groupes' : 'Groupe',
      value: (
        <ul className={styles.factList}>
          {c.groups.map((g) => (
            <li key={g.id}>
              <Link to={universePath(universe, `groupes/${g.id}`)} className={styles.factLink}>
                {g.name}
              </Link>
              <span className={styles.role}> · {roleName(groupRoles(g), memberRole({ CharacterGroup: g.CharacterGroup }, groupRoles(g)))}</span>
            </li>
          ))}
        </ul>
      ),
    },
    modules.species && c.species?.length > 0 && {
      label: c.species.length > 1 ? 'Espèces' : 'Espèce',
      value: c.species.map((s, i) => (
        <Fragment key={s.id}>
          {i > 0 && ', '}
          <Link to={universePath(universe, `especes/${s.id}`)} className={styles.factLink}>
            {s.name}
          </Link>
        </Fragment>
      )),
    },
    c.places?.length > 0 && {
      label: 'Origine',
      value: c.places.map((p, i) => (
        <Fragment key={p.id}>
          {i > 0 && ', '}
          <Link to={universePath(universe, `lieux/${p.id}`)} className={styles.factLink}>
            {p.name}
          </Link>
        </Fragment>
      )),
    },
  ].filter(Boolean);

  return (
    <div className={styles.sheet}>
      <aside className={styles.aside}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.name}>{characterName(c)}</h1>
            {c.title && <p className={styles.title}>{c.title}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
        <div className={styles.infobox}>
          <ImageZoom src={uploadUrl(c.avatar)} label={`Portrait de ${characterName(c)}`} fill>
            <CharacterAvatar character={c} className={styles.portrait} />
          </ImageZoom>
          {facts.length > 0 && (
            <dl className={styles.facts}>
              {facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </aside>

      <div className={styles.content}>
        {isEmpty && <p className={styles.empty}>Cette fiche ne contient encore aucun récit.</p>}

        {story.map((f) => (
          <SheetSection key={f.key} id={f.id} title={f.label}>
            <RichText html={c[f.key]} />
          </SheetSection>
        ))}

        {showPersonality && (
          <SheetSection id="personnalite" title="Personnalité">
            {development && (
              <div className={styles.development} data-type={development.value}>
                <p className={styles.developmentLabel}>Personnage {development.label.toLowerCase()}</p>
                {plainText(c.developmentNote) ? (
                  <RichText html={c.developmentNote} className={styles.developmentNote} />
                ) : (
                  <p className={styles.developmentNote}>{development.hint}</p>
                )}
              </div>
            )}
            {traitsSet && <CharacterTraits scores={c} />}
            {traitsSet && <Traits character={c} />}
          </SheetSection>
        )}

        {relations.length > 0 && (
          <SheetSection id="relations" title="Relations">
            <ul className={styles.relations}>
              {relations.map((r) => (
                <li key={r.id}>
                  <Link to={universePath(universe, `personnages/${r.id}`)} className={styles.relation} style={entityColorVars(r.colors)}>
                    <CharacterAvatar character={r} round className={styles.relationAvatar} />
                    <span className={styles.relationText}>
                      <span className={styles.relationName}>{characterName(r)}</span>
                      <RelationDetails link={r.link} otherId={r.id} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SheetSection>
        )}

        {dynamics?.list.length > 0 && (
          <SheetSection id="dynamiques" title="Dynamiques">
            <ul className={styles.dynamics}>
              {dynamics.list.map((d) => (
                <li key={d.key}>
                  <DynamicCard universe={universe} dynamic={d} byId={dynamics.byId} compact />
                </li>
              ))}
            </ul>
            <Link to={universePath(universe, 'dynamiques')} className={styles.factLink}>
              Voir toutes les dynamiques de l’univers
            </Link>
          </SheetSection>
        )}

        {sound}
        <CharacterAppearances universe={universe} character={c} stories={stories} events={events} />
        {modules.roleplay && <CharacterRoleplaySection universe={universe} character={c} />}

        <ModFieldsSheetSections entityType="character" entityId={c.id} />

        {photos.length > 0 && (
          <SheetSection id="album" title="Album photo">
            <PhotoGallery photos={photos} name={characterName(c)} />
          </SheetSection>
        )}
      </div>
    </div>
  );
}

/**
 * Nature, ton et évolution d'une relation (l'archétype ne s'affiche pas sur la fiche).
 * Nature à deux rôles : on affiche celui de l'autre personnage (« Parent » : il est le parent de celui-ci).
 */
function RelationDetails({ link, otherId }) {
  const tone = relationTone(link.tone);
  const label = relationLabel(link);
  const role = relationRole(link, otherId);
  return (
    <>
      {label && (
        <span className={styles.relationType} title={role ? label : undefined}>
          {role || label}
        </span>
      )}
      {(tone || link.evolving) && (
        <span className={styles.relationMeta}>
          {tone && (
            <span className={styles.tone} style={{ '--tone': tone.color }}>
              {tone.label}
            </span>
          )}
          {link.evolving && (
            <span className={styles.evolving} title="Évolue au fil du récit">
              <TrendingUp aria-hidden /> Évolue
            </span>
          )}
        </span>
      )}
    </>
  );
}

/** Traits renseignés : barre centrée, vers la faiblesse (gauche) ou la force (droite). */
function Traits({ character }) {
  return (
    <div className={styles.traitGroups}>
      {TRAIT_GROUPS.map((group) => {
        const traits = group.traits.filter((t) => character[t.key] != null);
        if (!traits.length) return null;
        return (
          <div key={group.key} className={styles.traitGroup}>
            <h3 className={styles.traitGroupTitle}>{group.label}</h3>
            <ul className={styles.traits}>
              {traits.map((t) => {
                const v = character[t.key];
                const pole = v >= 0 ? t.strength : t.weakness;
                return (
                  <li key={t.key} className={cx(styles.trait, v < 0 && styles.weak)}>
                    <span className={styles.traitLabels}>
                      <span className={cx(v < 0 && styles.traitActive)}>{t.weakness}</span>
                      <span className={cx(v > 0 && styles.traitActive)}>{t.strength}</span>
                    </span>
                    <span
                      className={styles.traitBar}
                      role="meter"
                      aria-valuemin={-TRAIT_MAX}
                      aria-valuemax={TRAIT_MAX}
                      aria-valuenow={v}
                      aria-label={`${t.strength} / ${t.weakness}`}
                      aria-valuetext={`${v > 0 ? '+' : ''}${v} (${pole})`}
                    >
                      <span className={styles.traitFill} style={{ '--amount': Math.abs(v) / TRAIT_MAX }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
