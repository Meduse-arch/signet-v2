import React from 'react';
import { ExternalLink } from 'lucide-react';

interface PopoutButtonProps {
  windowId: string;
  title: string;
  size: { w: number, h: number };
  onPopout?: () => void;
}

export function PopoutButton({ windowId, title, size, onPopout }: PopoutButtonProps) {
  const handlePopout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("[PopoutButton] Clicked!");
    const roomId = sessionStorage.getItem('signet_room_id');
    if (!roomId) {
      alert("Impossible de déterminer la session actuelle.");
      return;
    }
    
    const popoutUrl = `/#/popout/${roomId}?module=${windowId}`;
    console.log("[PopoutButton] Target URL:", popoutUrl);
    
    // Fermer la fenêtre locale dans l'application principale
    if (onPopout) {
      onPopout();
    }
    
    const isTauri = (window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__;
    
    if (isTauri) {
      console.log("[PopoutButton] Environnement Tauri détecté.");
      import('@tauri-apps/api/webviewWindow')
        .then(({ WebviewWindow }) => {
          console.log("[PopoutButton] Création de la WebviewWindow...");
          const win = new WebviewWindow(`popout-${windowId}-${Date.now()}`, {
            url: popoutUrl,
            title: `${title} (Pop-out)`,
            width: 800,
            height: 600
          });
          
          win.once('tauri://created', () => {
            console.log("[PopoutButton] Fenêtre créée avec succès dans Tauri !");
          });
          
          win.once('tauri://error', (e) => {
            console.error("[PopoutButton] Échec de la création côté Rust:", e);
            alert("Échec Tauri: " + JSON.stringify(e));
            // Fallback
            window.open(popoutUrl, '_blank', `width=${size.w},height=${size.h}`);
          });
        })
        .catch(err => {
          console.error("[PopoutButton] Erreur Tauri:", err);
          alert("Erreur de chargement Tauri: " + err.message);
          window.open(popoutUrl, '_blank', `width=${size.w},height=${size.h}`);
        });
    } else {
      console.log("[PopoutButton] Environnement Web détecté.");
      const newWindow = window.open(popoutUrl, '_blank', `width=${size.w},height=${size.h}`);
      if (!newWindow) {
        alert("Le navigateur a bloqué l'ouverture de la nouvelle fenêtre ! Veuillez autoriser les pop-ups.");
      }
    }
  };

  return (
    <button 
      onClick={handlePopout}
      className="text-white/30 hover:text-white transition-colors p-1 no-drag cursor-pointer relative z-[100]"
      title="Ouvrir dans une nouvelle fenêtre (Pop-out)"
    >
      <ExternalLink className="w-4 h-4 pointer-events-none" />
    </button>
  );
}
