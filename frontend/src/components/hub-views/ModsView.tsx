import { useState } from 'react';
import { Button } from '../ui/Button';
import { Puzzle, CheckCircle } from 'lucide-react';
import { t } from '../../core/locales/fr';

export function ModsView() {
  const [activeMods, setActiveMods] = useState<number[]>([1]);

  const mods = [
    { id: 1, name: "D&D 5E Core Rules", author: "Signet Team", desc: "Le système de règles complet pour Donjons & Dragons 5e édition." },
    { id: 2, name: "Sci-Fi Tokens Pack", author: "NeonArtist", desc: "Plus de 200 tokens haute résolution pour vos parties cyberpunk et spatiales." },
    { id: 3, name: "Dice 3D Physics", author: "ModdingCommunity", desc: "Remplace les lancers de dés 2D par un moteur physique 3D réaliste." },
    { id: 4, name: "Ambiance Sonore Fantastique", author: "BardMaster", desc: "Pack de musiques et d'effets sonores d'ambiance." },
  ];

  const toggleMod = (id: number) => {
    setActiveMods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-white mb-2 drop-shadow-xl">{t('modal_mods_title')}</h2>
        <p className="text-zinc-300 font-medium text-sm drop-shadow-md">{t('modal_mods_desc')}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {mods.map(mod => {
            const isActive = activeMods.includes(mod.id);
            return (
              <div key={mod.id} className={`border rounded-lg p-6 transition-all flex flex-col h-48 ${isActive ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.2)]' : 'bg-white/5 border-zinc-800 hover:border-white/20 hover:bg-white/10'}`}>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-bold text-lg flex items-center gap-2">
                      <Puzzle className={`w-5 h-5 ${isActive ? 'text-rose-400' : 'text-zinc-500'}`} />
                      {mod.name}
                    </h4>
                    {isActive && <CheckCircle className="w-5 h-5 text-rose-500 drop-shadow-md" />}
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">par {mod.author}</p>
                  <p className="text-sm text-zinc-300 line-clamp-2">{mod.desc}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button 
                    variant={isActive ? "ghost" : "glass"}
                    onClick={() => toggleMod(mod.id)}
                  >
                    {isActive ? t('modal_mods_active') : t('modal_mods_activate')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
