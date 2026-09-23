import React from 'react';
import { coreEventBus, EventBus } from './EventBus';
import type { WindowPosition } from './ModManager';
import type { LogEntry } from '../modules/activity-log/types';

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
      getName: () => {
        const val = getUsername();
        console.log(`[SignetAPI] getName called by ${modId}. Returned: "${val}"`);
        return val;
      },
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
      let results: number[] = [];
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

      if (isTauri) {
        // En mode Host (Tauri), on utilise le vrai backend Rust
        const { invoke } = await import('@tauri-apps/api/core');
        results = await invoke<number[]>('roll_dice', { dice: diceList });
      } else {
        // En mode WebRTC Client (Navigateur), on utilise un fallback mathématique local
        results = diceList.map(diceStr => {
          try {
            const str = diceStr.toLowerCase().replace(/\s/g, '');
            const match = str.match(/^(\d*)d(\d+)([-+]\d+)?$/);
            if (!match) return 0;
            
            const count = parseInt(match[1]) || 1;
            const faces = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[3]) : 0;
            
            let total = modifier;
            for (let i = 0; i < count; i++) {
              total += Math.floor(Math.random() * faces) + 1;
            }
            return total;
          } catch {
            return 0;
          }
        });
      }
      
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


  // === JOURNAL D'ACTIVITÉ ===

  /**
   * Enregistre une entrée dans le journal d'activité.
   * Raccourci pour : api.emit('LOG_ENTRY', { ... })
   *
   * @example
   * api.log({
   *   type: 'dice',
   *   actor: 'Elara',
   *   actorId: 'user-123',
   *   summary: 'a lancé Force (1d30) → 24',
   *   details: { formula: '1d30', result: 24 },
   *   visibility: 'all',
   * });
   */
  log(entry: Omit<LogEntry, 'id' | 'sourceModule' | 'timestamp'> & { accountName?: string }): void {
    const fullEntry: LogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      accountName: entry.accountName || this.user.getName(),
      sourceModule: this.modId,
      timestamp: Date.now(),
    };
    this.emit('LOG_ENTRY', fullEntry);
  }

  // NOTE: Dans le futur (Sprints suivants), nous ajouterons ici 
  // des fonctions comme :
  // - this.network.send(data)
  // - this.canvas.addToken(tokenData)
  // - this.chat.sendMessage(msg)
}
