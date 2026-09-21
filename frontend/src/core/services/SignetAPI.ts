import React from 'react';
import { coreEventBus, EventBus } from './EventBus';
import type { WindowPosition } from './ModManager';

/**
 * L'API Signet officielle fournie à chaque Module.
 * Elle agit comme une façade (Sandbox) pour empêcher les modules 
 * d'accéder directement au code sensible du moteur VTT.
 */
export class SignetAPI {
  public readonly events: EventBus;
  public readonly ui: {
    registerOverlay: (overlayId: string, component: React.ReactNode) => void;
    registerWindow: (windowId: string, title: string, component: React.ReactNode, options?: { defaultPosition?: WindowPosition, icon?: React.ReactNode, transparent?: boolean, hideHeader?: boolean, startSlim?: boolean, collapseMode?: 'slim' | 'hide' }) => void;
    registerAction: (actionId: string, label: string, icon: React.ReactNode, onClickEvent: string) => void;
    setActionState: (actionId: string, isActive: boolean) => void;
  };
  public readonly user: {
    getName: () => string;
  };
  public readonly library: {
    uploadAsset: (file: File) => Promise<string | null>;
    getAssetUrl: (hash: string) => string;
  };
  private readonly modId: string;

  constructor(modId: string, getUsername: () => string) {
    this.modId = modId;
    this.events = coreEventBus; // Pour l'instant on partage le même bus global

    this.user = {
      getName: getUsername,
    };

    this.library = {
      uploadAsset: async (file: File) => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const buffer = await file.arrayBuffer();
          // Convert to Array to send to Rust Vec<u8>
          const data = Array.from(new Uint8Array(buffer));
          const extension = file.name.split('.').pop() || 'png';
          
          const hashFileName = await invoke<string>('upload_asset', { data, extension });
          return hashFileName;
        } catch (e) {
          console.error("Erreur lors de l'upload de l'asset:", e);
          return null;
        }
      },
      getAssetUrl: (hashFileName: string) => {
        // En mode web (fallback), on renverra juste le hash comme URL (cassé mais ne plante pas)
        // En mode Tauri, on utilise le protocole custom
        if (window.__TAURI_INTERNALS__) {
          // Tauri convertit automatiquement les custom protocols si configuré, 
          // mais avec un register_uri_scheme_protocol natif, `asset://localhost` n'est plus nécessaire.
          // Tauri v2 supporte http://signet.localhost/ ou directement le nom de scheme.
          // Note: Sous Windows, les webviews requièrent http://<scheme>.localhost/
          return `http://signet.localhost/library/${hashFileName}`;
        }
        return hashFileName;
      }
    };

    this.ui = {
      registerOverlay: (overlayId: string, component: React.ReactNode) => {
        // On passe par l'EventBus pour enregistrer l'UI sans créer de dépendance circulaire avec ModManager
        this.events.emit('SYSTEM_UI_REGISTER_OVERLAY', {
          modId: this.modId,
          overlayId,
          component
        });
      },
      registerWindow: (windowId: string, title: string, component: React.ReactNode, options?: { defaultPosition?: WindowPosition, icon?: React.ReactNode, transparent?: boolean, hideHeader?: boolean, startSlim?: boolean, collapseMode?: 'slim' | 'hide' }) => {
        this.events.emit('SYSTEM_UI_REGISTER_WINDOW', {
          modId: this.modId,
          windowId,
          title,
          component,
          defaultPosition: options?.defaultPosition || 'floating',
          icon: options?.icon,
          transparent: options?.transparent,
          hideHeader: options?.hideHeader,
          startSlim: options?.startSlim,
          collapseMode: options?.collapseMode
        });
      },
      registerAction: (actionId: string, label: string, icon: React.ReactNode, onClickEvent: string) => {
        this.events.emit('SYSTEM_UI_REGISTER_ACTION', {
          modId: this.modId,
          actionId,
          label,
          icon,
          onClickEvent
        });
      },
      setActionState: (actionId: string, isActive: boolean) => {
        this.events.emit('SYSTEM_UI_ACTION_STATE_CHANGED', { actionId, isActive });
      }
    };
  }

  /**
   * Émet un événement sur le réseau local ou l'application.
   * Nous ajoutons automatiquement l'ID du module source pour la traçabilité.
   */
  emit(event: string, payload: any = {}): void {
    const dataWithSource = {
      ...payload,
      _sourceMod: this.modId,
    };
    this.events.emit(event, dataWithSource);
  }

  /**
   * S'abonne à un événement du VTT.
   */
  on(event: string, callback: (payload: any) => void): void {
    this.events.on(event, callback);
  }

  /**
   * Se désabonne d'un événement du VTT.
   */
  off(event: string, callback: (payload: any) => void): void {
    this.events.off(event, callback);
  }

  // === NOUVEAU: MOTEUR DE DÉS ===

  /**
   * Demande au Backend (Rust) de générer un lancer de dés sécurisé.
   * Le résultat est récupéré et un événement DICE_ROLLED_RAW est émis.
   */
  async requestRoll(diceList: string[]): Promise<number[]> {
    try {
      // Pour éviter les soucis lors des imports dans des contextes non-Tauri,
      // on importe invoke dynamiquement ou on l'utilise si disponible.
      const { invoke } = await import('@tauri-apps/api/core');
      const results = await invoke<number[]>('roll_dice', { dice: diceList });
      
      this.emit('DICE_ROLLED_RAW', { dice: diceList, results });
      return results;
    } catch (e) {
      console.error("Erreur lors du lancer de dés", e);
      return [];
    }
  }

  /**
   * Déclenche l'animation standard de dés en 3D/CSS sur l'écran.
   * L'animation émettra 'DICE_ANIMATION_COMPLETE' une fois terminée.
   */
  playStandardDiceAnimation(diceList: string[], results: number[]): void {
    this.emit('SYSTEM_UI_PLAY_DICE_ANIMATION', { dice: diceList, results });
  }

  // NOTE: Dans le futur (Sprints suivants), nous ajouterons ici 
  // des fonctions comme :
  // - this.network.send(data)
  // - this.canvas.addToken(tokenData)
  // - this.chat.sendMessage(msg)
}
