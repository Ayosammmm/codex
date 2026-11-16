import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronRight, MapPin } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { usePhotos } from '@/api/queries';
import { characterName } from '@/config/characters';
import { childCount, mapPins, placeImage, placeMap } from '@/config/places';
import { RichText } from '@/components/ui/RichText';
import { CharacterChip } from '@/components/characters/CharacterChip';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { PhotoGallery } from '@/components/entity/PhotoGallery';
import { SheetSection } from '@/components/entity/SheetSection';
import { GroupLogo } from '@/components/groups/GroupLogo';
import { entityColorVars } from '@/theme/universeTheme';
import { plainText, plural, universePath } from '@/utils/universe';
import { MapViewer } from './MapViewer';
import styles from './PlaceSheet.module.scss';

const byName = (a, b) => a.name.localeCompare(b.name, 'fr');

/**
 * Fiche d'un lieu en lecture seule : image, fil d'Ariane des lieux parents, présentation,
 * sous-lieux, groupes qui le contrôlent, originaires et album.
 * - `ancestors` / `subplaces` : depuis la liste des lieux de l'univers (images, couleurs, compteurs)
 * - `fauna` : créatures qui vivent ici (module Bestiaire)
 * - `modules` : { groups } ; `actions` : boutons de l'en-tête (ex. « Modifier »)
 */
export function PlaceSheet({ universe, place: p, ancestors, subplaces, fauna = [], modules, actions, sound = null }) {
  const { data: photos = [] } = usePhotos('place', p.id);
  const image = placeImage(p);
  const navigate = useNavigate();
  const natives = [...(p.characters || [])].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr'));
  const directGroups = [...(p.controllingGroups || [])].sort(byName);
  const indirectGroups = modules.groups ? [...(p.indirectlyControllingGroups || [])].sort(byName) : [];
  const showGroups = modules.groups && (directGroups.length > 0 || indirectGroups.length > 0);

  const stats = [
    subplaces.length > 0 && plural(subplaces.length, 'sous-lieu', 'sous-lieux'),
    natives.length > 0 && plural(natives.length, 'originaire'),
  ].filter(Boolean);

  return (
    <article className={styles.sheet}>
      <header className={styles.hero}>
        {/* Sans image, pas de bandeau vide : l'en-tête commence directement par le nom */}
        {image && <EntityBanner src={image} className={styles.banner} />}
        <div className={styles.identity}>
          <div className={styles.heading}>
            {(ancestors.length > 0 || p.type) && (
              <div className={styles.kicker}>
                {p.type && <span className={styles.type}>{p.type.name}</span>}
                {ancestors.length > 0 && (
                  <nav aria-label="Lieux parents" className={styles.breadcrumb}>
                    {ancestors.map((a, i) => (
                      <Fragment key={a.id}>
                        {i > 0 && <ChevronRight aria-hidden />}
                        <Link to={universePath(universe, `lieux/${a.id}`)}>{a.name}</Link>
                      </Fragment>
                    ))}
                  </nav>
                )}
              </div>
            )}
            <h1 className={styles.name}>{p.name}</h1>
            {stats.length > 0 && <p className={styles.stats}>{stats.join(' · ')}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      </header>

      {plainText(p.description) && (
        <SheetSection id="presentation">
          <RichText html={p.description} />
        </SheetSection>
      )}

      {sound}

      {modules.map && p.mapImage && (
        <SheetSection id="carte" title="Carte">
          <MapViewer
            src={placeMap(p)}
            pins={mapPins(p, subplaces)}
            label={`Carte de ${p.name}`}
            onPinClick={(pin) => navigate(universePath(universe, `lieux/${pin.id}`))}
          />
        </SheetSection>
      )}

      {subplaces.length > 0 && (
        <SheetSection id="sous-lieux" title="Sous-lieux">
          <ul className={styles.children}>
            {subplaces.map((c) => (
              <li key={c.id}>
                <Link to={universePath(universe, `lieux/${c.id}`)} className={styles.child} style={entityColorVars(c.colors)}>
                  <EntityBanner src={placeImage(c)} className={styles.childThumb} />
                  <span className={styles.childText}>
                    <span className={styles.childName}>{c.name}</span>
                    <span className={styles.childMeta}>
                      {[c.type?.name, childCount(c) > 0 && plural(childCount(c), 'sous-lieu', 'sous-lieux')].filter(Boolean).join(' · ') || 'Lieu'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {showGroups && (
        <SheetSection id="controle" title="Contrôlé par">
          <ul className={styles.groups}>
            {directGroups.map((g) => (
              <li key={g.id}>
                <GroupBubble universe={universe} group={g} />
              </li>
            ))}
            {indirectGroups.map((g) => (
              <li key={g.id}>
                <GroupBubble universe={universe} group={g} indirect />
              </li>
            ))}
          </ul>
          {indirectGroups.length > 0 && <p className={styles.note}>Les groupes en pointillés contrôlent un lieu parent.</p>}
        </SheetSection>
      )}

      {natives.length > 0 && (
        <SheetSection id="originaires" title="Originaires">
          <ul className={styles.natives}>
            {natives.map((c) => (
              <li key={c.id}>
                <CharacterChip universe={universe} character={c} />
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {fauna.length > 0 && (
        <SheetSection id="faune" title="Faune">
          <ul className={styles.children}>
            {fauna.map((c) => (
              <li key={c.id}>
                <Link to={universePath(universe, `bestiaire/${c.id}`)} className={styles.child} style={entityColorVars(c.colors)}>
                  <EntityBanner src={uploadUrl(c.image)} className={styles.childThumb} />
                  <span className={styles.childText}>
                    <span className={styles.childName}>{c.name}</span>
                    <span className={styles.childMeta}>{[modules.ranks && c.powerRank?.name && `Rang ${c.powerRank.name}`, c.temperament].filter(Boolean).join(' · ') || 'Créature'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </SheetSection>
      )}

      {photos.length > 0 && (
        <SheetSection id="album" title="Album photo">
          <PhotoGallery photos={photos} name={p.name} />
        </SheetSection>
      )}

      {!plainText(p.description) && !subplaces.length && !showGroups && !natives.length && !fauna.length && !photos.length && (
        <p className={styles.note}>
          <MapPin aria-hidden /> Ce lieu n’a encore ni présentation, ni sous-lieux, ni originaires.
        </p>
      )}
    </article>
  );
}

function GroupBubble({ universe, group, indirect = false }) {
  return (
    <Link
      to={universePath(universe, `groupes/${group.id}`)}
      className={indirect ? `${styles.bubble} ${styles.bubbleIndirect}` : styles.bubble}
      style={entityColorVars(group.colors)}
      title={indirect ? 'Contrôle un lieu parent' : undefined}
    >
      <GroupLogo group={group} round className={styles.bubbleLogo} />
      <span className={styles.bubbleName}>{group.name}</span>
    </Link>
  );
}
