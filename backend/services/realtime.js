const { WebSocketServer } = require('ws');
const { userFromToken } = require('./auth');

/**
 * Temps réel du roleplay (WebSocket sur /api/ws).
 * 1. le client se connecte puis s'identifie : { type: 'auth', token } (dans les 10 s) ;
 * 2. il s'abonne aux fils de lieux : { type: 'subscribe', placeId } / { type: 'unsubscribe', placeId } ;
 * 3. le serveur pousse les changements : { type: 'message:created' | 'message:updated' | 'message:deleted' | 'scenes:changed', placeId, ... }.
 * Les écritures passent par l'API REST (droits vérifiés) ; ce canal ne fait que diffuser.
 * Tout compte connecté peut lire, comme pour l'API.
 */

const rooms = new Map(); // placeId -> Set<WebSocket>
const AUTH_TIMEOUT = 10_000;
const HEARTBEAT = 30_000;
const MAX_ROOMS_PER_SOCKET = 50;

const leave = (ws, placeId) => {
  ws.rooms.delete(placeId);
  const room = rooms.get(placeId);
  if (!room) return;
  room.delete(ws);
  if (!room.size) rooms.delete(placeId);
};

const join = (ws, placeId) => {
  if (ws.rooms.size >= MAX_ROOMS_PER_SOCKET) return;
  ws.rooms.add(placeId);
  if (!rooms.has(placeId)) rooms.set(placeId, new Set());
  rooms.get(placeId).add(ws);
};

function setupRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/api/ws', maxPayload: 16 * 1024 });

  wss.on('connection', (ws) => {
    ws.user = null;
    ws.rooms = new Set();
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const authTimer = setTimeout(() => !ws.user && ws.close(4401, 'Connexion requise'), AUTH_TIMEOUT);

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!ws.user) {
        if (msg?.type !== 'auth' || typeof msg.token !== 'string') return ws.close(4401, 'Connexion requise');
        const user = await userFromToken(msg.token).catch(() => null);
        if (!user) return ws.close(4401, 'Session invalide');
        clearTimeout(authTimer);
        ws.user = user;
        ws.send(JSON.stringify({ type: 'ready' }));
        return;
      }
      const placeId = Number(msg?.placeId);
      if (!Number.isInteger(placeId) || placeId <= 0) return;
      if (msg.type === 'subscribe') join(ws, placeId);
      else if (msg.type === 'unsubscribe') leave(ws, placeId);
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      for (const placeId of [...ws.rooms]) leave(ws, placeId);
    });
    ws.on('error', () => {});
  });

  // Connexions mortes (veille, réseau coupé) : fermées après un ping sans réponse
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT);
  wss.on('close', () => clearInterval(interval));

  return wss;
}

/** Diffuse un événement à tous les abonnés du fil d'un lieu. */
function broadcast(placeId, event) {
  const room = rooms.get(Number(placeId));
  if (!room) return;
  const data = JSON.stringify({ ...event, placeId: Number(placeId) });
  for (const ws of room) if (ws.readyState === ws.OPEN) ws.send(data);
}

module.exports = { setupRealtime, broadcast };
