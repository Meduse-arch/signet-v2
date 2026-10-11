export interface HexeStat {
  level: number;
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
