import React from 'react';
import { Wrench } from 'lucide-react';
import { SignetAPI } from '../../services/SignetAPI';
import type { SignetModule } from '../../services/ModManager';
import { ToolbarUI } from './ui/ToolbarUI';

export const CoreToolbarModule: SignetModule = {
  id: 'core-toolbar',
  name: 'Barre d\'outils VTT',
  version: '1.0.0',

  init: (api: SignetAPI) => {
    console.log('[ToolbarModule] Initializing...');

    // Enregistre l'action pour ouvrir/fermer la barre d'outils
    api.ui.registerAction(
      'window-toolbar',
      'Outils VTT',
      <Wrench className="w-5 h-5" />,
      'WINDOW_TOGGLE'
    );

    // Enregistre la fenêtre de la barre d'outils
    api.ui.registerWindow(
      'window-toolbar',
      'Outils VTT',
      <ToolbarUI />,
      {
        icon: <Wrench className="w-5 h-5" />,
        defaultPosition: 'left',
        startSlim: true,
        collapseMode: 'slim'
      }
    );
  }
};
