import { useState, useEffect } from 'react';
import { supabase } from './core/supabase';
import { Auth } from './components/Auth';
import { Hub } from './components/Hub';
import { GameSession } from './components/GameSession';
import { t } from './core/locales/fr';

// Différents "écrans" de notre Single Page App
type AppState = 'auth' | 'hub' | 'game';

export default function App() {
  const [appState, setAppState] = useState<AppState>('auth');
  const [sessionRoomId, setSessionRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  
  // URL du serveur de signalement partagée entre l'interface réseau et le jeu
  const [signalUrl, setSignalUrl] = useState('http://localhost:3000/api/signal');
  const [isLanMode, setIsLanMode] = useState(false);

  // Vérifier la session Supabase au démarrage (une seule fois)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAppState(current => current === 'auth' ? 'hub' : current);
        // Récupérer le pseudo
        supabase.from('users_profile').select('username').eq('id', session.user.id).single()
          .then(({ data }) => { if (data?.username) setUsername(data.username); });
      } else {
        setAppState('auth');
      }
      setIsInitializing(false);
    });

    // Écouter les changements de connexion
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && appState === 'auth') {
        setAppState('hub');
      } else if (!session) {
        setAppState('auth');
        setSessionRoomId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // <--- Dépendance vide pour ne pas relancer à chaque changement d'écran !

  const handleJoinGame = (roomId: string, host: boolean) => {
    setSessionRoomId(roomId);
    setIsHost(host);
    setAppState('game');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-rose-500 animate-pulse font-bold">{t('app_loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-rose-500/30 font-sans">
      {/* Transitions simples gérées par React (montage/démontage avec animations Tailwind) */}
      
      {appState === 'auth' && (
        <div className="animate-fade-in">
          <Auth onLogin={() => setAppState('hub')} />
        </div>
      )}

      {appState === 'hub' && (
        <Hub 
          onJoinGame={handleJoinGame} 
          onLogout={handleLogout} 
          onSignalUrlChange={setSignalUrl} 
          isLanMode={isLanMode}
          onLanModeChange={setIsLanMode}
        />
      )}

      {appState === 'game' && sessionRoomId && (
        <div className="animate-fade-in h-screen flex flex-col">
          <div className="flex-1 overflow-hidden relative">
            <GameSession 
              roomId={sessionRoomId} 
              signalUrl={signalUrl} 
              isHost={isHost}
              username={username || 'Aventurier'}
              onLeave={() => setAppState('hub')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
