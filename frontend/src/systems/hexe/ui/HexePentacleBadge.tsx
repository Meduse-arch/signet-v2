import type { HexeWeaponRank, HexeWeaponNature, HexeWeaponSymbol } from '../types';
import { RANK_DESCRIPTIONS, ALL_RANKS, RANK_BRANCH_COUNTS } from '../types';

export { RANK_DESCRIPTIONS, ALL_RANKS };

interface HexePentacleBadgeProps {
  rank?: HexeWeaponRank;
  nature?: HexeWeaponNature;
  symbol?: HexeWeaponSymbol;
  size?: number; // taille en px, ex 20, 24, 32
  showLabel?: boolean;
  className?: string;
}

/**
 * Rendu géométrique SVG pour le système des pentacles de Hexe :
 * - Rangs représentés par leur nombre de branches (1 à 5 branches) et cercle pour le rang ultime.
 * - Aucune lettre alphabétique n'est affichée.
 * - Nature de la volonté :
 *   - Classique : pentacle droit (pointe vers le haut), non rempli.
 *   - Ego : pentacle inversé (pointe vers le bas), non rempli.
 *   - Possédée : pentacle inversé plein (entité résidente).
 *   - Cercle : présent pour le rang ultime (S) sur n'importe quelle nature.
 */
export function HexePentacleBadge({
  rank = 'C',
  nature = 'classic',
  symbol,
  size = 24,
  showLabel = false,
  className = ''
}: HexePentacleBadgeProps) {
  const orientation = symbol?.orientation || (nature === 'classic' ? 'upright' : 'inverted');
  const isFilled = symbol?.filled ?? (nature === 'possessed');
  const hasCircle = symbol?.hasCircle ?? (rank === 'S');
  const branches = RANK_BRANCH_COUNTS[rank] || 3;

  const cx = 50;
  const cy = 50;
  const r = 36;
  const angleOffset = orientation === 'upright' ? -Math.PI / 2 : Math.PI / 2;

  // Calcul des 5 sommets
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = angleOffset + (i * 2 * Math.PI) / 5;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }

  // Ordre des sommets connectés du pentagramme complet : 0 -> 2 -> 4 -> 1 -> 3 -> 0
  const starOrder = [0, 2, 4, 1, 3, 0];
  const fullPolygonPoints = starOrder.slice(0, 5).map(idx => `${points[idx].x},${points[idx].y}`).join(' ');

  // Couleurs selon nature
  const colorMap = {
    classic: {
      stroke: '#fb7185',
      fill: 'rgba(244,63,94,0.15)',
      glow: 'rgba(244,63,94,0.3)',
      text: 'Classique (Porteur)'
    },
    ego: {
      stroke: '#f59e0b',
      fill: 'rgba(245,158,11,0.2)',
      glow: 'rgba(245,158,11,0.3)',
      text: "D'Ego (Volonté propre)"
    },
    possessed: {
      stroke: '#e11d48',
      fill: 'rgba(225,29,72,0.7)',
      glow: 'rgba(225,29,72,0.5)',
      text: 'Possédée (Entité résidente)'
    }
  };
  const currentColors = colorMap[nature] || colorMap.classic;

  // Construction des tracés selon le nombre de branches (1 à 5)
  const renderBranches = () => {
    if (branches >= 5) {
      // 5 branches : le pentagramme complet
      if (isFilled) {
        return (
          <polygon
            points={fullPolygonPoints}
            fill={currentColors.fill}
            stroke={currentColors.stroke}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        );
      }
      const starLines = [];
      for (let i = 0; i < 5; i++) {
        const p1 = points[starOrder[i]];
        const p2 = points[starOrder[i + 1]];
        starLines.push(`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`);
      }
      return (
        <path
          d={starLines.join(' ')}
          fill="none"
          stroke={currentColors.stroke}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }

    // 1 à 4 branches : rayons émergeant du centre vers les sommets actifs + connexions
    const branchElements = [];

    // Rayons depuis le centre
    for (let i = 0; i < branches; i++) {
      const pt = points[i];
      branchElements.push(
        <line
          key={`ray-${i}`}
          x1={cx}
          y1={cy}
          x2={pt.x}
          y2={pt.y}
          stroke={currentColors.stroke}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      );
    }

    // Lignes connectant les sommets si branches >= 2
    if (branches >= 2) {
      for (let i = 0; i < branches - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        branchElements.push(
          <line
            key={`conn-${i}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={currentColors.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.8"
          />
        );
      }
    }

    return <g>{branchElements}</g>;
  };

  const rankLabel = RANK_DESCRIPTIONS[rank] || `${branches} branches`;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={`${rankLabel} — ${currentColors.text}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="shrink-0 drop-shadow-[0_0_6px_rgba(225,29,72,0.3)] transition-transform hover:scale-110"
      >
        {/* Anneau / Cercle pour le rang ultime (S) */}
        {hasCircle && (
          <circle
            cx={cx}
            cy={cy}
            r={r + 8}
            fill="none"
            stroke={currentColors.stroke}
            strokeWidth="3"
            opacity="0.95"
            className="animate-pulse"
          />
        )}

        {/* Sommets inactifs en filigrane discret pour repère visuel des 5 branches */}
        {points.map((pt, i) => (
          <circle
            key={`guide-${i}`}
            cx={pt.x}
            cy={pt.y}
            r="2"
            fill="rgba(255,255,255,0.15)"
          />
        ))}

        {/* Tracé actif des branches */}
        {renderBranches()}

        {/* Sommets actifs illuminés */}
        {points.slice(0, branches >= 5 ? 5 : branches).map((pt, i) => (
          <circle
            key={`active-pt-${i}`}
            cx={pt.x}
            cy={pt.y}
            r="3.5"
            fill={currentColors.stroke}
            stroke="#050508"
            strokeWidth="1"
          />
        ))}

        {/* Noyau central si 1 à 4 branches */}
        {branches < 5 && (
          <circle
            cx={cx}
            cy={cy}
            r="3.5"
            fill={currentColors.stroke}
          />
        )}
      </svg>

      {showLabel && (
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-bold text-slate-200">
            {rankLabel}
          </span>
          <span className="text-[9px] text-slate-400 capitalize">
            {nature === 'ego' ? "D'Ego" : nature === 'possessed' ? 'Possédée' : 'Classique'}
          </span>
        </div>
      )}
    </div>
  );
}
