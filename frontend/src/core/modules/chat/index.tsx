import React from 'react';
import { MessageSquare } from 'lucide-react';
import type { SignetModule } from '../../services/ModManager';
import { SignetAPI } from '../../services/SignetAPI';
import { ChatUI } from './ui/ChatUI';

/**
 * Le module officiel de Chat.
 * C'est la "logique" (l'autoradio) qui gère l'UI et le réseau.
 */
export const CoreChatModule: SignetModule = {
  id: 'core-chat',
  name: 'Chat Universel',
  version: '1.0.0',

  init: (api: SignetAPI) => {
    console.log('[ChatModule] Initializing...');

    // 1. On injecte l'interface graphique du chat dans le système
    api.ui.registerWindow('toggle-chat', 'Chat Universel', <ChatUI />, { defaultPosition: 'right' });

    // 1b. On enregistre notre action dans le Menu Principal / Barre des tâches
    api.ui.registerAction(
      'toggle-chat',
      'Chat Universel',
      <MessageSquare className="w-5 h-5" />,
      'WINDOW_TOGGLE'
    );

    // 2. On écoute l'UI (quand l'utilisateur clique sur "Envoyer" dans ChatUI)
    api.on('CHAT_UI_SEND', (text: string) => {
      // Formatage du message
      const payload = {
        author: api.user.getName(),
        text: text,
        timestamp: Date.now()
      };

      // On affiche le message localement (retour visuel immédiat)
      api.emit('CHAT_NEW_MESSAGE', payload);

      // On demande au système d'envoyer le message aux autres joueurs via WebRTC/LAN
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        modEventType: 'CHAT_MESSAGE',
        payload: payload
      });
    });

    // 3. On écoute le réseau (quand le GameBoard reçoit un paquet d'un autre joueur)
    api.on('NETWORK_INCOMING', (networkData: any) => {
      // On vérifie que c'est un MOD_EVENT et qu'il concerne le chat
      if (networkData.type === 'MOD_EVENT' && networkData.modEventType === 'CHAT_MESSAGE') {
        // Un autre joueur a parlé, on l'affiche dans notre ChatUI
        api.emit('CHAT_NEW_MESSAGE', networkData.payload);
      }
    });
  },

  cleanup: () => {
    console.log('[ChatModule] Cleaning up...');
    // Plus tard : api.ui.unregisterOverlay('chat-window')
  }
};
