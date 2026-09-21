import React, { useState, useEffect } from 'react';
import { SignetAPI } from '../../../services/SignetAPI';
import { Dices, Play } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

interface DiceWindowProps {
  api: SignetAPI;
}

export function DiceWindow({ api }: DiceWindowProps) {
  const [customCount, setCustomCount] = useState<string>('1');
  const [customMax, setCustomMax] = useState<string>('100');
  const [lastResult, setLastResult] = useState<{ dice: string[], results: number[] } | null>(null);

  // Écoute des résultats de dés
  useEffect(() => {
    const handleDiceComplete = (payload: { dice: string[], results: number[], _sourceMod?: string }) => {
      // On n'affiche le toast local que si c'est notre module qui a lancé (ou si on veut voir tous les lancers)
      if (payload._sourceMod === 'core-dice-roller') {
        setLastResult(payload);
        
        // Efface le toast après 5 secondes
        setTimeout(() => {
          setLastResult(null);
        }, 5000);
      }
    };

    api.on('DICE_ANIMATION_COMPLETE', handleDiceComplete);
    return () => {
      api.off('DICE_ANIMATION_COMPLETE', handleDiceComplete);
    };
  }, [api]);

  const rollDice = async (diceString: string) => {
    // 1. Demande le lancer à Rust
    const results = await api.requestRoll([diceString]);
    
    // 2. Si on a un résultat, on déclenche l'animation visuelle LOCALE
    if (results && results.length > 0) {
      const total = results.reduce((a, b) => a + b, 0);
      api.emit('LOCAL_DICE_ROLL_ANIMATION', { total, label: `Lancé de ${diceString}` });
    }
  };

  const handleCustomRoll = (e: React.FormEvent) => {
    e.preventDefault();
    const max = parseInt(customMax);
    const count = parseInt(customCount) || 1;
    if (!isNaN(max) && max > 0 && count > 0) {
      rollDice(`${count}d${max}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 text-white p-4 gap-6 pointer-events-auto">
      
      {/* Dés Classiques */}
      <div>
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Dices className="w-4 h-4" /> Classiques
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].map(d => (
            <button
              key={d}
              onClick={() => rollDice(d)}
              className="bg-white/5 hover:bg-rose-600/20 border border-white/10 hover:border-rose-500/50 rounded-md py-3 text-center transition-all group"
            >
              <span className="font-bold text-zinc-300 group-hover:text-rose-400">{d.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      <hr className="border-white/10" />

      {/* Dé Personnalisé */}
      <div>
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">
          Personnalisé
        </h3>
        <form onSubmit={handleCustomRoll} className="flex gap-2">
          <div className="w-16 shrink-0">
            <input 
              type="number" 
              min="1"
              max="100"
              value={customCount}
              onChange={(e) => setCustomCount(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-md px-2 py-2 text-white text-center focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-white/30">d</span>
            <input 
              type="number" 
              min="2"
              value={customMax}
              onChange={(e) => setCustomMax(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-md pl-8 pr-3 py-2 text-white focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>
          <Button type="submit" variant="glass" className="px-4">
            <Play className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Résultat (Toast local) */}
      {lastResult && (
        <div className="mt-auto animate-slide-up bg-[#050508]/90 border border-rose-500/30 rounded-xl p-4 text-center shadow-[0_0_30px_rgba(225,29,72,0.15)] relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 to-rose-400" />
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest block mb-2">
            Lancé de {lastResult.dice.join(', ')}
          </span>
          <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {lastResult.results.reduce((a, b) => a + b, 0)}
          </span>
          {lastResult.results.length > 1 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
              {lastResult.results.map((r, i) => (
                <span key={i} className="text-xs font-bold bg-white/5 border border-white/10 px-2 py-1 rounded text-zinc-300">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
