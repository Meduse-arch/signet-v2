
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

    // Lancer les dés via Rust ou Fallback JS
    if (diceOnly.length > 0) {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const rustResults = await invoke<number[]>('roll_dice', { dice: diceOnly });
        for (const r of rustResults) {
          total += r;
          results.push(r);
        }
      } else {
        // Fallback WebRTC (JS)
        for (const d of diceOnly) {
          const match = d.toLowerCase().match(/^(\d*)d(\d+)/);
          if (match) {
            const count = parseInt(match[1]) || 1;
            const faces = parseInt(match[2]);
            for (let i = 0; i < count; i++) {
              const val = Math.floor(Math.random() * faces) + 1;
              total += val;
              results.push(val);
            }
          }
        }
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
