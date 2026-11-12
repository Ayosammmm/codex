import { Fragment } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Map as MapIcon } from 'lucide-react';
import { mapPins, placeMap } from '@/config/places';
import { ChevronRight } from '@/components/ui/icons';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/Feedback';
import { entityAncestors } from '@/components/entity/tree';
import { plural, universePath } from '@/utils/universe';
import { MapViewer } from './MapViewer';
import styles from './MapExplorer.module.scss';
import { usePermissions } from '@/auth/auth';

/**
 * Vue « Carte » des lieux : la carte d'un lieu avec ses sous-lieux en repères.
 * Un repère ouvre la carte du sous-lieu s'il en a une, sinon sa fiche.
 * La carte affichée est gardée dans l'URL (?carte=id).
 */
export function MapExplorer({ universe, places, linkTo }) {
  const { canEdit } = usePermissions();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const withMap = places.filter((p) => p.mapImage);
  const byId = new Map(places.map((p) => [p.id, p]));

  if (!withMap.length) {
    return (
      <EmptyState icon={MapIcon} title="Aucune carte pour l’instant">
        Ajoutez une carte à un lieu (le monde, un royaume, une ville…) depuis son édition, section « Carte », puis placez-y ses sous-lieux.
      </EmptyState>
    );
  }

  // Carte par défaut : la plus haute dans la hiérarchie
  const depth = (p) => entityAncestors(p, places).length;
  const fallback = [...withMap].sort((a, b) => depth(a) - depth(b) || a.name.localeCompare(b.name, 'fr'))[0];
  const current = byId.get(Number(params.get('carte'))) || fallback;
  const show = (id) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('carte', id);
        return next;
      },
      { replace: true },
    );

  const pins = mapPins(current, places);
  const unplaced = places.filter((p) => p.parentId === current.id && (p.mapX == null || p.mapY == null));
  const trail = entityAncestors(current, places).filter((p) => p.mapImage);

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <nav aria-label="Cartes parentes" className={styles.breadcrumb}>
          {trail.map((p) => (
            <Fragment key={p.id}>
              <button type="button" onClick={() => show(p.id)}>
                {p.name}
              </button>
              <ChevronRight aria-hidden />
            </Fragment>
          ))}
          <Link to={linkTo(current)} className={styles.current}>
            {current.name}
          </Link>
        </nav>
        {withMap.length > 1 && (
          <Select
            compact
            aria-label="Changer de carte"
            options={withMap.map((p) => ({ value: String(p.id), label: p.name }))}
            value={String(current.id)}
            onChange={(id) => show(id)}
            className={styles.select}
          />
        )}
      </div>

      <MapViewer
        key={current.id}
        src={placeMap(current)}
        pins={pins}
        label={`Carte de ${current.name}`}
        onPinClick={(pin) => (pin.hasMap ? show(pin.id) : navigate(linkTo(byId.get(pin.id))))}
      />

      <p className={styles.hint}>
        {pins.length ? `${plural(pins.length, 'lieu placé', 'lieux placés')}. ` : 'Aucun sous-lieu placé sur cette carte. '}
        Molette ou boutons pour zoomer, glisser pour se déplacer ; les repères à calque ouvrent une carte plus détaillée.
        {unplaced.length > 0 && (
          <>
            {' '}
            {plural(unplaced.length, 'sous-lieu', 'sous-lieux')} à placer
            {canEdit('place', current.id) ? (
              <>
                {' '}:{' '}<Link to={universePath(universe, `lieux/${current.id}/modifier`)}>modifier la carte</Link>.
              </>
            ) : (
              '.'
            )}
          </>
        )}
      </p>
    </div>
  );
}
