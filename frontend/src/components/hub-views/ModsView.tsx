import { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Puzzle, CheckCircle, Users, Layers, ShieldCheck, XCircle } from 'lucide-react';
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
    { id: 'system-signet', label: 'Systèmes officiels', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'mod-signet', label: 'Mods officiels', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'system-community', label: 'Systèmes communauté', icon: <Users className="w-4 h-4" /> },
    { id: 'mod-community', label: 'Mods communauté', icon: <Puzzle className="w-4 h-4" /> },
  ];

  const getCategoryBadge = (category: StoreCategory) => {
    switch (category) {
      case 'system-signet':
        return <span className="text-xs px-2 py-0.5 rounded-md text-rose-300 border border-rose-500/30">Système officiel</span>;
      case 'mod-signet':
        return <span className="text-xs px-2 py-0.5 rounded-md text-rose-300 border border-rose-500/30">Mod officiel</span>;
      case 'system-community':
        return <span className="text-xs px-2 py-0.5 rounded-md text-zinc-400 border border-hairline">Système communauté</span>;
      case 'mod-community':
        return <span className="text-xs px-2 py-0.5 rounded-md text-zinc-400 border border-hairline">Mod communauté</span>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Boutique d'extensions</h2>
        <p className="text-zinc-400 text-sm">Gérez vos systèmes de jeu et vos modules additionnels.</p>
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Catégories */}
        <div className="flex flex-wrap gap-2 flex-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 h-10 text-sm rounded-lg border transition-colors ${
                activeCategory === cat.id 
                  ? 'bg-white/[.09] text-white shadow-[inset_0_-2px_0_#e11d48] border-white/10' 
                  : 'bg-surface/60 border-hairline text-zinc-400 hover:text-white hover:border-white/20'
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
            className="bg-surface-raised border border-hairline rounded-lg px-4 h-10 text-sm text-white focus:outline-none focus:border-rose-500 cursor-pointer transition-colors"
          >
            <option value="all">Afficher : Tout</option>
            <option value="enabled">Installés et actifs</option>
            <option value="disabled">Non installés</option>
          </select>
        </div>
      </div>
      
      {/* Grille */}
      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        {filteredItems.length === 0 ? (
          <div className="w-full h-40 flex items-center justify-center text-zinc-500 border border-dashed border-hairline rounded-2xl">
            Aucune extension trouvée pour ces filtres.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map(item => {
              const isEnabled = ModManager.isItemEnabled(item.id);
              return (
                <div key={item.id} className={`border rounded-2xl p-6 transition-colors flex flex-col h-56 relative overflow-hidden group ${isEnabled ? 'bg-surface/80 border-white/15 hover:border-white/25' : 'bg-surface/40 border-hairline hover:border-white/15 opacity-70 hover:opacity-100'}`}>
                  
                  
                  

                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-2">
                        {getCategoryBadge(item.category)}
                        <h4 className={`font-bold text-xl tracking-tight ${isEnabled ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}>
                          {item.name}
                        </h4>
                      </div>
                      {isEnabled ? (
                        <CheckCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-zinc-700 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">Par {item.author}</p>
                    <p className={`text-sm line-clamp-3 leading-relaxed ${isEnabled ? 'text-zinc-300' : 'text-zinc-500'}`}>{item.description}</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-hairline flex justify-end">
                    <Button 
                      variant={isEnabled ? "glass" : "primary"}
                      onClick={() => toggleItem(item.id)}
                      className="h-9 !py-0 px-4 text-sm"
                    >
                      {isEnabled ? "Désactiver" : "Activer"}
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
