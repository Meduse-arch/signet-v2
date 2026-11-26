import type { SignetAPI } from '../../../../core/services/SignetAPI';
import { Shield, Package, X, Search, ExternalLink, FlaskConical } from 'lucide-react';
import type { HexeStatKey, HexeEquipmentSlot } from '../../types';
import { SLOT_LABELS } from '../../types';
import type { HexeEquipmentTemplate } from '../../hexeEquipmentStore';
import { HexeItemImage } from '../HexeImagePicker';
import { STAT_SHORT, SLOT_FILTER_OPTIONS } from '../../constants';

interface ArsenalPickerPanelProps {
  templates: HexeEquipmentTemplate[];
  search: string;
  setSearch: (v: string) => void;
  slotFilter: HexeEquipmentSlot | 'all';
  setSlotFilter: (s: HexeEquipmentSlot | 'all') => void;
  onSelect: (template: HexeEquipmentTemplate) => void;
  onOpenArsenalWindow: () => void;
  onClose: () => void;
  api?: SignetAPI;
}

export function ArsenalPickerPanel({
  templates, search, setSearch, slotFilter, setSlotFilter, onSelect, onOpenArsenalWindow, onClose, api
}: ArsenalPickerPanelProps) {
  const filtered = templates.filter(t => {
    if (slotFilter !== 'all' && t.slot !== slotFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = t.name.toLowerCase().includes(q);
    const matchProps = (t.properties || []).some(p => p.toLowerCase().includes(q));
    const matchAb = (t.abilities || []).some(a => a.name.toLowerCase().includes(q));
    return matchName || matchProps || matchAb;
  });

  return (
    <div className="bg-void border border-white/15 rounded-xl p-3 flex flex-col gap-3 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-black text-white">
            Piocher dans l'Arsenal
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenArsenalWindow}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-200 rounded-lg transition-colors"
            title="Ouvrir la forge de l'Arsenal dans une fenêtre dédiée"
          >
            <ExternalLink className="w-3 h-3 text-rose-400" /> Forger...
          </button>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Chercher un équipement dans l'Arsenal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-raised border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {SLOT_FILTER_OPTIONS.map(({ slot, label, icon: Icon, colorClass }) => {
            const count = slot === 'all'
              ? templates.length
              : templates.filter(t => t.slot === slot).length;
            const isActive = slotFilter === slot;

            return (
              <button
                key={slot}
                onClick={() => setSlotFilter(slot)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-[color,background-color,border-color,opacity,transform] whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-black/40 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : colorClass}`} />
                <span>{label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    isActive
                      ? 'bg-black/30 text-rose-100'
                      : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
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
          <div className="text-center py-6 text-zinc-500 text-xs ">
            Aucun équipement disponible. Ouvrez l'Arsenal pour en forger de nouveaux.
          </div>
        ) : (
          filtered.map(t => {
            const bonusEntries = Object.entries(t.statBonuses || {}) as [HexeStatKey, number][];
            return (
              <div
                key={t.id}
                className="bg-surface-raised/60 border border-white/10 hover:border-white/20 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <HexeItemImage
                    src={t.imageUrl}
                    alt={t.name}
                    fallbackSlot={t.slot}
                    className="w-8 h-8 rounded-lg shrink-0"
                    api={api}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">{t.name}</span>
                      <span className={`text-[11px] font-bold rounded-lg px-1.5 py-0.2 border flex items-center gap-1 ${
                        t.slot === 'consumable'
                          ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                          : t.slot === 'other'
                            ? 'bg-sky-950/50 border-sky-700/40 text-sky-300'
                            : 'bg-white/5 border-white/10 text-zinc-400'
                      }`}>
                        {t.slot === 'consumable' && <FlaskConical className="w-2.5 h-2.5" />}
                        {t.slot === 'other' && <Package className="w-2.5 h-2.5" />}
                        {SLOT_LABELS[t.slot]}
                      </span>
                      {t.weight !== undefined && t.weight > 0 && (
                        <span className="text-[11px] font-bold text-zinc-400 bg-white/5 border border-white/10 rounded-lg px-1.5 py-0.2 leading-none shrink-0">
                          {t.weight} kg
                        </span>
                      )}
                    </div>

                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {bonusEntries.map(([st, val]) => (
                      <span key={st} className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded-lg px-1.5 py-0.2 leading-tight">
                        {STAT_SHORT[st]} +{val}
                      </span>
                    ))}
                    {(t.properties || []).map(p => (
                      <span key={p} className="text-[11px] text-zinc-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.2">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

                <button
                  onClick={() => onSelect(t)}
                  className="px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shrink-0 transition-colors whitespace-nowrap"
                >
                  Prendre
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

