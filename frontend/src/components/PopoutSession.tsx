import { useEffect, useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { requestDockIn } from '../core/services/popoutChannel';
import { usePopoutClient } from '../core/hooks/usePopoutClient';
import { loadGameSystems } from './game/loadGameSystems';
import { ModManager } from '../core/services/ModManager';
import { CoreChatModule } from '../core/modules/chat';
import { CoreNavigationModule } from '../core/modules/navigation';
import { CoreSystemWindowsModule } from '../core/modules/system-windows';

interface PopoutSessionProps {
  moduleId: string;
  /** Système de jeu actif (URL du popout) ; à défaut, celui annoncé par la fenêtre principale. */
  systemId: string | null;
  username: string;
}

export function PopoutSession({ moduleId, systemId: urlSystemId, username }: PopoutSessionProps) {
  // Relais local : pas de peer WebRTC, la fenêtre principale transmet les messages VTT.
  const syncedSystemId = usePopoutClient(username);
  const systemId = urlSystemId ?? syncedSystemId;

  const [error, setError] = useState<string | null>(null);

  const [modulesLoaded, setModulesLoaded] = useState(false);
  // Le système de jeu est chargé (ou n'a pas pu l'être) : la fenêtre demandée peut être cherchée
  const [systemLoaded, setSystemLoaded] = useState(false);

  useEffect(() => {
    // Initialiser les modules pour que la fenêtre puisse être récupérée
    ModManager.setContext(username, false);
    if (ModManager.isItemEnabled('mod-chat')) {
      ModManager.registerMod(CoreChatModule);
    }
    ModManager.registerMod(CoreNavigationModule);
    ModManager.registerMod(CoreSystemWindowsModule);

    setModulesLoaded(true);
  }, []);

  // Charge le module du système (Hexe/Flower) avant de chercher la fenêtre demandée.
  // Sans systemId connu (URL vide), on attend le `sync` de la fenêtre principale ;
  // loadGameSystems retombe sur les systèmes activés globalement si le système reste inconnu.
  useEffect(() => {
    if (!modulesLoaded) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      loadGameSystems(systemId, () => cancelled)
        .catch(err => console.error('[PopoutSession] Échec du chargement du système:', err))
        .finally(() => { if (!cancelled) setSystemLoaded(true); });
    }, systemId ? 0 : 500); // laisse au `sync` le temps d'arriver quand l'URL n'a pas de système
    return () => { cancelled = true; clearTimeout(timer); };
  }, [modulesLoaded, systemId]);

  const windowDef = ModManager.getWindows().find(w => w.windowId === moduleId);

  useEffect(() => {
    if (systemLoaded && !windowDef) {
      setError(`Fenêtre introuvable: ${moduleId}`);
    }
  }, [windowDef, moduleId, systemLoaded]);

  // Réintégrer : demande à la fenêtre principale de ré-afficher la fenêtre, puis ferme le popout.
  const handleDockIn = async () => {
    requestDockIn(moduleId);
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      window.close(); // popout navigateur (window.open)
    }
  };

  if (!modulesLoaded) {
    return null; // Wait for modules to register
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-void text-white flex items-center justify-center p-8 text-center">
        <p className="text-rose-500 font-bold">{error}</p>
      </div>
    );
  }

  if (!windowDef) return null;

  const WindowComponent = windowDef.component;

  // The popout is a fullscreen container for the module
  return (
    <div className="w-full h-screen bg-void text-white overflow-hidden flex flex-col">
      {/* En-tête : la barre native gère le déplacement, on ne garde que le titre et « Réintégrer » */}
      <div className="w-full h-8 bg-surface flex items-center justify-between px-4 shrink-0 border-b border-hairline">
        <span className="text-xs font-medium text-zinc-400">{windowDef.title}</span>
        <button
          onClick={handleDockIn}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
          title="Réintégrer dans l'app"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          Réintégrer dans l'app
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {WindowComponent}
      </div>
    </div>
  );
}
