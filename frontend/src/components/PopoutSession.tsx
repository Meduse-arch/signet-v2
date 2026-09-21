import React, { useEffect, useState } from 'react';
import { useVTTNetwork } from '../core/hooks/useVTTNetwork';
import { ModManager } from '../core/services/ModManager';
import { Loader2 } from 'lucide-react';
import { CoreChatModule } from '../core/modules/chat';
import { CoreNavigationModule } from '../core/modules/navigation';
import { CoreSystemWindowsModule } from '../core/modules/system-windows';

interface PopoutSessionProps {
  roomId: string;
  moduleId: string;
  signalUrl: string;
}

export function PopoutSession({ roomId, moduleId, signalUrl }: PopoutSessionProps) {
  const {
    connectionState,
    messages,
    joinGame,
    sendMessage: rawSendMessage,
  } = useVTTNetwork(signalUrl);

  const [error, setError] = useState<string | null>(null);

  const [modulesLoaded, setModulesLoaded] = useState(false);

  // Auto-connect as a "client" (even if the user is the Host in the main window,
  // the popout acts as a lightweight client connecting to the room)
  useEffect(() => {
    const timer = setTimeout(() => {
      joinGame(roomId);
    }, 100);
    return () => clearTimeout(timer);
  }, [roomId, joinGame]);

  useEffect(() => {
    // Initialiser les modules pour que la fenêtre puisse être récupérée
    ModManager.setContext('Popout');
    if (ModManager.isItemEnabled('mod-chat')) {
      ModManager.registerMod(CoreChatModule);
    }
    ModManager.registerMod(CoreNavigationModule);
    ModManager.registerMod(CoreSystemWindowsModule);
    
    setModulesLoaded(true);
  }, []);

  const windowDef = ModManager.getWindows().find(w => w.windowId === moduleId);

  useEffect(() => {
    if (modulesLoaded && !windowDef) {
      setError(`Fenêtre introuvable: ${moduleId}`);
    }
  }, [windowDef, moduleId, modulesLoaded]);

  if (!modulesLoaded) {
    return null; // Wait for modules to register
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-[#050508] text-white flex items-center justify-center p-8 text-center">
        <p className="text-rose-500 font-bold">{error}</p>
      </div>
    );
  }

  if (!windowDef) return null;

  const WindowComponent = windowDef.component;

  // The popout is a fullscreen container for the module
  return (
    <div className="w-full h-screen bg-[#050508] text-white overflow-hidden flex flex-col">
      {/* Title bar for desktop drag region */}
      <div data-tauri-drag-region className="w-full h-8 bg-black/40 flex items-center px-4 shrink-0 border-b border-white/5">
         <span className="text-xs font-bold text-white/50 tracking-widest uppercase">{windowDef.title} (Pop-out)</span>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {WindowComponent}
      </div>
    </div>
  );
}
