import React, { useState, useEffect } from 'react';
import { Settings, Users, BookOpen } from 'lucide-react';
import { ModManager, type SignetModule, type RegisteredAction } from '../../services/ModManager';
import { SignetAPI } from '../../services/SignetAPI';
import { Taskbar } from './ui/Taskbar';
import { MenuOverlay } from './ui/MenuOverlay';
import { coreEventBus } from '../../services/EventBus';

function NavigationWrapper() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actions, setActions] = useState<RegisteredAction[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [activeActionIds, setActiveActionIds] = useState<string[]>([]);

  useEffect(() => {
    // Charger les pins sauvegardés
    const saved = localStorage.getItem('signet_pinned_actions');
    if (saved) {
      try {
        setPinnedIds(JSON.parse(saved));
      } catch(e) {}
    }

    // Charger les actions déjà enregistrées (si le composant a monté APRÈS l'enregistrement)
    setActions(ModManager.getActions());

    const handleRegister = (action: RegisteredAction) => {
      setActions(prev => {
        if (prev.find(a => a.actionId === action.actionId)) return prev;
        return [...prev, action];
      });
    };

    const handleStateChange = (data: { actionId: string, isActive: boolean }) => {
      setActiveActionIds(prev => {
        if (data.isActive && !prev.includes(data.actionId)) {
          return [...prev, data.actionId];
        }
        if (!data.isActive && prev.includes(data.actionId)) {
          return prev.filter(id => id !== data.actionId);
        }
        return prev;
      });
    };

    coreEventBus.on('SYSTEM_UI_REGISTER_ACTION', handleRegister);
    coreEventBus.on('SYSTEM_UI_ACTION_STATE_CHANGED', handleStateChange);
    return () => {
      coreEventBus.off('SYSTEM_UI_REGISTER_ACTION', handleRegister);
      coreEventBus.off('SYSTEM_UI_ACTION_STATE_CHANGED', handleStateChange);
    };
  }, []);

  const togglePin = (actionId: string) => {
    setPinnedIds(prev => {
      const next = prev.includes(actionId) 
        ? prev.filter(id => id !== actionId)
        : [...prev, actionId];
      localStorage.setItem('signet_pinned_actions', JSON.stringify(next));
      return next;
    });
  };

  const handleReturnToHub = () => {
    coreEventBus.emit('SYSTEM_RETURN_TO_HUB');
  };

  const pinnedActions = actions.filter(a => pinnedIds.includes(a.actionId));

  return (
    <>
      <Taskbar 
        onOpenMenu={() => setIsMenuOpen(true)} 
        pinnedActions={pinnedActions}
      />
      <MenuOverlay 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onReturnToHub={handleReturnToHub}
        actions={actions}
        pinnedIds={pinnedIds}
        activeIds={activeActionIds}
        onTogglePin={togglePin}
      />
    </>
  );
}

export const CoreNavigationModule: SignetModule = {
  id: 'core-navigation',
  name: 'Navigation Principale',
  version: '1.0.0',

  init: (api: SignetAPI) => {
    console.log('[NavigationModule] Initializing...');
    
    // On enregistre l'ensemble de la navigation comme un overlay global
    api.ui.registerOverlay('nav-wrapper', <NavigationWrapper />);
  }
};
