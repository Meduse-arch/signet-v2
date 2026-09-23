// === Types du Journal d'Activité (core-activity-log) ===

export type LogEntryType = 'dice' | 'item' | 'skill' | 'action' | 'system';

/**
 * Représente une entrée dans le journal d'activité.
 * Émise par n'importe quel module via api.emit('LOG_ENTRY', entry) ou api.log(entry).
 */
export interface LogEntry {
  id: string;
  type: LogEntryType;

  /** Nom lisible de l'acteur (ex: "Elara") */
  actor: string;

  /** ID unique de l'acteur — utilisé par le MJ pour filtrer */
  actorId: string;

  /** Résumé humain de l'action (ex: "a lancé Force (1d30) → 24") */
  summary: string;

  /** Données brutes optionnelles (résultat de dé, nom de l'item…) */
  details?: Record<string, unknown>;

  /** Nom du compte joueur (ex: "Brochette") qui a déclenché l'action */
  accountName: string;

  /** Identifiant du module qui a émis ce log */
  sourceModule: string;

  timestamp: number;

  /**
   * Contrôle de visibilité :
   * - 'self'  → seulement l'acteur
   * - 'gm'   → seulement le MJ
   * - 'all'  → tout le monde
   */
  visibility: 'self' | 'gm' | 'all';
}

/** Payload pour l'event LOG_ENTRY_INCOMING (relayé via P2P) */
export interface LogEntryNetworkPayload {
  entry: LogEntry;
}
