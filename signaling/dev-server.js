// ---------------------------------------------------------------------------
// Serveur de signalement LOCAL — pour le développement uniquement
// ---------------------------------------------------------------------------
// Remplace `npx vercel dev` en local. Zéro dépendance, Node.js natif.
// Usage : node dev-server.js
// Le serveur écoute sur http://localhost:3000/api/signal
// ---------------------------------------------------------------------------

const http = require('http');

const PORT = 3000;

// Stockage en mémoire (identique à api/signal.ts)
const rooms = {};
const ROOM_TTL_MS = 10 * 60 * 1000;

function pruneExpiredRooms() {
  const now = Date.now();
  for (const id of Object.keys(rooms)) {
    if (now - rooms[id].createdAt > ROOM_TTL_MS) {
      delete rooms[id];
    }
  }
}

// Stockage des salons publics en mémoire
const publicRooms = {};
const PUBLIC_ROOM_TTL_MS = 60 * 1000; // 60 secondes sans heartbeat = salon expiré

function pruneExpiredPublicRooms() {
  const now = Date.now();
  for (const id of Object.keys(publicRooms)) {
    if (now - publicRooms[id].updatedAt > PUBLIC_ROOM_TTL_MS) {
      console.log(`[Lobby] Salon public expiré (timeout) : "${id}"`);
      delete publicRooms[id];
    }
  }
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Utilisation de la nouvelle API URL (WHATWG) au lieu de l'ancienne url.parse()
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsed = new URL(req.url, baseURL);

  // Route /api/public-rooms (Salons publics)
  if (parsed.pathname === '/api/public-rooms') {
    pruneExpiredPublicRooms();

    // GET — lister les salons publics
    if (req.method === 'GET') {
      const list = Object.values(publicRooms);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(list));
    }

    // DELETE — fermer un salon public
    if (req.method === 'DELETE') {
      const roomId = parsed.searchParams.get('roomId');
      if (roomId && publicRooms[roomId]) {
        delete publicRooms[roomId];
        console.log(`[Lobby] Salon public supprimé : "${roomId}"`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    }

    // POST — publier ou renouveler (heartbeat) un salon public
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data.roomId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'roomId requis' }));
          }

          publicRooms[data.roomId] = {
            roomId: data.roomId,
            name: data.name || data.roomId,
            system: data.system || 'Générique',
            tags: data.tags || '',
            desc: data.desc || '',
            players: typeof data.players === 'number' ? data.players : 1,
            maxPlayers: data.maxPlayers !== undefined ? data.maxPlayers : null,
            isRoomOpen: !!data.isRoomOpen,
            updatedAt: Date.now()
          };
          console.log(`[Lobby] Salon public mis à jour : "${data.roomId}" (${data.name || ''})`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'JSON invalide' }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Méthode non autorisée' }));
  }

  // On n'accepte sinon que /api/signal
  if (parsed.pathname !== '/api/signal') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Route introuvable' }));
  }

  const roomId = parsed.searchParams.get('roomId');
  if (!roomId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'roomId requis' }));
  }

  pruneExpiredRooms();

  // GET — récupérer l'état de la room
  if (req.method === 'GET') {
    const room = rooms[roomId];
    if (!room) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ offer: null, answer: null }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      offer: room.offer || null,
      answer: room.answer || null,
    }));
  }

  // DELETE — supprimer la room (verrouillage)
  if (req.method === 'DELETE') {
    delete rooms[roomId];
    console.log(`[Signal] Room "${roomId}" verrouillée/supprimée`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  // POST — déposer une offre ou une réponse
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { type, data } = JSON.parse(body);

        if (type !== 'offer' && type !== 'answer') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'type doit être "offer" ou "answer"' }));
        }

        if (!rooms[roomId]) {
          rooms[roomId] = { createdAt: Date.now() };
        }

        if (type === 'offer') {
          rooms[roomId].offer = data;
          delete rooms[roomId].answer; // <-- CORRECTION: Supprime l'ancienne réponse !
          console.log(`[Signal] Offre reçue pour room "${roomId}"`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true }));
        }

        if (type === 'answer') {
          rooms[roomId].answer = data;
          console.log(`[Signal] Réponse reçue pour room "${roomId}"`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'JSON invalide' }));
      }
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Méthode non autorisée' }));
});

server.listen(PORT, () => {
  console.log(`\n⚡ Serveur de signalement local`);
  console.log(`   http://localhost:${PORT}/api/signal`);
  console.log(`   Ctrl+C pour arrêter\n`);
});
