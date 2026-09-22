import { useState, useEffect } from 'react';
import { supabase } from '../core/supabase';
// import { t } from '../core/locales/fr'; // plus utilisé ici
import { Play, Plus, Clock, LogOut, Check, BookOpen, Globe, Puzzle, Settings, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { NetworkToggle } from './NetworkToggle';
import { NotesView } from './hub-views/NotesView';
import { PublicSessionsView } from './hub-views/PublicSessionsView';
import { ModsView } from './hub-views/ModsView';
import { SettingsView } from './hub-views/SettingsView';
import { CreateSessionView } from './hub-views/CreateSessionView';
import type { SessionCreationData } from './hub-views/CreateSessionView';
import { Carousel } from './ui/Carousel';
type HubView = 'main' | 'notes' | 'public' | 'mods' | 'settings' | 'create-session';

interface HubProps {
  onJoinGame: (roomId: string, isHost: boolean) => void;
  onLogout: () => void;
  onSignalUrlChange: (url: string) => void;
  isLanMode: boolean;
  onLanModeChange: (isLan: boolean) => void;
}

export function Hub({ onJoinGame, onLogout, onSignalUrlChange, isLanMode, onLanModeChange }: HubProps) {
  const [roomCode, setRoomCode] = useState('');
  const [roleLevel, setRoleLevel] = useState<number>(0);
  const [username, setUsername] = useState<string>('');
  // Vue courante (pour remplacer les modales)
  const [currentView, setCurrentView] = useState<HubView>('main');
  
  // État local pour les campagnes
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Chargement des campagnes (Tauri ou localStorage)
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        // @ts-ignore
        if (window.__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const data = await invoke<string>('get_campaigns_list');
          setCampaigns(JSON.parse(data));
        } else {
          const saved = localStorage.getItem('signet_campaigns');
          if (saved) setCampaigns(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Erreur de chargement des campagnes:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCampaigns();
  }, []);

  const saveCampaignsNow = async (newCampaigns: any[]) => {
    try {
      // @ts-ignore
      if (window.__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_campaigns_list', { data: JSON.stringify(newCampaigns) });
      } else {
        localStorage.setItem('signet_campaigns', JSON.stringify(newCampaigns));
      }
    } catch (e) {
      console.error("Erreur de sauvegarde des campagnes:", e);
    }
  };

  // Sauvegarde des campagnes sur changement
  useEffect(() => {
    if (!isLoaded) return;
    saveCampaignsNow(campaigns);
  }, [campaigns, isLoaded]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('users_profile')
          .select('username, role_level')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Erreur récupération profil:", error.message);
        } else if (data) {
          if (data.username) setUsername(data.username);
          if (data.role_level !== undefined) setRoleLevel(data.role_level);
        }
      }
    };
    fetchUser();
  }, []);

  const handleOpenCreateModal = () => {
    setCurrentView('create-session');
  };

  const handleConfirmCreate = (data: SessionCreationData) => {
    try {
      // Pour l'instant on génère un code aléatoire
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRoom = `SIGNET-${code}`;
      
      // On ajoute la nouvelle campagne en haut de la liste
      const newCampaign = { 
        id: newRoom, 
        name: data.name, 
        date: "À l'instant", 
        hue: `${Math.floor(Math.random() * 360)}deg`,
        system: data.system,
        isPublic: data.isPublic,
        tags: data.tags,
        maxPlayers: data.maxPlayers,
        isHost: true
      };

      setCampaigns(prev => {
        const updated = [newCampaign, ...prev];
        saveCampaignsNow(updated); // Sauvegarde immédiate avant démontage
        return updated;
      });

      setCurrentView('main');
      // On connecte immédiatement le MJ à sa nouvelle session (isHost = true)
      onJoinGame(newRoom, true);
    } catch (err: any) {
      alert("Erreur lors de la création : " + err.message);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputCode = roomCode.trim().toUpperCase();
    if (inputCode) {
      const finalCode = inputCode.startsWith('SIGNET-') ? inputCode : `SIGNET-${inputCode}`;
      onJoinGame(finalCode, false);
    }
  };

  const getRoleName = (level: number) => {
    if (level >= 100) return 'Créateur';
    if (level >= 50) return 'Admin';
    if (level >= 10) return 'Maître du Jeu';
    return 'Joueur';
  };
  const displayRole = getRoleName(roleLevel);
  
  // Vérification des droits (10 et plus pour héberger)
  const isGM = roleLevel >= 10;

  return (
    <div className="flex-1 flex flex-col relative bg-[#050508] text-white font-sans selection:bg-rose-500/30 overflow-y-auto hide-scrollbar w-full">
      
      {/* Background Cinématique (Fixe) */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-60 mix-blend-luminosity grayscale" 
          style={{ backgroundImage: 'url("/fantasy_vtt_bg.jpg")' }}
        ></div>
        {/* Dégradés façon Netflix pour faire ressortir le texte */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050508] via-[#050508]/80 to-transparent w-full md:w-2/3"></div>
      </div>

      {/* Header Minimaliste (Défile avec la page) */}
      <header className="shrink-0 relative w-full flex justify-between items-center p-6 lg:px-12 pt-10 lg:pt-10 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Signet VTT" className="w-8 h-8 lg:w-10 lg:h-10 opacity-90 drop-shadow-lg" />
          <span className="text-xl font-bold tracking-widest uppercase text-white drop-shadow-md">Signet</span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <NetworkToggle 
            onSignalUrlChange={onSignalUrlChange} 
            isLanMode={isLanMode} 
            onLanModeChange={onLanModeChange} 
          />
          
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-white drop-shadow-md">{username}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest drop-shadow-md ${isGM ? 'text-rose-400' : 'text-zinc-300'}`}>
              {displayRole}
            </span>
          </div>
          <Button 
            variant="ghost"
            onClick={onLogout} 
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Quitter</span>
          </Button>
        </div>
      </header>

      {/* Contenu Principal */}
      <main className="flex-1 flex flex-col justify-end p-6 lg:p-12 z-20 pb-12 w-full min-w-0">
        
        {currentView === 'main' ? (
          <>
            <div className="flex flex-col xl:flex-row gap-12 w-full xl:items-end justify-between">
              
              {/* Section Gauche : Héro */}
              <div className="max-w-3xl animate-slide-up flex-1">
            <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tight drop-shadow-2xl">
              L'Aventure vous attend.
            </h1>
            <p className="text-base md:text-lg text-zinc-300 font-medium mb-10 max-w-xl drop-shadow-md">
              Entrez un code d'invitation pour rejoindre la table de votre Maître du Jeu, ou reprenez une campagne existante.
            </p>

            {/* Actions Principales (Rejoindre & Créer) */}
            <div className="flex flex-col sm:flex-row gap-4 mb-16 xl:mb-0">
              
              {/* Formulaire Rejoindre */}
              <form onSubmit={handleJoin} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="CODE (EX: A4B9F2)"
                  className="w-full sm:w-56 bg-black/40 backdrop-blur-md border border-white/20 rounded-sm px-4 py-3 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-white transition-colors uppercase placeholder-white/30"
                />
                <Button
                  type="submit"
                  variant="white"
                  disabled={!roomCode.trim()}
                  leftIcon={<Play className="w-5 h-5 fill-current" />}
                >
                  Jouer
                </Button>
              </form>

              {/* Bouton Créer - Uniquement pour les MJ et Admin */}
              {isGM && (
                <Button
                  variant="glass"
                  onClick={handleOpenCreateModal}
                  leftIcon={<Plus className="w-5 h-5" />}
                >
                  Créer une session
                </Button>
              )}
            </div>
          </div>

          {/* Section Droite : Carré Magique de 4 Cartes (Caché sur sm, visible dès md) */}
          <div className="hidden md:grid grid-cols-2 gap-4 w-full md:w-[360px] xl:w-[380px] shrink-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            
            <div onClick={() => setCurrentView('notes')} className="bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-zinc-800 rounded-sm p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-105 hover:-translate-y-1 hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(225,29,72,0.15)] group" title="Ouvrir le Carnet de Notes">
              <BookOpen className="w-8 h-8 text-white/50 group-hover:text-rose-400 transition-colors" />
              <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors text-center">Carnet de Notes</span>
            </div>

            <div onClick={() => setCurrentView('public')} className="bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-zinc-800 rounded-sm p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-105 hover:-translate-y-1 hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(225,29,72,0.15)] group" title="Voir les sessions publiques">
              <Globe className="w-8 h-8 text-white/50 group-hover:text-rose-400 transition-colors" />
              <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors text-center">Sessions Publiques</span>
            </div>

            <div onClick={() => setCurrentView('mods')} className="bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-zinc-800 rounded-sm p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-105 hover:-translate-y-1 hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(225,29,72,0.15)] group" title="Gérer les Mods">
              <Puzzle className="w-8 h-8 text-white/50 group-hover:text-rose-400 transition-colors" />
              <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors text-center">Mods / Systèmes</span>
            </div>

            <div onClick={() => setCurrentView('settings')} className="bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-zinc-800 rounded-sm p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-105 hover:-translate-y-1 hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(225,29,72,0.15)] group" title="Ouvrir les paramètres">
              <Settings className="w-8 h-8 text-white/50 group-hover:text-rose-400 transition-colors" />
              <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors text-center">Paramètres & Actu</span>
            </div>

          </div>

          {/* Mobile/SM : Navigation en carousel horizontal (< md) */}
          <div className="flex md:hidden gap-3 w-full overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <button onClick={() => setCurrentView('notes')} className="shrink-0 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-zinc-800 rounded-sm p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-rose-500/50 group min-w-[90px]">
              <BookOpen className="w-6 h-6 text-white/50 group-hover:text-rose-400 transition-colors" />
              <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors text-center">Notes</span>
            </button>
            <button onClick={() => setCurrentView('public')} className="shrink-0 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-zinc-800 rounded-sm p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-rose-500/50 group min-w-[90px]">
              <Globe className="w-6 h-6 text-white/50 group-hover:text-rose-400 transition-colors" />
              <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors text-center">Sessions</span>
            </button>
            <button onClick={() => setCurrentView('mods')} className="shrink-0 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-zinc-800 rounded-sm p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-rose-500/50 group min-w-[90px]">
              <Puzzle className="w-6 h-6 text-white/50 group-hover:text-rose-400 transition-colors" />
              <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors text-center">Mods</span>
            </button>
            <button onClick={() => setCurrentView('settings')} className="shrink-0 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-zinc-800 rounded-sm p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-rose-500/50 group min-w-[90px]">
              <Settings className="w-6 h-6 text-white/50 group-hover:text-rose-400 transition-colors" />
              <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors text-center">Params</span>
            </button>
          </div>
          
        </div>

        {/* Espace pour le futur Carrousel des sessions */}
        <div className="w-full mt-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-4 text-white/80">
            <Clock className="w-5 h-5" />
            <h3 className="text-lg font-bold tracking-wide">Reprendre une campagne</h3>
          </div>
          
          {/* Placeholder du carrousel */}
          <Carousel className="gap-4 pb-4">
            
            {/* Rendu dynamique des campagnes */}
            {campaigns.map(camp => (
              <Card
                key={camp.id}
                title={camp.name}
                subtitle={`Dernière session : ${camp.date}`}
                badge={`CODE : ${camp.id}`}
                imageUrl="/fantasy_vtt_bg.jpg"
                onClick={() => onJoinGame(camp.id, camp.isHost !== false)}
              />
            ))}
            
            {/* Espace vide en fin de carrousel */}
            {isGM ? (
              <div 
                onClick={handleOpenCreateModal}
                className="min-w-[250px] h-[150px] bg-black/20 border border-zinc-800 border-dashed rounded-sm flex flex-col items-center justify-center text-white/30 hover:text-white/80 hover:border-rose-500/50 cursor-pointer transition-all hover:bg-white/5 group"
              >
                <Plus className="w-6 h-6 mb-2 group-hover:scale-110 group-hover:text-rose-400 transition-transform" />
                <span className="text-sm font-medium group-hover:text-rose-300">Créer une session</span>
              </div>
            ) : (
              <div className="min-w-[250px] h-[150px] bg-black/20 border border-zinc-800 border-dashed rounded-sm flex flex-col items-center justify-center text-white/20">
                <span className="text-2xl tracking-widest opacity-50">...</span>
                <span className="text-xs font-medium mt-2 opacity-50">En attente d'aventures</span>
              </div>
            )}
          </Carousel>
        </div>
          </>
        ) : (
          <div className="flex-1 w-full min-h-0 flex flex-col overflow-hidden">
            <div className="mb-4">
              <Button variant="ghost" onClick={() => setCurrentView('main')} leftIcon={<ArrowLeft className="w-5 h-5" />}>
                Retour à l'accueil
              </Button>
            </div>
            <div className="flex-1 w-full h-full min-h-0">
              {currentView === 'notes' && <NotesView />}
              {currentView === 'public' && <PublicSessionsView />}
              {currentView === 'mods' && <ModsView />}
              {currentView === 'settings' && <SettingsView />}
              {currentView === 'create-session' && <CreateSessionView onConfirm={handleConfirmCreate} />}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
