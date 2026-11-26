import { Flower2, Plus, Minus } from 'lucide-react';
import { normalizeStatKey } from '../../types';
import { isTauri } from '../../hooks/useFlowerCharacter';

interface FlowerRatingProps {
  statKey: string;
  value: number;
  isHost: boolean;
  onChange: (statKey: string, value: number) => void;
}

interface MasteryStarsProps {
  id: string;
  level?: number;
  type: 'skill' | 'item';
  isHost: boolean;
  onSetLevel: (id: string, type: 'skill' | 'item', level: number) => void;
}

export function hasMasteryScaling(obj: { modifiers?: { scaleStat?: string }[] }): boolean {
  if (!obj.modifiers) return false;
  for (const mod of obj.modifiers) {
    if (mod.scaleStat) {
      const scale = normalizeStatKey(mod.scaleStat);
      if (scale === 'niveau' || scale === 'maitrise') return true;
    }
  }
  return false;
}

export function FlowerRating({ statKey, value, isHost, onChange }: FlowerRatingProps) {
  const renderCore = () => {
    // Si la valeur est strictement supérieure à 5, on affiche une fleur + le multiplicateur
    if (value > 5) {
      return (
        <div className="flex items-center justify-center min-w-[120px] gap-2">
          <Flower2 className="w-5 h-5 text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]" />
          <span className="text-pink-300 font-bold text-sm">x {value}</span>
        </div>
      );
    }

    // Sinon, on affiche exactement 5 fleurs
    const flowers = [];
    for (let i = 1; i <= 5; i++) {
      flowers.push(
        <button 
          key={i} 
          disabled={!isHost}
          onClick={() => onChange(statKey, i)}
          className={`transition-all focus:outline-none ${!isHost ? 'cursor-default' : 'hover:scale-125'} ${i <= value ? 'text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]' : 'text-zinc-600'}`}
        >
          <Flower2 className="w-5 h-5" />
        </button>
      );
    }
    return <div className="flex gap-1 min-w-[120px] justify-center">{flowers}</div>;
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => onChange(statKey, Math.max(0, value - 1))}
        disabled={!isHost}
        className={`w-6 h-6 flex items-center justify-center bg-black/40 rounded transition-colors border border-white/5 shrink-0 ${!isHost ? 'text-zinc-700 opacity-30 cursor-not-allowed' : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30'}`}
      >
        <Minus className="w-3 h-3" />
      </button>
      
      {renderCore()}

      <button 
        onClick={() => onChange(statKey, value + 1)}
        disabled={!isHost}
        className={`w-6 h-6 flex items-center justify-center bg-black/40 rounded transition-colors border border-white/5 shrink-0 ${!isHost ? 'text-zinc-700 opacity-30 cursor-not-allowed' : 'text-zinc-400 hover:text-pink-400 hover:bg-pink-950/30'}`}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

export function MasteryStars({ id, level = 0, type, isHost, onSetLevel }: MasteryStarsProps) {
  const setLevel = (newLevel: number) => {
    const clamped = Math.max(0, Math.min(5, newLevel));
    onSetLevel(id, type, clamped);
  };

  return (
    <div className="flex items-center gap-1">
      {isTauri() && isHost && (
        <button 
          onClick={() => setLevel(level - 1)}
          className="w-5 h-5 flex items-center justify-center bg-black/40 text-zinc-500 rounded hover:text-fuchsia-400 hover:bg-fuchsia-950/30 transition-colors border border-white/5"
          title="Diminuer la maîtrise"
        >
          <Minus className="w-3 h-3" />
        </button>
      )}
      <div className="flex -space-x-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setLevel(s)}
            disabled={!isHost}
            className={`transition-colors ${s <= level ? 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]' : 'text-zinc-700 hover:text-zinc-500'} ${!isHost ? 'cursor-default' : ''}`}
            title={isTauri() && isHost ? "Changer le niveau (Maîtrise)" : "Niveau de maîtrise"}
          >
            <Flower2 className={`w-4 h-4 ${s <= level ? 'fill-current' : ''}`} />
          </button>
        ))}
      </div>
      {isTauri() && isHost && (
        <button 
          onClick={() => setLevel(level + 1)}
          className="w-5 h-5 flex items-center justify-center bg-black/40 text-zinc-500 rounded hover:text-fuchsia-400 hover:bg-fuchsia-950/30 transition-colors border border-white/5"
          title="Augmenter la maîtrise"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
