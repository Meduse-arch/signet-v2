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
  },
  {
    id: 'skill-frappe-chirurgicale',
    name: 'Frappe Chirurgicale',
    description: 'Une botte précise et létale visant les faiblesses articulaires et ignorant la protection adverse.',
    activationType: 'active',
    costs: { stm: 1 },
    effects: [
      { type: 'custom', description: 'Ignore la première réduction d\'armure de la cible.' }
    ],
    custom: false
  },
  {
    id: 'skill-entite-vorace',
    name: 'Entité Vorace',
    description: 'L\'esprit occulte scellé dans l\'objet insuffle une soif sanguinaire à chaque assaut.',
    activationType: 'passive',
    effects: [
      { type: 'rollModifier', value: 1, condition: 'Attaques en état de fureur ou blessé' }
    ],
    custom: false
  },
  {
    id: 'skill-doigts-agiles',
    name: 'Doigts Agiles',
    description: 'Une dextérité surnaturelle facilitant le déverrouillage de serrures et mécanismes complexes.',
    activationType: 'passive',
    effects: [
      { type: 'rollModifier', value: 2, condition: 'Jets de Dextérité ou de crochetage' }
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
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_SKILLS;
    }
    // Assure l'inclusion des compétences par défaut manquantes
    const existingIds = new Set(parsed.map(p => p.id));
    const missingDefaults = DEFAULT_SKILLS.filter(d => !existingIds.has(d.id));
    if (missingDefaults.length > 0) {
      const merged = [...parsed, ...missingDefaults];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
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

export function getSkillById(id: string): HexeSkill | undefined {
  return loadSkills().find(s => s.id === id);
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

/**
 * Convertit une ancienne HexeAbility inline en HexeSkill pour compatibilité transparente.
 */
export function abilityToSkill(ab: import('./types').HexeAbility): HexeSkill {
  return {
    id: ab.id,
    name: ab.name,
    description: ab.description,
    activationType: ab.activationType || 'passive',
    effects: ab.effects || [],
    dice: ab.dice,
    costs: ab.costs,
    conditions: ab.condition ? [ab.condition] : undefined,
    custom: true
  };
}

/**
 * Résout toutes les compétences associées à un équipement :
 * 1. Depuis abilityIds (identifiants officiels pointant vers le catalogue partagé)
 * 2. Depuis les éventuelles anciennes abilities inline
 */
export function getEquipmentSkills(equip: { abilityIds?: string[]; abilities?: import('./types').HexeAbility[] }): HexeSkill[] {
  const catalog = getSkillsCatalog();
  const catalogMap = new Map(catalog.map(s => [s.id, s]));
  const result: HexeSkill[] = [];
  const seenIds = new Set<string>();

  // 1. Depuis abilityIds
  for (const id of equip.abilityIds || []) {
    const found = catalogMap.get(id);
    if (found && !seenIds.has(found.id)) {
      result.push(found);
      seenIds.add(found.id);
    }
  }

  // 2. Rétrocompatibilité : anciennes abilities inline
  for (const ab of equip.abilities || []) {
    if (!seenIds.has(ab.id)) {
      result.push(abilityToSkill(ab));
      seenIds.add(ab.id);
    }
  }

  return result;
}

export interface CharacterSkillSource {
  skill: HexeSkill;
  sources: string[];
  isLearned: boolean;
  isEquippedOnly: boolean;
}

/**
 * Calcule l'ensemble des compétences disponibles pour un personnage :
 * - Compétences apprises directement (char.skills)
 * - Compétences accordées par les équipements actuellement portés (isEquipped === true)
 * Si un objet est déséquipé, ses compétences ne sont plus disponibles via cet objet,
 * mais restent conservées si le personnage les a apprises ou si un autre équipement porté les fournit.
 */
export function getCharacterAvailableSkills(char: import('./types').HexeCharacter): CharacterSkillSource[] {
  const map = new Map<string, CharacterSkillSource>();

  // 1. Compétences apprises directement par le personnage
  for (const skill of char.skills || []) {
    map.set(skill.id, {
      skill,
      sources: ['Appris'],
      isLearned: true,
      isEquippedOnly: false
    });
  }

  // 2. Compétences accordées par les équipements équipés
  for (const equip of char.equipment || []) {
    if (!equip.isEquipped) continue;
    const equipSkills = getEquipmentSkills(equip);
    for (const skill of equipSkills) {
      const existing = map.get(skill.id);
      if (existing) {
        if (!existing.sources.includes(equip.name)) {
          existing.sources.push(equip.name);
        }
      } else {
        map.set(skill.id, {
          skill,
          sources: [equip.name],
          isLearned: false,
          isEquippedOnly: true
        });
      }
    }
  }

  return Array.from(map.values());
}
