export interface PublicRoomInfo {
  roomId: string;
  name: string;
  system: string;
  tags?: string;
  desc?: string;
  players: number;
  maxPlayers: number | null;
  isRoomOpen?: boolean;
  updatedAt?: number;
}

export function getPublicRoomsUrl(signalUrl: string): string {
  try {
    const url = new URL(signalUrl);
    url.pathname = url.pathname.replace(/\/signal\/?$/, '/public-rooms');
    url.search = '';
    return url.toString();
  } catch {
    return signalUrl.replace('/api/signal', '/api/public-rooms');
  }
}

export const publicRoomsService = {
  async fetchPublicRooms(signalUrl: string): Promise<PublicRoomInfo[]> {
    const url = getPublicRoomsUrl(signalUrl);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Erreur récupération salons publics: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async publishPublicRoom(signalUrl: string, room: PublicRoomInfo): Promise<void> {
    const url = getPublicRoomsUrl(signalUrl);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(room)
    });
    if (!res.ok) {
      throw new Error(`Erreur publication salon public: ${res.status}`);
    }
  },

  async unpublishPublicRoom(signalUrl: string, roomId: string): Promise<void> {
    const base = getPublicRoomsUrl(signalUrl);
    const url = `${base}?roomId=${encodeURIComponent(roomId)}`;
    await fetch(url, { method: 'DELETE' }).catch(() => {});
  }
};
