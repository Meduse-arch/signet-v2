import SimplePeer from 'simple-peer';
import { encryptSignalData, decryptSignalData } from './crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Réponse renvoyée par GET /api/signal?roomId=xxx */
interface SignalRoomState {
  offer: SimplePeer.SignalData | null;
  answer: SimplePeer.SignalData | null;
}

/** Événements émis par VTTNetwork vers le reste de l'application */
export type VTTNetworkEvent =
  | { kind: 'connected' }
  | { kind: 'disconnected' }
  | { kind: 'data'; payload: unknown }
  | { kind: 'error'; error: Error };

export type VTTNetworkListener = (event: VTTNetworkEvent) => void;

// ---------------------------------------------------------------------------
// Classe principale
// ---------------------------------------------------------------------------

/**
 * `VTTNetwork` gère la couche réseau P2P du VTT.
 *
 * Flux de connexion :
 * 1. Le MJ appelle `hostGame(roomId)` → crée une offre SDP, la poste sur
 *    le serveur de signalement Vercel, puis poll toutes les 2 s en attendant
 *    la réponse du joueur.
 * 2. Le Joueur appelle `joinGame(roomId)` → récupère l'offre SDP depuis
 *    Vercel, génère sa réponse, et la poste.
 * 3. Une fois les deux côtés informés, WebRTC établit la connexion directe.
 *    Vercel n'est plus sollicité.
 *
 * Sécurité :
 * - `trickle: false` → un seul POST/GET par côté (pas de flux ICE continu).
 * - Les messages reçus via `data` sont renvoyés en `unknown` : le consumer
 *   DOIT les valider avec `zod` avant tout traitement.
 */
export class VTTNetwork {
  // ── État interne ────────────────────────────────────────────────────────
  private peer: SimplePeer.Instance | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<VTTNetworkListener> = new Set();

  /** URL de base du serveur de signalement (sans query string). */
  private readonly signalUrl: string;

  /** Intervalle de polling en millisecondes. */
  private readonly pollIntervalMs: number;

  constructor(signalUrl: string, pollIntervalMs = 2_000) {
    this.signalUrl = signalUrl;
    this.pollIntervalMs = pollIntervalMs;
  }

  // ── API publique ────────────────────────────────────────────────────────

  /**
   * Côté Maître du Jeu — crée la room et attend qu'un joueur la rejoigne.
   */
  public hostGame(roomId: string): void {
    this.cleanup();

    this.peer = new SimplePeer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.cloudflare.com:3478' }, // 1. Cloudflare (Focus vie privée)
          { urls: 'stun:global.stun.twilio.com:3478' }, // 2. Twilio
          { urls: 'stun:stun.l.google.com:19302' }, // 3. Google
        ],
      },
    });

    this.bindPeerEvents();

    this.peer.on('signal', async (offerData: SimplePeer.SignalData) => {
      try {
        await this.postSignal(roomId, 'offer', offerData);
        console.info('[VTTNetwork·Hôte] Offre SDP postée. Polling en attente de réponse…');
        this.startPollingForAnswer(roomId);
      } catch (err) {
        console.error('[VTTNetwork·Hôte] Échec POST offre :', err);
        this.emit({ kind: 'error', error: toError(err) });
      }
    });
  }

  /**
   * Côté Joueur — rejoint une room existante créée par le MJ.
   */
  public async joinGame(roomId: string): Promise<void> {
    this.cleanup();

    const checkOffer = async () => {
      try {
        const room = await this.getSignal(roomId);
        if (room?.offer) {
          console.info('[VTTNetwork·Joueur] Offre de l\'hôte trouvée !');
          this.stopPolling();
          this.startPlayerPeer(roomId, room.offer);
        }
      } catch (err) {
        console.error('[VTTNetwork·Joueur] Erreur vérification offre :', err);
      }
    };

    // 1. Vérification immédiate
    await checkOffer();

    // 2. Si on n'a pas trouvé l'offre, on boucle (polling) au lieu de crasher
    if (this.pollingTimer === null && !this.peer) {
      console.info('[VTTNetwork·Joueur] En attente de la création de la partie par le MJ...');
      this.pollingTimer = setInterval(checkOffer, this.pollIntervalMs);
    }
  }

  private startPlayerPeer(roomId: string, offer: SimplePeer.SignalData): void {
    this.peer = new SimplePeer({
      initiator: false,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.cloudflare.com:3478' }, // 1. Cloudflare
          { urls: 'stun:global.stun.twilio.com:3478' }, // 2. Twilio
          { urls: 'stun:stun.l.google.com:19302' }, // 3. Google
        ],
      },
    });

    this.bindPeerEvents();

    this.peer.on('signal', async (answerData: SimplePeer.SignalData) => {
      try {
        await this.postSignal(roomId, 'answer', answerData);
        console.info('[VTTNetwork·Joueur] Réponse SDP postée. Négociation WebRTC en cours…');
      } catch (err) {
        console.error('[VTTNetwork·Joueur] Échec POST réponse :', err);
        this.emit({ kind: 'error', error: toError(err) });
      }
    });

    this.peer.signal(offer);
  }

  /**
   * Envoie un message à travers le canal P2P (DataChannel WebRTC).
   */
  public send(message: unknown): void {
    if (!this.peer || !this.peer.connected) {
      console.warn('[VTTNetwork] send() appelé alors que le peer n\'est pas connecté.');
      return;
    }
    this.peer.send(JSON.stringify(message));
  }

  /** Ferme la connexion proprement et nettoie les ressources. */
  public destroy(): void {
    this.cleanup();
    this.listeners.clear();
  }

  /** `true` si le DataChannel WebRTC est ouvert. */
  public get connected(): boolean {
    return this.peer?.connected ?? false;
  }

  // ── Système d'événements léger ──────────────────────────────────────────

  /** Abonne un listener. Retourne une fonction de désabonnement. */
  public on(listener: VTTNetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: VTTNetworkEvent): void {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch (err) {
        console.error('[VTTNetwork] Erreur dans un listener :', err);
      }
    }
  }

  // ── Gestion des événements SimplePeer ───────────────────────────────────

  private bindPeerEvents(): void {
    const peer = this.peer;
    if (!peer) return;

    peer.on('connect', () => {
      console.info('⚡ [VTTNetwork] Connexion P2P WebRTC établie !');
      this.stopPolling();
      this.emit({ kind: 'connected' });
    });

    peer.on('data', (raw: Uint8Array) => {
      try {
        const payload: unknown = JSON.parse(new TextDecoder().decode(raw));
        this.emit({ kind: 'data', payload });
      } catch {
        console.warn('[VTTNetwork] Message reçu non-JSON, ignoré.');
      }
    });

    peer.on('close', () => {
      console.info('[VTTNetwork] Connexion WebRTC fermée.');
      this.emit({ kind: 'disconnected' });
    });

    peer.on('error', (err: Error) => {
      console.error('[VTTNetwork] Erreur WebRTC :', err);
      this.emit({ kind: 'error', error: err });
    });
  }

  // ── Communication avec le serveur de signalement ────────────────────────

  private async postSignal(
    roomId: string,
    type: 'offer' | 'answer',
    data: SimplePeer.SignalData,
  ): Promise<void> {
    const url = `${this.signalUrl}?roomId=${encodeURIComponent(roomId)}`;
    
    // Chiffrement de bout en bout de l'offre/réponse
    const encryptedData = await encryptSignalData(data, roomId);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data: encryptedData }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`POST ${url} → ${res.status} ${res.statusText} : ${body}`);
    }
  }

  private async getSignal(roomId: string): Promise<SignalRoomState | null> {
    const url = `${this.signalUrl}?roomId=${encodeURIComponent(roomId)}`;
    const res = await fetch(url);

    if (res.status === 404) return null;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GET ${url} → ${res.status} ${res.statusText} : ${body}`);
    }

    const raw = await res.json() as { offer: string | null; answer: string | null };
    const state: SignalRoomState = { offer: null, answer: null };

    // Déchiffrement de bout en bout
    if (raw.offer) {
      try {
        state.offer = await decryptSignalData<SimplePeer.SignalData>(raw.offer, roomId);
      } catch (err) {
        console.error('[VTTNetwork] Impossible de déchiffrer l\'offre (mauvais code ?)', err);
      }
    }

    if (raw.answer) {
      try {
        state.answer = await decryptSignalData<SimplePeer.SignalData>(raw.answer, roomId);
      } catch (err) {
        console.error('[VTTNetwork] Impossible de déchiffrer la réponse (mauvais code ?)', err);
      }
    }

    return state;
  }

  // ── Polling (côté Hôte uniquement) ──────────────────────────────────────

  private startPollingForAnswer(roomId: string): void {
    this.stopPolling();

    this.pollingTimer = setInterval(async () => {
      try {
        const room = await this.getSignal(roomId);
        if (room?.answer) {
          console.info('[VTTNetwork·Hôte] Réponse SDP reçue depuis le serveur de signalement.');
          this.stopPolling();
          this.peer?.signal(room.answer);
        }
      } catch (err) {
        console.error('[VTTNetwork·Hôte] Erreur polling :', err);
      }
    }, this.pollIntervalMs);
  }

  private stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  // ── Nettoyage ───────────────────────────────────────────────────────────

  private cleanup(): void {
    this.stopPolling();
    if (this.peer) {
      // Retire les écouteurs pour éviter que le `destroy()` ne déclenche 
      // un événement 'error' ou 'close' qui polluerait l'interface (faux positifs)
      this.peer.removeAllListeners();
      this.peer.destroy();
      this.peer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Utilitaire
// ---------------------------------------------------------------------------

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(String(value));
}
