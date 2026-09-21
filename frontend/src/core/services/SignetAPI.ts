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
  private readonly modId: string;

  constructor(modId: string, getUsername: () => string) {
    this.modId = modId;
    this.events = coreEventBus; // Pour l'instant on partage le même bus global

    this.user = {
      getName: getUsername,
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

  // NOTE: Dans le futur (Sprints suivants), nous ajouterons ici 
  // des fonctions comme :
  // - this.network.send(data)
  // - this.canvas.addToken(tokenData)
  // - this.chat.sendMessage(msg)
}
