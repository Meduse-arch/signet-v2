import type { SignetAPI } from '../../../../core/services/SignetAPI';
import { Shield, BookOpen, Zap, X, Search, ExternalLink, Layers, Flame } from 'lucide-react';
import type { HexeSkill, HexeActivationType } from '../../types';
import { formatDiceFormula } from '../../hexeDiceEngine';
import { HexeItemImage } from '../HexeImagePicker';

interface GrimoirePickerPanelProps {
  skills: HexeSkill[];
  search: string;
  setSearch: (v: string) => void;
  filterType: HexeActivationType | 'all';
  setFilterType: (f: HexeActivationType | 'all') => void;
  learnedSkillIds: string[];
  onSelect: (skill: HexeSkill) => void;
  onOpenGrimoireWindow: () => void;
  onClose: () => void;
  api?: SignetAPI;
}

export function GrimoirePickerPanel({
  skills, search, setSearch, filterType, setFilterType, learnedSkillIds, onSelect, onOpenGrimoireWindow, onClose, api
}: GrimoirePickerPanelProps) {
  const filtered = skills.filter(s => {
    if (filterType !== 'all' && s.activationType !== filterType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = s.name.toLowerCase().includes(q);
    const matchDesc = (s.description || '').toLowerCase().includes(q);
    const matchEff = (s.effects || []).some(e => e.type === 'custom' && e.description.toLowerCase().includes(q));
    return matchName || matchDesc || matchEff;
  });

  const SKILL_FILTER_OPTIONS: {
    type: HexeActivationType | 'all';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
  }[] = [
    { type: 'all', label: 'Toutes', icon: Layers, colorClass: 'text-slate-400' },
    { type: 'active', label: 'Actifs', icon: Flame, colorClass: 'text-rose-400' },
    { type: 'toggle', label: 'Toggles', icon: Zap, colorClass: 'text-amber-400' },
    { type: 'passive', label: 'Passifs', icon: Shield, colorClass: 'text-emerald-400' },
  ];

  return (
    <div className="bg-slate-950 border border-white/15 rounded-xl p-3 flex flex-col gap-3 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Piocher dans le Grimoire
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenGrimoireWindow}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 rounded-lg transition-colors"
            title="Ouvrir la forge du Grimoire dans une fenêtre dédiée"
          >
            <ExternalLink className="w-3 h-3 text-rose-400" /> Forger...
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Chercher une compétence dans le Grimoire..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {SKILL_FILTER_OPTIONS.map(({ type, label, icon: Icon, colorClass }) => {
            const count = type === 'all'
              ? skills.length
              : skills.filter(s => s.activationType === type).length;
            const isActive = filterType === type;

            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.35)]'
                    : 'bg-black/40 border-white/5 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : colorClass}`} />
                <span>{label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    isActive
                      ? 'bg-black/30 text-rose-100'
                      : 'bg-white/5 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            Aucune compétence trouvée. Ouvrez le Grimoire pour en forger de nouvelles.
          </div>
        ) : (
          filtered.map(s => {
            const isAlreadyLearned = learnedSkillIds.includes(s.id);
            return (
              <div
                key={s.id}
                className="bg-slate-900/60 border border-white/10 hover:border-white/20 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <HexeItemImage
                    src={s.imageUrl}
                    alt={s.name}
                    fallbackType={s.activationType}
                    className="w-8 h-8 rounded-lg shrink-0"
                    api={api}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">{s.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.2 border ${
                      s.activationType === 'passive'
                        ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                        : s.activationType === 'toggle'
                        ? 'bg-amber-950/60 border-amber-800/40 text-amber-300'
                        : 'bg-rose-950/60 border-rose-800/40 text-rose-300'
                    }`}>
                      {s.activationType === 'passive' ? 'Passif' : s.activationType === 'toggle' ? 'Toggle' : 'Actif'}
                    </span>
                    {s.dice && (
                      <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                        🎲 {formatDiceFormula(s.dice)}
                      </span>
                    )}
                    {s.costs?.mp && (
                      <span className="text-[9px] text-blue-300 bg-blue-950/60 px-1 rounded font-bold">
                        {s.costs.mp} MP
                      </span>
                    )}
                    {s.costs?.stm && (
                      <span className="text-[9px] text-emerald-300 bg-emerald-950/60 px-1 rounded font-bold">
                        {s.costs.stm} STM
                      </span>
                    )}
                  </div>

                  {s.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 italic">
                      {s.description}
                    </p>
                  )}
                </div>
              </div>

                {isAlreadyLearned ? (
                  <span className="px-2.5 py-1 text-[11px] font-bold text-slate-500 bg-white/5 border border-white/10 rounded-lg shrink-0">
                    Acquise
                  </span>
                ) : (
                  <button
                    onClick={() => onSelect(s)}
                    className="px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shrink-0 transition-colors shadow-[0_0_10px_rgba(225,29,72,0.3)] whitespace-nowrap"
                  >
                    Prendre
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

