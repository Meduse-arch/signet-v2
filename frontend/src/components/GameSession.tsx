import React, { useState, useEffect, useCallback } from 'react';
import { useVTTNetwork } from '../core/hooks/useVTTNetwork';
import { GameBoard } from './GameBoard';
import { Button } from './ui/Button';
import { Play } from 'lucide-react';
import { LobbyHeader } from './game/LobbyHeader';
import { PlayerCarousel } from './game/PlayerCarousel';

interface GameSessionProps {
  roomId: string;
  signalUrl: string;
  isHost: boolean;
  username: string;
  onLeave: () => void;
}

export function GameSession({ roomId, signalUrl, isHost, username, onLeave }: GameSessionProps) {
  const {
    connectionState,
    messages,
    hostGame,
    joinGame,
    lockRoom,
    sendMessage: rawSendMessage,
    sendBinary,
    disconnect,
  } = useVTTNetwork(signalUrl);

  const sendMessage = useCallback((msg: any) => {
    console.log('[GameSession] Message sortant:', msg);
    rawSendMessage(msg);
  }, [rawSendMessage]);

  const [players, setPlayers] = useState<string[]>(isHost ? [username] : []); // L'hôte s'inclut lui-même, le joueur attend le LOBBY_STATE
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isInGameView, setIsInGameView] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(isHost); // Par défaut, l'hôte se met en ligne


  // Ouvre la base de données SQLite correspondante dans Tauri
  useEffect(() => {
    const openDb = async () => {
      // @ts-ignore
      if (window.__TAURI_INTERNALS__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('open_campaign_db', { roomId });
          if (isHost) {
            await invoke('save_player', { username });
          }
        } catch (e) {
          console.error('[GameSession] Erreur ouverture BD:', e);
        }
      }
    };
    openDb();
  }, [roomId, isHost, username]);

  // Connexion automatique (Joueur)
  useEffect(() => {
    if (!isHost) {
      const timer = setTimeout(() => {
        joinGame(roomId);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [roomId, isHost, joinGame]);

  // Connexion gérée par le toggle "Partie en ligne" (Hôte)
  useEffect(() => {
    if (isHost) {
      const timer = setTimeout(() => {
        if (isOnline) {
          // Évite de détruire la session P2P actuelle si on est déjà connecté à un joueur
          if (connectionState !== 'connected') {
            hostGame(roomId);
          }
        } else {
          lockRoom(roomId); // Verrouille le salon (supprime du serveur de signalement)
          // La connexion P2P reste active pour les joueurs déjà là !
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [roomId, isHost, isOnline, hostGame, lockRoom, connectionState]);

  // Broadcast LOBBY_STATE quand le MJ ouvre/ferme la salle
  useEffect(() => {
    if (isHost && connectionState === 'connected') {
      sendMessage({
        type: 'LOBBY_STATE',
        payload: { players, isGameStarted, isRoomOpen },
      });
    }
  }, [isRoomOpen, isHost, connectionState, players, isGameStarted, sendMessage]);

  // Réaction à la connexion P2P
  useEffect(() => {
    if (connectionState === 'connected' && !isHost) {
      console.log('[GameSession] Joueur: Connexion P2P établie. Envoi de PLAYER_JOIN...');
      // Le joueur dit bonjour à l'hôte
      sendMessage({
        type: 'PLAYER_JOIN',
        payload: { username },
      });
    }

    if (connectionState === 'disconnected' && isHost) {
      console.log('[GameSession] Hôte: Déconnexion P2P. Reset liste joueurs.');
      // Si on perd la connexion, le joueur est parti, on le retire de la liste (vu qu'on gère 1 seul joueur pour l'instant)
      setPlayers([username]);
    }
  }, [connectionState, isHost, username, sendMessage]);

  const lastProcessedIdx = React.useRef(-1);

  // Traitement des messages entrants
  useEffect(() => {
    if (messages.length === 0) {
      lastProcessedIdx.current = -1; // Reset l'index si la connexion a été relancée
      return;
    }
    
    for (let i = lastProcessedIdx.current + 1; i < messages.length; i++) {
      const msg = messages[i];
      console.log('[GameSession] Nouveau message reçu:', msg);

      if (isHost && msg.type === 'PLAYER_JOIN') {
        console.log('[GameSession] Hôte: Réception PLAYER_JOIN pour', msg.payload.username);
        
        // Sauvegarder le joueur dans la BD
        // @ts-ignore
        if (window.__TAURI_INTERNALS__) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('save_player', { username: msg.payload.username }).catch(e => 
              console.error('[GameSession] Erreur save_player:', e)
            );
          });
        }

        setPlayers((prev) => {
          let newPlayer = msg.payload.username;
          
          // Gestion des doublons (si on teste avec le même compte dans deux onglets)
          if (prev.includes(newPlayer)) {
            let counter = 2;
            while (prev.includes(`${newPlayer} (${counter})`)) {
              counter++;
            }
            newPlayer = `${newPlayer} (${counter})`;
          }
          
          const next = [...prev, newPlayer];
          
          // L'hôte broadcast le nouvel état du lobby
          setTimeout(() => {
            console.log('[GameSession] Hôte: Envoi de LOBBY_STATE', { players: next, isGameStarted, isRoomOpen });
            sendMessage({
              type: 'LOBBY_STATE',
              payload: { players: next, isGameStarted, isRoomOpen },
            });
          }, 100);

          return next;
        });
      }

      if (!isHost && msg.type === 'LOBBY_STATE') {
        console.log('[GameSession] Joueur: Réception LOBBY_STATE', msg.payload);
        setPlayers(msg.payload.players);
        setIsGameStarted(msg.payload.isGameStarted);
        setIsRoomOpen(msg.payload.isRoomOpen);
      }

      if (!isHost && msg.type === 'START_GAME') {
        setIsGameStarted(true);
      }
    }
    
    lastProcessedIdx.current = messages.length - 1;
  }, [messages, isHost, sendMessage, isGameStarted, isRoomOpen]);

  const handleStartGame = () => {
    if (isHost) {
      setIsGameStarted(true);
      sendMessage({ type: 'START_GAME', payload: {} });
      setIsInGameView(true);
    }
  };

  const handleEnterGame = () => {
    setIsInGameView(true);
  };

  const handleReturnToLobby = () => {
    setIsInGameView(false);
  };

  const handleQuit = useCallback(() => {
    disconnect();
    onLeave();
  }, [disconnect, onLeave]);

  // Panic Escape (3x Echap rapide pour quitter en urgence)
  useEffect(() => {
    if (!isInGameView) return;

    let escapeCount = 0;
    let lastEscapeTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscapeTime < 600) { // 600ms maximum entre deux appuis
          escapeCount++;
        } else {
          escapeCount = 1;
        }
        lastEscapeTime = now;

        if (escapeCount >= 3) {
          console.log('[Panic] 3x Échap détecté. Sortie de secours activée.');
          handleQuit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInGameView, handleQuit]);

  if (isInGameView) {
    return (
      <GameBoard 
        isHost={isHost}
        username={username}
        messages={messages}
        sendMessage={sendMessage}
        sendBinary={sendBinary}
        onReturn={handleReturnToLobby}
      />
    );
  }

  return (
    <div className="h-full relative animate-fade-in bg-[#050508] overflow-hidden flex flex-col">
      {/* Background Cinématique */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm scale-105 grayscale" style={{ backgroundImage: 'url("/fantasy_vtt_bg.jpg")' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />
      </div>

      {/* Header : Réseau & Quitter */}
      <LobbyHeader 
        isHost={isHost}
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        isRoomOpen={isRoomOpen}
        setIsRoomOpen={setIsRoomOpen}
        connectionState={connectionState}
        onQuit={handleQuit}
      />

      {/* Main Content : Code & Joueurs */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        
        {/* Code Héro */}
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-zinc-400 text-sm font-bold uppercase tracking-[0.3em] mb-4 drop-shadow-md">Code d'invitation</h2>
          <div className="text-5xl md:text-7xl font-black text-white tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            {roomId}
          </div>
        </div>

        {/* Liste des Joueurs (Carrousel Horizontal) */}
        <PlayerCarousel 
          players={players} 
          isHost={isHost} 
          connectionState={connectionState} 
        />
      </div>

      {/* Action Finale */}
      <div className="relative z-20 w-full p-8 flex justify-center bg-gradient-to-t from-[#050508] to-transparent">
        {isHost ? (
          <Button 
            variant="primary" 
            onClick={handleStartGame}
            leftIcon={<Play className="w-6 h-6 fill-current" />}
            className="w-full max-w-md py-5 text-xl tracking-widest shadow-[0_0_40px_rgba(225,29,72,0.4)] hover:shadow-[0_0_60px_rgba(225,29,72,0.6)] animate-pulse"
          >
            LANCER LA SESSION
          </Button>
        ) : (
          <Button 
            variant="primary" 
            onClick={handleEnterGame}
            disabled={connectionState !== 'connected' || !isRoomOpen}
            leftIcon={<Play className="w-6 h-6 fill-current" />}
            className={`w-full max-w-md py-5 text-xl tracking-widest ${connectionState === 'connected' && isRoomOpen ? 'shadow-[0_0_40px_rgba(225,29,72,0.4)] hover:shadow-[0_0_60px_rgba(225,29,72,0.6)] animate-pulse' : 'opacity-50'}`}
          >
            {connectionState !== 'connected' ? 'CONNEXION EN COURS...' : (!isRoomOpen ? 'SALLE FERMÉE' : 'ENTRER EN JEU')}
          </Button>
        )}
      </div>

    </div>
  );
}
