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
import { SystemFlowerModule } from '../systems/flower';
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
  const [tokens, setTokens] = useState<TokenData[]>([]);

  // État des outils VTT
  const [activeTool, setActiveTool] = useState<'pan' | 'select' | 'duo' | 'ruler'>('pan');
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);

  // Initialisation des modules et chargement des tokens
  useEffect(() => {
    ModManager.setContext(username, isHost);
    if (ModManager.isItemEnabled('mod-chat')) {
      ModManager.registerMod(CoreChatModule);
    }
    ModManager.registerMod(CoreNavigationModule);
    ModManager.registerMod(CoreSystemWindowsModule);
    ModManager.registerMod(CoreToolbarModule); 
    if (ModManager.isItemEnabled('core-dice-roller')) {
      ModManager.registerMod(CoreDiceModule);
    }
    if (ModManager.isItemEnabled('core-chat-roll')) {
      ModManager.registerMod(CoreChatRollModule);
    }
    // Système de jeu (devrait être dynamique via la BDD plus tard, forcé pour le proto)
    ModManager.registerMod(SystemFlowerModule);

    if (isHost && isTauri()) {
      // Le MJ charge les tokens depuis la base de données
      invoke('get_tokens').then((dbTokens: any) => {
        const loadedTokens: TokenData[] = dbTokens.map((t: any) => {
          const data = JSON.parse(t.data);
          return {
            id: t.id,
            x: t.x,
            y: t.y,
            scaleX: t.scale_x,
            scaleY: t.scale_y,
            rotation: t.rotation,
            name: data.name,
            color: data.color,
            owner: data.owner,
            avatarUrl: data.avatarUrl,
          };
        });
        setTokens(loadedTokens);
        console.log('[GameBoard] Tokens chargés depuis la BD :', loadedTokens);
      }).catch(err => console.error('[GameBoard] Erreur chargement tokens:', err));
    } else if (!isHost) {
      // Les joueurs demandent l'état initial
      console.log('[GameBoard] Envoi de REQUEST_STATE pour récupérer la carte et les tokens');
      sendMessage({ type: 'REQUEST_STATE', payload: {} });
    }
  }, [username, isHost, sendMessage]);

  // Écoute des événements système globaux
  useEffect(() => {
    const handleReturnToHub = () => onReturn();
    const handleToolChange = (tool: 'pan' | 'select' | 'duo' | 'ruler') => setActiveTool(tool);
    const handleToggleGrid = (show: boolean) => setShowGrid(show);
    const handleToggleSnap = (snap: boolean) => setSnapToGrid(snap);
    const handleSetMapLocal = (url: string) => setMapUrl(url);
    const handleToggleToken = (token: TokenData) => {
      setTokens(prev => {
        const exists = prev.find(t => t.id === token.id);
        if (exists) {
          // Supprimer le token
          coreEventBus.emit('NETWORK_OUTGOING', { type: 'REMOVE_TOKEN', payload: { tokenId: token.id } });
          if (isHost && isTauri()) invoke('delete_token', { id: token.id }).catch(e => console.error(e));
          return prev.filter(t => t.id !== token.id);
        } else {
          // Ajouter le token
          coreEventBus.emit('NETWORK_OUTGOING', { type: 'SPAWN_TOKEN', payload: token });
          if (isHost && isTauri()) {
            invoke('save_token', {
              id: token.id,
              x: token.x,
              y: token.y,
              scaleX: token.scaleX || 1,
              scaleY: token.scaleY || 1,
              rotation: token.rotation || 0,
              data: JSON.stringify({
                name: token.name,
                color: token.color,
                owner: token.owner,
                avatarUrl: token.avatarUrl
              })
            }).catch(e => console.error(e));
          }
          return [...prev, token];
        }
      });
    };

    coreEventBus.on('SYSTEM_RETURN_TO_HUB', handleReturnToHub);
    coreEventBus.on('CANVAS_TOOL_CHANGED', handleToolChange);
    coreEventBus.on('CANVAS_TOGGLE_GRID', handleToggleGrid);
    coreEventBus.on('CANVAS_TOGGLE_SNAP', handleToggleSnap);
    coreEventBus.on('CANVAS_SET_MAP_LOCAL', handleSetMapLocal);
    coreEventBus.on('CANVAS_TOGGLE_TOKEN', handleToggleToken);

    // Quand FileTransferService finit de télécharger une carte ou un avatar !
    const handleFileComplete = (payload: { filename: string, blobUrl?: string }) => {
      if (!payload || !payload.filename) return;
      const { filename, blobUrl } = payload;

      // Si la carte qu'on attendait vient de finir de télécharger
      if (mapUrl && mapUrl.includes(filename)) {
        console.log(`[GameBoard] La carte ${filename} a été reçue et chargée.`);
        setMapUrl(blobUrl || `http://signet.localhost/library/${filename}`);
        setIsMapLoading(false);
      }
      
      // On regarde si c'est l'avatar d'un de nos tokens
      setTokens(prev => prev.map(t => {
        if (t.avatarUrl === filename) {
          return { ...t, avatarUrl: blobUrl || `http://signet.localhost/library/${filename}` };
        }
        return t;
      }));
    };
    coreEventBus.on('FILE_TRANSFER_COMPLETE', handleFileComplete);

    return () => {
      coreEventBus.off('SYSTEM_RETURN_TO_HUB', handleReturnToHub);
      coreEventBus.off('CANVAS_TOOL_CHANGED', handleToolChange);
      coreEventBus.off('CANVAS_TOGGLE_GRID', handleToggleGrid);
      coreEventBus.off('CANVAS_TOGGLE_SNAP', handleToggleSnap);
      coreEventBus.off('CANVAS_SET_MAP_LOCAL', handleSetMapLocal);
      coreEventBus.off('CANVAS_TOGGLE_TOKEN', handleToggleToken);
      coreEventBus.off('FILE_TRANSFER_COMPLETE', handleFileComplete);
    };
  }, [onReturn]);

  // Pont 1 : Réseau (Props) -> EventBus (Modules)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg.type === 'MOVE_TOKEN') {
      const { tokenId, x, y } = lastMsg.payload;
      setTokens((prev) => {
        const next = prev.map(t => (t.id === tokenId ? { ...t, x, y } : t));
        if (isHost && isTauri()) {
          const t = next.find(t => t.id === tokenId);
          if (t) {
            invoke('save_token', {
              id: t.id, x: t.x, y: t.y, scaleX: t.scaleX || 1, scaleY: t.scaleY || 1, rotation: t.rotation || 0,
              data: JSON.stringify({ name: t.name, color: t.color, owner: t.owner, avatarUrl: t.avatarUrl })
            }).catch(e => console.error(e));
          }
        }
        return next;
      });
    } else if (lastMsg.type === 'TRANSFORM_TOKEN') {
      const { tokenId, x, y, scaleX, scaleY, rotation } = lastMsg.payload;
      setTokens((prev) => {
        const next = prev.map(t => (t.id === tokenId ? { ...t, x, y, scaleX, scaleY, rotation } : t));
        if (isHost && isTauri()) {
          const t = next.find(t => t.id === tokenId);
          if (t) {
            invoke('save_token', {
              id: t.id, x: t.x, y: t.y, scaleX: t.scaleX || 1, scaleY: t.scaleY || 1, rotation: t.rotation || 0,
              data: JSON.stringify({ name: t.name, color: t.color, owner: t.owner, avatarUrl: t.avatarUrl })
            }).catch(e => console.error(e));
          }
        }
        return next;
      });
    } else if (lastMsg.type === 'SPAWN_TOKEN') {
      const token = lastMsg.payload;
      setTokens((prev) => {
        const exists = prev.find(t => t.id === token.id);
        const next = exists ? prev.map(t => (t.id === token.id ? token : t)) : [...prev, token];
        if (isHost && isTauri()) {
          invoke('save_token', {
            id: token.id, x: token.x, y: token.y, scaleX: token.scaleX || 1, scaleY: token.scaleY || 1, rotation: token.rotation || 0,
            data: JSON.stringify({ name: token.name, color: token.color, owner: token.owner, avatarUrl: token.avatarUrl })
          }).catch(e => console.error(e));
        }
        return next;
      });

      // Si le token a un avatar, on vérifie si on l'a en cache. Sinon, on le demande.
      if (token.avatarUrl && !token.avatarUrl.startsWith('blob:') && !isTauri()) {
        if (!FileTransferService.hasFile(token.avatarUrl)) {
          console.log(`[GameBoard] Demande de téléchargement de l'avatar ${token.avatarUrl} via P2P...`);
          sendMessage({ type: 'REQUEST_FILE', payload: { hash: token.avatarUrl } });
        } else {
          setTokens(prev => prev.map(t => t.id === token.id ? { ...t, avatarUrl: FileTransferService.getFileUrl(token.avatarUrl!)! } : t));
        }
      }
    } else if (lastMsg.type === 'REMOVE_TOKEN') {
      const { tokenId } = lastMsg.payload;
      setTokens(prev => prev.filter(t => t.id !== tokenId));
      if (isHost && isTauri()) invoke('delete_token', { id: tokenId }).catch(e => console.error(e));
    } else if (lastMsg.type === 'REQUEST_STATE') {
      if (isHost) {
        console.log('[GameBoard] Hôte: Envoi du SYNC_STATE suite à REQUEST_STATE');
        sendMessage({
          type: 'SYNC_STATE',
          payload: { mapUrl, tokens }
        });
      }
    } else if (lastMsg.type === 'SYNC_STATE') {
      if (!isHost) {
        console.log('[GameBoard] Joueur: Réception du SYNC_STATE', lastMsg.payload);
        const { mapUrl: syncedMapUrl, tokens: syncedTokens } = lastMsg.payload;
        setTokens(syncedTokens);
        if (syncedMapUrl) {
          // Déclencher le téléchargement si nécessaire (même logique que SET_MAP)
          const parts = syncedMapUrl.split('/library/');
          if (parts.length > 1) {
            const filename = parts[1];
            if (FileTransferService.hasFile(filename)) {
              setMapUrl(FileTransferService.getFileUrl(filename));
            } else {
              setIsMapLoading(true);
              sendMessage({ type: 'REQUEST_FILE', payload: { hash: filename } });
            }
          } else {
            setMapUrl(syncedMapUrl);
          }
        }
        
        // Requêter les avatars de tous les tokens si nécessaire
        syncedTokens.forEach((t) => {
          if (t.avatarUrl && !t.avatarUrl.startsWith('blob:')) {
            if (!FileTransferService.hasFile(t.avatarUrl)) {
              sendMessage({ type: 'REQUEST_FILE', payload: { hash: t.avatarUrl } });
            } else {
              setTokens(prev => prev.map(pt => pt.id === t.id ? { ...pt, avatarUrl: FileTransferService.getFileUrl(t.avatarUrl!)! } : pt));
            }
          }
        });
      }
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

  const handleTokenDelete = (tokenId: string) => {
    setTokens(prev => prev.filter(t => t.id !== tokenId));
    sendMessage({
      type: 'REMOVE_TOKEN',
      payload: { tokenId }
    });
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 relative overflow-hidden">
      {/* Moteur 2D (Konva) */}
      <VTTCanvas 
        tokens={tokens} 
        onTokenMove={handleTokenMove} 
        onTokenTransform={handleTokenTransform}
        onTokenDelete={handleTokenDelete}
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
