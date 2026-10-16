import type { VercelRequest, VercelResponse } from '@vercel/node';

// ---------------------------------------------------------------------------
// Salons publics — Vercel Serverless
// ---------------------------------------------------------------------------
interface PublicRoom {
  roomId: string;
  name: string;
  system: string;
  tags?: string;
  desc?: string;
  players: number;
  maxPlayers: number | null;
  isRoomOpen?: boolean;
  updatedAt: number;
}

const publicRooms: Record<string, PublicRoom> = {};
const PUBLIC_ROOM_TTL_MS = 60 * 1000; // 60 secondes sans heartbeat = salon expiré

function pruneExpiredPublicRooms(): void {
  const now = Date.now();
  for (const id of Object.keys(publicRooms)) {
    if (now - publicRooms[id].updatedAt > PUBLIC_ROOM_TTL_MS) {
      delete publicRooms[id];
    }
  }
}

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, X-Requested-With',
  );
}

export default function handler(req: VercelRequest, res: VercelResponse): VercelResponse {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  pruneExpiredPublicRooms();

  if (req.method === 'GET') {
    return res.status(200).json(Object.values(publicRooms));
  }

  if (req.method === 'DELETE') {
    const roomId = req.query.roomId as string;
    if (roomId && publicRooms[roomId]) {
      delete publicRooms[roomId];
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!data?.roomId) {
        return res.status(400).json({ error: 'roomId requis' });
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

      return res.status(200).json({ ok: true });
    } catch {
      return res.status(400).json({ error: 'JSON invalide' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
