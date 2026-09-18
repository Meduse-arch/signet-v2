import React, { useState, useEffect } from 'react';
import { ModManager } from '../../core/services/ModManager';
import type { UIOverlay } from '../../core/services/ModManager';
import { coreEventBus } from '../../core/services/EventBus';

/**
 * Composant réceptacle (invisible) qui affiche dynamiquement 
 * toutes les interfaces graphiques (UI) enregistrées par les Modules.
 */
export function ModuleOverlays() {
  const [overlays, setOverlays] = useState<UIOverlay[]>([]);

  useEffect(() => {
    // Récupère la liste initiale au montage
    setOverlays(ModManager.getOverlays());

    // S'abonne aux mises à jour (quand un module s'enregistre plus tard)
    const handleUpdate = () => {
      setOverlays([...ModManager.getOverlays()]); // Destructuration pour forcer le re-rendu React
    };

    coreEventBus.on('SYSTEM_UI_UPDATED', handleUpdate);

    return () => {
      coreEventBus.off('SYSTEM_UI_UPDATED', handleUpdate);
    };
  }, []);

  if (overlays.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {overlays.map((overlay) => (
        <React.Fragment key={`${overlay.modId}:${overlay.overlayId}`}>
          {overlay.component}
        </React.Fragment>
      ))}
    </div>
  );
}
