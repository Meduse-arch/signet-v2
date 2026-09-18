import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';
import { ModManager } from '../../core/services/ModManager';

export interface SessionCreationData {
  name: string;
  system: string;
  tags: string;
  desc: string;
  isPublic: boolean;
  maxPlayers: number | null;
}

interface CreateSessionViewProps {
  onConfirm: (data: SessionCreationData) => void;
}

export function CreateSessionView({ onConfirm }: CreateSessionViewProps) {
  const enabledSystems = ModManager.getEnabledSystems();
  const [sessionName, setSessionName] = useState('');
  const [sessionSystem, setSessionSystem] = useState(enabledSystems[0]?.id || '');
  const [sessionTags, setSessionTags] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [hasMaxPlayers, setHasMaxPlayers] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState<number>(5);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessionName.trim()) return;

    onConfirm({
      name: sessionName,
      system: sessionSystem,
      tags: sessionTags,
      desc: sessionDesc,
      isPublic,
      maxPlayers: hasMaxPlayers ? maxPlayers : null,
    });
  };

  return (
    <div className="w-full max-w-2xl animate-slide-up pb-12">
      <h2 className="text-3xl md:text-4xl font-black mb-8 text-white tracking-tight drop-shadow-md">Nouvelle Session</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Nom de la session"
          type="text"
          required
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="Ex: Le Donjon du Dragon Noir"
          autoFocus
        />

        <div className="w-full">
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Système de jeu</label>
          <select 
            value={sessionSystem} 
            onChange={e => setSessionSystem(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-sm px-4 py-3.5 text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-inner appearance-none cursor-pointer"
          >
            {enabledSystems.length === 0 && (
              <option value="" disabled>Aucun système activé...</option>
            )}
            {enabledSystems.map(sys => (
              <option key={sys.id} value={sys.id}>{sys.name}</option>
            ))}
          </select>
        </div>

        <Input
          label="Ambiance / Tags (séparés par des virgules)"
          type="text"
          value={sessionTags}
          onChange={(e) => setSessionTags(e.target.value)}
          placeholder="Ex: Dark Fantasy, Enquête, RP Vocal"
        />

        <div className="w-full">
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Description</label>
          <textarea
            value={sessionDesc}
            onChange={e => setSessionDesc(e.target.value)}
            rows={3}
            placeholder="Décrivez brièvement la campagne..."
            className="w-full bg-zinc-900/80 border border-zinc-700/80 rounded-sm px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-inner resize-none"
          ></textarea>
        </div>

        <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-sm">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Nombre de joueurs maximum</span>
            <span className="text-xs text-zinc-400">Limiter le nombre de places disponibles</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setHasMaxPlayers(!hasMaxPlayers)}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none border ${hasMaxPlayers ? 'bg-rose-500 border-rose-500' : 'bg-zinc-800 border-zinc-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${hasMaxPlayers ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            
            {hasMaxPlayers && (
              <input
                type="number"
                min="1"
                max="99"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-zinc-900 border border-zinc-700 rounded-sm px-2 py-1 text-center text-white focus:outline-none focus:border-rose-500"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 pb-2">
          <button 
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none border ${isPublic ? 'bg-rose-500 border-rose-500' : 'bg-zinc-800 border-zinc-600'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Session Publique</span>
            <span className="text-xs text-zinc-400">Rend la salle visible dans l'onglet Sessions Publiques</span>
          </div>
        </div>
        
        <div className="flex gap-4 pt-6 mt-6 border-t border-white/10">
          <Button 
            type="button" 
            variant="primary"
            disabled={!sessionName.trim()}
            onClick={() => handleSubmit()}
            leftIcon={<Check className="w-5 h-5" />}
            className="flex-1 py-4 text-lg"
          >
            Lancer la partie
          </Button>
        </div>
      </form>
    </div>
  );
}
