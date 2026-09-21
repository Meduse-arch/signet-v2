import React, { useState, useEffect } from 'react';
import { SignetAPI } from '../../../services/SignetAPI';

interface DiceAnimationOverlayProps {
  api: SignetAPI;
}

export function DiceAnimationOverlay({ api }: DiceAnimationOverlayProps) {
  const [activeRoll, setActiveRoll] = useState<{ id: number, total: number, label: string } | null>(null);

  useEffect(() => {
    const handlePlayAnimation = (payload: { total: number, label: string }) => {
      setActiveRoll({
        id: Date.now(),
        total: payload.total,
        label: payload.label
      });

      // Fin de l'animation automatique après 2.5 secondes
      setTimeout(() => {
        setActiveRoll(null);
      }, 2500);
    };

    api.on('LOCAL_DICE_ROLL_ANIMATION', handlePlayAnimation);
    return () => {
      api.off('LOCAL_DICE_ROLL_ANIMATION', handlePlayAnimation);
    };
  }, [api]);

  if (!activeRoll) return null;

  return (
    <div 
      className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-[8px] transition-all duration-500 cursor-pointer"
      onClick={() => setActiveRoll(null)}
    >
      <div className="flex flex-col items-center justify-center animate-slide-up">
        <span className="text-rose-300 font-semibold uppercase tracking-[0.2em] mb-4 text-xs drop-shadow-[0_0_8px_rgba(225,29,72,0.6)]">
          {activeRoll.label}
        </span>
        <div className="flex items-center justify-center w-28 h-28 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_0_50px_rgba(225,29,72,0.3)] animate-dice-roll text-white font-black">
          <span className={activeRoll.total >= 1000 ? 'text-4xl drop-shadow-lg' : 'text-5xl drop-shadow-lg'}>
            {activeRoll.total}
          </span>
        </div>
      </div>
    </div>
  );
}
