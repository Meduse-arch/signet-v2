import { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Puzzle, CheckCircle, Users, Layers, ShieldCheck, XCircle } from 'lucide-react';
import { t } from '../../core/locales/fr';
import { ModManager, type StoreCategory } from '../../core/services/ModManager';

type StatusFilter = 'all' | 'enabled' | 'disabled';

export function ModsView() {
  const [activeCategory, setActiveCategory] = useState<StoreCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const allItems = useMemo(() => ModManager.getAllStoreItems(), []);

  const toggleItem = (id: string) => {
    const isCurrentlyEnabled = ModManager.isItemEnabled(id);
    
    if (id === 'mod-nav' && isCurrentlyEnabled) {
      const confirmMsg = "ATTENTION : Vous êtes sur le point de désactiver la Navigation Principale.\n\nSi vous n'avez pas activé un mod de navigation alternatif, vous n'aurez plus de menu pour quitter la partie en jeu (sauf en appuyant 3 fois sur Échap).\n\nÊtes-vous sûr de vouloir désactiver ce module ?";
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    ModManager.toggleItemEnabled(id);
    setRefreshTrigger(prev => prev + 1); // Force le composant à se re-rendre pour lire localStorage
  };

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      
      const isEnabled = ModManager.isItemEnabled(item.id);
      if (statusFilter === 'enabled' && !isEnabled) return false;
      if (statusFilter === 'disabled' && isEnabled) return false;
      
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, statusFilter, refreshTrigger, allItems]);

  const categories: { id: StoreCategory | 'all', label: string, icon: React.ReactNode }[] = [
    { id: 'all', label: 'Tout explorer', icon: <Layers className="w-4 h-4" /> },
    { id: 'system-signet', label: 'Systèmes Officiels', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'mod-signet', label: 'Mods Officiels', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'system-community', label: 'Systèmes Communauté', icon: <Users className="w-4 h-4" /> },
    { id: 'mod-community', label: 'Mods Communauté', icon: <Puzzle className="w-4 h-4" /> },
  ];

  const getCategoryBadge = (category: StoreCategory) => {
    switch (category) {
      case 'system-signet':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-rose-500/20 text-rose-400 border border-rose-500/30">Système Officiel</span>;
      case 'mod-signet':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-rose-500/20 text-rose-400 border border-rose-500/30">Mod Officiel</span>;
      case 'system-community':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-zinc-700/50 text-zinc-300 border border-zinc-600/50">Système Commu.</span>;
      case 'mod-community':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-zinc-700/50 text-zinc-300 border border-zinc-600/50">Mod Commu.</span>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-4xl font-black text-white mb-2 drop-shadow-xl">Boutique d'Extensions</h2>
        <p className="text-zinc-300 font-medium text-sm drop-shadow-md">Gérez vos systèmes de jeu et vos modules additionnels.</p>
      </div>

      {/* Barre de filtres (Charte Graphique : Carrés/rounded-sm) */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Catégories */}
        <div className="flex flex-wrap gap-2 flex-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-sm border transition-all ${
                activeCategory === cat.id 
                  ? 'bg-rose-500/20 border-rose-500 text-white shadow-[0_0_15px_rgba(225,29,72,0.3)]' 
                  : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-500'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filtres de statut */}
        <div className="flex gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-zinc-900 border border-zinc-700 rounded-sm px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-rose-500 shadow-inner cursor-pointer"
          >
            <option value="all">Afficher : Tout</option>
            <option value="enabled">Installés & Actifs</option>
            <option value="disabled">Non Installés</option>
          </select>
        </div>
      </div>
      
      {/* Grille */}
      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        {filteredItems.length === 0 ? (
          <div className="w-full h-40 flex items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-sm">
            Aucune extension trouvée pour ces filtres.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map(item => {
              const isEnabled = ModManager.isItemEnabled(item.id);
              return (
                <div key={item.id} className={`border rounded-sm p-6 transition-all flex flex-col h-56 relative overflow-hidden group ${isEnabled ? 'bg-zinc-900/80 border-rose-500/30 shadow-[0_0_20px_rgba(225,29,72,0.05)] hover:border-rose-500/50' : 'bg-[#050508]/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50 opacity-70 hover:opacity-100'}`}>
                  
                  {/* Liseré haut rouge si actif */}
                  {isEnabled && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600/50 to-rose-400/50" />}

                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-2">
                        {getCategoryBadge(item.category)}
                        <h4 className={`font-black text-xl tracking-tight ${isEnabled ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}>
                          {item.name}
                        </h4>
                      </div>
                      {isEnabled ? (
                        <CheckCircle className="w-6 h-6 text-rose-500 drop-shadow-[0_0_8px_rgba(225,29,72,0.6)] shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-zinc-700 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mb-3 font-semibold tracking-wider">CRÉÉ PAR {item.author.toUpperCase()}</p>
                    <p className={`text-sm line-clamp-3 leading-relaxed ${isEnabled ? 'text-zinc-300' : 'text-zinc-500'}`}>{item.description}</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                    <Button 
                      variant={isEnabled ? "glass" : "primary"}
                      onClick={() => toggleItem(item.id)}
                      className="py-1.5 px-4 text-xs tracking-wider"
                    >
                      {isEnabled ? "DÉSACTIVER" : "ACTIVER"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
