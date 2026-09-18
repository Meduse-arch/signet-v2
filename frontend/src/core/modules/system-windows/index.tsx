import React from 'react';
import { Settings, Users, BookOpen } from 'lucide-react';
import type { SignetModule } from '../../services/ModManager';
import { SignetAPI } from '../../services/SignetAPI';
import { SystemWindowsUI } from './ui/SystemWindowsUI';

export const CoreSystemWindowsModule: SignetModule = {
  id: 'core-system-windows',
  name: 'Outils Système',
  version: '1.0.0',

  init: (api: SignetAPI) => {
    console.log('[SystemWindowsModule] Initializing...');
    
    // 1. On enregistre l'interface qui affichera les vues plein écran (z-index élevé)
    api.ui.registerOverlay('system-windows-layer', <SystemWindowsUI />);

    // 2. On enregistre les actions dans le Menu Principal
    api.ui.registerAction('system-notes', 'Notes Globales', <BookOpen className="w-5 h-5" />, 'SYSTEM_OPEN_NOTES');
    api.ui.registerAction('system-settings', 'Paramètres', <Settings className="w-5 h-5" />, 'SYSTEM_OPEN_SETTINGS');
  }
};
