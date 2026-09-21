export interface FlowerStat {
  name: string;
  value: number; // Nombre de fleurs (0 = 1d10, 1 = 1d30, etc.)
  isCustom?: boolean;
}

export interface FlowerCharacter {
  id: string; // Lié au tokenId ou un id unique généré
  name: string;
  owner_id?: string | null;
  avatarUrl?: string;
  
  // Note: le hpMax est calculé dynamiquement : 10 + Résistance + Résistance Magique
  hpCurrent: number;
  
  // Statistiques
  stats: Record<string, FlowerStat>;
}

// Stats de base quand le MJ crée une fiche (toutes à 0 au départ selon tes instructions)
export const DEFAULT_FLOWER_STATS: Record<string, FlowerStat> = {
  'force': { name: 'Force', value: 0 },
  'resistance': { name: 'Résistance', value: 0 },
  'resistance_magique': { name: 'Résistance Magique', value: 0 },
  'dexterite': { name: 'Dextérité', value: 0 },
  'puissance_magique': { name: 'Puissance Magique', value: 0 },
};

// Algorithme de conversion Fleurs -> Dés
export function getDiceForFlowers(flowerCount: number): string {
  if (flowerCount === 0) return '1d10';
  if (flowerCount <= 4) return `1d${10 + flowerCount * 20}`;
  return `${flowerCount - 3}d100`;
}

// Calcul des PV Max
export function calculateMaxHp(stats: Record<string, FlowerStat>): number {
  const res = stats['resistance']?.value || 0;
  const resMag = stats['resistance_magique']?.value || 0;
  return 10 + res + resMag;
}
