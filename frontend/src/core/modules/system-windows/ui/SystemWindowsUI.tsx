import React, { useState, useEffect } from 'react';
import { SettingsView } from '../../../../components/hub-views/SettingsView';
import { NotesView } from '../../../../components/hub-views/NotesView';
import { coreEventBus } from '../../../../core/services/EventBus';

type WindowType = 'settings' | 'notes' | null;

export function SystemWindowsUI() {
  const [activeWindow, setActiveWindow] = useState<WindowType>(null);

  // Informer le système de l'état actif (pour les boutons du Menu/Taskbar)
  useEffect(() => {
    coreEventBus.emit('SYSTEM_UI_ACTION_STATE_CHANGED', { actionId: 'system-settings', isActive: activeWindow === 'settings' });
    coreEventBus.emit('SYSTEM_UI_ACTION_STATE_CHANGED', { actionId: 'system-notes', isActive: activeWindow === 'notes' });
  }, [activeWindow]);

  useEffect(() => {
    const onOpenSettings = () => setActiveWindow('settings');
    const onOpenNotes = () => setActiveWindow('notes');
    const onReturnToHub = () => setActiveWindow(null); // Si on quitte le jeu, on ferme
    
    coreEventBus.on('SYSTEM_OPEN_SETTINGS', onOpenSettings);
    coreEventBus.on('SYSTEM_OPEN_NOTES', onOpenNotes);
    coreEventBus.on('SYSTEM_RETURN_TO_HUB', onReturnToHub);

    return () => {
      coreEventBus.off('SYSTEM_OPEN_SETTINGS', onOpenSettings);
      coreEventBus.off('SYSTEM_OPEN_NOTES', onOpenNotes);
      coreEventBus.off('SYSTEM_RETURN_TO_HUB', onReturnToHub);
    };
  }, []);

  if (!activeWindow) return null;

  const handleClose = () => setActiveWindow(null);

  return (
    <div className="absolute inset-0 z-[60] bg-[#050508] animate-fade-in pointer-events-auto overflow-y-auto flex flex-col p-6 lg:p-12">
      <div className="mb-4 shrink-0">
        <button 
          onClick={handleClose} 
          className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
        >
          Retour
        </button>
      </div>
      <div className="flex-1 w-full min-h-0">
        {activeWindow === 'settings' && <SettingsView />}
        {activeWindow === 'notes' && <NotesView />}
      </div>
    </div>
  );
}
