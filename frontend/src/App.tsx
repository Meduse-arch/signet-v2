import { useState, useEffect } from 'react';
import { supabase } from './core/supabase';
import { Auth } from './components/Auth';
import { Hub } from './components/Hub';
import { TestDashboard } from './TestDashboard';
import { t } from './core/locales/fr';

// Différents "écrans" de notre Single Page App
type AppState = 'auth' | 'hub' | 'game';

export default function App() {
  const [appState, setAppState] = useState<AppState>('auth');
  const [sessionRoomId, setSessionRoomId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Vérifier la session Supabase au démarrage (une seule fois)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // On va sur le hub uniquement si on n'est pas déjà en jeu (normalement c'est l'init donc on est sur auth)
        setAppState(current => current === 'auth' ? 'hub' : current);
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

  const handleJoinGame = (roomId: string) => {
    setSessionRoomId(roomId);
    setAppState('game');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-indigo-500 animate-pulse font-bold">{t('app_loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 font-sans">
      {/* Transitions simples gérées par React (montage/démontage avec animations Tailwind) */}
      
      {appState === 'auth' && (
        <div className="animate-fade-in">
          <Auth onLogin={() => setAppState('hub')} />
        </div>
      )}

      {appState === 'hub' && (
        <Hub onJoinGame={handleJoinGame} onLogout={handleLogout} />
      )}

      {appState === 'game' && sessionRoomId && (
        <div className="animate-fade-in h-screen flex flex-col">
          <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shrink-0">
            <div>
              <span className="text-slate-400">{t('app_room_label')} </span>
              <code className="text-indigo-400 font-bold bg-indigo-400/10 px-2 py-1 rounded">{sessionRoomId}</code>
            </div>
            <button 
              onClick={() => setAppState('hub')}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {t('app_leave_room')}
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {/* On réutilise temporairement le TestDashboard pour le P2P */}
            <TestDashboard initialRoom={sessionRoomId} />
          </div>
        </div>
      )}
    </div>
  );
}
