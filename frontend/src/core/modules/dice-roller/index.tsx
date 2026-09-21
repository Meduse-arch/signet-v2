import React from 'react';
import { SignetAPI } from '../../services/SignetAPI';
import { Dices } from 'lucide-react';
import { DiceWindow } from './ui/DiceWindow';
import { DiceAnimationOverlay } from './ui/DiceAnimationOverlay';

const MOD_ID = 'core-dice-roller';

export const CoreDiceModule = {
  id: MOD_ID,
  name: 'Dé Classique',
  version: '1.0.0',
  description: 'Moteur de dés classique avec animation 3D/CSS.',

  init: (api: SignetAPI) => {
    api.ui.registerAction(
      'dice-window',
      'Dé Classique',
      <Dices className="w-5 h-5" />,
      'WINDOW_TOGGLE'
    );

    // 1. Enregistre l'application dans le Dock
    api.ui.registerWindow(
      'dice-window',
      'Dé Classique',
      <DiceWindow api={api} />,
      {
        icon: <Dices className="w-5 h-5 text-rose-400" />,
        transparent: true
      }
    );

    // 2. Enregistre son propre overlay d'animation
    api.ui.registerOverlay(
      'dice-animation',
      <DiceAnimationOverlay api={api} />
    );

    console.log(`[ModManager] ${MOD_ID} initialisé.`);
  },

  destroy: () => {
    // Nettoyage si on décharge le module un jour
  }
};
