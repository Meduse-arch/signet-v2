import React from 'react';
import { SignetAPI } from '../../core/services/SignetAPI';
import { Users, Library } from 'lucide-react';
import { FlowerAppWindow } from './ui/FlowerAppWindow';
import { FlowerCompendiumWindow } from './ui/FlowerCompendiumWindow';
import { FlowerDiceOverlay } from './ui/FlowerDiceOverlay';

const MOD_ID = 'system-flower';

export const SystemFlowerModule = {
  id: MOD_ID,
  name: 'Système Flower',
  version: '1.0.0',
  description: 'Système de règles poétique basé sur des fleurs et des dés variables.',

  init: (api: SignetAPI) => {
    // 0. Enregistre l'overlay d'animation de dés
    api.ui.registerOverlay(
      'flower-dice-animation',
      <FlowerDiceOverlay api={api} />
    );

    // 1. Enregistre l'application (Conteneur principal)
    api.ui.registerAction(
      'flower-app',
      'Personnages',
      <Users className="w-5 h-5 text-pink-400" />,
      'WINDOW_TOGGLE'
    );

    // 2. Enregistre le Compendium (MJ)
    api.ui.registerAction(
      'flower-compendium',
      'Compendium',
      <Library className="w-5 h-5 text-fuchsia-400" />,
      'WINDOW_TOGGLE'
    );

    // 3. Enregistre la fenêtre du conteneur Personnages
    api.ui.registerWindow(
      'flower-app',
      'Personnages',
      <FlowerAppWindow api={api} />,
      {
        icon: <Users className="w-5 h-5 text-pink-400" />,
        transparent: true
      }
    );

    // 4. Enregistre la fenêtre du Compendium
    api.ui.registerWindow(
      'flower-compendium',
      'Compendium',
      <FlowerCompendiumWindow api={api} />,
      {
        icon: <Library className="w-5 h-5 text-fuchsia-400" />,
        transparent: true,
        width: 400,
        height: 600
      }
    );

    // 5. Écoute l'ouverture via les Pions (Tokens)
    api.on('TOKEN_DOUBLE_CLICKED', (tokenId: string) => {
      // Pour l'instant, tokenId correspond à l'id du personnage ou à son nom (à améliorer)
      (window as any)._currentEditCharId = tokenId;
      api.emit('SYSTEM_ACTION_TRIGGERED', 'flower-app');
    });

    // 5. Listener réseau général (toujours actif, même sans la fenêtre ouverte)
    api.on('NETWORK_INCOMING', async (msg: any) => {
      if (msg.type !== 'MOD_EVENT' || msg._sourceMod !== 'system-flower') return;
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

      // Répond aux demandes de personnages (même si la fenêtre n'est pas ouverte)
      if (msg.modEventType === 'REQUEST_CHARACTERS' && isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const records: any[] = await invoke('get_characters');
          const parsed = records.map((r: any) => {
            try { return JSON.parse(r.data); } catch { return r; }
          });
          api.emit('NETWORK_OUTGOING', {
            type: 'MOD_EVENT',
            _sourceMod: 'system-flower',
            modEventType: 'SYNC_CHARACTERS',
            payload: parsed
          });
        } catch(err) {
          console.error('[Flower] Erreur réponse REQUEST_CHARACTERS', err);
        }
      }

      // Sauvegarde automatique en arrière-plan (SYNC_CHARACTER entrant)
      if (msg.modEventType === 'SYNC_CHARACTER' && isTauri) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const char = msg.payload;
          await invoke('save_character', {
            id: char.id,
            name: char.name,
            ownerId: char.owner_id || null,
            data: JSON.stringify(char)
          });
        } catch(err) {
          console.error('[Flower] Erreur sauvegarde en arrière-plan', err);
        }
      }
    });

    console.log(`[ModManager] ${MOD_ID} initialisé.`);
  },

  destroy: () => {
    // Nettoyage
  }
};
