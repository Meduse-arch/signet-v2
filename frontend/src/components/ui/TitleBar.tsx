import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTauri, setIsTauri] = useState(true);
  
  useEffect(() => {
    const setup = async () => {
      try {
        const win = getCurrentWindow();
        setIsMaximized(await win.isMaximized());
        setIsFullscreen(await win.isFullscreen());
        
        const unlisten = await win.onResized(async () => {
          setIsMaximized(await win.isMaximized());
          setIsFullscreen(await win.isFullscreen());
        });
        
        // Gérer le plein écran avec F11
        const handleKeyDown = async (e: KeyboardEvent) => {
          if (e.key === 'F11') {
            e.preventDefault();
            const currentFull = await win.isFullscreen();
            await win.setFullscreen(!currentFull);
            setIsFullscreen(!currentFull);
          }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => { 
          unlisten();
          window.removeEventListener('keydown', handleKeyDown);
        };
      } catch (e) {
        // Pas dans Tauri (navigateur)
        setIsTauri(false);
      }
    };
    setup();
  }, []);

  const handleMinimize = async () => {
    try { await getCurrentWindow().minimize(); } catch (e) { console.warn(e); }
  };
  const handleToggleMaximize = async () => {
    try { await getCurrentWindow().toggleMaximize(); } catch (e) { console.warn(e); }
  };
  const handleClose = async () => {
    try { await getCurrentWindow().close(); } catch (e) { console.warn(e); }
  };

  // Ne pas afficher la barre si on est sur navigateur ou en plein écran
  if (!isTauri || isFullscreen) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-8 z-[99999] flex items-center justify-between bg-transparent select-none text-white/50 transition-colors duration-200 hover:bg-black/40">
      {/* Zone de DRAG — seule cette zone permet de déplacer la fenêtre */}
      <div className="flex-1 flex items-center gap-2 pl-3 h-full" data-tauri-drag-region>
        <img src="/logo.svg" alt="Logo" className="w-3.5 h-3.5 opacity-70 pointer-events-none" />
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/60 pointer-events-none">Signet VTT</span>
      </div>

      {/* Boutons — PAS de data-tauri-drag-region ici, les clics doivent fonctionner */}
      <div className="flex h-full relative z-10">
        <button 
          className="h-full w-[46px] flex items-center justify-center bg-transparent text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white" 
          onClick={handleMinimize} 
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Réduire"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button 
          className="h-full w-[46px] flex items-center justify-center bg-transparent text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white" 
          onClick={handleToggleMaximize}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Agrandir"
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button 
          className="h-full w-[46px] flex items-center justify-center bg-transparent text-white/50 transition-colors duration-150 hover:bg-[#e81123] hover:text-white" 
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
