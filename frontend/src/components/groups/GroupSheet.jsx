import { Link } from 'react-router';
import { CornerLeftUp, MapPin } from '@/components/ui/icons';
import { IMG, uploadUrl } from '@/api/client';
import { usePhotos } from '@/api/queries';
import { RichText } from '@/components/ui/RichText';
import { PhotoGallery } from '@/components/entity/PhotoGallery';
import { ModFieldsSheetSections } from '@/mods/ModFieldsSections';
import { SheetSection } from '@/components/entity/SheetSection';
import { plainText, plural, universePath } from '@/utils/universe';
import { GroupLogo } from './GroupLogo';
import { GroupOrgChart } from './GroupOrgChart';
import { EntityBanner } from '@/components/entity/EntityBanner';
import { ImageZoom } from '@/components/entity/ImageZoom';
import styles from './GroupSheet.module.scss';

/**
 * Fiche d'un groupe en lecture seule : bannière, identité, description, organigramme,
 * lieux contrôlés et album.
 * - `subgroups` : groupes dont c'est le parent (depuis la liste de l'univers)
 * - `actions`   : boutons de l'en-tête (ex. « Modifier »)
 */
export function GroupSheet({ universe, group: g, subgroups, actions, sound = null }) {
  const { data: photos = [] } = usePhotos('group', g.id);
  const members = g.characters || [];
  const places = g.controlledPlaces || [];
  const indirectPlaces = (g.indirectlyControlledPlaces || []).filter((p) => !places.some((d) => d.id === p.id));
  const hasDescription = Boolean(plainText(g.description));

  const stats = [
    plural(members.length, 'membre'),
    subgroups.length > 0 && plural(subgroups.length, 'sous-groupe'),
    places.length > 0 && plural(places.length, 'lieu contrôlé', 'lieux contrôlés'),
  ].filter(Boolean);

  return (
    <article className={styles.sheet}>
      <header className={styles.hero}>
        <EntityBanner src={uploadUrl(g.banner, IMG.large)} zoom={uploadUrl(g.banner)} label={`Bannière de ${g.name}`} className={styles.banner} />
        <div className={styles.identity}>
          <ImageZoom src={uploadUrl(g.image)} label={`Logo de ${g.name}`} className={styles.logoZoom}>
            <GroupLogo group={g} className={styles.logo} />
          </ImageZoom>
          <div className={styles.heading}>
            <div className={styles.kicker}>
              {g.type && <span className={styles.type}>{g.type.name}</span>}
              {g.parent && (
                <Link to={universePath(universe, `groupes/${g.parent.id}`)} className={styles.parentLink}>
                  <CornerLeftUp aria-hidden /> {g.parent.name}
                </Link>
              )}
            </div>
            <h1 className={styles.name}>{g.name}</h1>
            <p className={styles.stats}>{stats.join(' · ')}</p>
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      </header>

      {hasDescription && (
        <SheetSection id="description">
          <RichText html={g.description} />
        </SheetSection>
      )}

      {sound}

      <SheetSection id="organigramme" title="Organigramme">
        <GroupOrgChart universe={universe} group={g} subgroups={subgroups} />
      </SheetSection>

      {(places.length > 0 || indirectPlaces.length > 0) && (
        <SheetSection id="lieux" title="Lieux contrôlés">
          <ul className={styles.places}>
            {places.map((p) => (
              <li key={p.id}>
                <Link to={universePath(universe, `lieux/${p.id}`)} className={styles.place}>
                  <MapPin aria-hidden /> {p.name}
                </Link>
              </li>
            ))}
            {indirectPlaces.map((p) => (
              <li key={p.id}>
                <Link to={universePath(universe, `lieux/${p.id}`)} className={styles.placeIndirect} title="Contrôlé via un lieu parent">
                  <MapPin aria-hidden /> {p.name}
                </Link>
              </li>
            ))}
          </ul>
          {indirectPlaces.length > 0 && <p className={styles.note}>Les lieux en pointillés sont contrôlés à travers leur lieu parent.</p>}
        </SheetSection>
      )}

      <ModFieldsSheetSections entityType="group" entityId={g.id} />

      {photos.length > 0 && (
        <SheetSection id="album" title="Album photo">
          <PhotoGallery photos={photos} name={g.name} />
        </SheetSection>
      )}
    </article>
  );
}
