import { Search } from 'lucide-react';
import type { GrimoireFilter } from './useGrimoireTemplates';

interface GrimoireFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  activeFilter: GrimoireFilter;
  setActiveFilter: (v: GrimoireFilter) => void;
  counts: Record<GrimoireFilter, number>;
}

export function GrimoireFilterBar({ search, setSearch, activeFilter, setActiveFilter, counts }: GrimoireFilterBarProps) {
  return (
    <div className="p-3 border-b border-white/10 bg-black/20 space-y-2 shrink-0">
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Rechercher par nom, effet ou description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface-raised/80 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {(['all', 'passive', 'toggle', 'active'] as const).map(tab => {
          const count = counts[tab];
          const isSel = activeFilter === tab;
          const label = tab === 'all' ? 'Toutes' : tab === 'passive' ? 'Passifs' : tab === 'toggle' ? 'Toggles' : 'Actifs';
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-[color,background-color,border-color,opacity,transform] whitespace-nowrap ${
                isSel
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{label}</span>
              <span className="text-[11px] px-1 py-0.2 rounded-lg bg-black/40 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
