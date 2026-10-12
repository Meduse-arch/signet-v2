import { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';
import { HexeCharacterManagerWindow } from './HexeCharacterManagerWindow';
import { HexeCharacterSheetWindow } from './HexeCharacterSheetWindow';

interface HexeAppWindowProps {
  api: SignetAPI;
}

export function HexeAppWindow({ api }: HexeAppWindowProps) {
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);

  // Écoute pour ouvrir directement une fiche depuis le plateau (clic sur un pion)
  useEffect(() => {
    const charIdToEdit = (window as any)._currentEditCharId;
    if (charIdToEdit) {
      setActiveCharacterId(charIdToEdit);
    }

    const handleForceOpen = (id: string) => setActiveCharacterId(id);
    api.on('HEXE_FORCE_OPEN_SHEET', handleForceOpen);

    return () => {
      api.off('HEXE_FORCE_OPEN_SHEET', handleForceOpen);
    };
  }, [api]);

  return (
    <div className="w-full h-full">
      {activeCharacterId ? (
        <HexeCharacterSheetWindow 
          api={api} 
          characterId={activeCharacterId} 
          onBack={() => {
            setActiveCharacterId(null);
            (window as any)._currentEditCharId = null; // Reset
          }} 
        />
      ) : (
        <HexeCharacterManagerWindow 
          api={api} 
          onOpenSheet={(id) => {
            setActiveCharacterId(id);
            (window as any)._currentEditCharId = id;
          }} 
        />
      )}
    </div>
  );
}
