import { z } from 'zod';
import { P2PMessageSchema } from '../network/schemas';

// Canal local (même appareil) entre la fenêtre principale et les fenêtres détachées.
// BroadcastChannel : même origine, sans passer par le réseau ni par des permissions Tauri.
// Les popouts ne rejoignent PAS la room WebRTC : la fenêtre principale relaie les messages VTT.
const CHANNEL_NAME = 'signet-popout';

/** `origin` = id du popout émetteur/destinataire ; 'main' = fenêtre principale ; '*' = tous. */
const popoutMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('dock-in'), windowId: z.string().min(1) }),
  z.object({ type: z.literal('request-sync'), origin: z.string().min(1) }),
  z.object({
    type: z.literal('sync'),
    origin: z.string().min(1),
    players: z.array(z.string()),
    isHost: z.boolean(),
    systemId: z.string().nullable(), // système de jeu actif (null = non défini)
  }),
  z.object({
    type: z.literal('vtt-relay'),
    origin: z.string().min(1),
    dir: z.enum(['incoming', 'outgoing']),
    payload: P2PMessageSchema,
  }),
]);

export type PopoutMessage = z.infer<typeof popoutMessageSchema>;

export interface PopoutChannel {
  post: (msg: PopoutMessage) => void;
  close: () => void;
}

/** Ouvre le canal ; `onMessage` ne reçoit que des messages validés. */
export function createPopoutChannel(onMessage: (msg: PopoutMessage) => void): PopoutChannel {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<unknown>) => {
    const parsed = popoutMessageSchema.safeParse(e.data);
    if (parsed.success) onMessage(parsed.data);
    else console.warn('[popoutChannel] Message rejeté (validation Zod) :', parsed.error.issues);
  };
  return { post: (msg) => channel.postMessage(msg), close: () => channel.close() };
}

/** Demande à la fenêtre principale de ré-afficher la DraggableWindow `windowId`. */
export function requestDockIn(windowId: string): void {
  const channel = createPopoutChannel(() => {});
  channel.post({ type: 'dock-in', windowId });
  channel.close();
}

/** Écoute les demandes de réintégration. Renvoie la fonction de désabonnement. */
export function onDockInRequest(handler: (windowId: string) => void): () => void {
  const channel = createPopoutChannel((msg) => {
    if (msg.type === 'dock-in') handler(msg.windowId);
  });
  return channel.close;
}
