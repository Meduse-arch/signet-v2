import { useState, useEffect } from 'react';
import { supabase } from './core/supabase';
import { Auth } from './components/Auth';
import { Hub } from './components/Hub';
import { GameSession } from './components/GameSession';
import { TitleBar } from './components/ui/TitleBar';
import { SplashTransition } from './components/ui/SplashTransition';
import { t } from './core/locales/fr';

// Différents "écrans" de notre Single Page App
type AppState = 'auth' | 'hub' | 'game';

export default function App() {
  const [appState, setAppState] = useState<AppState>('auth');
  const [sessionRoomId, setSessionRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [muted] = useState(() => localStorage.getItem('splash-muted') === 'true');
  
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
    setShowSplash(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <TitleBar />
        <div className="text-rose-500 animate-pulse font-bold">{t('app_loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050508] text-zinc-200 selection:bg-rose-500/30 font-sans flex flex-col">
      <TitleBar />
      
      {/* Transitions simples gérées par React (montage/démontage avec animations Tailwind) */}
      
      {appState === 'auth' && (
        <div className="flex-1 animate-fade-in overflow-y-auto hide-scrollbar">
          <Auth onLogin={() => setAppState('hub')} />
        </div>
      )}

      {appState === 'hub' && (
        <div className="flex-1 overflow-hidden animate-fade-in flex flex-col">
          <Hub 
            onJoinGame={handleJoinGame} 
            onLogout={handleLogout} 
            onSignalUrlChange={setSignalUrl} 
            isLanMode={isLanMode}
            onLanModeChange={setIsLanMode}
          />
        </div>
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

      {showSplash && (
        <SplashTransition
          logoSrc="/logo.svg"
          muted={muted}
          onDone={() => setShowSplash(false)}
        />
      )}
    </div>
  );
}
