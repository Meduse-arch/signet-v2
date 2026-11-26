import { memo } from 'react';
import { Edit3, Copy, Trash2, ChevronDown, ChevronUp, Tag, Zap } from 'lucide-react';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import type { HexeStatKey } from '../../types';
import { SLOT_LABELS } from '../../types';
import type { HexeEquipmentTemplate } from '../../hexeEquipmentStore';
import { HexePentacleBadge, RANK_DESCRIPTIONS } from '../HexePentacleBadge';
import { HexeItemImage, HexeItemDetailBanner } from '../HexeImagePicker';
import { formatDiceFormula } from '../../hexeDiceEngine';
import { getEquipmentSkills } from '../../hexeSkillStore';
import { STAT_SHORT } from '../../constants';

interface ArsenalItemCardProps {
  item: HexeEquipmentTemplate;
  expanded: boolean;
  api?: SignetAPI;
  onToggleExpand: (id: string) => void;
  onEdit: (item: HexeEquipmentTemplate) => void;
  onDuplicate: (item: HexeEquipmentTemplate) => void;
  onDelete: (id: string, name: string) => void;
}

export const ArsenalItemCard = memo(function ArsenalItemCard({
  item, expanded: isExpanded, api, onToggleExpand, onEdit, onDuplicate, onDelete
}: ArsenalItemCardProps) {
  const bonusEntries = Object.entries(item.statBonuses || {}) as [HexeStatKey, number][];
  const isWeapon = item.slot === 'weapon';
  const itemSkills = getEquipmentSkills(item);
  const hasDetails = itemSkills.length > 0 || (item.properties?.length || 0) > 0 || !!item.description || isWeapon;

  return (
      <div
        key={item.id}
        className="bg-surface border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-[color,background-color,border-color,opacity,transform] group "
      >
        <div className="p-3 flex items-center justify-between gap-3">
          {/* Titre & Slot */}
          <div className="flex items-center gap-3 min-w-0">
            <HexeItemImage
              src={item.imageUrl}
              alt={item.name}
              fallbackSlot={item.slot}
              className="w-9 h-9 rounded-lg shrink-0"
              api={api}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                <span className="text-[11px] font-bold bg-white/5 border border-white/10 text-zinc-400 rounded-lg px-1.5 py-0.5 leading-none">
                  {SLOT_LABELS[item.slot]}
                </span>
                {item.weight !== undefined && (
                  <span className="text-[11px] font-bold text-zinc-300 bg-white/5 border border-white/10 rounded-lg px-1.5 py-0.5 leading-none">
                    {item.weight} kg
                  </span>
                )}
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-1.5 py-0.5">
                  <HexePentacleBadge
                    rank={item.rank || 'C'}
                    nature={item.nature || 'classic'}
                    symbol={item.symbol}
                    size={18}
                  />
                  <span className="text-[11px] font-bold text-rose-300">
                    {RANK_DESCRIPTIONS[item.rank || 'C']}
                  </span>
                  {item.dice && (
                    <span className="text-[11px] font-mono font-semibold text-amber-300 ml-1">
                      {formatDiceFormula(item.dice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Résumé des bonus et tags */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {bonusEntries.map(([stat, val]) => (
                  <span
                    key={stat}
                    className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded-lg px-1.5 py-0.2 leading-tight"
                  >
                    {STAT_SHORT[stat]} +{val}
                  </span>
                ))}

                {(item.properties || []).slice(0, 3).map(p => (
                  <span
                    key={p}
                    className="text-[11px] text-zinc-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.2"
                  >
                    {p}
                  </span>
                ))}
                {(item.properties || []).length > 3 && (
                  <span className="text-[11px] text-zinc-500">
                    +{(item.properties || []).length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {hasDetails && (
              <button
                onClick={() => onToggleExpand(item.id)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Voir les détails"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Modifier"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDuplicate(item)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-amber-400 transition-colors"
              title="Dupliquer"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(item.id, item.name)}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zone de détails dépliée */}
        {isExpanded && hasDetails && (
          <div className="px-3 pb-3 pt-1 border-t border-white/5 bg-black/30 space-y-2">
            {item.imageUrl ? (
              <HexeItemDetailBanner
                src={item.imageUrl}
                alt={item.name}
                fallbackSlot={item.slot}
                className="w-full h-40 sm:h-48 rounded-xl mb-2"
                api={api}
              />
            ) : null}

            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <HexePentacleBadge
                rank={item.rank || 'C'}
                nature={item.nature || 'classic'}
                symbol={item.symbol}
                size={32}
                showLabel={true}
              />
              <div className="text-xs">
                <div className="font-bold text-rose-200 flex items-center gap-2">
                  <span>{RANK_DESCRIPTIONS[item.rank || 'C']}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
                    {item.nature === 'ego' ? "D'Ego (Volonté de l'objet)" : item.nature === 'possessed' ? "Possédée (Entité résidente)" : "Classique (Volonté du porteur)"}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {item.dice ? (
                    <span>Formule de jet : <strong className="text-amber-300 font-mono">{formatDiceFormula(item.dice)}</strong></span>
                  ) : (
                    <span className=" text-zinc-500">Aucune formule de dés (facultative)</span>
                  )}
                </div>
              </div>
            </div>

            {item.description && (
              <p className="text-xs text-zinc-300 ">{item.description}</p>
            )}

            {(item.properties || []).length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-zinc-500 font-bold">
                  Propriétés :
                </span>
                {item.properties!.map(p => (
                  <span
                    key={p}
                    className="text-[11px] text-zinc-200 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1"
                  >
                    <Tag className="w-2.5 h-2.5 text-rose-400" />
                    {p}
                  </span>
                ))}
              </div>
            )}

            {itemSkills.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 font-bold block">
                  Capacités spéciales ({itemSkills.length}) :
                </span>
                {itemSkills.map(ab => (
                  <div
                    key={ab.id}
                    className="bg-surface-raised/80 border-l-2 border-rose-500 border border-white/10 rounded-lg p-2 text-xs"
                  >
                    <div className="font-bold text-rose-300 flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>{ab.name}</span>
                        {ab.activationType && (
                          <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
                            {ab.activationType === 'toggle' ? 'Toggle' : ab.activationType === 'active' ? 'Actif' : 'Passif'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {ab.dice && (
                          <span className="text-[11px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded-lg">
                            {formatDiceFormula(ab.dice)}
                          </span>
                        )}
                        {ab.costs?.mp && (
                          <span className="text-[11px] text-blue-300 bg-blue-950/60 px-1 rounded-lg">
                            {ab.costs.mp} MP
                          </span>
                        )}
                        {ab.costs?.stm && (
                          <span className="text-[11px] text-emerald-300 bg-emerald-950/60 px-1 rounded-lg">
                            {ab.costs.stm} STM
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-zinc-300 mt-0.5">{ab.description}</p>
                    {ab.conditions?.length ? (
                      <p className="text-[11px] text-amber-400/90 mt-0.5">
                        Condition : {ab.conditions.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  );
});
