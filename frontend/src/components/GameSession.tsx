import React, { useState, useEffect } from 'react';
import { useVTTNetwork } from '../core/hooks/useVTTNetwork';
import { GameBoard } from './GameBoard';
import { Button } from './ui/Button';
import { Users, Play, Shield, User, Loader2 } from 'lucide-react';

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
    sendMessage,
    disconnect,
  } = useVTTNetwork(signalUrl);

  const [players, setPlayers] = useState<string[]>([username]); // On s'inclut soi-même
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isInGameView, setIsInGameView] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(true);

  // Connexion automatique (Joueur)
  useEffect(() => {
    if (!isHost) {
      const timer = setTimeout(() => {
        joinGame(roomId);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [roomId, isHost, joinGame]);

  // Connexion gérée par le toggle (Hôte)
  useEffect(() => {
    if (isHost) {
      const timer = setTimeout(() => {
        if (isRoomOpen) {
          hostGame(roomId);
        } else {
          disconnect();
          setPlayers([username]); // Reset si on ferme la salle
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRoomOpen, roomId, isHost, hostGame, disconnect, username]);

  // Réaction à la connexion P2P
  useEffect(() => {
    if (connectionState === 'connected' && !isHost) {
      // Le joueur dit bonjour à l'hôte
      sendMessage({
        type: 'PLAYER_JOIN',
        payload: { username },
      });
    }

    if (connectionState === 'disconnected' && isHost) {
      // Si on perd la connexion, le joueur est parti, on le retire de la liste (vu qu'on gère 1 seul joueur pour l'instant)
      setPlayers([username]);
    }
  }, [connectionState, isHost, username, sendMessage]);

  // Traitement des messages entrants
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMsg = messages[messages.length - 1];

    if (isHost && lastMsg.type === 'PLAYER_JOIN') {
      const newPlayer = lastMsg.payload.username;
      setPlayers(prev => {
        const next = prev.includes(newPlayer) ? prev : [...prev, newPlayer];
        // L'hôte broadcast le nouvel état du lobby
        setTimeout(() => {
          sendMessage({
            type: 'LOBBY_STATE',
            payload: { players: next, isGameStarted },
          });
        }, 100);
        return next;
      });
    }

    if (!isHost && lastMsg.type === 'LOBBY_STATE') {
      setPlayers(lastMsg.payload.players);
      setIsGameStarted(lastMsg.payload.isGameStarted);
    }

    if (!isHost && lastMsg.type === 'START_GAME') {
      setIsGameStarted(true);
    }
  }, [messages, isHost, sendMessage, isGameStarted]);

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

  const handleQuit = () => {
    disconnect();
    onLeave();
  };

  if (isInGameView) {
    return (
      <GameBoard 
        isHost={isHost}
        username={username}
        messages={messages}
        sendMessage={sendMessage}
        onReturn={handleReturnToLobby}
      />
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row animate-fade-in bg-zinc-950 overflow-hidden">
        
        {/* Panneau Gauche : Liste des joueurs */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-zinc-700/50 bg-zinc-900/50">
          <div className="bg-black/20 border-b border-zinc-700/50 p-6 flex items-center gap-3">
            <Users className="w-6 h-6 text-rose-400" />
            <h2 className="text-2xl font-black text-white tracking-widest uppercase drop-shadow-md">
              Joueurs ({players.length})
            </h2>
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex flex-col gap-4">
              {players.map((p, idx) => (
                <div key={idx} className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-4 flex items-center gap-4 shadow-lg animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${idx === 0 && isHost ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-zinc-700 text-zinc-300'}`}>
                    {idx === 0 && isHost ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-lg">{p}</p>
                    <p className="text-xs text-zinc-400 uppercase tracking-wider">
                      {idx === 0 && isHost ? 'Maître du Jeu' : 'Joueur'}
                    </p>
                  </div>
                </div>
              ))}

              {connectionState === 'connecting' && !isHost && (
                <div className="bg-zinc-800/20 border border-zinc-700/50 border-dashed rounded-xl p-4 flex items-center justify-center h-[82px]">
                  <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
              )}
              
              {isHost && players.length < 5 && (
                <div className="bg-zinc-800/20 border border-zinc-700/50 border-dashed rounded-xl p-4 flex items-center justify-center h-[82px] text-zinc-500 text-sm font-medium">
                  En attente d'autres joueurs...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panneau Droit : Contrôles */}
        <div className="w-full md:w-80 bg-black/40 flex flex-col">
          <div className="p-6 flex-1 flex flex-col gap-8">
            
            {/* Code Room */}
            <div>
              <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2 text-center">Code d'invitation</h3>
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-center">
                <code className="text-rose-400 font-mono font-black text-xl tracking-widest">{roomId}</code>
              </div>
            </div>

            {/* Statut Réseau / Toggle */}
            <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 p-4">
              {isHost ? (
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isRoomOpen ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {isRoomOpen ? 'Salle Ouverte' : 'Salle Fermée'}
                  </span>
                  <button 
                    onClick={() => setIsRoomOpen(!isRoomOpen)}
                    className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none shadow-inner ${isRoomOpen ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-zinc-600 hover:bg-zinc-500'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isRoomOpen ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                  {connectionState === 'connecting' && <span className="text-yellow-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</span>}
                  {connectionState === 'connected' && <span className="text-emerald-400 flex items-center gap-2">Réseau OK</span>}
                  {connectionState === 'disconnected' && <span className="text-zinc-500 flex items-center gap-2">Hors ligne</span>}
                  {connectionState === 'error' && <span className="text-red-400 flex items-center gap-2">Erreur Réseau</span>}
                </div>
              )}
            </div>
            
          </div>

          {/* Actions */}
          <div className="p-6 bg-black/60 border-t border-zinc-700/50 flex flex-col gap-4">
            {isHost ? (
              <Button 
                variant="primary" 
                onClick={handleStartGame}
                leftIcon={<Play className="w-5 h-5" />}
                className="w-full py-4 text-lg"
              >
                Lancer la Session
              </Button>
            ) : (
              <Button 
                variant="primary" 
                onClick={handleEnterGame}
                leftIcon={<Play className="w-5 h-5" />}
                disabled={!isGameStarted}
                className="w-full py-4 text-lg"
              >
                {isGameStarted ? 'Entrer en jeu' : 'En attente...'}
              </Button>
            )}

            <Button variant="ghost" onClick={handleQuit} className="w-full">
              Quitter la salle
            </Button>
          </div>
        </div>

    </div>
  );
}
