import React from 'react';
import { SignetAPI } from './SignetAPI';
import { coreEventBus } from './EventBus';

export interface SignetModule {
  id: string;
  name: string;
  version: string;
  /**
   * Fonction appelée quand le module est chargé.
   * C'est ici que le module s'abonne aux événements.
   */
  init: (api: SignetAPI) => void;
  /**
   * Fonction appelée quand le module est déchargé.
   */
  cleanup?: () => void;
}

export interface UIOverlay {
  modId: string;
  overlayId: string;
  component: React.ReactNode;
}

class ModManagerService {
  private activeMods: Map<string, SignetModule> = new Map();
  private apis: Map<string, SignetAPI> = new Map();
  private overlays: Map<string, UIOverlay> = new Map();
  private username: string = 'Anonyme';

  constructor() {
    // Écoute les demandes d'enregistrement d'UI venant des APIs des modules
    coreEventBus.on('SYSTEM_UI_REGISTER_OVERLAY', (data: UIOverlay) => {
      const key = `${data.modId}:${data.overlayId}`;
      this.overlays.set(key, data);
      console.log(`[ModManager] UI Overlay registered: ${key}`);
      // On prévient le système React qu'il y a de nouveaux composants à dessiner
      coreEventBus.emit('SYSTEM_UI_UPDATED');
    });
  }

  /**
   * Définit le contexte global du VTT (comme le nom de l'utilisateur)
   */
  public setContext(username: string): void {
    this.username = username;
  }

  /**
   * Récupère tous les composants d'interface graphique enregistrés par les modules
   */
  public getOverlays(): UIOverlay[] {
    return Array.from(this.overlays.values());
  }

  /**
   * Enregistre et initialise un nouveau module
   */
  public registerMod(mod: SignetModule): void {
    if (this.activeMods.has(mod.id)) {
      console.warn(`[ModManager] Module ${mod.id} is already registered.`);
      return;
    }

    try {
      console.log(`[ModManager] Initializing module: ${mod.name} (${mod.id}) v${mod.version}`);
      
      // On crée une API dédiée (sandboxée) pour ce module
      const api = new SignetAPI(mod.id, () => this.username);
      
      // On exécute la logique d'initialisation du module
      mod.init(api);

      this.activeMods.set(mod.id, mod);
      this.apis.set(mod.id, api);
      
      console.log(`[ModManager] Module ${mod.id} loaded successfully.`);
    } catch (err) {
      console.error(`[ModManager] Failed to initialize module ${mod.id}:`, err);
    }
  }

  /**
   * Décharge un module et nettoie la mémoire
   */
  public unloadMod(modId: string): void {
    const mod = this.activeMods.get(modId);
    if (mod) {
      if (mod.cleanup) {
        try {
          mod.cleanup();
        } catch(err) {
          console.error(`[ModManager] Error during cleanup of module ${modId}:`, err);
        }
      }
      this.activeMods.delete(modId);
      this.apis.delete(modId);
      console.log(`[ModManager] Module ${modId} unloaded.`);
    }
  }

  /**
   * Renvoie la liste de tous les modules actuellement actifs
   */
  public getActiveMods(): SignetModule[] {
    return Array.from(this.activeMods.values());
  }
}

// Instance globale par défaut (Singleton)
export const ModManager = new ModManagerService();
