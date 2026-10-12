import type {
  HexeCharacter, HexeStatKey, HexeResourceKey, HexeEffect, HexeSkill
} from './types';
import { getMaxHP, getMaxMP, getMaxSTM, getMaxChance, getDiceForLevel } from './types';
import { rollDiceFormula, type HexeRollResult } from './hexeDiceEngine';

export interface HexeEffectiveStats {
  levels: Record<HexeStatKey, number>;
  dice: Record<HexeStatKey, string>;
  maxResources: Record<HexeResourceKey, number>;
  rollModifiers: { value: number; condition?: string; source: string }[];
}

/**
 * Récupère tous les effets actifs d'un personnage :
 * 1. Équipements portés (isEquipped === true)
 * 2. Compétences passives (activationType === 'passive')
 * 3. Compétences toggle actuellement activées (activationType === 'toggle' && activeToggles.includes(id))
 */
export function getActiveEffects(char: HexeCharacter): { effect: HexeEffect; source: string }[] {
  const result: { effect: HexeEffect; source: string }[] = [];

  // 1. Équipements portés
  for (const equip of char.equipment || []) {
    if (!equip.isEquipped) continue;

    // Effets directs de l'équipement
    for (const eff of equip.effects || []) {
      result.push({ effect: eff, source: equip.name });
    }

    // Compatibilité : statBonuses directs existants
    for (const [st, val] of Object.entries(equip.statBonuses || {})) {
      if (val && typeof val === 'number') {
        result.push({
          effect: { type: 'statLevel', stat: st as HexeStatKey, value: val },
          source: equip.name,
        });
      }
    }

    // Compatibilité : resourceModifiers directs existants
    for (const mod of equip.resourceModifiers || []) {
      result.push({
        effect: {
          type: 'resourceChange',
          resource: mod.target,
          target: 'maximum',
          operation: 'add',
          value: mod.value,
        },
        source: equip.name,
      });
    }
  }

  // 2. Compétences (passives et toggles activés)
  const activeToggles = new Set(char.activeToggles || []);
  for (const skill of char.skills || []) {
    const isPassive = skill.activationType === 'passive';
    const isToggleOn = skill.activationType === 'toggle' && activeToggles.has(skill.id);

    if (isPassive || isToggleOn) {
      for (const eff of skill.effects || []) {
        result.push({ effect: eff, source: skill.name });
      }
    }
  }

  return result;
}

/**
 * Calcule tous les niveaux effectifs de statistiques, les dés associés,
 * et les maximums de ressources en tenant compte de tous les bonus actifs.
 */
export function calculateEffectiveState(char: HexeCharacter): HexeEffectiveStats {
  const activeEffects = getActiveEffects(char);

  // 1. Niveaux de statistiques effectifs
  const levels: Record<HexeStatKey, number> = {
    str: char.stats?.str?.level || 1,
    dex: char.stats?.dex?.level || 1,
    agi: char.stats?.agi?.level || 1,
    tec: char.stats?.tec?.level || 1,
    vit: char.stats?.vit?.level || 1,
    luc: char.stats?.luc?.level || 1,
  };

  const rollModifiers: { value: number; condition?: string; source: string }[] = [];
  const maxResourceModifiers: Record<HexeResourceKey, number> = {
    hp: 0,
    mp: 0,
    stm: 0,
    chance: 0,
  };

  for (const { effect, source } of activeEffects) {
    if (effect.type === 'statLevel') {
      levels[effect.stat] = (levels[effect.stat] || 1) + effect.value;
    } else if (effect.type === 'rollModifier') {
      rollModifiers.push({ value: effect.value, condition: effect.condition, source });
    } else if (effect.type === 'resourceChange' && effect.target === 'maximum') {
      if (effect.operation === 'add' && effect.value) {
        maxResourceModifiers[effect.resource] += effect.value;
      }
    }
  }

  // 2. Dés associés aux niveaux effectifs
  const dice: Record<HexeStatKey, string> = {
    str: getDiceForLevel(levels.str),
    dex: getDiceForLevel(levels.dex),
    agi: getDiceForLevel(levels.agi),
    tec: getDiceForLevel(levels.tec),
    vit: getDiceForLevel(levels.vit),
    luc: getDiceForLevel(levels.luc),
  };

  // 3. Maximums de ressources basés sur les formules de Hexe + bonus
  const maxResources: Record<HexeResourceKey, number> = {
    hp: getMaxHP(levels.vit) + maxResourceModifiers.hp,
    mp: getMaxMP(levels.tec) + maxResourceModifiers.mp,
    stm: getMaxSTM(levels.agi) + maxResourceModifiers.stm,
    chance: getMaxChance(levels.luc) + maxResourceModifiers.chance,
  };

  return {
    levels,
    dice,
    maxResources,
    rollModifiers,
  };
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  char: HexeCharacter;
  diceRolls: HexeRollResult[];
  costSpent?: Partial<Record<HexeResourceKey, number>>;
  restoredResources?: Partial<Record<HexeResourceKey, number>>;
}

/**
 * Exécute une compétence active ou un consommable :
 * - Vérifie et déduit les coûts
 * - Lance les formules de dés associées
 * - Applique les restaurations / changements de ressources plafonnés au maximum
 * - Renvoye le personnage mis à jour et un résumé pour le log / chat
 */
export function executeSkillOrItem(
  initialChar: HexeCharacter,
  itemOrSkill: {
    name: string;
    costs?: Partial<Record<HexeResourceKey, number>>;
    effects?: HexeEffect[];
    dice?: HexeSkill['dice'];
  }
): ExecutionResult {
  const effective = calculateEffectiveState(initialChar);
  const nextChar: HexeCharacter = JSON.parse(JSON.stringify(initialChar));
  const diceRolls: HexeRollResult[] = [];
  const costSpent: Partial<Record<HexeResourceKey, number>> = {};
  const restoredResources: Partial<Record<HexeResourceKey, number>> = {};

  // 1. Vérification des coûts
  for (const [resKey, costVal] of Object.entries(itemOrSkill.costs || {})) {
    const k = resKey as HexeResourceKey;
    const currentVal = nextChar.resources[k] || 0;
    if (costVal && currentVal < costVal) {
      return {
        success: false,
        message: `Ressource insuffisante : ${k.toUpperCase()} actuel (${currentVal}) < Coût requis (${costVal}).`,
        char: initialChar,
        diceRolls: [],
      };
    }
  }

  // 2. Déduction des coûts
  for (const [resKey, costVal] of Object.entries(itemOrSkill.costs || {})) {
    const k = resKey as HexeResourceKey;
    if (costVal) {
      nextChar.resources[k] = Math.max(0, (nextChar.resources[k] || 0) - costVal);
      costSpent[k] = costVal;
    }
  }

  // 3. Lancer de dé principal si défini sur la compétence
  if (itemOrSkill.dice && itemOrSkill.dice.terms?.length > 0) {
    const roll = rollDiceFormula(itemOrSkill.dice);
    diceRolls.push(roll);
  }

  // 4. Application des effets
  const effectSummaries: string[] = [];

  for (const eff of itemOrSkill.effects || []) {
    if (eff.type === 'resourceChange' && eff.target === 'current') {
      let amount = eff.value || 0;

      // Si l'effet comporte un jet de dés (ex: restaure 2d4 HP)
      if (eff.dice && eff.dice.terms?.length > 0) {
        const roll = rollDiceFormula(eff.dice);
        diceRolls.push(roll);
        amount += roll.total;
      }

      const res = eff.resource;
      const current = nextChar.resources[res] || 0;
      const max = effective.maxResources[res];

      if (eff.operation === 'restore' || eff.operation === 'add') {
        const newCurrent = Math.min(max, current + amount);
        const actualGained = newCurrent - current;
        nextChar.resources[res] = newCurrent;
        restoredResources[res] = (restoredResources[res] || 0) + actualGained;
        effectSummaries.push(`+${actualGained} ${res.toUpperCase()} (${newCurrent}/${max})`);
      } else if (eff.operation === 'spend') {
        const newCurrent = Math.max(0, current - amount);
        nextChar.resources[res] = newCurrent;
        effectSummaries.push(`-${amount} ${res.toUpperCase()} (${newCurrent}/${max})`);
      } else if (eff.operation === 'set') {
        const newCurrent = Math.min(max, Math.max(0, amount));
        nextChar.resources[res] = newCurrent;
        effectSummaries.push(`${res.toUpperCase()} fixé à ${newCurrent}/${max}`);
      }
    } else if (eff.type === 'custom') {
      effectSummaries.push(eff.description);
    }
  }

  // Construction du message de synthèse
  const parts: string[] = [`A activé **${itemOrSkill.name}**`];

  if (Object.keys(costSpent).length > 0) {
    const costsStr = Object.entries(costSpent).map(([k, v]) => `-${v} ${k.toUpperCase()}`).join(', ');
    parts.push(`(Coût: ${costsStr})`);
  }

  if (diceRolls.length > 0) {
    const rollsStr = diceRolls.map(r => `${r.formulaString} → **${r.total}** ${r.breakdownText}`).join(' | ');
    parts.push(`🎲 ${rollsStr}`);
  }

  if (effectSummaries.length > 0) {
    parts.push(`— ${effectSummaries.join(', ')}`);
  }

  return {
    success: true,
    message: parts.join(' '),
    char: nextChar,
    diceRolls,
    costSpent,
    restoredResources,
  };
}
