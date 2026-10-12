import type { HexeDiceFormula, HexeDiceTerm } from './types';

export interface HexeTermRoll {
  count: number;
  sides: number;
  values: number[];
  sum: number;
}

export interface HexeRollResult {
  formulaString: string;
  terms: HexeTermRoll[];
  flatModifier: number;
  total: number;
  breakdownText: string;
  breakdown?: string;
}

/**
 * Analyse une chaîne textuelle de dés (ex: "2d4", "2d6 + 1d8", "2d4 + 3", "1d20 - 2")
 * et la convertit en structure HexeDiceFormula validée.
 */
export function parseDiceFormula(rawInput: string): HexeDiceFormula | null {
  if (!rawInput || typeof rawInput !== 'string') return null;

  const cleaned = rawInput.trim().replace(/\s+/g, '');
  if (!cleaned) return null;

  const terms: HexeDiceTerm[] = [];
  let flatModifier = 0;

  // Regex pour découper les termes (+2d6, -1d8, +3, -2, 2d4, etc.)
  const regex = /([+-]?)(?:(\d*)d(\d+)|(\d+))/gi;
  let match: RegExpExecArray | null;
  let matchedLength = 0;

  while ((match = regex.exec(cleaned)) !== null) {
    matchedLength += match[0].length;
    const sign = match[1] === '-' ? -1 : 1;

    if (match[3] !== undefined) {
      // C'est un dé : count d sides
      const count = (match[2] ? parseInt(match[2], 10) : 1) * sign;
      const sides = parseInt(match[3], 10);

      if (count <= 0 || sides <= 0 || sides > 1000 || Math.abs(count) > 100) {
        return null; // Valeurs aberrantes ou négatives
      }
      terms.push({ count, sides });
    } else if (match[4] !== undefined) {
      // C'est un modificateur fixe
      const val = parseInt(match[4], 10) * sign;
      flatModifier += val;
    }
  }

  // Si on n'a rien matché ou si la chaîne contenait des caractères illégaux
  if (terms.length === 0 && flatModifier === 0) return null;
  if (matchedLength !== cleaned.length) return null;

  return { terms, flatModifier: flatModifier !== 0 ? flatModifier : undefined };
}

/**
 * Convertit une structure HexeDiceFormula en représentation textuelle standard lisible.
 */
export function formatDiceFormula(formula: HexeDiceFormula): string {
  if (!formula || !formula.terms || formula.terms.length === 0) {
    return formula.flatModifier !== undefined ? `${formula.flatModifier}` : '0';
  }

  const termsStr = formula.terms
    .map((t, idx) => {
      const part = `${t.count}d${t.sides}`;
      return idx === 0 ? part : `+ ${part}`;
    })
    .join(' ');

  if (formula.flatModifier && formula.flatModifier !== 0) {
    const modStr = formula.flatModifier > 0 ? `+ ${formula.flatModifier}` : `- ${Math.abs(formula.flatModifier)}`;
    return `${termsStr} ${modStr}`;
  }

  return termsStr;
}

/**
 * Lance localement une formule de dés et renvoie le détail complet des résultats.
 */
export function rollDiceFormula(formula: HexeDiceFormula): HexeRollResult {
  const formulaString = formatDiceFormula(formula);
  const termRolls: HexeTermRoll[] = [];
  let totalDiceSum = 0;

  for (const term of formula.terms || []) {
    const values: number[] = [];
    let sum = 0;
    for (let i = 0; i < term.count; i++) {
      const val = Math.floor(Math.random() * term.sides) + 1;
      values.push(val);
      sum += val;
    }
    termRolls.push({
      count: term.count,
      sides: term.sides,
      values,
      sum,
    });
    totalDiceSum += sum;
  }

  const flatModifier = formula.flatModifier || 0;
  const total = totalDiceSum + flatModifier;

  // Création du texte de décomposition
  const breakdownParts = termRolls.map(t => {
    if (t.values.length === 1) return `[${t.values[0]}]`;
    return `[${t.values.join(', ')}]`;
  });

  if (flatModifier !== 0) {
    breakdownParts.push(flatModifier > 0 ? `+${flatModifier}` : `${flatModifier}`);
  }

  const breakdownText = breakdownParts.join(' ');

  return {
    formulaString,
    terms: termRolls,
    flatModifier,
    total,
    breakdownText,
    breakdown: breakdownText,
  };
}
