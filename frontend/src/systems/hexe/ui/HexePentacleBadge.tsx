import type { HexeWeaponRank, HexeWeaponNature, HexeWeaponSymbol } from '../types';

interface HexePentacleBadgeProps {
  rank?: HexeWeaponRank;
  nature?: HexeWeaponNature;
  symbol?: HexeWeaponSymbol;
  size?: number; // taille en px, ex 24, 32
  showLabel?: boolean;
  className?: string;
}

/**
 * Composant de rendu géométrique pour la symbolique des armes de Hexe (Section 8) :
 * - Rangs F (1 branche), D (2), C (3), B (4), A (5), S (avec cercle)
 * - Orientation : droit (classique), inversé (Ego), inversé plein (possédée)
 */
export function HexePentacleBadge({
  rank = 'C',
  nature = 'classic',
  symbol,
  size = 28,
  showLabel = false,
  className = ''
}: HexePentacleBadgeProps) {
  // Détermination de l'orientation et remplissage (depuis symbol ou déduit de nature)
  const orientation = symbol?.orientation || (nature === 'classic' ? 'upright' : 'inverted');
  const isFilled = symbol?.filled ?? (nature === 'possessed');
  const hasCircle = symbol?.hasCircle ?? (rank === 'S');

  // Nombre de branches selon le rang
  const branchCountMap: Record<HexeWeaponRank, number> = {
    F: 1,
    D: 2,
    C: 3,
    B: 4,
    A: 5,
    S: 5
  };
  const branches = branchCountMap[rank] || 3;

  // Calcul des coordonnées des 5 sommets d'un pentagramme standard centré en (50, 50) de rayon 38
  const cx = 50;
  const cy = 50;
  const r = 38;
  const angleOffset = orientation === 'upright' ? -Math.PI / 2 : Math.PI / 2;

  // Génère les 5 points du cercle
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = angleOffset + (i * 2 * Math.PI) / 5;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }

  // Ordre des sommets connectés du pentagramme (sauts de 2) : 0 -> 2 -> 4 -> 1 -> 3 -> 0
  const starOrder = [0, 2, 4, 1, 3, 0];
  const starLines = [];
  for (let i = 0; i < Math.min(branches, 5); i++) {
    const p1 = points[starOrder[i]];
    const p2 = points[starOrder[i + 1]];
    starLines.push(`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`);
  }

  // Polygone complet si plein (arme possédée)
  const fullPolygonPoints = starOrder.slice(0, 5).map(idx => `${points[idx].x},${points[idx].y}`).join(' ');

  // Couleurs selon nature
  const colorMap = {
    classic: { stroke: '#fb7185', fill: 'rgba(244,63,94,0.15)', glow: 'rgba(244,63,94,0.3)', text: 'Classique' },
    ego: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.2)', glow: 'rgba(245,158,11,0.3)', text: 'Arme d\'Ego' },
    possessed: { stroke: '#dc2626', fill: 'rgba(220,38,38,0.7)', glow: 'rgba(220,38,38,0.5)', text: 'Possédée' }
  };
  const currentColors = colorMap[nature] || colorMap.classic;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} title={`Arme de Rang ${rank} — ${currentColors.text}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="shrink-0 drop-shadow-[0_0_8px_rgba(225,29,72,0.3)] transition-transform hover:scale-110"
      >
        {/* Cercle pour le rang S */}
        {hasCircle && (
          <circle
            cx={cx}
            cy={cy}
            r={r + 6}
            fill="none"
            stroke={currentColors.stroke}
            strokeWidth="3.5"
            strokeDasharray="none"
            opacity="0.9"
          />
        )}

        {/* Fond / remplissage pour arme possédée */}
        {isFilled && branches >= 5 ? (
          <polygon
            points={fullPolygonPoints}
            fill={currentColors.fill}
            stroke={currentColors.stroke}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        ) : (
          /* Tracé des branches du rang */
          <path
            d={starLines.join(' ')}
            fill={isFilled ? currentColors.fill : 'none'}
            stroke={currentColors.stroke}
            strokeWidth={isFilled ? '5' : '4.5'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Sommets connectés visibles */}
        {starOrder.slice(0, Math.min(branches + 1, 5)).map((idx) => (
          <circle
            key={idx}
            cx={points[idx].x}
            cy={points[idx].y}
            r={isFilled ? '3.5' : '3'}
            fill={currentColors.stroke}
          />
        ))}
      </svg>

      {showLabel && (
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-black text-white uppercase tracking-wider">
            Rang {rank}
          </span>
          <span className="text-[9px] font-semibold text-slate-400 capitalize">
            {nature}
          </span>
        </div>
      )}
    </div>
  );
}
