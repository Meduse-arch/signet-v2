// --- Stats ---

export type HexeStatKey = 'str' | 'dex' | 'agi' | 'tec' | 'vit' | 'luc';
export const ALL_STATS: HexeStatKey[] = ['str', 'dex', 'agi', 'tec', 'vit', 'luc'];

export interface HexeStat {
  level: number;
}

// --- Dés Personnalisés ---

export interface HexeDiceTerm {
  count: number;
  sides: number;
}

export interface HexeDiceFormula {
  terms: HexeDiceTerm[];
  flatModifier?: number;
}

// --- Effets & Compétences ---

export type HexeActivationType = 'passive' | 'toggle' | 'active';

export type HexeResourceKey = 'hp' | 'mp' | 'stm' | 'chance';

export type HexeEffect =
  | {
      type: 'statLevel';
      stat: HexeStatKey;
      value: number; // ex: +2
    }
  | {
      type: 'rollModifier';
      value: number; // ex: +2 au résultat final
      condition?: string; // ex: 'jet d\'attaque'
    }
  | {
      type: 'resourceChange';
      resource: HexeResourceKey;
      target: 'current' | 'maximum';
      operation: 'add' | 'set' | 'restore' | 'spend';
      value?: number;
      dice?: HexeDiceFormula;
    }
  | {
      type: 'carryCapacity';
      modifierType: 'flat' | 'percent';
      value: number; // ex: +10 (flat) ou +20 (+20%)
    }
  | {
      type: 'custom';
      description: string;
    };

export interface HexeSkill {
  id: string;
  name: string;
  description?: string;
  activationType: HexeActivationType;
  effects: HexeEffect[];
  dice?: HexeDiceFormula;
  skillLevel?: number;
  duration?: string;
  conditions?: string[];
  costs?: Partial<Record<HexeResourceKey, number>>;
  custom?: boolean;
  /** Si la compétence provient d'une arme/équipement spécifique */
  sourceEquipmentId?: string;
  /** Illustration ou icône personnalisée */
  imageUrl?: string;
}

// --- Équipements, Rangs & Pentacles ---

export type HexeWeaponRank = 'F' | 'D' | 'C' | 'B' | 'A' | 'S';
export type HexeItemRank = HexeWeaponRank;

export const ALL_RANKS: HexeWeaponRank[] = ['F', 'D', 'C', 'B', 'A', 'S'];

export const RANK_BRANCH_COUNTS: Record<HexeWeaponRank, number> = {
  F: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 5,
  S: 5
};

export const RANK_DESCRIPTIONS: Record<HexeWeaponRank, string> = {
  F: '1 branche',
  D: '2 branches',
  C: '3 branches',
  B: '4 branches',
  A: '5 branches',
  S: 'Rang Ultime (Cercle)'
};

export type HexeWeaponNature = 'classic' | 'ego' | 'possessed';
export type HexePentacleOrientation = 'upright' | 'inverted';

export interface HexeWeaponSymbol {
  orientation: HexePentacleOrientation;
  filled: boolean;
  hasCircle: boolean;
}

// --- Équipement ---

export type HexeEquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'other';

export interface HexeAbility {
  id: string;
  name: string;
  description: string;
  condition?: string;
  activationType?: HexeActivationType;
  dice?: HexeDiceFormula;
  costs?: { mp?: number; stm?: number; hp?: number; chance?: number };
  duration?: string;
  effects?: HexeEffect[];
  imageUrl?: string;
}

export interface HexeResourceModifier {
  target: 'hp' | 'mp' | 'stm' | 'chance';
  value: number;
}

export interface HexeEquipment {
  id: string;
  /** Identifiant du template parent dans l'Arsenal (si l'objet provient de l'Arsenal) */
  templateId?: string;
  name: string;
  slot: HexeEquipmentSlot;
  /** Quantité pour les consommables et objets empilables (défaut 1) */
  quantity?: number;
  /** Bonus individuels par statistique. Ex: { agi: 2, dex: 1 } */
  statBonuses?: Partial<Record<HexeStatKey, number>>;
  /** Mots-clés descriptifs ou mécaniques. Ex: ['légère', 'silencieuse'] */
  properties?: string[];
  /** Capacités spéciales nommées avec leurs propres jets/coûts/effets */
  abilities?: HexeAbility[];
  /** Modifications rares sur les ressources */
  resourceModifiers?: HexeResourceModifier[];
  /** L'objet est actuellement équipé (faux pour les consommables) */
  isEquipped: boolean;
  description?: string;

  /** Illustration personnalisée de l'équipement */
  imageUrl?: string;
  /** Poids unitaire en kg ou unités de charge (défaut 0) */
  weight?: number;

  // Système de rangs et symbolique des pentacles (applicable à tous les équipements)
  rank?: HexeWeaponRank;
  nature?: HexeWeaponNature;
  symbol?: HexeWeaponSymbol;
  abilityIds?: string[];

  // Effets et formule de dés de base (facultative)
  effects?: HexeEffect[];
  dice?: HexeDiceFormula;
}

export interface HexeInventoryItem {
  id: string;
  name: string;
  quantity: number;
  description?: string;
  imageUrl?: string;
  weight?: number;
}

export interface HexeResources {
  hp: number;
  mp: number;
  stm: number;
  chance: number;
}

export interface HexeCharacter {
  id: string;
  name: string;
  owner_id?: string | null;
  avatarUrl?: string;
  
  stats: {
    str: HexeStat;
    dex: HexeStat;
    agi: HexeStat;
    tec: HexeStat;
    vit: HexeStat;
    luc: HexeStat;
  };
  
  resources: HexeResources;

  /** Armes, armures et accessoires */
  equipment?: HexeEquipment[];
  /** Objets simples (consommables, clés, etc.) */
  inventory?: HexeInventoryItem[];

  /** Compétences acquises ou conférées */
  skills?: HexeSkill[];
  /** IDs des compétences toggle actuellement activées */
  activeToggles?: string[];
}

export const DEFAULT_HEXE_STATS = {
  str: { level: 1 },
  dex: { level: 1 },
  agi: { level: 1 },
  tec: { level: 1 },
  vit: { level: 1 },
  luc: { level: 1 },
};

export function getDiceForLevel(level: number): string {
  switch(level) {
    case 1: return '1d4';
    case 2: return '1d6';
    case 3: return '1d8';
    case 4: return '1d10';
    case 5: return '1d12';
    case 6: return '1d20';
    case 7: return '1d30';
    case 8: return '1d40';
    case 9: return '1d50';
    case 10: return '1d60';
    default: 
      if (level < 1) return '1d4';
      return `1d${(level - 4) * 10}`; // Formule pour level > 10 (ex: 11 = d70)
  }
}

export function getMaxHP(vit: number): number { return 10 + vit; }
export function getMaxMP(tec: number): number { return 10 + tec; }
export function getMaxSTM(agi: number): number { return 10 + agi; }
export function getMaxChance(luc: number): number { return luc; }

export const STAT_LABELS: Record<keyof HexeCharacter['stats'], string> = {
  str: 'Force (STR)',
  dex: 'Dextérité (DEX)',
  agi: 'Agilité (AGI)',
  tec: 'Technique (TEC)',
  vit: 'Vitalité (VIT)',
  luc: 'Chance (LUC)'
};

export const SLOT_LABELS: Record<HexeEquipmentSlot, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  accessory: 'Accessoire',
  consumable: 'Consommable',
  other: 'Autre',
};

/**
 * Calcule le bonus total apporté par les équipements portés pour une stat donnée.
 * Seuls les équipements avec isEquipped === true sont pris en compte.
 */
export function getEquipmentBonusForStat(
  statKey: HexeStatKey,
  equipment: HexeEquipment[] = []
): number {
  return equipment
    .filter(e => e.isEquipped && e.statBonuses?.[statKey])
    .reduce((sum, e) => sum + (e.statBonuses![statKey] ?? 0), 0);
}

/**
 * Calcule le niveau effectif d'une statistique en ajoutant les bonus d'équipement.
 * Le niveau de base du personnage n'est pas modifié.
 */
export function getEffectiveStatLevel(
  statKey: HexeStatKey,
  baseLevel: number,
  equipment: HexeEquipment[] = []
): number {
  return baseLevel + getEquipmentBonusForStat(statKey, equipment);
}

// --- Système de Poids & Encombrement ---

export type HexeEncumbranceTier = 'light' | 'heavy' | 'overburdened';

export interface HexeEncumbranceState {
  totalWeight: number;
  maxWeight: number;
  ratio: number;
  tier: HexeEncumbranceTier;
  agiPenalty: number;
  isOverencumbered: boolean;
}

/**
 * Formule de base proposée dans le document de conception :
 * Poids maximal = 10 + (STR effective × 5)
 * (STR 1 = 15 unités, STR 4 = 30 unités, STR 6 = 40 unités).
 */
export function getBaseCarryCapacity(effectiveStrLevel: number): number {
  return 10 + (Math.max(1, effectiveStrLevel) * 5);
}

