import React, { useState, useEffect } from 'react';
import { useVTTNetwork } from '../core/hooks/useVTTNetwork';
import { GameBoard } from './GameBoard';
import { Button } from './ui/Button';
import { Play, Shield, User, Loader2, LogOut } from 'lucide-react';

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
    <div className="h-full relative animate-fade-in bg-[#050508] overflow-hidden flex flex-col">
      {/* Background Cinématique */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm scale-105" style={{ backgroundImage: 'url("/fantasy_vtt_bg.jpg")' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />
      </div>

      {/* Header : Quitter & Réseau */}
      <div className="relative z-10 w-full p-6 flex justify-between items-start">
        <Button variant="ghost" onClick={handleQuit} leftIcon={<LogOut className="w-4 h-4" />}>
          Quitter
        </Button>

        <div className="bg-black/40 backdrop-blur-md rounded-sm border border-white/10 p-4 w-64 flex flex-col gap-2">
          {isHost ? (
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isRoomOpen ? 'text-white/90' : 'text-zinc-500'}`}>
                {isRoomOpen ? 'Salle Ouverte' : 'Salle Fermée'}
              </span>
              <button 
                onClick={() => setIsRoomOpen(!isRoomOpen)}
                className={`w-10 h-5 rounded-sm transition-colors relative focus:outline-none border ${isRoomOpen ? 'bg-white border-white' : 'bg-transparent border-zinc-600'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-sm bg-black transition-transform ${isRoomOpen ? 'translate-x-5' : 'opacity-50'}`} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
              {connectionState === 'connecting' && <span className="text-zinc-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</span>}
              {connectionState === 'connected' && <span className="text-white/80 flex items-center gap-2">Réseau OK</span>}
              {connectionState === 'disconnected' && <span className="text-zinc-500 flex items-center gap-2">Hors ligne</span>}
              {connectionState === 'error' && <span className="text-rose-500 flex items-center gap-2">Erreur Réseau</span>}
            </div>
          )}
        </div>
      </div>

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
        <div className="w-full max-w-5xl overflow-hidden mb-12">
          <div className="flex gap-6 overflow-x-auto pb-6 hide-scrollbar px-4" style={{ scrollSnapType: 'x mandatory' }}>
            {players.map((p, idx) => (
              <div key={idx} className={`shrink-0 w-40 h-56 rounded-sm border ${idx === 0 && isHost ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_30px_rgba(225,29,72,0.15)]' : 'border-white/10 bg-black/40'} backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group animate-fade-in`} style={{ animationDelay: `${idx * 0.1}s`, scrollSnapAlign: 'start' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-sm flex items-center justify-center border ${idx === 0 && isHost ? 'border-rose-500/50 bg-rose-900/50 text-rose-300' : 'border-white/10 bg-white/5 text-white/50'}`}>
                    {idx === 0 && isHost ? <Shield className="w-8 h-8" /> : <User className="w-8 h-8" />}
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg leading-tight truncate w-32">{p}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                      {idx === 0 && isHost ? 'Maître du Jeu' : 'Joueur'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Ghost slots (toujours afficher au moins 1 slot vide pour inviter) */}
            {Array.from({ length: Math.max(1, 5 - players.length) }).map((_, i) => (
              <div key={`ghost-${i}`} className="shrink-0 w-40 h-56 rounded-sm border border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center text-white/20" style={{ scrollSnapAlign: 'start' }}>
                {connectionState === 'connecting' && i === 0 && !isHost ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <span className="text-sm font-medium uppercase tracking-wider">Vide</span>
                )}
              </div>
            ))}
          </div>
        </div>
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
            leftIcon={<Play className="w-6 h-6 fill-current" />}
            disabled={!isGameStarted}
            className={`w-full max-w-md py-5 text-xl tracking-widest ${isGameStarted ? 'shadow-[0_0_40px_rgba(225,29,72,0.4)] animate-pulse' : 'opacity-50'}`}
          >
            {isGameStarted ? 'ENTRER EN JEU' : 'EN ATTENTE DU MJ...'}
          </Button>
        )}
      </div>

    </div>
  );
}
