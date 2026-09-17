import { useEffect, useRef } from 'react';

export interface SplashTransitionProps {
  /** Appelé quand l'animation est terminée (à toi de démonter le composant) */
  onDone?: () => void;
  /** Chemin vers le logo, défaut "/logo.svg" */
  logoSrc?: string;
  /** Si true, aucun son n'est joué */
  muted?: boolean;
}

/**
 * Splash animé façon Netflix avec identité sonore "Ta-dum".
 * La géométrie de la coupure suit exactement les sommets de l'hexagone.
 */
export function SplashTransition({
  onDone,
  logoSrc = '/logo.svg',
  muted = false,
}: SplashTransitionProps) {
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    // Durée totale de l'animation
    const TOTAL_DURATION_MS = 1550;

    if (!muted && !hasPlayedRef.current) {
      hasPlayedRef.current = true;
      playSplashSound();
    }

    const timer = window.setTimeout(() => {
      onDone?.();
    }, TOTAL_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [muted, onDone]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050508] pointer-events-none">
      
      {/* Ligne de fracture (angle 150deg = perpendiculaire à 60deg) */}
      <div 
        className="absolute inset-0 opacity-0 animate-crack-flash [animation-delay:0.55s]"
        style={{ background: 'linear-gradient(150deg, transparent 49.6%, rgba(225,29,72,0.9) 49.9%, rgba(225,29,72,0.9) 50.1%, transparent 50.4%)' }}
      />
      
      {/* Logo entier (fade-in pop puis disparaît au moment du split) */}
      <div className="absolute inset-0 flex items-center justify-center animate-hide-logo [animation-delay:0.55s]">
        <img src={logoSrc} alt="" className="w-[min(38vw,340px)] h-[min(38vw,340px)] block opacity-0 animate-logo-pop" />
      </div>

      {/* Moitié A (Haut-Gauche) */}
      <div 
        className="absolute inset-0 flex items-center justify-center will-change-transform animate-split-a [animation-delay:0.55s]"
        style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 21.14%, 0% 78.86%)' }}
      >
        <img src={logoSrc} alt="" className="w-[min(38vw,340px)] h-[min(38vw,340px)] block" />
      </div>

      {/* Moitié B (Bas-Droite) */}
      <div 
        className="absolute inset-0 flex items-center justify-center will-change-transform animate-split-b [animation-delay:0.55s]"
        style={{ clipPath: 'polygon(100% 100%, 0% 100%, 0% 78.86%, 100% 21.14%)' }}
      >
        <img src={logoSrc} alt="" className="w-[min(38vw,340px)] h-[min(38vw,340px)] block" />
      </div>

    </div>
  );
}

// ---------- Moteur audio (Généré par synthèse) ----------

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

/** 
 * Un battement "intérieur" très lent, sourd et résonnant (comme dans sa propre tête)
 */
function playDeepThump(ctx: AudioContext, time: number, intensity: number = 1.0) {
  // L'onde sub-bass extrêmement grave
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(45, time); // Encore plus grave
  osc.frequency.exponentialRampToValueAtTime(15, time + 0.4); // Descente très lente
  
  // Enveloppe de volume plus ronde, moins sèche
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(2.0 * intensity, time + 0.08); // Attaque douce mais forte
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8); // Résonance longue
  
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 1.0);

  // Bruit sourd très grave (sensation de pression sanguine dans les oreilles)
  const bufferSize = ctx.sampleRate * 0.2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(80, time); // Filtre très bas, presque étouffé

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.001, time);
  nGain.gain.exponentialRampToValueAtTime(1.0 * intensity, time + 0.05);
  nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

  noise.connect(lp).connect(nGain).connect(ctx.destination);
  noise.start(time);
  noise.stop(time + 0.5);
}

function playSplashSound(): void {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    
    const now = ctx.currentTime;
    
    // Le "Ba" (Très lent, lourd et calme) au démarrage
    playDeepThump(ctx, now, 1.2);
    
    // Le "Bum" (Enorme pression qui résonne) exactement à la déchirure
    playDeepThump(ctx, now + 0.55, 3.0);
    
  } catch {
    // Audio indisponible
  }
}
