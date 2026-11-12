import { Fragment } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from '@/components/ui/icons';
import { usePhotos } from '@/api/queries';
import { characterName } from '@/config/characters';
import { childCount, memberCount, specieImage } from '@/config/species';
import { RichText } from '@/components/ui/RichText';
import { CharacterChip } from '@/components/characters/CharacterChip';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { PhotoGallery } from '@/components/entity/PhotoGallery';
import { SheetSection } from '@/components/entity/SheetSection';
import { entityColorVars } from '@/theme/universeTheme';
import { plainText, plural, universePath } from '@/utils/universe';
import styles from '@/components/entity/InfoboxSheet.module.scss';

/**
 * Fiche d'une espèce en lecture seule : encadré (illustration, lignée, chiffres) à gauche ;
 * présentation, sous-espèces, représentants et album à droite.
 * - `ancestors` / `subspecies` : depuis la liste des espèces de l'univers
 * - `actions` : boutons de l'en-tête (ex. « Modifier »)
 */
export function SpecieSheet({ universe, specie: s, ancestors, subspecies, actions }) {
  const { data: photos = [] } = usePhotos('specie', s.id);
  const members = [...(s.characters || [])].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr'));
  const hasDescription = Boolean(plainText(s.description));
  const isEmpty = !hasDescription && !subspecies.length && !members.length && !photos.length;

  const facts = [
    ancestors.length > 0 && {
      label: 'Lignée',
      value: (
        <span className={styles.lineage}>
          {ancestors.map((a, i) => (
            <Fragment key={a.id}>
              {i > 0 && <ChevronRight aria-hidden />}
              <Link to={universePath(universe, `especes/${a.id}`)} className={styles.factLink}>
                {a.name}
              </Link>
            </Fragment>
          ))}
        </span>
      ),
    },
    { label: 'Personnages', value: members.length || '—' },
    subspecies.length > 0 && { label: 'Sous-espèces', value: subspecies.length },
  ].filter(Boolean);

  return (
    <div className={styles.sheet}>
      <aside className={styles.aside}>
        <header className={styles.header}>
          <h1 className={styles.name}>{s.name}</h1>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
        <div className={styles.infobox}>
          <EntityBanner src={specieImage(s)} className={styles.portrait} />
          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.label} className={styles.fact}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>

      <div className={styles.content}>
        {isEmpty && <p className={styles.empty}>Cette espèce n’a encore ni présentation, ni sous-espèces, ni représentants.</p>}

        {hasDescription && (
          <SheetSection id="presentation" title="Présentation">
            <RichText html={s.description} />
          </SheetSection>
        )}

        {subspecies.length > 0 && (
          <SheetSection id="sous-especes" title="Sous-espèces">
            <ul className={styles.subspecies}>
              {subspecies.map((sub) => (
                <li key={sub.id}>
                  <Link to={universePath(universe, `especes/${sub.id}`)} className={styles.sub} style={entityColorVars(sub.colors)}>
                    <EntityBanner src={specieImage(sub)} className={styles.subThumb} />
                    <span className={styles.subText}>
                      <span className={styles.subName}>{sub.name}</span>
                      <span className={styles.subMeta}>
                        {[plural(memberCount(sub), 'personnage'), childCount(sub) > 0 && plural(childCount(sub), 'sous-espèce')].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SheetSection>
        )}

        {members.length > 0 && (
          <SheetSection id="representants" title="Représentants">
            <ul className={styles.members}>
              {members.map((c) => (
                <li key={c.id}>
                  <CharacterChip universe={universe} character={c} />
                </li>
              ))}
            </ul>
          </SheetSection>
        )}

        {photos.length > 0 && (
          <SheetSection id="album" title="Album photo">
            <PhotoGallery photos={photos} name={s.name} />
          </SheetSection>
        )}
      </div>
    </div>
  );
}
