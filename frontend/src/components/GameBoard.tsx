import React, { useState, useEffect, useRef } from 'react';
import type { P2PMessage } from '../core/network/schemas';
import { Button } from './ui/Button';
import { LogOut } from 'lucide-react';

interface Token {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

interface GameBoardProps {
  isHost: boolean;
  username: string;
  messages: P2PMessage[];
  sendMessage: (msg: P2PMessage) => void;
  onReturn: () => void;
}

const GRID_SIZE = 50;

export function GameBoard({ isHost, username, messages, sendMessage, onReturn }: GameBoardProps) {
  // Liste de pions par défaut pour tester
  const [tokens, setTokens] = useState<Token[]>([
    { id: 'hero', name: username.substring(0, 2).toUpperCase(), x: 3, y: 3, color: 'bg-zinc-800 text-white border-zinc-500' },
    { id: 'goblin1', name: 'GB', x: 8, y: 4, color: 'bg-rose-950 text-rose-200 border-rose-800' },
    { id: 'goblin2', name: 'GB', x: 8, y: 6, color: 'bg-rose-950 text-rose-200 border-rose-800' },
  ]);

  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Synchronisation des positions P2P
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg.type === 'MOVE_TOKEN') {
      const { tokenId, x, y } = lastMsg.payload;
      setTokens((prev) => 
        prev.map(t => (t.id === tokenId ? { ...t, x, y } : t))
      );
    }
  }, [messages]);

  const handlePointerDown = (e: React.PointerEvent, tokenId: string) => {
    // Prevent default to avoid text selection while dragging
    e.preventDefault();
    setDraggingToken(tokenId);
    
    // Capture pointer events to the board to track outside moves
    if (boardRef.current) {
      boardRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingToken || !boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const rawX = e.clientX - boardRect.left;
    const rawY = e.clientY - boardRect.top;

    // Calculer les coordonnées de la grille (0, 1, 2...)
    const gridX = Math.max(0, Math.floor(rawX / GRID_SIZE));
    const gridY = Math.max(0, Math.floor(rawY / GRID_SIZE));

    setTokens((prev) =>
      prev.map(t => (t.id === draggingToken ? { ...t, x: gridX, y: gridY } : t))
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingToken) return;

    // Envoyer la position finale en P2P
    const token = tokens.find(t => t.id === draggingToken);
    if (token) {
      sendMessage({
        type: 'MOVE_TOKEN',
        payload: { tokenId: token.id, x: token.x, y: token.y },
      });
    }

    setDraggingToken(null);
    if (boardRef.current) {
      boardRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Barre d'outils */}
      <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <h1 className="text-white font-bold tracking-wider">
          Plateau <span className="text-rose-400">SIGNET</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-sm">
            {isHost ? 'Maître du Jeu' : 'Joueur'}
          </span>
          <Button variant="ghost" size="sm" onClick={onReturn} leftIcon={<LogOut className="w-4 h-4" />}>
            Retour
          </Button>
        </div>
      </div>

      {/* Zone du plateau */}
      <div 
        ref={boardRef}
        className="flex-1 relative overflow-hidden touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          // Motif de grille (50x50 pixels) très subtil et teinté de rouge (sang)
          backgroundImage: 'linear-gradient(to right, rgba(225,29,72,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(225,29,72,0.05) 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
      >
        {tokens.map((token) => (
          <div
            key={token.id}
            onPointerDown={(e) => handlePointerDown(e, token.id)}
            className={`absolute flex items-center justify-center font-bold text-sm rounded-sm shadow-lg border-2 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform ${token.color} ${draggingToken === token.id ? 'border-white z-10' : 'z-0'}`}
            style={{
              width: GRID_SIZE - 4, // Laisse un petit espace
              height: GRID_SIZE - 4,
              left: token.x * GRID_SIZE + 2,
              top: token.y * GRID_SIZE + 2,
              // Désactiver la transition quand on drag pour pas que ça lag
              transition: draggingToken === token.id ? 'none' : 'transform 0.1s, left 0.1s, top 0.1s',
            }}
          >
            {token.name}
          </div>
        ))}
      </div>
    </div>
  );
}
