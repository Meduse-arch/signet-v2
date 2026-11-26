import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from '../core/supabase';
// import { t } from '../core/locales/fr'; // plus utilisé ici
import { Play, Plus, LogOut, BookOpen, Globe, Puzzle, Settings, ArrowLeft, ChevronDown, ScrollText } from 'lucide-react';
import { Button } from './ui/Button';
const NotesView = lazy(() => import('./hub-views/NotesView').then(m => ({ default: m.NotesView })));
import { PublicSessionsView } from './hub-views/PublicSessionsView';
import { ModsView } from './hub-views/ModsView';
import { SettingsView } from './hub-views/SettingsView';
import { CreateSessionView } from './hub-views/CreateSessionView';
import type { SessionCreationData } from './hub-views/CreateSessionView';
import { Carousel } from './ui/Carousel';
import { CampaignCard } from './hub-views/CampaignCard';
import { HUB_UPDATE, HUB_UPDATE_SEEN_KEY } from './hub-views/hubUpdate';
import { notesService } from '../core/services/notesService';
type HubView = 'main' | 'notes' | 'public' | 'mods' | 'settings' | 'create-session';

interface HubProps {
  onJoinGame: (roomId: string, isHost: boolean, systemId?: string, metadata?: any) => void;
  onLogout: () => void;
  onSignalUrlChange: (url: string) => void;
  isLanMode: boolean;
  onLanModeChange: (isLan: boolean) => void;
  signalUrl?: string;
}

function relativeTime(ts: number): string {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d < 30 ? `il y a ${d} j` : new Date(ts).toLocaleDateString();
}

export function Hub({ onJoinGame, onLogout, onSignalUrlChange, isLanMode, onLanModeChange, signalUrl }: HubProps) {
  const [roomCode, setRoomCode] = useState('');
  const [roleLevel, setRoleLevel] = useState<number>(0);
  const [username, setUsername] = useState<string>('');
  // Vue courante (pour remplacer les modales)
  const [currentView, setCurrentView] = useState<HubView>('main');
  
  // État local pour les campagnes
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  // Cartes du panneau droit repliables une par une (UI uniquement)
  const [collapsedCards, setCollapsedCards] = useState<Partial<Record<HubView, boolean>>>({});
  const toggleCard = (id: HubView) => setCollapsedCards(prev => ({ ...prev, [id]: !prev[id] }));
  // Bandeau « mise à jour » (masqué une fois fermé, jusqu'à la prochaine version)
  const [isUpdateOpen, setIsUpdateOpen] = useState(() => localStorage.getItem(HUB_UPDATE_SEEN_KEY) !== HUB_UPDATE.version);
  // Dernière note modifiée (lecture seule, pour l'aperçu du Carnet)
  const [lastNote, setLastNote] = useState<{ name: string; updatedAt?: number; excerpt: string } | null>(null);
  useEffect(() => {
    if (currentView !== 'main') return;
    let cancelled = false;
    // Léger délai : laisse la vue Notes finir d'enregistrer avant de relire l'arborescence
    const timer = setTimeout(async () => {
      try {
        const files = (await notesService.getTree()).filter(i => i.item_type === 'file');
        if (files.length === 0) { if (!cancelled) setLastNote(null); return; }
        const latest = files.reduce((a, b) => ((b.updated_at ?? 0) > (a.updated_at ?? 0) ? b : a));
        const content = await notesService.readNote(latest.path);
        const excerpt = content.split(/\r?\n/).map(l => l.replace(/^#+\s*/, '').trim()).filter(l => l && l !== latest.name).slice(0, 2).join(' ');
        if (!cancelled) setLastNote({ name: latest.name, updatedAt: latest.updated_at, excerpt });
      } catch (e) {
        console.error('Erreur lecture dernière note:', e);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentView]);

  const toggleUpdate = () => {
    if (isUpdateOpen) localStorage.setItem(HUB_UPDATE_SEEN_KEY, HUB_UPDATE.version);
    setIsUpdateOpen(!isUpdateOpen);
  };

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
        desc: data.desc,
        maxPlayers: data.maxPlayers,
        isHost: true
      };

      setCampaigns(prev => {
        const updated = [newCampaign, ...prev];
        saveCampaignsNow(updated); // Sauvegarde immédiate avant démontage
        return updated;
      });

      setCurrentView('main');
      // On connecte immédiatement le MJ à sa nouvelle session (isHost = true) avec métadonnées
      onJoinGame(newRoom, true, data.system, {
        name: data.name,
        isPublic: data.isPublic,
        tags: data.tags,
        desc: data.desc,
        maxPlayers: data.maxPlayers
      });
    } catch (err: any) {
      alert("Erreur lors de la création : " + err.message);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputCode = roomCode.trim().toUpperCase();
    if (inputCode) {
      const finalCode = inputCode.startsWith('SIGNET-') ? inputCode : `SIGNET-${inputCode}`;
      
      // Enregistrer dans le carrousel (liste des campagnes)
      const existingIndex = campaigns.findIndex(c => c.id === finalCode);
      let updatedCampaigns;
      
      if (existingIndex === -1) {
        const newCampaign = {
          id: finalCode,
          name: `Session ${finalCode}`, // Nom par défaut
          date: "À l'instant",
          hue: `${Math.floor(Math.random() * 360)}deg`,
          isHost: false
        };
        updatedCampaigns = [newCampaign, ...campaigns];
      } else {
        // Remonter la campagne en haut et mettre à jour la date
        updatedCampaigns = [...campaigns];
        const camp = updatedCampaigns.splice(existingIndex, 1)[0];
        camp.date = "À l'instant";
        updatedCampaigns.unshift(camp);
      }

      setCampaigns(updatedCampaigns);
      saveCampaignsNow(updatedCampaigns);

      onJoinGame(finalCode, false, updatedCampaigns[0].system);
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

  // Aperçus en direct, dérivés des campagnes déjà chargées
  const publicCampaigns = campaigns.filter(c => c.isPublic);
  const usedSystems: string[] = [...new Set<string>(campaigns.map(c => c.system).filter((x): x is string => typeof x === 'string' && x.length > 0))];

  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  const sideItems: { id: HubView; title: string; desc: string; meta?: string; icon: React.ReactNode; preview: React.ReactNode }[] = [
    {
      id: 'notes',
      title: 'Carnet de notes',
      desc: 'Notes du MJ, sur ce disque',
      icon: <BookOpen className="w-5 h-5 shrink-0" />,
      preview: lastNote ? (
        <div>
          <div className="text-xs text-zinc-500">Dernière note{lastNote.updatedAt ? ` · ${relativeTime(lastNote.updatedAt)}` : ''}</div>
          <div className="mt-1 text-sm font-medium text-white truncate">{lastNote.name}</div>
          {lastNote.excerpt && <p className="mt-1 text-sm leading-relaxed text-zinc-500 line-clamp-2">{lastNote.excerpt}</p>}
        </div>
      ) : (
        <span className="text-sm text-zinc-500">Ouvrir le carnet</span>
      ),
    },
    {
      id: 'public',
      title: 'Sessions publiques',
      desc: 'Tables ouvertes aux nouveaux joueurs',
      meta: publicCampaigns.length > 0 ? `${publicCampaigns.length} ${publicCampaigns.length > 1 ? 'publiques' : 'publique'}` : undefined,
      icon: <Globe className="w-5 h-5 shrink-0" />,
      preview: publicCampaigns.length > 0 ? (
        <ul className="divide-y divide-white/[.06]">
          {publicCampaigns.slice(0, 2).map(c => (
            <li key={c.id} className="flex items-center gap-3 h-12">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{c.name}</div>
                <div className="text-xs text-zinc-500 truncate">{c.system ? cap(c.system) : 'Système libre'} · {c.date ?? '—'}</div>
              </div>
              {c.maxPlayers ? <span className="num text-xs text-zinc-400">{c.maxPlayers} max</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm text-zinc-500">Parcourir les tables ouvertes</span>
      ),
    },
    {
      id: 'mods',
      title: 'Mods et systèmes',
      desc: 'Systèmes de jeu et modules du Core',
      icon: <Puzzle className="w-5 h-5 shrink-0" />,
      preview: usedSystems.length > 0 ? (
        <ul className="divide-y divide-white/[.06]">
          {usedSystems.slice(0, 3).map(sys => {
            const n = campaigns.filter(c => c.system === sys).length;
            return (
              <li key={sys} className="flex items-center gap-3 h-12">
                <span className="flex-1 text-sm text-white">{cap(sys)}</span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 num">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {n} {n > 1 ? 'campagnes' : 'campagne'}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="text-sm text-zinc-500">Gérer les mods</span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col relative bg-[#050508] text-white font-sans selection:bg-rose-500/30 overflow-y-auto hide-scrollbar w-full">

      {/* Arrière-plan château (fixe), assombri pour la lisibilité */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-60 mix-blend-luminosity grayscale"
          style={{ backgroundImage: 'url("/fantasy_vtt_bg.jpg")' }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050508] via-[#050508]/80 to-transparent w-full md:w-2/3"></div>
      </div>

      {/* Top bar épurée : logo | profil, Paramètres, Quitter */}
      <header className="shrink-0 relative w-full flex justify-between items-center h-20 px-8 lg:px-14 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="w-8 h-8 opacity-90" />
          <span className="text-xl font-bold tracking-tight text-white">Signet</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-bold text-white">{username}</span>
            <span className={`text-xs ${isGM ? 'text-rose-400' : 'text-zinc-400'}`}>{displayRole}</span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('settings')}
            title="Paramètres"
            aria-label="Paramètres"
            className="w-9 h-9 grid place-items-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="h-9 px-3 flex items-center gap-2 rounded-lg text-sm whitespace-nowrap text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Quitter</span>
          </button>
        </div>
      </header>

      {/* Contenu principal : pleine hauteur */}
      <main className="flex-1 flex flex-col z-20 w-full min-w-0 px-8 lg:px-14 pb-10 gap-12">

        {currentView === 'main' ? (
          <>
            {/* Scène : héro à gauche, centre dégagé, panneau droit pleine hauteur */}
            <div className={`flex-1 grid gap-10 xl:gap-16 pt-6 xl:pt-10 min-h-[420px] xl:grid-cols-[1fr_400px]`}>

              <div className="max-w-3xl animate-fade-in flex flex-col justify-between gap-12">
                <div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight drop-shadow-2xl">
                  L'aventure vous attend
                </h1>
                <p className="text-base md:text-lg text-zinc-300 font-medium mb-9 max-w-xl drop-shadow-md">
                  Entrez le code d'invitation de votre Maître du jeu, ou reprenez une campagne existante.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <form onSubmit={handleJoin} className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      placeholder="Code, ex. A4B9F2"
                      aria-label="Code de session"
                      className="w-full sm:w-56 flex-1 sm:flex-none bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-4 h-11 text-white text-sm font-mono tracking-wider focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder-white/40"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      className="!rounded-lg !h-11 !py-0 !px-5"
                      disabled={!roomCode.trim()}
                      leftIcon={<Play className="w-5 h-5 fill-current shrink-0" />}
                    >
                      Rejoindre
                    </Button>
                  </form>

                  {isGM && (
                    <Button
                      variant="glass"
                      className="!rounded-lg !h-11 !py-0 !px-5"
                      onClick={handleOpenCreateModal}
                      leftIcon={<Plus className="w-5 h-5 shrink-0" />}
                    >
                      Créer une session
                    </Button>
                  )}
                </div>
                </div>

                {/* Centre dégagé : nouveautés de la version, carte repliable (même famille que le panneau droit) */}
                <div className="self-stretch w-full max-w-2xl rounded-2xl bg-[#090a10]/75 backdrop-blur-xl border border-white/[.08] hover:border-white/20 transition-colors">
                  <button
                    type="button"
                    onClick={toggleUpdate}
                    aria-expanded={isUpdateOpen}
                    className="group w-full flex items-center gap-3 p-5 text-left"
                  >
                    <ScrollText className="w-5 h-5 shrink-0 text-zinc-500 group-hover:text-rose-400 transition-colors" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-bold text-white">Nouveautés</span>
                      <span className="block text-xs text-zinc-500">Version <span className="num">{HUB_UPDATE.version}</span></span>
                    </span>
                    {!isUpdateOpen && <span className="num text-xs text-zinc-500 whitespace-nowrap">{HUB_UPDATE.notes.length} changements</span>}
                    <span className="w-8 h-8 shrink-0 grid place-items-center rounded-lg text-zinc-500 group-hover:text-white group-hover:bg-white/10 transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform ${isUpdateOpen ? '' : '-rotate-90'}`} />
                    </span>
                  </button>
                  {isUpdateOpen && (
                    <ul className="px-5 pb-4 divide-y divide-white/[.06]">
                      {HUB_UPDATE.notes.map(note => (
                        <li key={note} className="flex items-center gap-3 h-10 text-sm text-zinc-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
                          <span className="truncate">{note}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Panneau droit : 3 cartes pleine hauteur, chacune repliable séparément */}
              <nav aria-label="Menu principal" className="flex flex-col gap-4 min-h-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {sideItems.map(item => {
                  const isOpen = !collapsedCards[item.id];
                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col bg-[#090a10]/75 backdrop-blur-xl border border-white/[.08] hover:border-white/20 rounded-2xl transition-colors `}
                    >
                      <div className="flex items-center gap-1 pr-2">
                        <button
                          type="button"
                          onClick={() => setCurrentView(item.id)}
                          title={item.title}
                          className="group flex-1 min-w-0 flex items-center gap-3 p-5 text-left"
                        >
                          <span className="text-zinc-500 group-hover:text-rose-400 transition-colors">{item.icon}</span>
                          <span className="min-w-0">
                            <span className="block text-base font-bold text-white">{item.title}</span>
                            {isOpen && <span className="block text-xs text-zinc-500">{item.desc}</span>}
                          </span>
                        </button>
                        {item.meta && <span className="num text-xs text-zinc-500 whitespace-nowrap">{item.meta}</span>}
                        <button
                          type="button"
                          onClick={() => toggleCard(item.id)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? `Replier ${item.title}` : `Déplier ${item.title}`}
                          title={isOpen ? 'Replier' : 'Déplier'}
                          className="w-8 h-8 shrink-0 grid place-items-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                        </button>
                      </div>
                      {isOpen && <div className="px-5 pb-4">{item.preview}</div>}
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Campagnes ancrées en bas */}
            <section aria-labelledby="hub-campaigns" className="w-full animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-baseline justify-between mb-5">
                <h2 id="hub-campaigns" className="text-2xl font-bold tracking-tight">Reprendre une campagne</h2>
                <span className="text-sm text-zinc-500 num">{campaigns.length} {campaigns.length > 1 ? 'campagnes' : 'campagne'}</span>
              </div>

              <Carousel className="gap-5 pb-3">
                {campaigns.map(camp => (
                  <CampaignCard
                    key={camp.id}
                    camp={camp}
                    onOpen={() => onJoinGame(camp.id, camp.isHost !== false, camp.system, {
                      name: camp.name,
                      isPublic: camp.isPublic,
                      tags: camp.tags,
                      desc: camp.desc,
                      maxPlayers: camp.maxPlayers,
                    })}
                  />
                ))}

                {isGM ? (
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="w-[340px] h-[250px] shrink-0 rounded-xl border border-dashed border-white/15 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-white hover:border-rose-500/50 hover:bg-white/5 transition-colors"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-sm font-medium">Créer une session</span>
                  </button>
                ) : (
                  <div className="w-[340px] h-[250px] shrink-0 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-zinc-600 text-sm">
                    En attente d'aventures
                  </div>
                )}
              </Carousel>
            </section>
          </>
        ) : (
          <div className="flex-1 w-full min-h-0 flex flex-col overflow-hidden">
            <div className="mb-4">
              <Button variant="ghost" onClick={() => setCurrentView('main')} leftIcon={<ArrowLeft className="w-5 h-5" />}>
                Retour à l'accueil
              </Button>
            </div>
            <div className="flex-1 w-full h-full min-h-0">
              {currentView === 'notes' && <Suspense fallback={null}><NotesView /></Suspense>}
              {currentView === 'public' && (
                <PublicSessionsView 
                  signalUrl={signalUrl}
                  onJoinSession={(pubRoomId, pubSystem) => {
                    const existing = campaigns.find(c => c.id === pubRoomId);
                    if (!existing) {
                      const newCamp = {
                        id: pubRoomId,
                        name: `Session ${pubRoomId}`,
                        date: "À l'instant",
                        hue: `${Math.floor(Math.random() * 360)}deg`,
                        system: pubSystem || 'default',
                        isHost: false
                      };
                      const updated = [newCamp, ...campaigns];
                      setCampaigns(updated);
                      saveCampaignsNow(updated);
                    }
                    onJoinGame(pubRoomId, false, pubSystem);
                  }}
                />
              )}
              {currentView === 'mods' && <ModsView />}
              {currentView === 'settings' && (
                <SettingsView
                  isLanMode={isLanMode}
                  onLanModeChange={onLanModeChange}
                  onSignalUrlChange={onSignalUrlChange}
                />
              )}
              {currentView === 'create-session' && <CreateSessionView onConfirm={handleConfirmCreate} />}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
