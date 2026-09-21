import React, { useState, useEffect } from 'react';
import type { P2PMessage } from '../core/network/schemas';
import { ModuleOverlays } from './game/ModuleOverlays';
import { DockManager } from './game/DockManager';
import { ModManager } from '../core/services/ModManager';
import { CoreChatModule } from '../core/modules/chat';
import { CoreNavigationModule } from '../core/modules/navigation';
import { CoreSystemWindowsModule } from '../core/modules/system-windows';
import { CoreToolbarModule } from '../core/modules/toolbar';
import { CoreDiceModule } from '../core/modules/dice-roller';
import { CoreChatRollModule } from '../core/modules/chat-roll';
import { coreEventBus } from '../core/services/EventBus';
import { VTTCanvas, type TokenData } from './game/VTTCanvas';

interface GameBoardProps {
  isHost: boolean;
  username: string;
  messages: P2PMessage[];
  sendMessage: (msg: P2PMessage) => void;
  sendBinary: (data: Uint8Array) => void;
  onReturn: () => void;
}

const GRID_SIZE = 50;

import { invoke } from '@tauri-apps/api/core';
import { FileTransferService } from '../core/services/FileTransferService';

// Détection simple si on est dans l'app Tauri ou dans un simple navigateur (Chrome)
const isTauri = () => '__TAURI_INTERNALS__' in window;

export function GameBoard({ isHost, username, messages, sendMessage, sendBinary, onReturn }: GameBoardProps) {
  // Liste de pions par défaut pour tester
  const [tokens, setTokens] = useState<TokenData[]>([
    { id: 'hero', name: username.substring(0, 2).toUpperCase(), x: 3, y: 3, color: 'bg-zinc-800 text-white border-zinc-500', owner: username },
    { id: 'goblin1', name: 'GB', x: 8, y: 4, color: 'bg-rose-950 text-rose-200 border-rose-800' },
    { id: 'goblin2', name: 'GB', x: 8, y: 6, color: 'bg-rose-950 text-rose-200 border-rose-800' },
  ]);

  // État des outils VTT
  const [activeTool, setActiveTool] = useState<'pan' | 'select' | 'duo' | 'ruler'>('pan');
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);

  // Initialisation des modules au lancement du plateau
  useEffect(() => {
    ModManager.setContext(username, isHost);
    if (ModManager.isItemEnabled('mod-chat')) {
      ModManager.registerMod(CoreChatModule);
    }
    ModManager.registerMod(CoreNavigationModule);
    ModManager.registerMod(CoreSystemWindowsModule);
    ModManager.registerMod(CoreToolbarModule); // Nouveau module
    if (ModManager.isItemEnabled('core-dice-roller')) {
      ModManager.registerMod(CoreDiceModule);
    }
    if (ModManager.isItemEnabled('core-chat-roll')) {
      ModManager.registerMod(CoreChatRollModule);
    }
  }, [username, isHost]);

  // Écoute des événements système globaux
  useEffect(() => {
    const handleReturnToHub = () => onReturn();
    const handleToolChange = (tool: 'pan' | 'select' | 'duo' | 'ruler') => setActiveTool(tool);
    const handleToggleGrid = (show: boolean) => setShowGrid(show);
    const handleToggleSnap = (snap: boolean) => setSnapToGrid(snap);
    const handleSetMapLocal = (url: string) => setMapUrl(url);

    coreEventBus.on('SYSTEM_RETURN_TO_HUB', handleReturnToHub);
    coreEventBus.on('CANVAS_TOOL_CHANGED', handleToolChange);
    coreEventBus.on('CANVAS_TOGGLE_GRID', handleToggleGrid);
    coreEventBus.on('CANVAS_TOGGLE_SNAP', handleToggleSnap);
    coreEventBus.on('CANVAS_SET_MAP_LOCAL', handleSetMapLocal);

    // Quand FileTransferService finit de télécharger une carte !
    const handleFileComplete = (payload: { filename: string, blobUrl?: string }) => {
      // Si la carte qu'on attendait vient de finir de télécharger
      if (payload && payload.filename) {
        setIsMapLoading(false);
        // Si on est dans le navigateur (blobUrl fourni), on utilise le Blob URL
        // Sinon (Tauri), on utilise le lien signet:// local
        setMapUrl(payload.blobUrl || `http://signet.localhost/library/${payload.filename}`);
      }
    };
    coreEventBus.on('FILE_TRANSFER_COMPLETE', handleFileComplete);

    return () => {
      coreEventBus.off('SYSTEM_RETURN_TO_HUB', handleReturnToHub);
      coreEventBus.off('CANVAS_TOOL_CHANGED', handleToolChange);
      coreEventBus.off('CANVAS_TOGGLE_GRID', handleToggleGrid);
      coreEventBus.off('CANVAS_TOGGLE_SNAP', handleToggleSnap);
      coreEventBus.off('CANVAS_SET_MAP_LOCAL', handleSetMapLocal);
      coreEventBus.off('FILE_TRANSFER_COMPLETE', handleFileComplete);
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
    } else if (lastMsg.type === 'TRANSFORM_TOKEN') {
      const { tokenId, x, y, scaleX, scaleY, rotation } = lastMsg.payload;
      setTokens((prev) => 
        prev.map(t => (t.id === tokenId ? { ...t, x, y, scaleX, scaleY, rotation } : t))
      );
    } else if (lastMsg.type === 'SET_MAP') {
      const { url } = lastMsg.payload;
      
      const parts = url.split('/library/');
      if (parts.length > 1) {
        const filename = parts[1];

        // 1. Si on est dans l'app Tauri (Hôte/MJ)
        if (isTauri()) {
          invoke('check_asset_exists', { hash: filename.split('.')[0] }).then((exists) => {
            if (exists) {
              setMapUrl(url);
            } else {
              console.log(`[GameBoard] Carte non trouvée localement. Demande de ${filename}...`);
              setIsMapLoading(true);
              sendMessage({ type: 'REQUEST_FILE', payload: { hash: filename } });
            }
          }).catch(err => {
            console.error("Erreur check_asset_exists", err);
            setMapUrl(url); // Fallback
          });
        } 
        // 2. Si on est dans un navigateur standard (Joueur Chrome)
        else {
          // On vérifie le cache mémoire du FileTransferService
          if (FileTransferService.hasFile(filename)) {
            setMapUrl(FileTransferService.getFileUrl(filename));
          } else {
            console.log(`[GameBoard] Carte non trouvée en mémoire. Demande de ${filename}...`);
            setIsMapLoading(true);
            sendMessage({ type: 'REQUEST_FILE', payload: { hash: filename } });
          }
        }
      } else {
        setMapUrl(url); // Fallback normal
      }
    } else if (lastMsg.type === 'REQUEST_FILE') {
      if (isHost) {
        // L'Hôte envoie le fichier demandé via le FileTransferService (binaire pur)
        FileTransferService.sendFile(lastMsg.payload.hash, sendBinary);
      }
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

  const handleTokenTransform = (tokenId: string, x: number, y: number, scaleX: number, scaleY: number, rotation: number) => {
    // Mise à jour locale
    setTokens((prev) =>
      prev.map(t => (t.id === tokenId ? { ...t, x, y, scaleX, scaleY, rotation } : t))
    );

    // Envoi en P2P
    sendMessage({
      type: 'TRANSFORM_TOKEN',
      payload: { tokenId, x, y, scaleX, scaleY, rotation },
    });
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Moteur 2D (Konva) */}
      <VTTCanvas 
        tokens={tokens} 
        onTokenMove={handleTokenMove} 
        onTokenTransform={handleTokenTransform}
        gridSize={GRID_SIZE} 
        isHost={isHost}
        username={username}
        activeTool={activeTool}
        showGrid={showGrid}
        snapToGrid={snapToGrid}
        mapUrl={mapUrl}
      />

      {isMapLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(225,29,72,0.5)]"></div>
            <p className="text-white font-bold tracking-widest animate-pulse drop-shadow-md">TÉLÉCHARGEMENT DE LA CARTE EN COURS...</p>
          </div>
        </div>
      )}

      {/* Windows du Dock */}
      <div className="absolute inset-0 pointer-events-none z-40">
        <DockManager />
      </div>

      {/* Overlays (Animations, Navigation, Notifications) au-dessus de tout */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        <ModuleOverlays />
      </div>
    </div>
  );
}
