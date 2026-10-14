/**
 * hexeEquipmentStore.ts
 *
 * Store partagé pour les templates d'équipements Hexe.
 * Persisté en localStorage (avec synchronisation d'événements pour rafraîchissement temps réel).
 *
 * Distinction importante :
 * - Template : objet créé dans l'Arsenal, sans isEquipped (modèle réutilisable).
 * - Instance  : copie d'un template ajoutée à un personnage, avec son propre id et isEquipped.
 */

import type { HexeEquipment } from './types';

const STORAGE_KEY = 'hexe_arsenal_templates';
const EVENT_NAME = 'hexe_arsenal_updated';

/** Un template est un HexeEquipment sans l'état isEquipped (toujours false dans le store). */
export type HexeEquipmentTemplate = Omit<HexeEquipment, 'isEquipped'>;

const DEFAULT_TEMPLATE_IDS = new Set([
  'template-default-dague',
  'template-default-epee',
  'template-default-lame-ego',
  'template-default-faux-possession',
  'template-default-cotte',
  'template-default-tunique',
  'template-default-amulette',
  'template-default-potion-soin',
  'template-default-ether',
  'template-default-elixir-endurance',
  'template-default-faveur-fortune',
  'template-default-crochet'
]);

function load(): HexeEquipmentTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as HexeEquipmentTemplate[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Nettoie les anciens templates par défaut s'ils sont encore présents dans le localStorage
    const cleaned = parsed.filter(t => !t.id.startsWith('template-default-') && !DEFAULT_TEMPLATE_IDS.has(t.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

function save(templates: HexeEquipmentTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  } catch (err) {
    console.error('[HexeEquipmentStore] Erreur de sauvegarde localStorage', err);
  }
}

/** Permet aux fenêtres et composants de s'abonner aux changements dans l'Arsenal */
export function subscribeTemplates(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
  };
}

/** Récupère tous les templates de l'Arsenal. */
export function getTemplates(): HexeEquipmentTemplate[] {
  return load();
}

/** Ajoute un nouveau template dans l'Arsenal. */
export function addTemplate(template: Omit<HexeEquipmentTemplate, 'id'>): HexeEquipmentTemplate {
  const templates = load();
  const newTemplate: HexeEquipmentTemplate = {
    ...template,
    id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  save([...templates, newTemplate]);
  return newTemplate;
}

/** Supprime un template de l'Arsenal par son id. */
export function removeTemplate(id: string): void {
  const templates = load().filter(t => t.id !== id);
  save(templates);
}

/** Met à jour un template existant. */
export function updateTemplate(id: string, patch: Partial<HexeEquipmentTemplate>): void {
  const templates = load().map(t => t.id === id ? { ...t, ...patch } : t);
  save(templates);
}

/**
 * Crée une instance (copie) d'un template pour l'ajouter à un personnage.
 * L'instance reçoit un nouvel id unique et isEquipped = false.
 */
export function instantiateTemplate(template: HexeEquipmentTemplate): HexeEquipment {
  return {
    ...template,
    id: `equip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    templateId: template.id,
    isEquipped: false,
  };
}
