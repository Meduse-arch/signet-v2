import { Button } from '../ui/Button';
import { Users, Swords } from 'lucide-react';
import { t } from '../../core/locales/fr';

export function PublicSessionsView() {
  const sessions = [
    { id: 1, name: "L'Appel du Dragon Noir", system: "D&D 5E", players: 4, max: 5 },
    { id: 2, name: "Cyberpunk: Néon rouge", system: "Cyberpunk RED", players: 3, max: 4 },
    { id: 3, name: "Le Manoir Oublié", system: "Cthulhu", players: 5, max: 5 },
    { id: 4, name: "Aventures en Terre du Milieu", system: "Anneau Unique", players: 2, max: 4 },
  ];

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-white mb-2 drop-shadow-xl">{t('modal_public_title')}</h2>
        <p className="text-zinc-300 font-medium text-sm drop-shadow-md">{t('modal_public_desc')}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sessions.map(s => (
            <div key={s.id} className="bg-white/5 border border-zinc-800 rounded-lg p-6 flex items-center justify-between hover:border-rose-500/30 transition-all hover:bg-white/10 group">
              <div>
                <h4 className="text-white font-bold text-xl group-hover:text-rose-400 transition-colors">{s.name}</h4>
                <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                  <span className="flex items-center gap-2"><Swords className="w-4 h-4" /> {s.system}</span>
                  <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {s.players}/{s.max} Joueurs</span>
                </div>
              </div>
              <Button 
                variant={s.players >= s.max ? "ghost" : "glass"}
                disabled={s.players >= s.max}
              >
                {s.players >= s.max ? t('modal_public_full') : t('modal_public_join')}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
