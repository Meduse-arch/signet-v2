import React, { useState, useEffect, useCallback } from 'react';
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
    lockRoom,
    sendMessage: rawSendMessage,
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
  const [isOnline, setIsOnline] = useState(false);

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
        <div className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm scale-105 grayscale" style={{ backgroundImage: 'url("/fantasy_vtt_bg.jpg")' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />
      </div>

      {/* Header : Réseau & Quitter */}
      <div className="relative z-10 w-full p-6 flex justify-between items-start">
        <div className="bg-black/40 backdrop-blur-md rounded-sm border border-white/10 p-4 w-64 flex flex-col gap-4">
          {isHost ? (
            <>
              {/* Toggle En Ligne */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isOnline ? 'text-white/90' : 'text-zinc-500'}`}>
                  {isOnline ? 'En Ligne' : 'Hors Ligne'}
                </span>
                <button 
                  onClick={() => setIsOnline(!isOnline)}
                  className={`w-10 h-5 rounded-sm transition-colors relative focus:outline-none border ${isOnline ? 'bg-white border-white' : 'bg-transparent border-zinc-600'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-sm bg-black transition-transform ${isOnline ? 'translate-x-5' : 'opacity-50'}`} />
                </button>
              </div>

              {/* Toggle Accès Plateau */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${isRoomOpen ? 'text-white/90' : 'text-zinc-500'}`}>
                  {isRoomOpen ? 'Plateau Ouvert' : 'Plateau Fermé'}
                </span>
                <button 
                  onClick={() => setIsRoomOpen(!isRoomOpen)}
                  className={`w-10 h-5 rounded-sm transition-colors relative focus:outline-none border ${isRoomOpen ? 'bg-white border-white' : 'bg-transparent border-zinc-600'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-sm bg-black transition-transform ${isRoomOpen ? 'translate-x-5' : 'opacity-50'}`} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
              {connectionState === 'connecting' && <span className="text-zinc-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</span>}
              {connectionState === 'connected' && <span className="text-white/80 flex items-center gap-2">Réseau OK</span>}
              {connectionState === 'disconnected' && <span className="text-zinc-500 flex items-center gap-2">Hors ligne</span>}
              {connectionState === 'error' && <span className="text-rose-500 flex items-center gap-2">Erreur Réseau</span>}
            </div>
          )}
        </div>

        <Button variant="ghost" onClick={handleQuit} leftIcon={<LogOut className="w-4 h-4" />}>
          Quitter
        </Button>
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
              <div key={idx} className={`shrink-0 w-40 h-56 rounded-sm border ${idx === 0 ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_30px_rgba(225,29,72,0.15)]' : 'border-white/10 bg-black/40'} backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group animate-fade-in`} style={{ animationDelay: `${idx * 0.1}s`, scrollSnapAlign: 'start' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-sm flex items-center justify-center border ${idx === 0 ? 'border-rose-500/50 bg-rose-900/50 text-rose-300' : 'border-white/10 bg-white/5 text-white/50'}`}>
                    {idx === 0 ? <Shield className="w-8 h-8" /> : <User className="w-8 h-8" />}
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-lg leading-tight truncate w-32">{p}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                      {idx === 0 ? 'Maître du Jeu' : 'Joueur'}
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
