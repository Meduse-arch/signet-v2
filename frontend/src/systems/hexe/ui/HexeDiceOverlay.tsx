import { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';

interface HexeDiceOverlayProps {
  api: SignetAPI;
}

export function HexeDiceOverlay({ api }: HexeDiceOverlayProps) {
  const [activeRoll, setActiveRoll] = useState<{ id: number, total: number, label: string } | null>(null);

  useEffect(() => {
    const handleOutgoing = (message: any) => {
      if (message.type === 'MOD_EVENT' && message.modEventType === 'HEXE_ROLL_ANIMATION' && message.payload) {
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
      className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/80 backdrop-blur-[4px] transition-all duration-500 cursor-pointer"
      onClick={() => setActiveRoll(null)}
    >
      <div className="flex flex-col items-center justify-center animate-slide-up relative">
        <span className="text-red-500 font-bold uppercase tracking-[0.3em] mb-8 text-sm drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] z-10 font-serif">
          {activeRoll.label}
        </span>
        
        <div className="relative flex items-center justify-center w-64 h-64">
          <svg className="absolute inset-0 w-full h-full text-red-600/80" viewBox="0 0 100 100" fill="none">
             <polygon 
               points="50,5 76.5,86.4 7.3,36 92.7,36 23.5,86.4" 
               stroke="currentColor" 
               strokeWidth="1.5" 
               className="animate-[dash_1.5s_ease-out_forwards]"
               strokeDasharray="500"
               strokeDashoffset="500"
             />
             <circle 
                cx="50" 
                cy="50" 
                r="48" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                className="animate-[dash_1s_ease-out_forwards]" 
                strokeDasharray="320" 
                strokeDashoffset="320" 
                fill="rgba(220,38,38,0.05)" 
             />
          </svg>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dash {
              to {
                stroke-dashoffset: 0;
              }
            }
          `}} />

          <div className="z-10 flex items-center justify-center bg-[#2a1714]/80 backdrop-blur-md rounded-full w-24 h-24 border border-red-600/80 shadow-[0_0_40px_rgba(220,38,38,0.6)] animate-bounce-in">
            <span className="text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.9)] text-[#ebd5b3] font-black font-serif">
              {activeRoll.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
