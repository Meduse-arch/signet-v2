import { useState, useEffect, useRef, useCallback } from 'react';
import { VTTNetwork } from '../network/webrtc-client';
import { P2PMessageSchema, type P2PMessage } from '../network/schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseVTTNetworkReturn {
  connectionState: ConnectionState;
  roomId: string | null;
  messages: P2PMessage[];
  hostGame: (roomId: string) => void;
  joinGame: (roomId: string) => void;
  lockRoom: (roomId: string) => void;
  sendMessage: (payload: P2PMessage) => void;
  disconnect: () => void;
}

const MAX_MESSAGES = 500;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVTTNetwork(signalUrl: string): UseVTTNetworkReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<P2PMessage[]>([]);

  const networkRef = useRef<VTTNetwork | null>(null);

  const getNetwork = useCallback((): VTTNetwork => {
    if (!networkRef.current) {
      networkRef.current = new VTTNetwork(signalUrl);
    }
    return networkRef.current;
  }, [signalUrl]);

  // ── Abonnement aux événements VTTNetwork ────────────────────────────────
  useEffect(() => {
    const network = getNetwork();

    const unsubscribe = network.on((event) => {
      console.log(`[useVTTNetwork] Événement reçu du réseau :`, event.kind);
      switch (event.kind) {
        case 'connected':
          console.log('[useVTTNetwork] Mise à jour de l\'état React -> connected');
          setConnectionState('connected');
          break;

        case 'disconnected':
          console.log('[useVTTNetwork] Mise à jour de l\'état React -> disconnected');
          setConnectionState('disconnected');
          break;

        case 'error':
          console.error('[useVTTNetwork] Erreur réseau :', event.error);
          setConnectionState('error');
          break;

        case 'data': {
          const result = P2PMessageSchema.safeParse(event.payload);
          if (!result.success) {
            console.warn(
              '[useVTTNetwork] Message P2P rejeté (validation Zod) :',
              result.error.issues,
              'Payload brut :',
              event.payload,
            );
            return;
          }
          setMessages((prev) => {
            const next = [...prev, result.data];
            return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
          });
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, [getNetwork]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const hostGame = useCallback(
    (id: string) => {
      setConnectionState('connecting');
      setRoomId(id);
      setMessages([]);
      getNetwork().hostGame(id);
    },
    [getNetwork],
  );

  const joinGame = useCallback(
    (id: string) => {
      setConnectionState('connecting');
      setRoomId(id);
      setMessages([]);
      getNetwork().joinGame(id);
    },
    [getNetwork],
  );

  const lockRoom = useCallback(
    (id: string) => {
      getNetwork().lockRoom(id);
    },
    [getNetwork],
  );

  const sendMessage = useCallback(
    (payload: P2PMessage) => {
      getNetwork().send(payload);
    },
    [getNetwork],
  );

  const disconnect = useCallback(() => {
    networkRef.current?.close(); // Keep the instance and listeners alive
    setConnectionState('disconnected');
    setRoomId(null);
    setMessages([]);
  }, []);

  return {
    connectionState,
    roomId,
    messages,
    hostGame,
    joinGame,
    lockRoom,
    sendMessage,
    disconnect,
  };
}
