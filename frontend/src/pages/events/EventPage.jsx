import { Link } from 'react-router';
import { ArrowLeft, Pencil } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { EventSheet } from '@/components/events/EventSheet';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { EventLoader } from './EventLoader';
import { usePermissions } from '@/auth/auth';

/** Fiche d'un événement (/evenements/:eventId), en lecture seule. */
export default function EventPage() {
  return <EventLoader>{(event, universe) => <EventView key={event.id} universe={universe} event={event} />}</EventLoader>;
}

function EventView({ universe, event }) {
  const { canEdit } = usePermissions();
  // Chronologie de l'univers : événements voisins
  const { data: events = [] } = useEntityList('events', universe.id);
  const index = events.findIndex((e) => e.id === event.id);
  const prev = index > 0 ? events[index - 1] : null;
  const next = index >= 0 ? events[index + 1] || null : null;

  return (
    <EntityThemeZone tinted universe={universe} colors={event.colors} background={uploadUrl(event.background)} backgroundColor={event.backgroundColor}>
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to={universePath(universe, 'evenements')} className={page.backLink}>
          <ArrowLeft aria-hidden /> Événements
        </Link>
        <div className={page.belowBack}>
          <EventSheet
            universe={universe}
            event={event}
            prev={prev}
            next={next}
            modules={{ groups: isModuleEnabled(getModulesState(universe), 'groups') }}
            actions={
              canEdit('event', event.id) && (
                <Button as={Link} to={universePath(universe, `evenements/${event.id}/modifier`)} variant="primary" icon={Pencil}>
                  Modifier
                </Button>
              )
            }
          />
        </div>
      </main>
    </EntityThemeZone>
  );
}
