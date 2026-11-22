import { Message } from '@/components/messages/Message';
import { RpTravels } from './RpTravels';

/**
 * Message d'un fil ou d'une scène de roleplay : le message commun (components/messages/Message), entouré des
 * arrivées et départs de ses personnages (`placesById` : noms des lieux ; sans lui, pas de déplacements).
 * Autres props : celles de Message.
 */
export function RpMessage({ placesById, ...props }) {
  const { universe, message, charactersById } = props;
  const travels = placesById && message.travels;
  return (
    <Message
      {...props}
      before={travels && <RpTravels universe={universe} kind="arrivals" items={travels.arrivals} charactersById={charactersById} placesById={placesById} />}
      after={travels && <RpTravels universe={universe} kind="departures" items={travels.departures} charactersById={charactersById} placesById={placesById} />}
    />
  );
}
