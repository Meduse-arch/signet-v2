import React from 'react';
import { SignetAPI } from '../../core/services/SignetAPI';
import { Users } from 'lucide-react';
import { FlowerAppWindow } from './ui/FlowerAppWindow';

const MOD_ID = 'system-flower';

export const SystemFlowerModule = {
  id: MOD_ID,
  name: 'Système Flower',
  version: '1.0.0',
  description: 'Système de règles poétique basé sur des fleurs et des dés variables.',

  init: (api: SignetAPI) => {
    // 1. Enregistre l'application (Conteneur principal)
    api.ui.registerAction(
      'flower-app',
      'Personnages',
      <Users className="w-5 h-5 text-pink-400" />,
      'WINDOW_TOGGLE'
    );

    // 2. Enregistre la fenêtre du conteneur
    api.ui.registerWindow(
      'flower-app',
      'Personnages',
      <FlowerAppWindow api={api} />,
      {
        icon: <Users className="w-5 h-5 text-pink-400" />,
        transparent: true
      }
    );

    // 3. Écoute l'ouverture via les Pions (Tokens)
    api.on('TOKEN_DOUBLE_CLICKED', (tokenId: string) => {
      // Pour l'instant, tokenId correspond à l'id du personnage ou à son nom (à améliorer)
      (window as any)._currentEditCharId = tokenId;
      api.emit('SYSTEM_ACTION_TRIGGERED', 'flower-app');
    });

    console.log(`[ModManager] ${MOD_ID} initialisé.`);
  },

  destroy: () => {
    // Nettoyage
  }
};
