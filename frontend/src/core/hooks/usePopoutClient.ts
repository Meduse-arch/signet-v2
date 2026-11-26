import { useEffect, useState } from 'react';
import { coreEventBus } from '../services/EventBus';
import { ModManager } from '../services/ModManager';
import { createPopoutChannel } from '../services/popoutChannel';
import { P2PMessageSchema } from '../network/schemas';

/**
 * Popout : branche l'EventBus local sur la fenêtre principale via BroadcastChannel,
 * à la place d'un peer WebRTC. Demande l'état courant (joueurs, rôle, système) au montage.
 * Renvoie le `systemId` annoncé par la fenêtre principale (null tant qu'inconnu).
 */
export function usePopoutClient(username: string): string | null {
  const [syncedSystemId, setSyncedSystemId] = useState<string | null>(null);

  useEffect(() => {
    const id = crypto.randomUUID();
    let injecting = false; // vrai pendant l'injection d'un message relayé (anti-boucle)

    const channel = createPopoutChannel((msg) => {
      if (msg.type === 'sync' && (msg.origin === id || msg.origin === '*')) {
        ModManager.setContext(username, msg.isHost);
        ModManager.setPlayers(msg.players);
        if (msg.systemId) setSyncedSystemId(msg.systemId);
      } else if (msg.type === 'vtt-relay' && msg.origin !== id) {
        injecting = true;
        try {
          coreEventBus.emit(msg.dir === 'incoming' ? 'NETWORK_INCOMING' : 'NETWORK_OUTGOING', msg.payload);
        } finally {
          injecting = false;
        }
      }
    });

    const onOutgoing = (payload: unknown) => {
      if (injecting) return;
      const parsed = P2PMessageSchema.safeParse(payload);
      if (!parsed.success) return;
      channel.post({ type: 'vtt-relay', origin: id, dir: 'outgoing', payload: parsed.data });
    };
    coreEventBus.on('NETWORK_OUTGOING', onOutgoing);
    channel.post({ type: 'request-sync', origin: id });

    return () => {
      coreEventBus.off('NETWORK_OUTGOING', onOutgoing);
      channel.close();
    };
  }, [username]);

  return syncedSystemId;
}
