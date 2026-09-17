import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// ⚠️ STOCKAGE TEMPORAIRE EN MÉMOIRE
// ---------------------------------------------------------------------------
// Ce dictionnaire fonctionne pour le développement local et les « warm starts »
// d'une même instance Vercel, mais la mémoire n'est PAS partagée entre les
// différentes invocations serverless ni entre les régions.
//
// TODO (Production) : Remplacer ce Record par Vercel KV (Redis managé) ou
// un autre store partagé pour garantir la persistance inter-requêtes.
//   → import { kv } from '@vercel/kv';
//   → await kv.set(`room:${roomId}`, roomData, { ex: 300 }); // TTL 5 min
// ---------------------------------------------------------------------------
const rooms: Record<string, { offer?: unknown; answer?: unknown; createdAt: number }> = {};

// Durée de vie maximale d'une room en mémoire (10 minutes).
const ROOM_TTL_MS = 10 * 60 * 1000;

/**
 * Nettoie les rooms expirées (garbage collection basique).
 * Appelé à chaque requête pour éviter les fuites mémoire en dev.
 */
function pruneExpiredRooms(): void {
  const now = Date.now();
  for (const id of Object.keys(rooms)) {
    if (now - rooms[id].createdAt > ROOM_TTL_MS) {
      delete rooms[id];
    }
  }
}

/**
 * Applique les en-têtes CORS à la réponse.
 * En production, remplacer '*' par le domaine exact de l'app Electron / front.
 */
function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, X-Requested-With',
  );
}

// ---------------------------------------------------------------------------
// Handler principal — point d'entrée Vercel Serverless
// ---------------------------------------------------------------------------
export default function handler(req: VercelRequest, res: VercelResponse): VercelResponse {
  setCorsHeaders(res);

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Seules GET, POST et DELETE sont autorisées
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez GET, POST ou DELETE.' });
  }

  // Le roomId est obligatoire dans les query params
  const roomId = req.query.roomId;
  if (!roomId || typeof roomId !== 'string' || roomId.length === 0) {
    return res.status(400).json({ error: 'Le paramètre "roomId" est requis (query string).' });
  }

  // Nettoyage périodique
  pruneExpiredRooms();

  // ── GET : Récupérer l'état actuel de la room ───────────────────────────
  if (req.method === 'GET') {
    const room = rooms[roomId];
    if (!room) {
      return res.status(200).json({ offer: null, answer: null });
    }
    // On renvoie uniquement offer/answer, pas les métadonnées internes
    return res.status(200).json({
      offer: room.offer ?? null,
      answer: room.answer ?? null,
    });
  }

  // ── DELETE : Supprimer la room (verrouillage) ─────────────────────────
  if (req.method === 'DELETE') {
    delete rooms[roomId];
    return res.status(200).json({ ok: true, message: 'Room verrouillée/supprimée.' });
  }

  // ── POST : Déposer une offre (host) ou une réponse (join) ─────────────
  if (req.method === 'POST') {
    const { type, data } = req.body ?? {};

    if (type !== 'offer' && type !== 'answer') {
      return res.status(400).json({
        error: 'Le champ "type" est requis et doit valoir "offer" ou "answer".',
      });
    }

    if (!data) {
      return res.status(400).json({ error: 'Le champ "data" (SDP) est requis.' });
    }

    // Création de la room si elle n'existe pas encore
    if (!rooms[roomId]) {
      rooms[roomId] = { createdAt: Date.now() };
    }

    if (type === 'offer') {
      rooms[roomId].offer = data;
      delete rooms[roomId].answer; // <-- CORRECTION: Supprime l'ancienne réponse
      return res.status(200).json({ ok: true, message: 'Offre SDP enregistrée.' });
    }

    // type === 'answer'
    if (!rooms[roomId].offer) {
      return res.status(409).json({
        error: 'Impossible de poster une réponse : aucune offre n\'existe pour cette room.',
      });
    }
    rooms[roomId].answer = data;
    return res.status(200).json({ ok: true, message: 'Réponse SDP enregistrée.' });
  }

  // Fallback (ne devrait jamais arriver)
  return res.status(500).json({ error: 'Erreur interne inattendue.' });
}
