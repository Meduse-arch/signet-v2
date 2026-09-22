export interface FlowerStat {
  name: string;
  value: number; // Nombre de fleurs (0 = 1d10, 1 = 1d30, etc.)
  isCustom?: boolean;
}

export interface ItemModifier {
  target: string; // 'force', 'pv', 'resistance', etc.
  value: string; // '3' or '1d20'
  scaleStat?: string; // e.g., 'force', 'niveau' (level), 'quantite' (quantity)
}

export type SkillType = 'active' | 'toggle' | 'passive';

export interface FlowerSkill {
  id: string;
  compendiumId?: string;
  name: string;
  description: string;
  level?: number; // 0 to 5 stars
  skillType?: SkillType;
  isActive?: boolean; // For toggle skills
  modifiers?: ItemModifier[];
}

export type ItemType = 'neutral' | 'equippable' | 'consumable';

export interface FlowerItem {
  id: string;
  compendiumId?: string;
  name: string;
  quantity: number;
  description: string;
  itemType?: ItemType;
  level?: number; // Mastery/Stars (0 to 5)
  modifiers?: ItemModifier[];
  isEquipped?: boolean;
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
  
  // Compétences & Inventaire
  skills?: FlowerSkill[];
  inventory?: FlowerItem[];
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
  if (flowerCount === 1) return '1d30';
  if (flowerCount === 2) return '1d50';
  if (flowerCount === 3) return '1d70';
  
  // A partir de 4 fleurs, c'est des d100
  // 4 fleurs = 1d100 (4-3 = 1)
  // 5 fleurs = 2d100 (5-3 = 2)
  // 6 fleurs = 3d100 (6-3 = 3)
  return `${flowerCount - 3}d100`;
}

// Normalisation des clés de statistiques (enlève les accents, met en minuscule, remplace espaces par _)
export function normalizeStatKey(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '_');
}

// Calcul des PV Max
export function calculateMaxHp(stats: Record<string, FlowerStat>, inventory?: FlowerItem[], skills?: FlowerSkill[]): number {
  const res = stats['resistance']?.value || 0;
  const resMag = stats['resistance_magique']?.value || 0;
  
  let base = 10 + res + resMag;

  const applyMods = (modifiers: ItemModifier[] | undefined, qty: number, level: number) => {
    if (!modifiers) return;
    for (const mod of modifiers) {
      const target = normalizeStatKey(mod.target);
      if (target === 'pv' || target === 'pv_max') {
        const val = parseInt(mod.value);
        if (!isNaN(val)) {
          let multiplier = 1;
          if (mod.scaleStat) {
            const scale = normalizeStatKey(mod.scaleStat);
            if (scale === 'quantite') {
              multiplier = qty;
            } else if (scale === 'niveau' || scale === 'maitrise') {
              multiplier = level;
            } else {
              multiplier = stats[scale]?.value || 0;
            }
          }
          base += (val * multiplier);
        }
      }
    }
  };
  
  // Appliquer les modificateurs d'inventaire
  if (inventory) {
    for (const item of inventory) {
      if (item.isEquipped) {
        applyMods(item.modifiers, item.quantity, 0);
      }
    }
  }

  // Appliquer les modificateurs de compétences
  if (skills) {
    for (const skill of skills) {
      if (skill.skillType === 'passive' || (skill.skillType === 'toggle' && skill.isActive)) {
        applyMods(skill.modifiers, 1, skill.level || 0);
      }
    }
  }
  
  return base;
}
