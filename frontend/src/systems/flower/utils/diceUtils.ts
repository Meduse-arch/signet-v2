import { invoke } from '@tauri-apps/api/core';

/**
 * Lance des dés via le backend Rust directement, sans passer par le module Core.
 * rollArray: ex ['1d10', '+3', '2d6']
 */
export async function simulateFlowerRoll(rollArray: string[]): Promise<{ total: number, results: number[] }> {
  try {
    // On sépare les dés des modificateurs fixes
    const diceOnly = rollArray.filter(p => p.toLowerCase().includes('d'));
    const flatMods = rollArray.filter(p => !p.toLowerCase().includes('d'));

    let total = 0;
    const results: number[] = [];

    // Lancer les dés via Rust
    if (diceOnly.length > 0) {
      const rustResults = await invoke<number[]>('roll_dice', { dice: diceOnly });
      for (const r of rustResults) {
        total += r;
        results.push(r);
      }
    }

    // Ajouter les modificateurs fixes
    for (const part of flatMods) {
      const val = parseInt(part.replace('+', '').trim());
      if (!isNaN(val)) {
        total += val;
      }
    }

    return { total, results };
  } catch (e) {
    console.error('[Flower] Erreur lors du lancer de dés:', e);
    // Fallback local si le backend n'est pas disponible
    let total = 0;
    const results: number[] = [];
    for (const part of rollArray) {
      const p = part.trim().toLowerCase();
      if (p.includes('d')) {
        const cleanP = p.replace('+', '').replace('-', '');
        const [numStr, sidesStr] = cleanP.split('d');
        const num = parseInt(numStr) || 1;
        const sides = parseInt(sidesStr) || 20;
        for (let i = 0; i < num; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          total += roll;
          results.push(roll);
        }
      } else {
        const val = parseInt(p.replace('+', ''));
        if (!isNaN(val)) total += val;
      }
    }
    return { total, results };
  }
}
