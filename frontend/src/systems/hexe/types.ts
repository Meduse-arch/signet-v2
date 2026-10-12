// --- Stats ---

export type HexeStatKey = 'str' | 'dex' | 'agi' | 'tec' | 'vit' | 'luc';

export interface HexeStat {
  level: number;
}

// --- Équipement ---

export type HexeEquipmentSlot = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'other';

export interface HexeAbility {
  id: string;
  name: string;
  description: string;
  condition?: string;
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
  /** Capacités spéciales nommées */
  abilities?: HexeAbility[];
  /** Modifications rares sur les ressources */
  resourceModifiers?: HexeResourceModifier[];
  /** L'objet est actuellement équipé (faux pour les consommables) */
  isEquipped: boolean;
  description?: string;
}

export interface HexeInventoryItem {
  id: string;
  name: string;
  quantity: number;
  description?: string;
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
