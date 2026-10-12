/**
 * hexeSkillStore.ts
 *
 * Store partagé pour le catalogue des compétences de Hexe (Section 3 & 10 du document de conception).
 * Persisté en localStorage avec synchronisation d'événements en temps réel.
 */

import type { HexeSkill } from './types';

const STORAGE_KEY = 'hexe_skills_catalog';
const EVENT_NAME = 'hexe_skills_updated';

const DEFAULT_SKILLS: HexeSkill[] = [
  {
    id: 'skill-vision-nocturne',
    name: 'Vision Nocturne',
    description: 'Permet de discerner clairement formes et présences dans l\'obscurité totale des cryptes.',
    activationType: 'passive',
    effects: [
      { type: 'custom', description: 'Voit parfaitement dans le noir sans source lumineuse.' }
    ],
    custom: false
  },
  {
    id: 'skill-resistance-poison',
    name: 'Sang Purifié',
    description: 'Une résistance naturelle ou inquisitoriale contre les toxines et venins occultes.',
    activationType: 'passive',
    effects: [
      { type: 'rollModifier', value: 2, condition: 'Sauvegardes contre le poison' }
    ],
    custom: false
  },
  {
    id: 'skill-aura-renforcement',
    name: 'Aura de Renforcement',
    description: 'Canalise le flux mystique pour décupler la puissance musculaire de chaque assaut.',
    activationType: 'toggle',
    costs: { mp: 2 },
    effects: [
      { type: 'statLevel', stat: 'str', value: 2 }
    ],
    custom: false
  },
  {
    id: 'skill-armure-magique',
    name: 'Linceul d\'Acier Sacré',
    description: 'Une barrière invisible qui enveloppe le corps, consolidant la résistance vitale.',
    activationType: 'toggle',
    costs: { mp: 3 },
    effects: [
      { type: 'statLevel', stat: 'vit', value: 2 },
      { type: 'resourceChange', resource: 'hp', target: 'maximum', operation: 'add', value: 5 }
    ],
    custom: false
  },
  {
    id: 'skill-pas-sombre',
    name: 'Pas de l\'Ombre',
    description: 'Étouffe le bruit de chaque mouvement et fluidifie les déplacements pour échapper aux regards.',
    activationType: 'toggle',
    costs: { stm: 1 },
    effects: [
      { type: 'statLevel', stat: 'agi', value: 2 },
      { type: 'rollModifier', value: 2, condition: 'Jets de discrétion' }
    ],
    custom: false
  },
  {
    id: 'skill-soin-mineur',
    name: 'Soin Mineur',
    description: 'Restaure immédiatement la chair blessée par une imposition des mains sanctifiée.',
    activationType: 'active',
    costs: { mp: 3 },
    dice: { terms: [{ count: 2, sides: 4 }] },
    effects: [
      {
        type: 'resourceChange',
        resource: 'hp',
        target: 'current',
        operation: 'restore',
        dice: { terms: [{ count: 2, sides: 4 }] }
      }
    ],
    custom: false
  },
  {
    id: 'skill-fente-puissante',
    name: 'Fente Lourde',
    description: 'Un coup d\'estoc dévastateur visant à transpercer les défenses les plus solides.',
    activationType: 'active',
    costs: { stm: 2 },
    dice: { terms: [{ count: 2, sides: 6 }], flatModifier: 2 },
    effects: [
      { type: 'custom', description: 'Inflige 2d6 + 2 dégâts physiques perforants.' }
    ],
    custom: false
  },
  {
    id: 'skill-eclat-celeste',
    name: 'Éclat Céleste',
    description: 'Projette une onde de choc lumineuse brûlant les impurs et déstabilisant la zone.',
    activationType: 'active',
    costs: { mp: 4 },
    dice: { terms: [{ count: 3, sides: 8 }] },
    effects: [
      { type: 'custom', description: 'Inflige 3d8 dégâts radiants à la cible.' }
    ],
    custom: false
  },
  {
    id: 'skill-faveur-fortune',
    name: 'Faveur du Martyr',
    description: 'Invoque la miséricorde des saints pour recharger un point de Chance crucial.',
    activationType: 'active',
    costs: { mp: 5 },
    effects: [
      {
        type: 'resourceChange',
        resource: 'chance',
        target: 'current',
        operation: 'restore',
        value: 1
      }
    ],
    custom: false
  }
];

function loadSkills(): HexeSkill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SKILLS));
      return DEFAULT_SKILLS;
    }
    const parsed = JSON.parse(raw) as HexeSkill[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SKILLS;
  } catch {
    return DEFAULT_SKILLS;
  }
}

function saveSkills(skills: HexeSkill[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  } catch (err) {
    console.error('[HexeSkillStore] Erreur sauvegarde', err);
  }
}

export function subscribeSkills(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
  };
}

export function getSkillsCatalog(): HexeSkill[] {
  return loadSkills();
}

export function addSkillToCatalog(skill: Omit<HexeSkill, 'id'>): HexeSkill {
  const all = loadSkills();
  const newSkill: HexeSkill = {
    ...skill,
    id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    custom: true
  };
  saveSkills([...all, newSkill]);
  return newSkill;
}

export function updateSkillInCatalog(id: string, patch: Partial<HexeSkill>): void {
  const all = loadSkills().map(s => s.id === id ? { ...s, ...patch } : s);
  saveSkills(all);
}

export function removeSkillFromCatalog(id: string): void {
  const all = loadSkills().filter(s => s.id !== id);
  saveSkills(all);
}

/**
 * Crée une copie d'une compétence pour l'associer à un personnage.
 */
export function instantiateSkill(skill: HexeSkill, sourceEquipmentId?: string): HexeSkill {
  return {
    ...skill,
    id: `char-skill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceEquipmentId
  };
}
