import React from 'react';
import { Settings, Users, BookOpen } from 'lucide-react';
import type { SignetModule } from '../../services/ModManager';
import { SignetAPI } from '../../services/SignetAPI';
import { NotesView } from '../../../components/hub-views/NotesView';
import { SettingsView } from '../../../components/hub-views/SettingsView';
import { coreEventBus } from '../../services/EventBus';

function FullscreenWindowWrapper({ windowId, children }: { windowId: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full bg-[#050508]/50 pointer-events-auto p-4">
      {children}
    </div>
  );
}

export const CoreSystemWindowsModule: SignetModule = {
  id: 'core-system-windows',
  name: 'Outils Système',
  version: '1.0.0',

  init: (api: SignetAPI) => {
    console.log('[SystemWindowsModule] Initializing...');
    
    // On enregistre les deux fenêtres séparément
    api.ui.registerWindow('system-notes', 'Notes Globales', (
      <FullscreenWindowWrapper windowId="system-notes">
        <NotesView />
      </FullscreenWindowWrapper>
    ), { defaultPosition: 'fullscreen' });

    api.ui.registerWindow('system-settings', 'Paramètres', (
      <FullscreenWindowWrapper windowId="system-settings">
        <SettingsView />
      </FullscreenWindowWrapper>
    ), { defaultPosition: 'fullscreen' });

    // On enregistre les actions dans le Menu Principal
    api.ui.registerAction('system-notes', 'Notes Globales', <BookOpen className="w-5 h-5" />, 'WINDOW_TOGGLE');
    api.ui.registerAction('system-settings', 'Paramètres', <Settings className="w-5 h-5" />, 'WINDOW_TOGGLE');
  }
};
