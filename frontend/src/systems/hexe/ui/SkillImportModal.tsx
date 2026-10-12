import { useState, useMemo } from 'react';
import type { HexeActivationType } from '../types';
import { STAT_LABELS } from '../types';
import { getSkillsCatalog } from '../hexeSkillStore';
import { formatDiceFormula } from '../hexeDiceEngine';
import {
  Search, Shield, Zap, Flame, Check, X, Sparkles, BookOpen
} from 'lucide-react';

interface SkillImportModalProps {
  alreadyLinkedIds?: string[];
  onImportSkillIds: (skillIds: string[]) => void;
  onClose: () => void;
  onOpenGrimoire?: () => void;
}

export function SkillImportModal({
  alreadyLinkedIds = [],
  onImportSkillIds,
  onClose,
  onOpenGrimoire
}: SkillImportModalProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<HexeActivationType | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const catalog = useMemo(() => getSkillsCatalog(), []);

  const counts = useMemo(() => ({
    all: catalog.length,
    passive: catalog.filter(s => s.activationType === 'passive').length,
    toggle: catalog.filter(s => s.activationType === 'toggle').length,
    active: catalog.filter(s => s.activationType === 'active').length,
  }), [catalog]);

  const filtered = useMemo(() => {
    return catalog.filter(skill => {
      if (filterType !== 'all' && skill.activationType !== filterType) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const inName = skill.name.toLowerCase().includes(q);
      const inDesc = (skill.description || '').toLowerCase().includes(q);
      const inEffects = (skill.effects || []).some(e =>
        e.type === 'custom' ? e.description.toLowerCase().includes(q) : false
      );
      return inName || inDesc || inEffects;
    });
  }, [catalog, filterType, search]);

  const toggleSelect = (id: string) => {
    if (alreadyLinkedIds.includes(id)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) return;
    onImportSkillIds(Array.from(selectedIds));
    onClose();
  };

  const getActivationBadge = (type: HexeActivationType) => {
    switch (type) {
      case 'passive':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.5 uppercase tracking-wider">
            <Shield className="w-2.5 h-2.5 text-emerald-400" />
            Passif
          </span>
        );
      case 'toggle':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/40 rounded px-1.5 py-0.5 uppercase tracking-wider">
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            Toggle
          </span>
        );
      case 'active':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-rose-300 bg-rose-950/60 border border-rose-800/40 rounded px-1.5 py-0.5 uppercase tracking-wider">
            <Flame className="w-2.5 h-2.5 text-rose-400" />
            Actif
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#090a10] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/10 bg-[#050508]/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.25)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2 truncate">
                Importer des capacités
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 font-mono font-normal">
                  {catalog.length} disponibles
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Sélectionnez les compétences du Grimoire conférées par cet équipement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="p-3 border-b border-white/10 bg-[#07080d] flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, effet ou mot-clé..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#050508] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['all', 'passive', 'toggle', 'active'] as const).map(tab => {
              const count = counts[tab];
              const isSel = filterType === tab;
              const label = tab === 'all' ? 'Toutes' : tab === 'passive' ? 'Passifs' : tab === 'toggle' ? 'Toggles' : 'Actifs';
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterType(tab)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    isSel
                      ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.35)]'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste des cartes du catalogue */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs italic border border-dashed border-white/10 rounded-xl bg-black/20">
              Aucune capacité trouvée dans le Grimoire pour cette recherche.
            </div>
          ) : (
            filtered.map(skill => {
              const isAlreadyLinked = alreadyLinkedIds.includes(skill.id);
              const isSelected = selectedIds.has(skill.id);

              return (
                <div
                  key={skill.id}
                  onClick={() => toggleSelect(skill.id)}
                  className={`border rounded-xl p-3 flex items-start justify-between gap-3 transition-all cursor-pointer select-none ${
                    isAlreadyLinked
                      ? 'bg-[#050508]/50 border-white/5 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-rose-950/25 border-rose-500 shadow-[0_0_14px_rgba(225,29,72,0.25)]'
                      : 'bg-[#050508] border-white/10 hover:border-white/25 hover:bg-[#090a10]'
                  }`}
                >
                  {/* Case à cocher visuelle */}
                  <div className="pt-0.5 shrink-0">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        isAlreadyLinked
                          ? 'border-white/10 bg-white/5 text-slate-500'
                          : isSelected
                          ? 'border-rose-500 bg-rose-600 text-white shadow-[0_0_8px_rgba(225,29,72,0.5)]'
                          : 'border-white/20 bg-black/40 text-transparent'
                      }`}
                    >
                      {(isSelected || isAlreadyLinked) && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Contenu de la capacité */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">{skill.name}</span>
                      {getActivationBadge(skill.activationType)}

                      {isAlreadyLinked && (
                        <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.2">
                          Déjà associée
                        </span>
                      )}

                      {skill.dice && (
                        <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                          🎲 {formatDiceFormula(skill.dice)}
                        </span>
                      )}

                      {skill.costs?.mp && (
                        <span className="text-[9px] font-bold text-blue-300 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.2 rounded">
                          {skill.costs.mp} MP
                        </span>
                      )}
                      {skill.costs?.stm && (
                        <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                          {skill.costs.stm} STM
                        </span>
                      )}
                      {skill.costs?.hp && (
                        <span className="text-[9px] font-bold text-rose-300 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.2 rounded">
                          {skill.costs.hp} HP
                        </span>
                      )}
                    </div>

                    {skill.description && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-2">
                        {skill.description}
                      </p>
                    )}

                    {skill.conditions && skill.conditions.length > 0 && (
                      <div className="text-[10px] text-amber-400/90 italic">
                        Condition : {skill.conditions.join(', ')}
                      </div>
                    )}

                    {/* Effets */}
                    {skill.effects?.length > 0 && (
                      <div className="flex gap-1 flex-wrap pt-0.5">
                        {skill.effects.map((eff, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-semibold text-slate-300 bg-white/5 border border-white/10 rounded px-1.5 py-0.2"
                          >
                            {eff.type === 'statLevel' && `+${eff.value} niv. ${STAT_LABELS[eff.stat]}`}
                            {eff.type === 'rollModifier' && `+${eff.value} aux jets`}
                            {eff.type === 'resourceChange' && `${eff.operation.toUpperCase()} ${eff.resource.toUpperCase()}`}
                            {eff.type === 'custom' && eff.description}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-[#050508]/90 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div>
            {onOpenGrimoire && (
              <button
                type="button"
                onClick={onOpenGrimoire}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                title="Ouvrir le Grimoire Hexe pour forger une nouvelle capacité générale"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Créer dans le Grimoire</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleConfirm}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] flex items-center gap-1.5 ${
                selectedIds.size > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {selectedIds.size > 0
                  ? `Importer la sélection (${selectedIds.size})`
                  : 'Sélectionnez des capacités'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
