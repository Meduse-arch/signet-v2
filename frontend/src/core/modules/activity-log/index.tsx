import React from 'react';
import type { SignetModule } from '../../services/ModManager';
import { SignetAPI } from '../../services/SignetAPI';
import { ScrollText } from 'lucide-react';
import { LogStore } from './LogStore';
import { ActivityLogWindow } from './ui/ActivityLogWindow';
import type { LogEntry, LogEntryNetworkPayload } from './types';

const MOD_ID = 'core-activity-log';

export const CoreActivityLogModule: SignetModule = {
  id: MOD_ID,
  name: 'Journal d\'Activité',
  version: '1.0.0',

  init: (api: SignetAPI) => {
    // 1. Enregistrement de l'action dans la toolbar/dock
    api.ui.registerAction(
      'activity-log-window',
      'Journal d\'Activité',
      <ScrollText className="w-5 h-5 text-indigo-400" />,
      'WINDOW_TOGGLE'
    );

    // 2. Enregistrement de la fenêtre
    api.ui.registerWindow(
      'activity-log-window',
      'Journal d\'Activité',
      <ActivityLogWindow api={api} />,
      {
        icon: <ScrollText className="w-5 h-5 text-indigo-400" />,
        transparent: true,
      }
    );

    // 3. Écoute des entrées directes (via api.log() qui émet LOG_ENTRY)
    api.on('LOG_ENTRY', (entry: LogEntry) => {
      // Stockage local
      LogStore.push(entry);

      // Diffusion sur le réseau pour les autres joueurs
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: MOD_ID,
        modEventType: 'LOG_ENTRY_INCOMING',
        payload: { entry }
      });
    });

    // 4. Écoute des entrées réseau (depuis les autres joueurs)
    api.on('NETWORK_INCOMING', (event: any) => {
      if (event.type === 'MOD_EVENT' && event.modEventType === 'LOG_ENTRY_INCOMING') {
        const payload = event.payload as LogEntryNetworkPayload;
        LogStore.push(payload.entry);
      }
    });

    console.log(`[ModManager] ${MOD_ID} initialisé.`);
  },
  
  cleanup: () => {
    LogStore.clear();
  }
};
