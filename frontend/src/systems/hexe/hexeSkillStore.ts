/**
 * hexeSkillStore.ts
 *
 * Store partagé pour le catalogue des compétences de Hexe (Section 3 & 10 du document de conception).
 * Persisté en localStorage avec synchronisation d'événements en temps réel.
 */

import type { HexeSkill } from './types';

const STORAGE_KEY = 'hexe_skills_catalog';
const EVENT_NAME = 'hexe_skills_updated';

const DEFAULT_SKILL_IDS = new Set([
  'skill-vision-nocturne',
  'skill-resistance-poison',
  'skill-aura-renforcement',
  'skill-armure-magique',
  'skill-pas-sombre',
  'skill-soin-mineur',
  'skill-fente-puissante',
  'skill-eclat-celeste',
  'skill-faveur-fortune',
  'skill-frappe-chirurgicale',
  'skill-entite-vorace',
  'skill-doigts-agiles'
]);

function loadSkills(): HexeSkill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as HexeSkill[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Nettoie les anciens exemples par défaut si encore stockés localement
    const cleaned = parsed.filter(s => s.custom !== false && !DEFAULT_SKILL_IDS.has(s.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
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
