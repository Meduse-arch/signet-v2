import React, { useState, useEffect } from 'react';

interface FlowerDiceOverlayProps {
  api: any;
}

export function FlowerDiceOverlay({ api }: FlowerDiceOverlayProps) {
  const [activeRoll, setActiveRoll] = useState<{ id: number, total: number, label: string } | null>(null);

  useEffect(() => {
    const handleIncoming = (message: any) => {
      if (message.type === 'FLOWER_ROLL_ANIMATION' && message.payload) {
        setActiveRoll({
          id: Date.now(),
          total: message.payload.total,
          label: message.payload.label
        });

        setTimeout(() => {
          setActiveRoll(null);
        }, 3500);
      }
    };

    api.on('NETWORK_INCOMING', handleIncoming);
    return () => {
      api.off('NETWORK_INCOMING', handleIncoming);
    };
  }, [api]);

  useEffect(() => {
    const handleOutgoing = (message: any) => {
      if (message.type === 'FLOWER_ROLL_ANIMATION' && message.payload) {
        setActiveRoll({
          id: Date.now(),
          total: message.payload.total,
          label: message.payload.label
        });

        setTimeout(() => {
          setActiveRoll(null);
        }, 3500);
      }
    };

    api.on('NETWORK_OUTGOING', handleOutgoing);
    return () => {
      api.off('NETWORK_OUTGOING', handleOutgoing);
    };
  }, [api]);

  if (!activeRoll) return null;

  return (
    <div 
      className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/60 backdrop-blur-[4px] transition-all duration-500 cursor-pointer"
      onClick={() => setActiveRoll(null)}
    >
      <div className="flex flex-col items-center justify-center animate-slide-up relative">
        <span className="text-rose-300 font-bold uppercase tracking-[0.3em] mb-8 text-sm drop-shadow-[0_0_10px_rgba(225,29,72,0.7)] z-10">
          {activeRoll.label}
        </span>
        
        <div className="relative flex items-center justify-center w-64 h-64">
          {/* SVG Rosace qui se dessine */}
          <svg className="absolute inset-0 w-full h-full text-pink-500/80 animate-[spin_10s_linear_infinite]" viewBox="0 0 200 200" fill="none">
             {/* Rosace */}
             <path 
               d="M100 10 C 130 50, 190 50, 190 100 C 190 150, 130 150, 100 190 C 70 150, 10 150, 10 100 C 10 50, 70 50, 100 10 Z" 
               stroke="currentColor" 
               strokeWidth="2" 
               className="animate-[dash_1.5s_ease-out_forwards]"
               strokeDasharray="600"
               strokeDashoffset="600"
             />
             <path 
               d="M10 100 C 50 70, 50 10, 100 10 C 150 10, 150 70, 190 100 C 150 130, 150 190, 100 190 C 50 190, 50 130, 10 100 Z" 
               stroke="currentColor" 
               strokeWidth="2" 
               className="animate-[dash_1.8s_ease-out_forwards]"
               strokeDasharray="600"
               strokeDashoffset="600"
               opacity="0.6"
             />
             <circle 
                cx="100" 
                cy="100" 
                r="45" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="animate-[dash_1s_ease-out_forwards]" 
                strokeDasharray="300" 
                strokeDashoffset="300" 
                fill="rgba(244,114,182,0.1)" 
             />
          </svg>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dash {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}} />

          {/* Résultat du dé */}
          <div className="z-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full w-24 h-24 border border-rose-500/50 shadow-[0_0_30px_rgba(225,29,72,0.4)] animate-bounce-in">
            <span className={activeRoll.total >= 1000 ? 'text-4xl drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] text-white font-black' : 'text-5xl drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] text-white font-black'}>
              {activeRoll.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
