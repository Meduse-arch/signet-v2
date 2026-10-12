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

const DEFAULT_TEMPLATES: HexeEquipmentTemplate[] = [
  {
    id: 'template-default-dague',
    name: "Dague d'inquisiteur",
    slot: 'weapon',
    statBonuses: { dex: 1, agi: 1 },
    properties: ['légère', 'perforante'],
    abilities: [
      {
        id: 'ab-dague-1',
        name: 'Frappe chirurgicale',
        description: 'Ignore la première réduction d\'armure.',
        condition: 'Attaque surprise ou au corps-à-corps'
      }
    ],
    description: 'Une lame effilée gravée d\'inscriptions inquisitoriales.'
  },
  {
    id: 'template-default-epee',
    name: 'Épée de Templier',
    slot: 'weapon',
    statBonuses: { str: 2 },
    properties: ['tranchante', 'polyvalente'],
    abilities: [
      {
        id: 'ab-epee-1',
        name: 'Fente lourde',
        description: 'Déstabilise la cible sur une réussite majeure.'
      }
    ],
    description: 'Forgée dans un acier d\'une pureté remarquable.'
  },
  {
    id: 'template-default-cotte',
    name: 'Cotte de mailles de pénitent',
    slot: 'armor',
    statBonuses: { vit: 2 },
    properties: ['renforcée', 'lourde'],
    abilities: [
      {
        id: 'ab-cotte-1',
        name: 'Endurance de fer',
        description: 'Réduit les dégâts contondants et perforants.'
      }
    ],
    description: 'Une armure lourde portée par les chevaliers pénitents.'
  },
  {
    id: 'template-default-tunique',
    name: "Tunique de traqueur",
    slot: 'armor',
    statBonuses: { agi: 2 },
    properties: ['silencieuse', 'souple'],
    description: 'Vêtement sombre en cuir traité pour étouffer les pas.'
  },
  {
    id: 'template-default-amulette',
    name: 'Amulette de Saint-Céleste',
    slot: 'accessory',
    statBonuses: { tec: 1, luc: 1 },
    properties: ['relique'],
    abilities: [
      {
        id: 'ab-amulette-1',
        name: 'Grâce martyre',
        description: 'Permet de relancer 1 dé une fois par repos.',
        condition: 'Sur un échec critique'
      }
    ],
    description: 'Relique contenant les cendres scellées d\'un martyr.'
  },
  {
    id: 'template-default-potion-soin',
    name: 'Fiole de Vitalité',
    slot: 'consumable',
    quantity: 1,
    properties: ['consommable', 'alchimie', 'soin'],
    abilities: [
      {
        id: 'ab-potion-1',
        name: 'Élixir revigorant',
        description: 'Rend 5 points de vie immédiatement lorsqu\'elle est bue.'
      }
    ],
    description: 'Élixir carmin scellé par de la cire de bougie sacrée.'
  },
  {
    id: 'template-default-ether',
    name: 'Flasque d\'Éther Sanctifié',
    slot: 'consumable',
    quantity: 1,
    properties: ['consommable', 'magie', 'mana'],
    abilities: [
      {
        id: 'ab-ether-1',
        name: 'Regain mystique',
        description: 'Restaure 4 points de magie (MP).'
      }
    ],
    description: 'Essence bleutée instable distillée sous le clair de lune.'
  },
  {
    id: 'template-default-crochet',
    name: 'Trousse de crochetage occulte',
    slot: 'other',
    properties: ['outil', 'crochetage', 'délicat'],
    abilities: [
      {
        id: 'ab-crochet-1',
        name: 'Doigts agiles',
        description: 'Facilite le déverrouillage de serrures et mécanismes anciens.',
        condition: 'Sur jet de Dextérité ou Technique'
      }
    ],
    description: 'Ensemble de tiges fines en fer froid gravées de symboles de déliement.'
  }
];

function load(): HexeEquipmentTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Initialise avec les templates de base par défaut
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    const parsed = JSON.parse(raw) as HexeEquipmentTemplate[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
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
