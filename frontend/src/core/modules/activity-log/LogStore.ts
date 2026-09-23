import { coreEventBus } from '../../services/EventBus';
import type { LogEntry } from './types';

const MAX_ENTRIES = 500;

/**
 * Store global réactif pour les entrées du journal d'activité.
 * Stocké en mémoire uniquement (perdu à chaque reconnexion — comportement voulu).
 *
 * On utilise un tableau simple + un système de listeners léger pour notifier
 * les composants React sans dépendre de Zustand ou Context lourd.
 */
class LogStoreService {
  private entries: LogEntry[] = [];
  private listeners: Set<() => void> = new Set();

  /**
   * Ajoute une entrée au journal.
   * Si le journal dépasse MAX_ENTRIES, la plus ancienne est supprimée.
   */
  public push(entry: LogEntry): void {
    this.entries = [...this.entries, entry];
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(this.entries.length - MAX_ENTRIES);
    }
    this.notify();
  }

  /**
   * Retourne toutes les entrées (immutables).
   */
  public getAll(): LogEntry[] {
    return this.entries;
  }

  /**
   * Vide le journal (ex: quand on quitte la partie).
   */
  public clear(): void {
    this.entries = [];
    this.notify();
  }

  /**
   * Abonne un composant aux changements du store.
   * Retourne une fonction de désabonnement.
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
    // On émet aussi un event sur le bus pour les composants qui préfèrent cette approche
    coreEventBus.emit('ACTIVITY_LOG_UPDATED');
  }
}

// Singleton global
export const LogStore = new LogStoreService();
