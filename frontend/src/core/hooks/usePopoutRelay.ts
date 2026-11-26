import { useEffect } from 'react';
import { coreEventBus } from '../services/EventBus';
import { ModManager } from '../services/ModManager';
import { createPopoutChannel } from '../services/popoutChannel';
import { P2PMessageSchema } from '../network/schemas';

/** Système de jeu de la session en cours (posé par App.tsx à l'entrée en jeu). */
function readSystemId(): string | null {
  return sessionStorage.getItem('signet_system_id') || null;
}

/**
 * Fenêtre principale : relaie les messages VTT (EventBus) vers les popouts locaux et injecte
 * ceux des popouts dans le flux sortant. Les popouts n'ouvrent aucune connexion WebRTC.
 */
export function usePopoutRelay(): void {
  useEffect(() => {
    let currentOrigin = 'main'; // origine du message en cours d'injection (anti-écho)

    const channel = createPopoutChannel((msg) => {
      if (msg.type === 'request-sync') {
        channel.post({
          type: 'sync',
          origin: msg.origin,
          players: ModManager.getPlayers(),
          isHost: ModManager.getIsHost(),
          systemId: readSystemId(),
        });
      } else if (msg.type === 'vtt-relay' && msg.dir === 'outgoing') {
        currentOrigin = msg.origin;
        try {
          coreEventBus.emit('NETWORK_OUTGOING', msg.payload);
        } finally {
          currentOrigin = 'main';
        }
      }
    });

    const forward = (dir: 'incoming' | 'outgoing') => (payload: unknown) => {
      const parsed = P2PMessageSchema.safeParse(payload);
      if (!parsed.success) return;
      channel.post({ type: 'vtt-relay', origin: currentOrigin, dir, payload: parsed.data });
    };
    const onIncoming = forward('incoming');
    const onOutgoing = forward('outgoing');
    const onPlayers = (players: string[]) =>
      channel.post({ type: 'sync', origin: '*', players, isHost: ModManager.getIsHost(), systemId: readSystemId() });

    coreEventBus.on('NETWORK_INCOMING', onIncoming);
    coreEventBus.on('NETWORK_OUTGOING', onOutgoing);
    coreEventBus.on('PLAYERS_CHANGED', onPlayers);

    return () => {
      coreEventBus.off('NETWORK_INCOMING', onIncoming);
      coreEventBus.off('NETWORK_OUTGOING', onOutgoing);
      coreEventBus.off('PLAYERS_CHANGED', onPlayers);
      channel.close();
    };
  }, []);
}
