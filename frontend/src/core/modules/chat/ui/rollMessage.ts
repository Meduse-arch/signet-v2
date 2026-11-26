/** Résultat de jet extrait d'un message de chat (lecture seule, aucun nouveau tirage). */
export interface ParsedRoll {
  title: string;
  formula: string;
  total: number;
  note: string;
}

const clean = (t: string) => t.replace(/\*+/g, '').replace(/🎲/g, '').trim();

/** Reconnaît les messages de jet : « a lancé 2d20 : 17 » (/roll) et « … ➔ [ 17 ] » (fiches de système). */
export function parseRollMessage(text: string, type?: string): ParsedRoll | null {
  const slash = /^a lancé (.+?) : (-?\d+)$/.exec(text.trim());
  if (slash) {
    return { title: 'Jet', formula: slash[1], total: Number(slash[2]), note: '' };
  }
  if (type !== 'roll' && !text.includes('➔')) return null;

  const arrow = /➔\s*\**\[\s*(-?\d+)\s*\]\**/.exec(text);
  if (!arrow) return null;

  const before = text.slice(0, arrow.index);
  const after = clean(text.slice(arrow.index + arrow[0].length));
  const lines = before.split('\n').map(clean).filter(Boolean);
  if (lines.length === 0) return { title: 'Jet', formula: '', total: Number(arrow[1]), note: after };

  // Plusieurs lignes : titre puis formule ; une seule ligne : action + formule entre crochets éventuels
  if (lines.length > 1) {
    return { title: lines[0].replace(/\.{3}$/, ''), formula: lines[lines.length - 1], total: Number(arrow[1]), note: after };
  }
  const bracket = /^(.*?)\s*\[(.+?)\]\s*$/.exec(lines[0]);
  return bracket
    ? { title: bracket[1], formula: bracket[2], total: Number(arrow[1]), note: after }
    : { title: lines[0], formula: '', total: Number(arrow[1]), note: after };
}
