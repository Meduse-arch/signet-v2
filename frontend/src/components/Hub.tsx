import { useState, useEffect } from 'react';
import { supabase } from '../core/supabase';
import { t } from '../core/locales/fr';
import { Play, Plus, Clock, LogOut, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';

interface HubProps {
  onJoinGame: (roomId: string) => void;
  onLogout: () => void;
}

export function Hub({ onJoinGame, onLogout }: HubProps) {
  const [roomCode, setRoomCode] = useState('');
  const [roleLevel, setRoleLevel] = useState<number>(0);
  const [username, setUsername] = useState<string>('');
  
  // États pour la création de session
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  
  // État local pour les campagnes
  const [campaigns, setCampaigns] = useState([
    { id: 'SEAL-DEMO2', name: 'Campagne Principale', date: 'il y a 1 semaine', hue: '180deg' },
    { id: 'SIGNET-DEMO1', name: 'Le Donjon Oublié', date: 'il y a 2 jours', hue: '0deg' }
  ]);

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
    setIsCreateModalOpen(true);
    setSessionName(''); // Réinitialiser le champ
  };

  const handleConfirmCreate = () => {
    if (!sessionName.trim()) {
      alert("Erreur: le nom de la session est vide.");
      return;
    }

    try {
      // Pour l'instant on génère un code aléatoire
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRoom = `SIGNET-${code}`;
      
      // On ajoute la nouvelle campagne en haut de la liste
      setCampaigns(prev => [
        { id: newRoom, name: sessionName, date: "À l'instant", hue: `${Math.floor(Math.random() * 360)}deg` },
        ...prev
      ]);

      setIsCreateModalOpen(false);
      // On connecte immédiatement le MJ à sa nouvelle session
      onJoinGame(newRoom);
    } catch (err: any) {
      alert("Erreur lors de la création : " + err.message);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputCode = roomCode.trim().toUpperCase();
    if (inputCode) {
      const finalCode = inputCode.startsWith('SIGNET-') ? inputCode : `SIGNET-${inputCode}`;
      onJoinGame(finalCode);
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
    <div className="min-h-screen bg-[#050508] text-white flex flex-col relative font-sans selection:bg-indigo-500/30 overflow-x-hidden w-full">
      
      {/* Background Cinématique */}
      <div className="absolute inset-0 w-full h-full">
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-60 mix-blend-luminosity" 
          style={{ backgroundImage: 'url("/fantasy_vtt_bg.jpg")' }}
        ></div>
        {/* Dégradés façon Netflix pour faire ressortir le texte */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050508] via-[#050508]/80 to-transparent w-full md:w-2/3"></div>
      </div>

      {/* Header Minimaliste */}
      <header className="w-full flex justify-between items-center p-6 lg:px-12 z-20">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Signet VTT" className="w-8 h-8 lg:w-10 lg:h-10 opacity-90 drop-shadow-lg" />
          <span className="text-xl font-bold tracking-widest uppercase text-white drop-shadow-md">Signet</span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-white drop-shadow-md">{username}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest drop-shadow-md ${isGM ? 'text-indigo-400' : 'text-slate-300'}`}>
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
        <div className="max-w-3xl animate-slide-up">
          
          <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tight drop-shadow-2xl">
            L'Aventure vous attend.
          </h1>
          <p className="text-base md:text-lg text-slate-300 font-medium mb-10 max-w-xl drop-shadow-md">
            Entrez un code d'invitation pour rejoindre la table de votre Maître du Jeu, ou reprenez une campagne existante.
          </p>

          {/* Actions Principales (Rejoindre & Créer) */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            
            {/* Formulaire Rejoindre */}
            <form onSubmit={handleJoin} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="CODE (EX: A4B9F2)"
                className="w-48 sm:w-56 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-4 py-3 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-white transition-colors uppercase placeholder-white/30"
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

        {/* Espace pour le futur Carrousel des sessions */}
        <div className="w-full mt-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-2 mb-4 text-white/80">
            <Clock className="w-5 h-5" />
            <h3 className="text-lg font-bold tracking-wide">Reprendre une campagne</h3>
          </div>
          
          {/* Placeholder du carrousel */}
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            
            {/* Rendu dynamique des campagnes */}
            {campaigns.map(camp => (
              <Card
                key={camp.id}
                title={camp.name}
                subtitle={`Dernière session : ${camp.date}`}
                badge={`CODE : ${camp.id}`}
                imageUrl="/fantasy_vtt_bg.jpg"
                style={{ filter: `hue-rotate(${camp.hue})` }}
                onClick={() => onJoinGame(camp.id)}
              />
            ))}
            
            {/* Espace vide en fin de carrousel */}
            {isGM ? (
              <div 
                onClick={handleOpenCreateModal}
                className="min-w-[250px] h-[150px] bg-black/20 border border-white/5 border-dashed rounded-xl flex flex-col items-center justify-center text-white/30 hover:text-white/80 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-white/5 group"
              >
                <Plus className="w-6 h-6 mb-2 group-hover:scale-110 group-hover:text-indigo-400 transition-transform" />
                <span className="text-sm font-medium group-hover:text-indigo-300">Créer une session</span>
              </div>
            ) : (
              <div className="min-w-[250px] h-[150px] bg-black/20 border border-white/5 border-dashed rounded-xl flex flex-col items-center justify-center text-white/20">
                <span className="text-2xl tracking-widest opacity-50">...</span>
                <span className="text-xs font-medium mt-2 opacity-50">En attente d'aventures</span>
              </div>
            )}
          </div>
        </div>

      </main>
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Nouvelle Session"
      >
        <div className="space-y-6">
          <Input
            label="Nom de la session"
            type="text"
            required
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Ex: Le Donjon du Dragon Noir"
            autoFocus
          />
          
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsCreateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              type="button" 
              variant="primary"
              disabled={!sessionName.trim()}
              onClick={handleConfirmCreate}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Créer la session
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
