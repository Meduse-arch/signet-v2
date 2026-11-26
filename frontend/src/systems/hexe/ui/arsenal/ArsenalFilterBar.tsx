import { Search, X } from 'lucide-react';
import type { HexeEquipmentSlot } from '../../types';
import type { HexeEquipmentTemplate } from '../../hexeEquipmentStore';
import { SLOT_FILTER_OPTIONS } from '../../constants';

interface ArsenalFilterBarProps {
  templates: HexeEquipmentTemplate[];
  search: string;
  setSearch: (v: string) => void;
  filterSlot: HexeEquipmentSlot | 'all';
  setFilterSlot: (v: HexeEquipmentSlot | 'all') => void;
}

export function ArsenalFilterBar({ templates, search, setSearch, filterSlot, setFilterSlot }: ArsenalFilterBarProps) {
  return (
    <div className="p-3 border-b border-white/10 bg-[#090a10] flex flex-col gap-2.5 shrink-0">
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher par nom, propriété, capacité..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#050508] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtre par slot : onglets avec icônes et compteurs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
        {SLOT_FILTER_OPTIONS.map(({ slot, label, icon: Icon, colorClass }) => {
          const count = slot === 'all'
            ? templates.length
            : templates.filter(t => t.slot === slot).length;
          const isActive = filterSlot === slot;

          return (
            <button
              key={slot}
              onClick={() => setFilterSlot(slot)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_12px_rgba(225,29,72,0.35)]'
                  : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : colorClass}`} />
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                  isActive
                    ? 'bg-black/30 text-rose-100'
                    : 'bg-white/5 text-slate-400 group-hover:text-slate-200 group-hover:bg-white/10'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
