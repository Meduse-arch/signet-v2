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

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Utilisation de la nouvelle API URL (WHATWG) au lieu de l'ancienne url.parse()
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsed = new URL(req.url, baseURL);

  // On n'accepte que /api/signal
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
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Room introuvable' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      offer: room.offer || null,
      answer: room.answer || null,
    }));
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
