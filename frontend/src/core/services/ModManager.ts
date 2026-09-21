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

export type WindowPosition = 'left' | 'right' | 'top' | 'bottom' | 'floating' | 'fullscreen';

export interface RegisteredWindow {
  modId: string;
  windowId: string;
  title: string;
  icon?: React.ReactNode;
  component: React.ReactNode;
  defaultPosition: WindowPosition;
  transparent?: boolean;
  hideHeader?: boolean;
  startSlim?: boolean;
  collapseMode?: 'slim' | 'hide';
}

export interface RegisteredAction {
  modId: string;
  actionId: string;
  label: string;
  icon: React.ReactNode;
  onClickEvent: string;
}

export interface GameSystem {
  id: string;
  name: string;
  description: string;
}

export type StoreCategory = 'system-signet' | 'mod-signet' | 'system-community' | 'mod-community';

export interface StoreItem {
  id: string;
  name: string;
  author: string;
  description: string;
  category: StoreCategory;
}

class ModManagerService {
  private activeMods: Map<string, SignetModule> = new Map();
  private apis: Map<string, SignetAPI> = new Map();
  private overlays: Map<string, UIOverlay> = new Map();
  private windows: Map<string, RegisteredWindow> = new Map();
  private actions: Map<string, RegisteredAction> = new Map();
  private username: string = 'Anonyme';
  private isHost: boolean = false;

  private storeItems: StoreItem[] = [
    { id: 'system-seal', name: 'SEAL', author: 'Signet Team', description: 'Tactical modern combat', category: 'system-signet' },
    { id: 'system-stars', name: 'Flower', author: 'Signet Team', description: 'Sci-fi RPG', category: 'system-signet' },
    { id: 'mod-chat', name: 'Chat Universel', author: 'Signet Team', description: 'Module de chat officiel pour toutes les parties.', category: 'mod-signet' },
    { id: 'mod-nav', name: 'Navigation Principale', author: 'Signet Team', description: 'La barre des tâches et le Menu de base.', category: 'mod-signet' },
    { id: 'core-system-windows', name: 'Outils Système', author: 'Signet Team', description: 'Fenêtres système (Paramètres, Notes Globales).', category: 'mod-signet' },
    { id: 'core-toolbar', name: 'Barre d\'outils VTT', author: 'Signet Team', description: 'Outils du plateau virtuel (Caméra, Sélection, Grille).', category: 'mod-signet' }
  ];

  constructor() {
    // Écoute les demandes d'enregistrement d'UI venant des APIs des modules
    coreEventBus.on('SYSTEM_UI_REGISTER_OVERLAY', (data: UIOverlay) => {
      const key = `${data.modId}:${data.overlayId}`;
      this.overlays.set(key, data);
      console.log(`[ModManager] UI Overlay registered: ${key}`);
      // On prévient le système React qu'il y a de nouveaux composants à dessiner
      coreEventBus.emit('SYSTEM_UI_UPDATED');
    });

    coreEventBus.on('SYSTEM_UI_REGISTER_WINDOW', (data: RegisteredWindow) => {
      const key = `${data.modId}:${data.windowId}`;
      this.windows.set(key, data);
      console.log(`[ModManager] Window registered: ${key}`);
      coreEventBus.emit('SYSTEM_UI_UPDATED');
    });

    coreEventBus.on('SYSTEM_UI_REGISTER_ACTION', (data: RegisteredAction) => {
      this.actions.set(data.actionId, data);
      console.log(`[ModManager] Action registered: ${data.actionId}`);
    });
  }

  /**
   * Définit le contexte global du VTT (comme le nom de l'utilisateur)
   */
  public setContext(username: string, isHost: boolean = false): void {
    this.username = username;
    this.isHost = isHost;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  /**
   * Récupère tous les composants d'interface graphique enregistrés par les modules
   */
  public getOverlays(): UIOverlay[] {
    return Array.from(this.overlays.values());
  }

  /**
   * Récupère toutes les fenêtres (Managed Windows)
   */
  public getWindows(): RegisteredWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Récupère toutes les actions enregistrées (pour le Menu Principal / Taskbar)
   */
  public getActions(): RegisteredAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Gestionnaire du Store
   */
  public getAllStoreItems(): StoreItem[] {
    return this.storeItems;
  }

  public isItemEnabled(id: string): boolean {
    const saved = localStorage.getItem(`signet_store_${id}`);
    if (saved !== null) {
      return saved === 'true';
    }
    // Activé par défaut pour les systèmes et mods Signet officiels
    const item = this.storeItems.find(i => i.id === id);
    return item ? item.category.includes('signet') : false;
  }

  public toggleItemEnabled(id: string): void {
    const currentState = this.isItemEnabled(id);
    localStorage.setItem(`signet_store_${id}`, (!currentState).toString());
  }

  /**
   * Renvoie la liste des systèmes de jeu ACTIVÉS.
   */
  public getEnabledSystems(): GameSystem[] {
    return this.storeItems
      .filter(item => item.category.startsWith('system') && this.isItemEnabled(item.id))
      .map(item => ({
        id: item.id.replace('system-', ''),
        name: item.name,
        description: item.description
      }));
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
