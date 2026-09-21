import type { SignetModule } from '../../services/ModManager';
import { SignetAPI } from '../../services/SignetAPI';
import { Dices } from 'lucide-react';
import React from 'react';

/**
 * Module "Chat Roll"
 * Écoute les commandes du chat (ex: /roll 2d20) et renvoie un message formaté avec le résultat.
 */
export const CoreChatRollModule: SignetModule = {
  id: 'core-chat-roll',
  name: 'Lancés de dés via Chat',
  version: '1.0.0',

  init: (api: SignetAPI) => {
    console.log('[ChatRollModule] Initializing...');

    // On ajoute un bouton dans la Navigation pour rendre le module visible
    // Clic dessus = ouvre le chat
    api.ui.registerAction(
      'action-chat-roll',
      'Dés Chat',
      <Dices className="w-5 h-5 text-rose-400" />,
      'ACTION_CHAT_ROLL_CLICK'
    );

    api.on('ACTION_CHAT_ROLL_CLICK', () => {
      // Simule un clic sur l'action du chat pour l'ouvrir
      api.events.emit('WINDOW_TOGGLE', 'toggle-chat');
    });

    api.on('CHAT_COMMAND', async (payload: any) => {
      const cmd = payload.command;
      if (!cmd || typeof cmd !== 'string') return;
      
      const lowerCmd = cmd.toLowerCase().trim();
      
      // On vérifie si la commande est /roll ou /r
      if (lowerCmd.startsWith('/roll ') || lowerCmd.startsWith('/r ')) {
        // Extraction de la formule (ex: "2d20")
        const formula = lowerCmd.replace(/^\/r(oll)?\s+/, '').trim();
        
        if (!formula) return;

        // On demande au moteur aléatoire de résoudre la formule
        const results = await api.requestRoll([formula]);

        if (results && results.length > 0) {
          const total = results.reduce((a, b) => a + b, 0);

          // Formatage du message spécial
          const payload = {
            author: api.user.getName(),
            text: `a lancé ${formula} : ${total}`,
            timestamp: Date.now(),
            type: 'roll'
          };

          // Affichage local
          api.emit('CHAT_NEW_MESSAGE', payload);

          // Diffusion réseau
          api.emit('NETWORK_OUTGOING', {
            type: 'MOD_EVENT',
            modEventType: 'CHAT_MESSAGE',
            payload: payload
          });
        }
      }
    });
  }
};
