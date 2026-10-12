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
    rank: 'C',
    nature: 'classic',
    symbol: { orientation: 'upright', filled: false, hasCircle: false },
    dice: { terms: [{ count: 1, sides: 4 }], flatModifier: 2 },
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
    rank: 'B',
    nature: 'classic',
    symbol: { orientation: 'upright', filled: false, hasCircle: false },
    dice: { terms: [{ count: 1, sides: 8 }], flatModifier: 0 },
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
    id: 'template-default-lame-ego',
    name: 'Murmure Écarlate',
    slot: 'weapon',
    rank: 'A',
    nature: 'ego',
    symbol: { orientation: 'inverted', filled: false, hasCircle: false },
    dice: { terms: [{ count: 2, sides: 6 }], flatModifier: 1 },
    statBonuses: { dex: 2, luc: 1 },
    properties: ['ego', 'légendaire', 'buveuse de sang'],
    abilities: [
      {
        id: 'ab-ego-1',
        name: 'Volonté Frémissante',
        description: 'Le désir de l\'arme dépasse celui du porteur et réclame le sang de ses ennemis.',
        condition: 'Arme d\'Ego active'
      }
    ],
    description: 'Une lame éveillée qui murmure à l\'esprit de son porteur. Pentacle inversé gravé sur la garde.'
  },
  {
    id: 'template-default-faux-possession',
    name: 'Faux du Fléau d\'Ébène',
    slot: 'weapon',
    rank: 'S',
    nature: 'possessed',
    symbol: { orientation: 'inverted', filled: true, hasCircle: true },
    dice: { terms: [{ count: 2, sides: 8 }, { count: 1, sides: 4 }], flatModifier: 3 },
    statBonuses: { str: 3, tec: 2 },
    properties: ['possédée', 'relique maudite', 'entité résidente'],
    abilities: [
      {
        id: 'ab-faux-1',
        name: 'Étreinte Démoniaque',
        description: 'Libère les tourments de l\'entité emprisonnée pour faucher les âmes.',
        condition: 'Volonté étrangère dominante'
      }
    ],
    description: 'Arme possédée de Rang S. Pentacle inversé plein serti dans un cercle de contention.'
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
    effects: [
      {
        type: 'resourceChange',
        resource: 'hp',
        target: 'current',
        operation: 'restore',
        dice: { terms: [{ count: 2, sides: 4 }] }
      }
    ],
    abilities: [
      {
        id: 'ab-potion-1',
        name: 'Élixir revigorant',
        description: 'Rend 2d4 points de vie immédiatement lorsqu\'elle est bue.'
      }
    ],
    description: 'Élixir carmin scellé par de la cire de bougie sacrée. Restaure 2d4 HP.'
  },
  {
    id: 'template-default-ether',
    name: 'Flasque d\'Éther Sanctifié',
    slot: 'consumable',
    quantity: 1,
    properties: ['consommable', 'magie', 'mana'],
    effects: [
      {
        type: 'resourceChange',
        resource: 'mp',
        target: 'current',
        operation: 'restore',
        dice: { terms: [{ count: 2, sides: 6 }] }
      }
    ],
    abilities: [
      {
        id: 'ab-ether-1',
        name: 'Regain mystique',
        description: 'Restaure 2d6 points de magie (MP).'
      }
    ],
    description: 'Essence bleutée instable distillée sous le clair de lune. Restaure 2d6 MP.'
  },
  {
    id: 'template-default-elixir-endurance',
    name: 'Élixir d\'Endurance',
    slot: 'consumable',
    quantity: 1,
    properties: ['consommable', 'endurance', 'vigueur'],
    effects: [
      {
        type: 'resourceChange',
        resource: 'stm',
        target: 'current',
        operation: 'restore',
        dice: { terms: [{ count: 1, sides: 8 }] }
      }
    ],
    description: 'Infusion amère qui rend 1d8 STM immédiatement.'
  },
  {
    id: 'template-default-faveur-fortune',
    name: 'Faveur de Fortune',
    slot: 'consumable',
    quantity: 1,
    properties: ['consommable', 'chance', 'bénédiction'],
    effects: [
      {
        type: 'resourceChange',
        resource: 'chance',
        target: 'current',
        operation: 'restore',
        value: 2
      }
    ],
    description: 'Pétale argenté consacré à la Déesse du Hasard. Restaure 2 points de Chance.'
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    const parsed = JSON.parse(raw) as HexeEquipmentTemplate[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_TEMPLATES;
    }
    // Assure l'inclusion des templates par défaut manquants (ex: nouvelles armes Ego / Possédées)
    const existingIds = new Set(parsed.map(p => p.id));
    const missingDefaults = DEFAULT_TEMPLATES.filter(d => !existingIds.has(d.id));
    if (missingDefaults.length > 0) {
      const merged = [...parsed, ...missingDefaults];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
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
