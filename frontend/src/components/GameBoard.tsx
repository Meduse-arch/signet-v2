import React, { useState, useEffect } from 'react';
import type { P2PMessage } from '../core/network/schemas';
import { ModuleOverlays } from './game/ModuleOverlays';
import { DockManager } from './game/DockManager';
import { ModManager } from '../core/services/ModManager';
import { CoreChatModule } from '../core/modules/chat';
import { CoreNavigationModule } from '../core/modules/navigation';
import { CoreSystemWindowsModule } from '../core/modules/system-windows';
import { coreEventBus } from '../core/services/EventBus';
import { VTTCanvas, type TokenData } from './game/VTTCanvas';

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
  const [tokens, setTokens] = useState<TokenData[]>([
    { id: 'hero', name: username.substring(0, 2).toUpperCase(), x: 3, y: 3, color: 'bg-zinc-800 text-white border-zinc-500', owner: username },
    { id: 'goblin1', name: 'GB', x: 8, y: 4, color: 'bg-rose-950 text-rose-200 border-rose-800' }, // owner undefined, ou on pourrait mettre l'host
    { id: 'goblin2', name: 'GB', x: 8, y: 6, color: 'bg-rose-950 text-rose-200 border-rose-800' },
  ]);

  // Initialisation des modules au lancement du plateau
  useEffect(() => {
    ModManager.setContext(username);
    if (ModManager.isItemEnabled('mod-chat')) {
      ModManager.registerMod(CoreChatModule);
    }
    ModManager.registerMod(CoreNavigationModule);
    ModManager.registerMod(CoreSystemWindowsModule);
  }, [username]);

  // Écoute des événements système globaux
  useEffect(() => {
    const handleReturnToHub = () => {
      onReturn();
    };

    coreEventBus.on('SYSTEM_RETURN_TO_HUB', handleReturnToHub);
    return () => {
      coreEventBus.off('SYSTEM_RETURN_TO_HUB', handleReturnToHub);
    };
  }, [onReturn]);

  // Pont 1 : Réseau (Props) -> EventBus (Modules)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg.type === 'MOVE_TOKEN') {
      const { tokenId, x, y } = lastMsg.payload;
      setTokens((prev) => 
        prev.map(t => (t.id === tokenId ? { ...t, x, y } : t))
      );
    } else {
      // Tous les autres types de messages (ex: CHAT) sont transférés aux modules
      coreEventBus.emit('NETWORK_INCOMING', lastMsg);
    }
  }, [messages]);

  // Pont 2 : EventBus (Modules) -> Réseau (Props)
  useEffect(() => {
    const handleOutgoing = (msg: any) => {
      sendMessage(msg);
    };

    coreEventBus.on('NETWORK_OUTGOING', handleOutgoing);

    return () => {
      coreEventBus.off('NETWORK_OUTGOING', handleOutgoing);
    };
  }, [sendMessage]);

  const handleTokenMove = (tokenId: string, x: number, y: number) => {
    // Mise à jour locale
    setTokens((prev) =>
      prev.map(t => (t.id === tokenId ? { ...t, x, y } : t))
    );

    // Envoi en P2P
    sendMessage({
      type: 'MOVE_TOKEN',
      payload: { tokenId, x, y },
    });
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Moteur 2D (Konva) */}
      <VTTCanvas 
        tokens={tokens} 
        onTokenMove={handleTokenMove} 
        gridSize={GRID_SIZE} 
        isHost={isHost}
        username={username}
      />

      {/* Interface Modulaire superposée (Modules, UI) */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <ModuleOverlays />
        <DockManager />
      </div>
    </div>
  );
}
