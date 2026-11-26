import { Plus, Skull } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { getDiceForFlowers } from '../../types';
import type { FlowerSheetState } from '../../hooks/useFlowerCharacter';
import { isTauri } from '../../hooks/useFlowerCharacter';
import { FlowerRating } from './FlowerRatings';

export function StatsTab({ sheet }: { sheet: FlowerSheetState }) {
  const { character, newStatName, setNewStatName, knownCustomStats, isHost, handleStatChange, rollStat, addCustomStat, deleteCustomStat } = sheet;
  return (
    <div className="flex flex-col gap-3">
      {Object.entries(character.stats).map(([key, stat]) => (
        <div key={key} className="flex items-center justify-between bg-black/30 p-2 rounded-md border border-white/5 hover:border-rose-500/30 transition-colors group/stat">
          <button 
            onClick={() => rollStat(key)}
            className="text-left font-bold text-zinc-300 hover:text-rose-300 transition-colors w-40 truncate"
          >
            {stat.name}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-12 text-right font-mono">
              {getDiceForFlowers(stat.value)}
            </span>
            <FlowerRating statKey={key} value={stat.value} isHost={isHost} onChange={handleStatChange} />
            {stat.isCustom && isTauri() && (
              <button
                onClick={() => deleteCustomStat(key)}
                className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-[color,background-color,border-color,opacity,transform] opacity-0 group-hover/stat:opacity-100"
                title={`Supprimer la stat "${stat.name}"`}
              >
                <Skull className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Ajout de Statistique Personnalisée (Interface MJ) */}
      <div className="mt-4 pt-4 border-t border-rose-500/30">
        <form onSubmit={addCustomStat} className="flex gap-2">
          <input 
            list="known-custom-stats"
            type="text" 
            value={newStatName} 
            onChange={(e) => setNewStatName(e.target.value)}
            placeholder="Nouvelle Statistique (ex: Perception)"
            className="flex-1 bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
          />
          <datalist id="known-custom-stats">
            {knownCustomStats.map((s, i) => <option key={`${s}-${i}`} value={s} />)}
          </datalist>
          <Button type="submit" variant="glass" className="px-3" disabled={!newStatName.trim()}>
            <Plus className="w-4 h-4 text-rose-400" />
          </Button>
        </form>
      </div>
    </div>
  );
}
