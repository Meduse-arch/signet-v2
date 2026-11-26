import { Loader2, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';

interface LobbyHeaderProps {
  isHost: boolean;
  isOnline: boolean;
  setIsOnline: (val: boolean) => void;
  isRoomOpen: boolean;
  setIsRoomOpen: (val: boolean) => void;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  onQuit: () => void;
}

export function LobbyHeader({
  isHost,
  isOnline,
  setIsOnline,
  isRoomOpen,
  setIsRoomOpen,
  connectionState,
  onQuit
}: LobbyHeaderProps) {
  return (
    <div className="relative z-10 w-full p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
      <div className="bg-surface/80 backdrop-blur-xl rounded-xl border border-hairline p-4 w-full sm:w-64 flex flex-col gap-4">
        {isHost ? (
          <>
            {/* Toggle En Ligne */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isOnline ? 'text-white' : 'text-zinc-500'}`}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
              <button 
                onClick={() => setIsOnline(!isOnline)}
                className={`w-10 h-5 rounded-full transition-colors relative border ${isOnline ? 'bg-rose-600 border-rose-600' : 'bg-surface-raised border-white/15'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${isOnline ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Toggle Accès Plateau */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isRoomOpen ? 'text-white' : 'text-zinc-500'}`}>
                {isRoomOpen ? 'Plateau ouvert' : 'Plateau fermé'}
              </span>
              <button 
                onClick={() => setIsRoomOpen(!isRoomOpen)}
                className={`w-10 h-5 rounded-full transition-colors relative border ${isRoomOpen ? 'bg-rose-600 border-rose-600' : 'bg-surface-raised border-white/15'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${isRoomOpen ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm">
            {connectionState === 'connecting' && <span className="text-zinc-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connexion…</span>}
            {connectionState === 'connected' && <span className="text-white/80 flex items-center gap-2">Réseau OK</span>}
            {connectionState === 'disconnected' && <span className="text-zinc-500 flex items-center gap-2">Hors ligne</span>}
            {connectionState === 'error' && <span className="text-rose-500 flex items-center gap-2">Erreur réseau</span>}
          </div>
        )}
      </div>

      <Button variant="ghost" onClick={onQuit} leftIcon={<LogOut className="w-4 h-4" />}>
        Quitter
      </Button>
    </div>
  );
}
