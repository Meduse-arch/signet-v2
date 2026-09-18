type EventCallback = (payload?: any) => void;

export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * S'abonne à un événement spécifique
   */
  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Se désabonne d'un événement
   */
  off(event: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Diffuse un événement avec des données optionnelles
   */
  emit(event: string, payload?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // Nous copions le Set pour éviter les problèmes si un listener se désinscrit pendant l'exécution
      const listenersCopy = Array.from(eventListeners);
      listenersCopy.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`[EventBus] Error in listener for event "${event}":`, error);
        }
      });
    }
  }

  /**
   * Supprime tous les listeners (utile pour le nettoyage quand on change de session)
   */
  clearAll(): void {
    this.listeners.clear();
  }
}

// Instance globale par défaut (Core Event Bus)
export const coreEventBus = new EventBus();
