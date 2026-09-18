import React, { useEffect, useState } from 'react';
import { useVTTNetwork } from '../core/hooks/useVTTNetwork';
import { ModManager } from '../core/services/ModManager';
import { Loader2 } from 'lucide-react';

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

  // Auto-connect as a "client" (even if the user is the Host in the main window,
  // the popout acts as a lightweight client connecting to the room)
  useEffect(() => {
    const timer = setTimeout(() => {
      joinGame(roomId);
    }, 100);
    return () => clearTimeout(timer);
  }, [roomId, joinGame]);

  const moduleDef = ModManager.getEnabledModules().find(m => m.id === moduleId);

  useEffect(() => {
    if (!moduleDef) {
      setError(`Module introuvable ou désactivé: ${moduleId}`);
    }
  }, [moduleDef, moduleId]);

  if (error) {
    return (
      <div className="w-full h-screen bg-[#050508] text-white flex items-center justify-center p-8 text-center">
        <p className="text-rose-500 font-bold">{error}</p>
      </div>
    );
  }

  if (connectionState !== 'connected') {
    return (
      <div className="w-full h-screen bg-[#050508] text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        <p className="text-zinc-400 font-medium animate-pulse">Connexion à la partie en cours...</p>
      </div>
    );
  }

  if (!moduleDef) return null;

  const ModuleComponent = moduleDef.component;

  // The popout is a fullscreen container for the module
  return (
    <div className="w-full h-screen bg-[#050508] text-white overflow-hidden flex flex-col">
      {/* Title bar for desktop drag region */}
      <div data-tauri-drag-region className="w-full h-8 bg-black/40 flex items-center px-4 shrink-0 border-b border-white/5">
         <span className="text-xs font-bold text-white/50 tracking-widest uppercase">{moduleDef.name} (Pop-out)</span>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <ModuleComponent 
          messages={messages}
          sendMessage={rawSendMessage}
        />
      </div>
    </div>
  );
}
