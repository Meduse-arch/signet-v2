import type { SignetAPI } from '../../../../core/services/SignetAPI';
import type { HexeSheetState } from '../../hooks/useHexeCharacterSheet';
import { Shield, Backpack, Trash2 } from 'lucide-react';
import type { HexeEquipment } from '../../types';
import { HexeItemImage } from '../HexeImagePicker';
import { InventorySection } from './InventorySection';
import { EquipmentCard } from './EquipmentCard';
import { ArsenalPickerPanel } from './ArsenalPickerPanel';

export function InventoryTab({ sheet, api }: { sheet: HexeSheetState; api: SignetAPI }) {
  const { effectiveState, equippedItems, bagItems, legacyItems, totalBagCount, expandedEquip, toggleExpandEquip, toggleEquipped, handleRollWeapon, handleConsumeItem, updateEquipmentQty, setEditingEquipment, deleteEquipment, showArsenalPicker, setShowArsenalPicker, arsenalTemplates, pickerSearch, setPickerSearch, pickerSlot, setPickerSlot, addEquipmentFromArsenal, updateItemQty, deleteItem } = sheet;
  return (
      <div className="flex flex-col gap-6">
        {/* Barre discrète de poids et capacité */}
        <div className="flex items-center justify-between gap-3 bg-[#090a10] border border-white/10 rounded-xl px-3.5 py-2.5 shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
              <span>Poids :</span>
              <strong className={
                effectiveState.encumbrance.tier === 'overburdened'
                  ? 'text-rose-400 font-black'
                  : effectiveState.encumbrance.tier === 'heavy'
                  ? 'text-amber-400 font-black'
                  : 'text-white font-black'
              }>
                {effectiveState.encumbrance.totalWeight}
              </strong>
              <span className="text-slate-500 font-normal">/ {effectiveState.encumbrance.maxWeight} kg</span>
            </span>

            {/* Jauge visuelle */}
            <div className="w-20 sm:w-32 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10 shrink-0">
              <div
                className={`h-full transition-all duration-300 ${
                  effectiveState.encumbrance.tier === 'overburdened'
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.8)]'
                    : effectiveState.encumbrance.tier === 'heavy'
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.round(effectiveState.encumbrance.ratio * 100))}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {effectiveState.encumbrance.tier === 'light' ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                Charge normale
              </span>
            ) : effectiveState.encumbrance.tier === 'heavy' ? (
              <span
                className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full"
                title="Charge lourde (≥ 75%) : -1 au niveau effectif d'AGI"
              >
                -1 AGI (Lourd)
              </span>
            ) : (
              <span
                className="text-[10px] font-bold text-rose-300 bg-rose-950/70 border border-rose-800/50 px-2 py-0.5 rounded-full"
                title="Charge excessive (≥ 100%) : -2 au niveau effectif d'AGI et sprint impossible"
              >
                -2 AGI (Encombré)
              </span>
            )}
          </div>
        </div>

        {/* Section 1 — Équipements portés */}
        <InventorySection
          title="Équipements portés"
          icon={<Shield className="w-4 h-4 text-rose-400" />}
          count={equippedItems.length}
        >
          {equippedItems.length === 0 ? (
            <p className="text-xs italic text-slate-500 px-1 py-2">
              Aucun équipement porté. Équipez des armes, armures ou accessoires depuis votre sac ci-dessous.
            </p>
          ) : (
            equippedItems.map((equip: HexeEquipment) => (
              <EquipmentCard
                key={equip.id}
                equip={equip}
                api={api}
                expanded={expandedEquip.has(equip.id)}
                onToggleExpand={() => toggleExpandEquip(equip.id)}
                onToggleEquip={() => toggleEquipped(equip.id)}
                onRollWeapon={() => handleRollWeapon(equip)}
                onEdit={() => setEditingEquipment(equip)}
                onDelete={() => deleteEquipment(equip.id)}
              />
            ))
          )}
        </InventorySection>

        {/* Section 2 — Sac & Inventaire (UN SEUL TRUC UNIFIÉ avec + Arsenal) */}
        <InventorySection
          title="Sac & Inventaire"
          icon={<Backpack className="w-4 h-4 text-rose-400" />}
          count={totalBagCount}
          action={
            <button
              onClick={() => setShowArsenalPicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              {showArsenalPicker ? 'Fermer Arsenal' : '+ Arsenal'}
            </button>
          }
        >
          {/* Sélecteur Arsenal */}
          {showArsenalPicker && (
            <ArsenalPickerPanel
              templates={arsenalTemplates}
              search={pickerSearch}
              setSearch={setPickerSearch}
              slotFilter={pickerSlot}
              setSlotFilter={setPickerSlot}
              onSelect={addEquipmentFromArsenal}
              onOpenArsenalWindow={() => api.emit('SYSTEM_ACTION_TRIGGERED', 'hexe-arsenal')}
              onClose={() => setShowArsenalPicker(false)}
              api={api}
            />
          )}

          {totalBagCount === 0 && !showArsenalPicker ? (
            <p className="text-xs italic text-slate-500 px-1 py-2">
              Votre sac est vide. Cliquez sur "+ Arsenal" pour piocher une arme, armure, accessoire ou potion.
            </p>
          ) : (
            <>
              {/* Équipements en réserve & Consommables */}
              {bagItems.map((equip: HexeEquipment) => (
                <EquipmentCard
                  key={equip.id}
                  equip={equip}
                  api={api}
                  expanded={expandedEquip.has(equip.id)}
                  onToggleExpand={() => toggleExpandEquip(equip.id)}
                  onToggleEquip={() => toggleEquipped(equip.id)}
                  onRollWeapon={() => handleRollWeapon(equip)}
                  onConsume={() => handleConsumeItem(equip)}
                  onUpdateQty={(delta) => updateEquipmentQty(equip.id, delta)}
                  onEdit={() => setEditingEquipment(equip)}
                  onDelete={() => deleteEquipment(equip.id)}
                />
              ))}

              {/* Objets rétrocompatibles */}
              {legacyItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <HexeItemImage
                      src={item.imageUrl}
                      alt={item.name}
                      fallbackSlot="other"
                      className="w-7 h-7 rounded-lg shrink-0"
                      api={api}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate block">
                          {item.name}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-400 rounded px-1.5 py-0.5 leading-none shrink-0">
                          Objet
                        </span>
                        {item.weight !== undefined && item.weight > 0 && (
                          <span className="text-[9px] font-bold text-slate-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 leading-none shrink-0">
                            ⚖️ {item.quantity && item.quantity > 1 ? `${item.weight}×${item.quantity}=${Math.round(item.weight * item.quantity * 10)/10}` : item.weight} kg
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <span className="text-[10px] text-slate-400 italic truncate block mt-0.5">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg px-2 py-0.5">
                      <button
                        onClick={() => updateItemQty(item.id, -1)}
                        className="w-4 h-4 text-slate-400 hover:text-white font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-white w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItemQty(item.id, 1)}
                        className="w-4 h-4 text-slate-400 hover:text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </InventorySection>
      </div>
  );
}
