/** Dispositions de fenêtres (Libre / Combat) : deux emplacements que le joueur remplit lui-même en jouant. */
export type WindowLayoutId = 'free' | 'combat';

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface LayoutSnapshot {
  open: string[];
  pos: Record<string, LayoutPosition>;
}

// Position flottante courante de chaque fenêtre (renseignée par DraggableWindow)
const currentPositions = new Map<string, LayoutPosition>();

export const windowPositions = {
  set: (windowId: string, pos: LayoutPosition) => { currentPositions.set(windowId, pos); },
  get: (windowId: string) => currentPositions.get(windowId),
};

const STORAGE_KEY = 'signet_window_layouts';

const isPosition = (v: unknown): v is LayoutPosition =>
  typeof v === 'object' && v !== null && typeof (v as LayoutPosition).x === 'number' && typeof (v as LayoutPosition).y === 'number';

function isSnapshot(v: unknown): v is LayoutSnapshot {
  if (typeof v !== 'object' || v === null) return false;
  const { open, pos } = v as { open?: unknown; pos?: unknown };
  return Array.isArray(open) && open.every(id => typeof id === 'string')
    && typeof pos === 'object' && pos !== null && Object.values(pos).every(isPosition);
}

function load(): Partial<Record<WindowLayoutId, LayoutSnapshot>> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (typeof raw !== 'object' || raw === null) return {};
    const { free, combat } = raw as Record<string, unknown>;
    return { ...(isSnapshot(free) ? { free } : {}), ...(isSnapshot(combat) ? { combat } : {}) };
  } catch {
    return {};
  }
}

// Dispositions mémorisées, conservées d'une partie à l'autre
const saved = load();

export const layoutStore = {
  save: (id: WindowLayoutId, snapshot: LayoutSnapshot) => {
    saved[id] = snapshot;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (e) {
      console.error('[windowLayouts] Sauvegarde impossible', e);
    }
  },
  get: (id: WindowLayoutId) => saved[id],
};
