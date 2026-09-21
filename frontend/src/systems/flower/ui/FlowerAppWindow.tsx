import React, { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';
import { CharacterManagerWindow } from './CharacterManagerWindow';
import { CharacterSheetWindow } from './CharacterSheetWindow';

interface FlowerAppWindowProps {
  api: SignetAPI;
}

export function FlowerAppWindow({ api }: FlowerAppWindowProps) {
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);

  // Écoute pour ouvrir directement une fiche depuis le plateau (clic sur un pion)
  useEffect(() => {
    // Dans index.tsx, on définira window._currentEditCharId = tokenId et on émettra "SYSTEM_ACTION_TRIGGERED" 
    // qui montera cette fenêtre. Si _currentEditCharId est défini, on switch dessus.
    const charIdToEdit = (window as any)._currentEditCharId;
    if (charIdToEdit) {
      setActiveCharacterId(charIdToEdit);
    }

    // Custom event pour la communication interne de Flower si besoin
    const handleForceOpen = (id: string) => setActiveCharacterId(id);
    api.on('FLOWER_FORCE_OPEN_SHEET', handleForceOpen);

    return () => {
      api.off('FLOWER_FORCE_OPEN_SHEET', handleForceOpen);
    };
  }, [api]);

  return (
    <div className="w-full h-full">
      {activeCharacterId ? (
        <CharacterSheetWindow 
          api={api} 
          characterId={activeCharacterId} 
          onBack={() => {
            setActiveCharacterId(null);
            (window as any)._currentEditCharId = null; // Reset
          }} 
        />
      ) : (
        <CharacterManagerWindow 
          api={api} 
          onOpenSheet={(id) => {
            setActiveCharacterId(id);
            (window as any)._currentEditCharId = id; // Pour la compatibilité avec la logique actuelle
          }} 
        />
      )}
    </div>
  );
}
