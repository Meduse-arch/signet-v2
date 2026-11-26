import { Plus, Skull, Shield } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { FlowerSheetState } from '../../hooks/useFlowerCharacter';
import { isTauri } from '../../hooks/useFlowerCharacter';
import { MasteryStars, hasMasteryScaling } from './FlowerRatings';

export function InventoryTab({ sheet }: { sheet: FlowerSheetState }) {
  const { character, inventoryFilter, setInventoryFilter, isHost, removeItem, updateItem, handleToggleEquip, openCompendiumModal, handleConsumeItem, setMasteryLevel } = sheet;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-rose-500/30 mb-4">
        <h3 className="font-bold text-rose-400">Sac à dos</h3>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setInventoryFilter('all')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${inventoryFilter === 'all' ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >Tous</button>
          <button 
            onClick={() => setInventoryFilter('equipped')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${inventoryFilter === 'equipped' ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >Équipés</button>
          <button 
            onClick={() => setInventoryFilter('unequipped')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${inventoryFilter === 'unequipped' ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >Dans le Sac</button>
        </div>

        {isTauri() && (
          <Button onClick={() => openCompendiumModal('item')} variant="glass" size="sm" className="gap-2">
            <Plus className="w-4 h-4 text-rose-400" /> Ajouter
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {(!character.inventory || character.inventory.length === 0) ? (
          <p className="text-center text-zinc-500 py-8">L'inventaire est vide.</p>
        ) : (
          character.inventory
            .filter(i => inventoryFilter === 'all' ? true : inventoryFilter === 'equipped' ? i.isEquipped : !i.isEquipped)
            .map(item => (
              <div key={item.id} className="bg-black/30 p-3 rounded-md border border-white/5 flex flex-col gap-2 relative group">
                <button 
                  onClick={() => removeItem(item.id)}
            className="absolute top-2 right-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Supprimer l'objet"
          >
            <Skull className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-6">
            <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-white/10 shrink-0">
              <span className="text-xs text-zinc-500">Qte</span>
              <input 
                type="number" 
                value={item.quantity}
                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                className="bg-transparent text-white font-bold w-12 text-center focus:outline-none focus:bg-white/10"
              />
            </div>
            
            {(!item.itemType || item.itemType === 'equippable') && (
              <button 
                onClick={() => handleToggleEquip(item)}
                className={`shrink-0 p-1.5 rounded-lg transition-[color,background-color,border-color,opacity,transform] ${item.isEquipped ? 'bg-rose-500/20 text-rose-400' : 'bg-black/50 text-zinc-600 hover:text-zinc-400 border border-white/5'}`}
                title={item.isEquipped ? "Déséquiper" : "Équiper"}
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            {item.itemType === 'consumable' && (
              <button 
                onClick={() => handleConsumeItem(item.id)}
                className="shrink-0 p-1.5 rounded-lg transition-[color,background-color,border-color,opacity,transform] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 border border-emerald-500/30"
                title="Consommer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </button>
            )}

            <div className={`flex-1 font-bold ${(!item.itemType || item.itemType === 'equippable') && item.isEquipped ? 'text-rose-300' : 'text-zinc-300'}`}>
              <div className="flex items-center gap-2">
                <span>{item.name || 'Objet Sans Nom'}</span>
                {hasMasteryScaling(item) && <MasteryStars id={item.id} level={item.level} type="item" isHost={isHost} onSetLevel={setMasteryLevel} />}
              </div>
              {item.modifiers && item.modifiers.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${(!item.itemType || item.itemType === 'equippable') && item.isEquipped ? 'text-rose-400 bg-rose-900/30' : 'text-zinc-500 bg-zinc-800/50'}`}>
                  {item.modifiers.map(m => `+${m.value} ${m.target}`).join(', ')}
                </span>
              )}
            </div>
          </div>
          <div className="bg-black/40 text-sm text-zinc-400 rounded-lg p-2 border border-transparent min-h-[40px]">
            {item.description || 'Aucune description.'}
          </div>
        </div>
      ))
    )}
    </div>
  </div>
  );
}
