import { memo } from 'react';
import { getEquipmentSkills } from '../../hexeSkillStore';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import { Trash2, ChevronDown, ChevronUp, Package, Tag, Zap, FlaskConical, Edit3, Dices } from 'lucide-react';
import type { HexeEquipment, HexeStatKey } from '../../types';
import { SLOT_LABELS } from '../../types';
import { formatDiceFormula } from '../../hexeDiceEngine';
import { HexePentacleBadge } from '../HexePentacleBadge';
import { HexeItemImage, HexeItemDetailBanner } from '../HexeImagePicker';
import { STAT_SHORT } from '../../constants';

interface EquipmentCardProps {
  equip: HexeEquipment;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  onToggleEquip: (id: string) => void;
  onRollWeapon?: (equip: HexeEquipment) => void;
  onConsume?: (equip: HexeEquipment) => void;
  onUpdateQty?: (id: string, delta: number) => void;
  onEdit?: (equip: HexeEquipment) => void;
  onDelete: (id: string) => void;
  api?: SignetAPI;
}

export const EquipmentCard = memo(function EquipmentCard({
  equip, expanded, onToggleExpand, onToggleEquip, onRollWeapon, onConsume, onUpdateQty, onEdit, onDelete, api
}: EquipmentCardProps) {
  const bonusEntries = Object.entries(equip.statBonuses ?? {}) as [HexeStatKey, number][];
  const linkedSkills = getEquipmentSkills(equip);
  const hasDetails = linkedSkills.length > 0 || (equip.properties?.length ?? 0) > 0 || !!equip.description || !!equip.imageUrl || equip.slot === 'weapon';
  const isConsumable = equip.slot === 'consumable';

  return (
    <div className={`bg-[#090a10] border rounded-xl overflow-hidden transition-all ${equip.isEquipped ? 'border-rose-500/60 shadow-[0_0_15px_rgba(225,29,72,0.15)]' : 'border-white/10'}`}>
      <div className="p-3 flex flex-col gap-2">
        {/* Ligne 1 : Miniature, Nom, Badge Slot, Poids et Bonus */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <HexeItemImage
              src={equip.imageUrl}
              alt={equip.name}
              fallbackSlot={equip.slot}
              className="w-9 h-9 rounded-lg shrink-0 mt-0.5"
              api={api}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-white truncate">{equip.name}</span>
                <HexePentacleBadge
                  rank={equip.rank || 'C'}
                  nature={equip.nature || 'classic'}
                  symbol={equip.symbol}
                  size={20}
                />
                <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 leading-none shrink-0 flex items-center gap-1 border ${
                  isConsumable
                    ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                    : equip.slot === 'other'
                      ? 'bg-sky-950/50 border-sky-700/40 text-sky-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                }`}>
                  {isConsumable && <FlaskConical className="w-2.5 h-2.5" />}
                  {equip.slot === 'other' && <Package className="w-2.5 h-2.5" />}
                  {SLOT_LABELS[equip.slot]}
                </span>

                {equip.weight !== undefined && equip.weight > 0 && (
                  <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 leading-none shrink-0" title="Poids unitaire / total">
                    ⚖️ {equip.quantity && equip.quantity > 1 ? `${equip.weight}×${equip.quantity}=${Math.round(equip.weight * equip.quantity * 10)/10}` : equip.weight} kg
                  </span>
                )}
              </div>

              {bonusEntries.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {bonusEntries.map(([stat, val]) => (
                    <span key={stat} className="text-[9px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.2 leading-tight">
                      {STAT_SHORT[stat]} +{val}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bouton déplier détails si présents */}
          {hasDetails && (
            <button
              onClick={() => onToggleExpand(equip.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title="Détails"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Ligne 2 : Actions et contrôles */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/5 flex-wrap">
          {/* Tags ou statut */}
          <div className="flex items-center gap-1 overflow-hidden">
            {(equip.properties || []).slice(0, 2).map(p => (
              <span key={p} className="text-[9px] text-slate-400 bg-white/5 border border-white/5 rounded-full px-1.5 py-0.2 truncate max-w-[80px]">
                {p}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {isConsumable ? (
              <>
                <div className="flex items-center gap-1 bg-[#050508] border border-white/10 rounded-lg px-1.5 py-0.5">
                  <button
                    onClick={() => onUpdateQty && onUpdateQty(equip.id, -1)}
                    className="w-4 h-4 text-slate-400 hover:text-white font-bold text-xs"
                    title="Diminuer"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-white w-4 text-center">
                    {equip.quantity ?? 1}
                  </span>
                  <button
                    onClick={() => onUpdateQty && onUpdateQty(equip.id, 1)}
                    className="w-4 h-4 text-slate-400 hover:text-white font-bold text-xs"
                    title="Augmenter"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => onConsume?.(equip)}
                  className="px-2 py-1 text-[10px] font-bold rounded-lg transition-colors bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] whitespace-nowrap"
                  title="Consommer"
                >
                  <FlaskConical className="w-3 h-3" />
                  <span>Utiliser</span>
                </button>
              </>
            ) : (
              <>
                {equip.slot === 'weapon' && equip.dice && onRollWeapon && (
                  <button
                    onClick={() => onRollWeapon(equip)}
                    className="px-2 py-1 text-[10px] font-bold rounded-lg transition-colors bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 flex items-center gap-1 shadow-sm whitespace-nowrap"
                    title={`Lancer les dés (${formatDiceFormula(equip.dice)})`}
                  >
                    <Dices className="w-3 h-3 text-rose-400" />
                    <span>{formatDiceFormula(equip.dice)}</span>
                  </button>
                )}
                <button
                  onClick={() => onToggleEquip(equip.id)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors whitespace-nowrap ${
                    equip.isEquipped
                      ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] hover:bg-rose-500'
                      : 'bg-white/5 text-slate-300 hover:bg-white/15 border border-white/10'
                  }`}
                >
                  {equip.isEquipped ? 'Porté' : 'Équiper'}
                </button>
              </>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(equip)}
                className="p-1 rounded text-slate-500 hover:text-white transition-colors"
                title="Modifier cet équipement sur la fiche"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onDelete(equip.id)}
              className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 bg-black/40 space-y-2">
          {equip.imageUrl ? (
            <HexeItemDetailBanner
              src={equip.imageUrl}
              alt={equip.name}
              fallbackSlot={equip.slot}
              className="w-full h-36 sm:h-44 rounded-xl mb-2"
              api={api}
            />
          ) : null}

          {equip.description && (
            <p className="text-xs italic text-slate-400">{equip.description}</p>
          )}

          {equip.rank && (
            <div className="bg-black/50 border border-white/10 rounded-lg p-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <HexePentacleBadge
                  rank={equip.rank || 'C'}
                  nature={equip.nature || 'classic'}
                  symbol={equip.symbol}
                  size={32}
                  showLabel={true}
                />
                <div className="text-[11px] text-slate-300">
                  {equip.nature === 'ego'
                    ? "Objet d'Ego : Volonté propre de l'objet."
                    : equip.nature === 'possessed'
                    ? "Objet Possédé : Entité occulte résidente."
                    : "Objet Classique : Volonté directrice du porteur."}
                </div>
              </div>
              {equip.dice && (
                <span className="text-[10px] font-black text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-1 rounded shrink-0">
                  🎲 {formatDiceFormula(equip.dice)}
                </span>
              )}
            </div>
          )}

          {(equip.properties?.length ?? 0) > 0 && (
            <div className="flex gap-1 flex-wrap">
              {equip.properties!.map(p => (
                <span key={p} className="text-[9px] font-medium bg-white/5 border border-white/10 text-slate-300 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5 text-rose-400" /> {p}
                </span>
              ))}
            </div>
          )}

          {linkedSkills.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                Capacités spéciales ({linkedSkills.length}) :
              </span>
              {linkedSkills.map(ab => (
                <div key={ab.id} className="bg-slate-900/90 border-l-2 border-rose-500 border border-white/10 rounded p-2 text-xs">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="text-xs font-bold text-rose-300">{ab.name}</span>
                      {ab.activationType && (
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                          ab.activationType === 'passive'
                            ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                            : ab.activationType === 'toggle'
                            ? 'bg-amber-950/60 border-amber-800/40 text-amber-300'
                            : 'bg-rose-950/60 border-rose-800/40 text-rose-300'
                        }`}>
                          {ab.activationType === 'toggle' ? 'Toggle' : ab.activationType === 'active' ? 'Actif' : 'Passif'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {ab.dice && (
                        <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                          🎲 {formatDiceFormula(ab.dice)}
                        </span>
                      )}
                      {ab.costs?.mp && (
                        <span className="text-[9px] text-blue-300 bg-blue-950/60 px-1 rounded">
                          {ab.costs.mp} MP
                        </span>
                      )}
                      {ab.costs?.stm && (
                        <span className="text-[9px] text-emerald-300 bg-emerald-950/60 px-1 rounded">
                          {ab.costs.stm} STM
                        </span>
                      )}
                      {ab.costs?.hp && (
                        <span className="text-[9px] text-rose-300 bg-rose-950/60 px-1 rounded">
                          {ab.costs.hp} HP
                        </span>
                      )}
                      {ab.costs?.chance && (
                        <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1 rounded">
                          {ab.costs.chance} Chance
                        </span>
                      )}
                    </div>
                  </div>
                  {ab.description && <p className="text-xs text-slate-300 mt-0.5">{ab.description}</p>}
                  {ab.conditions?.length ? (
                    <p className="text-[10px] italic text-amber-400/90 mt-0.5">Condition : {ab.conditions.join(', ')}</p>
                  ) : null}
                  {ab.effects?.length ? (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {ab.effects.map((eff, i) => (
                        <span key={i} className="text-[9px] text-slate-300 bg-white/5 border border-white/10 rounded px-1.5 py-0.2">
                          {eff.type === 'statLevel' && `${STAT_SHORT[eff.stat]} ${eff.value > 0 ? `+${eff.value}` : eff.value}`}
                          {eff.type === 'rollModifier' && `Jet ${eff.value > 0 ? `+${eff.value}` : eff.value}`}
                          {eff.type === 'resourceChange' && `${eff.operation} ${eff.resource.toUpperCase()}`}
                          {eff.type === 'carryCapacity' && `Port ${eff.value > 0 ? `+${eff.value}` : eff.value}${eff.modifierType === 'percent' ? '%' : 'kg'}`}
                          {eff.type === 'custom' && eff.description}
                        </span>
                      ))}
                    </div>
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

