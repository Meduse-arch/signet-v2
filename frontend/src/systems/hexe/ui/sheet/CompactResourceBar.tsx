
interface CompactResourceBarProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number;
  color: string;
  trackColor: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function CompactResourceBar({ icon, label, current, max, color, trackColor, onDecrement, onIncrement }: CompactResourceBarProps) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="bg-[#090a10] border border-white/10 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between gap-1.5 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0" style={{ color }}>
          {icon}
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider truncate">{label}</span>
        </div>
        <div className="text-xs font-black text-white shrink-0">
          {current}<span className="text-[10px] font-medium text-slate-400">/{max}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
        <div
          className="h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(225,29,72,0.4)]"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Contrôles - / + */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          {Math.round(pct)}%
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onDecrement}
            className="w-6 h-5 rounded bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-300 hover:text-white transition-colors"
            title="Diminuer"
          >
            -
          </button>
          <button
            onClick={onIncrement}
            className="w-6 h-5 rounded bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-300 hover:text-white transition-colors"
            title="Augmenter"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal d'Édition d'Équipement ─────────────────────────────────────────────

