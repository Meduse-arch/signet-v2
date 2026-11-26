import { Minus, Plus } from 'lucide-react';

interface CompactResourceBarProps {
  label: string;
  current: number;
  max: number;
  color: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

/** Ligne de ressource : étiquette | jauge fine | valeur (chiffres alignés) | − +. */
export function CompactResourceBar({ label, current, max, color, onDecrement, onIncrement }: CompactResourceBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 h-11 px-4 min-w-0">
      <span className="w-16 shrink-0 text-[13px] text-zinc-400 truncate">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[.07] overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}>
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-14 shrink-0 text-right num text-[13px] text-white">
        {current}<span className="text-zinc-600"> / {max}</span>
      </span>
      <span className="flex shrink-0">
        <button
          type="button"
          onClick={onDecrement}
          className="w-6 h-6 grid place-items-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[.06] transition-colors"
          title="Diminuer"
          aria-label={`Diminuer ${label}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onIncrement}
          className="w-6 h-6 grid place-items-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[.06] transition-colors"
          title="Augmenter"
          aria-label={`Augmenter ${label}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </span>
    </div>
  );
}
