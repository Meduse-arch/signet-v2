import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  
  useEffect(() => {
    const setup = async () => {
      try {
        const win = getCurrentWindow();
        setIsMaximized(await win.isMaximized());
        const unlisten = await win.onResized(async () => {
          setIsMaximized(await win.isMaximized());
        });
        return () => { unlisten(); };
      } catch (e) {
        // Pas dans Tauri (navigateur)
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

  return (
    <div className="titlebar">
      {/* Zone de DRAG — seule cette zone permet de déplacer la fenêtre */}
      <div className="titlebar-drag" data-tauri-drag-region>
        <img src="/logo.svg" alt="Logo" className="titlebar-logo-img" />
        <span className="titlebar-logo-text">Signet VTT</span>
      </div>

      {/* Boutons — PAS de data-tauri-drag-region ici, les clics doivent fonctionner */}
      <div className="titlebar-buttons">
        <button 
          className="titlebar-btn" 
          onClick={handleMinimize} 
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Réduire"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button 
          className="titlebar-btn" 
          onClick={handleToggleMaximize}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Agrandir"
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button 
          className="titlebar-btn titlebar-btn-close" 
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
