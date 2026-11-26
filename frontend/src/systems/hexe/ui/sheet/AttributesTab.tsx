import type { HexeSheetState } from '../../hooks/useHexeCharacterSheet';
import type { HexeStatKey } from '../../types';
import { ALL_STATS, STAT_LABELS, getDiceForLevel } from '../../types';
import { STAT_SHORT } from '../../constants';

export function AttributesTab({ sheet }: { sheet: HexeSheetState }) {
  const { char, effectiveState, updateStat, rollStat } = sheet;
  return (
        <div className="relative">
          {/* Pentagramme en filigrane cramoisi éclatant (couleur logo Signet/Hexe #e11d48) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-35 sm:opacity-40">
            <svg
              viewBox="0 0 100 100"
              className="w-72 h-72 sm:w-80 sm:h-80 drop-shadow-[0_0_24px_rgba(225,29,72,0.65)] transition-transform duration-700 group-hover:scale-105"
            >
              {/* Anneaux extérieurs et cercles ésotériques */}
              <circle cx="50" cy="50" r="47" stroke="#e11d48" strokeWidth="1" fill="none" opacity="0.6" />
              <circle cx="50" cy="50" r="44" stroke="#e11d48" strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.8" />
              <circle cx="50" cy="50" r="24" stroke="#e11d48" strokeWidth="1" strokeDasharray="1.5 1.5" fill="none" opacity="0.5" />
              
              {/* Pentagramme complet tracé avec ses branches d'entrelacs */}
              <polygon
                points="50,4 62.5,38.5 98.5,38.5 69.5,60 80.5,95 50,73.5 19.5,95 30.5,60 1.5,38.5 37.5,38.5"
                fill="#e11d48"
                fillOpacity="0.08"
                stroke="#e11d48"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />

              {/* Sommets illuminés en rouge cramoisi néon */}
              {[
                { x: 50, y: 4 },
                { x: 98.5, y: 38.5 },
                { x: 80.5, y: 95 },
                { x: 19.5, y: 95 },
                { x: 1.5, y: 38.5 }
              ].map((pt, idx) => (
                <circle key={idx} cx={pt.x} cy={pt.y} r="2.2" fill="#e11d48" stroke="#050508" strokeWidth="0.8" />
              ))}

              {/* Noyau central du pentagramme */}
              <circle cx="50" cy="50" r="3" fill="#e11d48" opacity="0.85" />
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2.5 relative z-10">
            {ALL_STATS.map(stat => {
              const baseLevel = char.stats[stat]?.level || 1;
              const effectiveLevel = effectiveState.levels[stat] || baseLevel;
              const effectiveDice = effectiveState.dice[stat] || getDiceForLevel(effectiveLevel);
              const bonus = effectiveLevel - baseLevel;
              const hasBonus = bonus > 0;

            return (
              <div
                key={stat}
                className="bg-[#090a10]/80 backdrop-blur-md border border-white/10 hover:border-rose-500/40 hover:bg-[#090a10]/90 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between gap-2 transition-all group shadow-sm min-w-0"
              >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs text-white truncate">
                  {STAT_LABELS[stat].split(' ')[0]}
                </span>
                <span className="text-[9px] font-black uppercase text-rose-400 tracking-wider bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.5 rounded shrink-0">
                  {STAT_SHORT[stat as HexeStatKey]}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/5">
                {/* Contrôle de niveau */}
                <div className="flex items-center gap-1 bg-[#050508] px-1.5 py-1 rounded-lg border border-white/10 shrink-0">
                  <button
                    onClick={() => updateStat(stat, -1)}
                    className="w-4 h-4 rounded text-slate-400 hover:text-white font-bold flex items-center justify-center text-xs"
                    title="Diminuer niveau"
                  >
                    -
                  </button>
                  <div className="flex items-center gap-0.5 px-0.5">
                    <span className="font-black text-xs text-white leading-none">
                      {baseLevel}
                    </span>
                    {hasBonus && (
                      <span className="text-[9px] font-bold text-emerald-400 leading-none">
                        +{bonus}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => updateStat(stat, 1)}
                    className="w-4 h-4 rounded text-slate-400 hover:text-white font-bold flex items-center justify-center text-xs"
                    title="Augmenter niveau"
                  >
                    +
                  </button>
                </div>

                {/* Bouton de jet de dé */}
                <button
                  onClick={() => rollStat(stat as HexeStatKey)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap shrink-0 ml-auto"
                  title={`Lancer ${effectiveDice} pour ${STAT_LABELS[stat]}`}
                >
                  <span className="text-[11px]">🎲</span>
                  <span>{effectiveDice}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
