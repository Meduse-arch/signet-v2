import type React from 'react';
import {
  Shield, Swords, Sparkles, Package, FlaskConical, Layers
} from 'lucide-react';
import type {
  HexeEquipmentSlot, HexeStatKey, HexeWeaponRank, HexeWeaponNature, HexeAbility
} from './types';

export const STAT_SHORT: Record<HexeStatKey, string> = {
  str: 'STR', dex: 'DEX', agi: 'AGI', tec: 'TEC', vit: 'VIT', luc: 'LUC'
};

export const SLOT_FILTER_OPTIONS: {
  slot: HexeEquipmentSlot | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}[] = [
  { slot: 'all', label: 'Tous', icon: Layers, colorClass: 'text-slate-400' },
  { slot: 'weapon', label: 'Armes', icon: Swords, colorClass: 'text-rose-400' },
  { slot: 'armor', label: 'Armures', icon: Shield, colorClass: 'text-amber-400' },
  { slot: 'accessory', label: 'Accessoires', icon: Sparkles, colorClass: 'text-cyan-400' },
  { slot: 'consumable', label: 'Consommables', icon: FlaskConical, colorClass: 'text-emerald-400' },
  { slot: 'other', label: 'Autre', icon: Package, colorClass: 'text-sky-400' },
];

/** Formulaire d'édition d'un équipement (Arsenal). */
export interface EquipmentFormState {
  name: string;
  slot: HexeEquipmentSlot;
  weight?: number | '';
  imageUrl?: string;
  statBonuses: Partial<Record<HexeStatKey, number>>;
  properties: string[];
  abilities: HexeAbility[];
  abilityIds: string[];
  description: string;
  rank?: HexeWeaponRank;
  nature?: HexeWeaponNature;
  diceFormula?: string;
}

export const EMPTY_FORM: EquipmentFormState = {
  name: '',
  slot: 'weapon',
  weight: '',
  imageUrl: undefined,
  statBonuses: {},
  properties: [],
  abilities: [],
  abilityIds: [],
  description: '',
  rank: 'C',
  nature: 'classic',
  diceFormula: '',
};
