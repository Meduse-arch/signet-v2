import { useState } from 'react';
import { useVTTNetwork } from './core/hooks/useVTTNetwork';
import type { P2PMessage } from './core/network/schemas';

// URL du serveur de signalement Vercel lancé localement via `npx vercel dev`
const SIGNAL_URL = 'http://localhost:3000/api/signal';

// Room par défaut pour les tests
const DEFAULT_ROOM = 'test-room-42';

/**
 * Dashboard de test P2P.
 * 
 * Permet de tester le flux complet :
 * - Onglet 1 → « Héberger » (MJ)
 * - Onglet 2 → « Rejoindre » (Joueur)
 * - Envoyer/recevoir des messages validés par Zod en temps réel.
 */
export function TestDashboard({ initialRoom }: { initialRoom?: string }) {
  const {
    connectionState,
    roomId,
    messages,
    hostGame,
    joinGame,
    sendMessage,
    disconnect,
  } = useVTTNetwork(SIGNAL_URL);

  const [inputRoomId, setInputRoomId] = useState(initialRoom || DEFAULT_ROOM);
  const [chatInput, setChatInput] = useState('');

  // Auto-rejoindre si initialRoom est fourni (pour la transition depuis le Hub)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  /*
  React.useEffect(() => {
    if (initialRoom && connectionState === 'disconnected') {
      // Pour plus tard
    }
  }, [initialRoom]);
  */

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleHost = () => {
    if (inputRoomId.trim()) hostGame(inputRoomId.trim());
  };

  const handleJoin = () => {
    if (inputRoomId.trim()) joinGame(inputRoomId.trim());
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const msg: P2PMessage = {
      type: 'CHAT',
      payload: {
        senderId: 'Aventurier',
        content: chatInput.trim(),
        timestamp: Date.now(),
      },
    };
    sendMessage(msg);
    setChatInput('');
  };

  const handleSendMoveToken = () => {
    const msg: P2PMessage = {
      type: 'MOVE_TOKEN',
      payload: {
        tokenId: 'token-goblin-01',
        x: Math.round(Math.random() * 800),
        y: Math.round(Math.random() * 600),
      },
    };
    sendMessage(msg);
  };

  const handleSendDiceRoll = () => {
    const d1 = Math.ceil(Math.random() * 20);
    const msg: P2PMessage = {
      type: 'ROLL_DICE',
      payload: {
        rollerId: 'Aventurier',
        formula: '1d20',
        results: [d1],
        total: d1,
      },
    };
    sendMessage(msg);
  };

  // ── Rendu ───────────────────────────────────────────────────────────────

  const stateColor: Record<string, string> = {
    disconnected: 'var(--color-muted)',
    connecting: 'var(--color-warning)',
    connected: 'var(--color-success)',
    error: 'var(--color-error)',
  };

  return (
    <div className="dashboard !h-full !overflow-y-auto !bg-transparent">
      <header className="dashboard-header !bg-slate-900/50 !backdrop-blur-md !border-slate-800">
        <h1 className="!text-white">⚔️ Plateau Virtuel (P2P Test)</h1>
        <div className="status-badge" style={{ backgroundColor: stateColor[connectionState] }}>
          {connectionState.toUpperCase()}
        </div>
      </header>

      {/* ── Connexion ── */}
      <section className="card !bg-slate-900/80 !border-slate-700">
        <h2 className="!text-slate-300">Statut de la Salle</h2>
        <div className="row">
          <input
            type="text"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            placeholder="ID de la room"
            disabled={connectionState !== 'disconnected'}
            className="!bg-slate-800 !text-white !border-slate-700"
          />
        </div>
        <div className="row">
          {connectionState === 'disconnected' ? (
            <>
              <button className="btn btn-host !bg-indigo-600 !border-transparent hover:!bg-indigo-500 !text-white" onClick={handleHost}>
                🏰 Créer la salle P2P
              </button>
              <button className="btn btn-join !bg-purple-600 !border-transparent hover:!bg-purple-500 !text-white" onClick={handleJoin}>
                🗡️ Rejoindre la salle P2P
              </button>
            </>
          ) : (
            <button className="btn btn-disconnect !bg-red-600 !border-transparent hover:!bg-red-500 !text-white" onClick={disconnect}>
              ❌ Couper la connexion P2P
            </button>
          )}
        </div>
      </section>

      {/* ── Actions de test ── */}
      {connectionState === 'connected' && (
        <section className="card">
          <h2>Actions de test</h2>

          {/* Chat */}
          <div className="row">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Écrire un message…"
            />
            <button className="btn btn-send" onClick={handleSendChat}>
              💬 Envoyer
            </button>
          </div>

          {/* Actions rapides */}
          <div className="row">
            <button className="btn btn-action" onClick={handleSendMoveToken}>
              📍 Déplacer un token (aléatoire)
            </button>
            <button className="btn btn-action" onClick={handleSendDiceRoll}>
              🎲 Lancer 1d20
            </button>
          </div>
        </section>
      )}

      {/* ── Journal des messages ── */}
      <section className="card">
        <h2>Journal des messages ({messages.length})</h2>
        <div className="message-log">
          {messages.length === 0 ? (
            <p className="empty-state">Aucun message reçu pour le moment…</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`message message-${msg.type.toLowerCase()}`}>
                <span className="message-type">{msg.type}</span>
                <span className="message-content">
                  {formatMessage(msg)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ── Utilitaire d'affichage ────────────────────────────────────────────────

function formatMessage(msg: P2PMessage): string {
  switch (msg.type) {
    case 'CHAT':
      return `[${msg.payload.senderId}] ${msg.payload.content}`;
    case 'MOVE_TOKEN':
      return `Token "${msg.payload.tokenId}" → (${msg.payload.x}, ${msg.payload.y})`;
    case 'ROLL_DICE':
      return `${msg.payload.rollerId} lance ${msg.payload.formula} → [${msg.payload.results.join(', ')}] = ${msg.payload.total}`;
  }
}
