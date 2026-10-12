import { SignetAPI } from '../../core/services/SignetAPI';
import { Skull, Shield, BookOpen } from 'lucide-react';
import { HexeAppWindow } from './ui/HexeAppWindow';
import { HexeArsenalWindow } from './ui/HexeArsenalWindow';
import { HexeGrimoireWindow } from './ui/HexeGrimoireWindow';
import { HexeDiceOverlay } from './ui/HexeDiceOverlay';

const MOD_ID = 'system-hexe';

export const SystemHexeModule = {
  id: MOD_ID,
  name: 'Système Hexe',
  version: '1.0.0',
  description: 'Module pour le système de jeu Hexe.',

  init: (api: SignetAPI) => {
    // 0. Enregistre l'overlay d'animation de dés
    api.ui.registerOverlay(
      'hexe-dice-animation',
      <HexeDiceOverlay api={api} />
    );

    // 1. Enregistre le bouton Personnages dans la barre latérale / menu
    api.ui.registerAction(
      'hexe-app',
      'Hexe',
      <Skull className="w-5 h-5 text-red-500" />,
      'WINDOW_TOGGLE'
    );

    // 2. Enregistre l'Arsenal (Forge d'équipements, armes & armures)
    api.ui.registerAction(
      'hexe-arsenal',
      'Arsenal',
      <Shield className="w-5 h-5 text-rose-500" />,
      'WINDOW_TOGGLE'
    );

    // 3. Enregistre le Grimoire (Forge & catalogue des compétences, sorts & dons)
    api.ui.registerAction(
      'hexe-grimoire',
      'Grimoire',
      <BookOpen className="w-5 h-5 text-purple-400" />,
      'WINDOW_TOGGLE'
    );

    // 4. Enregistre la fenêtre associée aux Personnages
    api.ui.registerWindow(
      'hexe-app',
      'Personnages Hexe',
      <HexeAppWindow api={api} />,
      {
        icon: <Skull className="w-5 h-5 text-red-500" />,
        defaultWidth: 480,
        defaultHeight: 640
      }
    );

    // 5. Enregistre la fenêtre de l'Arsenal
    api.ui.registerWindow(
      'hexe-arsenal',
      'Arsenal Hexe',
      <HexeArsenalWindow api={api} />,
      {
        icon: <Shield className="w-5 h-5 text-rose-500" />,
        defaultWidth: 520,
        defaultHeight: 640
      }
    );

    // 6. Enregistre la fenêtre du Grimoire
    api.ui.registerWindow(
      'hexe-grimoire',
      'Grimoire Hexe',
      <HexeGrimoireWindow api={api} />,
      {
        icon: <BookOpen className="w-5 h-5 text-purple-400" />,
        defaultWidth: 540,
        defaultHeight: 660
      }
    );

    // 3. Écoute l'ouverture via les Pions (Tokens)
    api.on('TOKEN_DOUBLE_CLICKED', (tokenId: string) => {
      (window as any)._currentEditCharId = tokenId;
      api.emit('SYSTEM_ACTION_TRIGGERED', 'hexe-app');
    });

    // 4. Listener réseau général (toujours actif, même sans la fenêtre ouverte)
    api.on('NETWORK_INCOMING', async (msg: any) => {
      if (msg.type !== 'MOD_EVENT' || msg._sourceMod !== 'system-hexe') return;
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
            _sourceMod: 'system-hexe',
            modEventType: 'SYNC_CHARACTERS',
            payload: parsed
          });
        } catch(err) {
          console.error('[Hexe] Erreur réponse REQUEST_CHARACTERS', err);
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
          console.error('[Hexe] Erreur sauvegarde en arrière-plan', err);
        }
      }
    });

    console.log(`[ModManager] ${MOD_ID} initialisé.`);
  },

  destroy: () => {
    // Nettoyage lors du changement de module
    console.log(`[ModManager] ${MOD_ID} détruit.`);
  }
};
