import React from 'react';
import { Shield, User, Loader2 } from 'lucide-react';
import { Carousel } from '../ui/Carousel';

interface PlayerCarouselProps {
  players: string[];
  isHost: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export function PlayerCarousel({ players, isHost, connectionState }: PlayerCarouselProps) {
  return (
    <div className="w-full max-w-5xl overflow-hidden mb-12">
      <Carousel className="gap-6 pb-6 px-4" style={{ scrollSnapType: 'x mandatory' }}>
        {players.map((p, idx) => (
          <div 
            key={idx} 
            className={`shrink-0 w-40 h-56 rounded-sm border ${idx === 0 ? 'border-rose-500/50 bg-rose-950/20 shadow-[0_0_30px_rgba(225,29,72,0.15)]' : 'border-white/10 bg-black/40'} backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group animate-fade-in`} 
            style={{ animationDelay: `${idx * 0.1}s`, scrollSnapAlign: 'start' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className={`w-16 h-16 rounded-sm flex items-center justify-center border ${idx === 0 ? 'border-rose-500/50 bg-rose-900/50 text-rose-300' : 'border-white/10 bg-white/5 text-white/50'}`}>
                {idx === 0 ? <Shield className="w-8 h-8" /> : <User className="w-8 h-8" />}
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg leading-tight truncate w-32">{p}</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                  {idx === 0 ? 'Maître du Jeu' : 'Joueur'}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Ghost slots (toujours afficher au moins 1 slot vide pour inviter) */}
        {Array.from({ length: Math.max(1, 5 - players.length) }).map((_, i) => (
          <div 
            key={`ghost-${i}`} 
            className="shrink-0 w-40 h-56 rounded-sm border border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center text-white/20" 
            style={{ scrollSnapAlign: 'start' }}
          >
            {connectionState === 'connecting' && i === 0 && !isHost ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <span className="text-sm font-medium uppercase tracking-wider">Vide</span>
            )}
          </div>
        ))}
      </Carousel>
    </div>
  );
}
