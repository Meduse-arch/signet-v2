import { useState, useEffect, useRef, useCallback } from 'react';
import { VTTNetwork } from '../network/webrtc-client';
import { P2PMessageSchema, type P2PMessage } from '../network/schemas';
import { FileTransferService } from '../services/FileTransferService';
import { coreEventBus } from '../services/EventBus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Message validé + numéro de séquence monotone (jamais réinitialisé, survit à la troncature). */
export interface SequencedMessage {
  seq: number;
  msg: P2PMessage;
}

/** Types qu'un client ne peut pas envoyer à l'hôte : seul le MJ les émet. */
const HOST_ONLY_TYPES: ReadonlySet<P2PMessage['type']> = new Set([
  'SET_MAP',
  'START_GAME',
  'SPAWN_TOKEN',
  'REMOVE_TOKEN',
  'MOVE_PLAYER_MAP',
]);

export interface UseVTTNetworkReturn {
  connectionState: ConnectionState;
  roomId: string | null;
  messages: SequencedMessage[];
  hostGame: (roomId: string) => void;
  joinGame: (roomId: string) => void;
  lockRoom: (roomId: string) => void;
  sendMessage: (payload: P2PMessage) => void;
  sendBinary: (data: Uint8Array) => void;
  disconnect: () => void;
}

const MAX_MESSAGES = 500;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVTTNetwork(signalUrl: string, isHost: boolean): UseVTTNetworkReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SequencedMessage[]>([]);

  const networkRef = useRef<VTTNetwork | null>(null);
  const seqRef = useRef(0);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

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

        case 'binary':
          FileTransferService.receiveChunk(event.payload, (filename, blobUrl) => {
            console.log(`[useVTTNetwork] Fichier P2P reçu et sauvegardé : ${filename}`);
            coreEventBus.emit('FILE_TRANSFER_COMPLETE', { filename, blobUrl });
          });
          break;

        case 'data': {
          const result = P2PMessageSchema.safeParse(event.payload);
          if (!result.success) {
            console.warn('[useVTTNetwork] Message P2P rejeté (validation Zod) :', result.error.issues);
            return;
          }
          // Contrôle de rôle : tout message reçu par l'hôte vient d'un joueur.
          if (isHostRef.current && HOST_ONLY_TYPES.has(result.data.type)) {
            console.warn(`[useVTTNetwork] Message "${result.data.type}" réservé au MJ rejeté.`);
            return;
          }
          const entry: SequencedMessage = { seq: seqRef.current++, msg: result.data };
          setMessages((prev) => {
            const next = [...prev, entry];
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

  const sendBinary = useCallback(
    (data: Uint8Array) => {
      getNetwork().sendBinary(data);
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
    sendBinary,
    disconnect,
  };
}
