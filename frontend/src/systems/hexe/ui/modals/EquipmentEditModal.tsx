import { useState, useMemo, lazy, Suspense } from 'react';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import { Tag, Zap, X, Edit3, Plus } from 'lucide-react';
import type { HexeEquipment, HexeStatKey, HexeEquipmentSlot, HexeWeaponRank, HexeWeaponNature, HexeAbility } from '../../types';
import { ALL_STATS, STAT_LABELS } from '../../types';
import { parseDiceFormula, formatDiceFormula } from '../../hexeDiceEngine';
import { getEquipmentSkills } from '../../hexeSkillStore';
import { HexePentacleBadge, ALL_RANKS, RANK_DESCRIPTIONS } from '../HexePentacleBadge';
import { HexeImagePicker } from '../HexeImagePicker';
import { STAT_SHORT } from '../../constants';
const SkillImportModal = lazy(() => import('../SkillImportModal').then(m => ({ default: m.SkillImportModal })));

// ─── Modal d'Édition d'Équipement ─────────────────────────────────────────────

interface EquipmentEditModalProps {
  equipment: HexeEquipment;
  onSave: (updated: HexeEquipment) => void;
  onClose: () => void;
  api?: SignetAPI;
}

export function EquipmentEditModal({ equipment, onSave, onClose, api }: EquipmentEditModalProps) {
  const [name, setName] = useState(equipment.name);
  const [slot, setSlot] = useState<HexeEquipmentSlot>(equipment.slot);
  const [weight, setWeight] = useState<number | ''>(equipment.weight ?? '');
  const [imageUrl, setImageUrl] = useState<string>(equipment.imageUrl ?? '');
  const [quantity, setQuantity] = useState(equipment.quantity ?? 1);
  const [description, setDescription] = useState(equipment.description ?? '');
  const [rank, setRank] = useState<HexeWeaponRank>(equipment.rank || 'C');
  const [nature, setNature] = useState<HexeWeaponNature>(equipment.nature || 'classic');
  const [diceStr, setDiceStr] = useState(equipment.dice ? formatDiceFormula(equipment.dice) : '');
  const [statBonuses, setStatBonuses] = useState<Partial<Record<HexeStatKey, number>>>({ ...(equipment.statBonuses ?? {}) });
  const [properties, setProperties] = useState<string[]>([...(equipment.properties ?? [])]);
  const [abilities, setAbilities] = useState<HexeAbility[]>([...(equipment.abilities ?? [])]);
  const [abilityIds, setAbilityIds] = useState<string[]>([...(equipment.abilityIds ?? [])]);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form helpers
  const [newProp, setNewProp] = useState('');
  const [newBonusStat, setNewBonusStat] = useState<HexeStatKey>('str');
  const [newBonusVal, setNewBonusVal] = useState(1);

  const handleAddProp = () => {
    if (!newProp.trim()) return;
    if (!properties.includes(newProp.trim())) {
      setProperties(prev => [...prev, newProp.trim()]);
    }
    setNewProp('');
  };

  const handleRemoveProp = (prop: string) => {
    setProperties(prev => prev.filter(p => p !== prop));
  };

  const handleAddBonus = () => {
    setStatBonuses(prev => ({
      ...prev,
      [newBonusStat]: (prev[newBonusStat] || 0) + newBonusVal
    }));
  };

  const handleRemoveBonus = (statKey: HexeStatKey) => {
    setStatBonuses(prev => {
      const next = { ...prev };
      delete next[statKey];
      return next;
    });
  };

  const handleRemoveSkill = (id: string) => {
    setAbilityIds(prev => prev.filter(x => x !== id));
    setAbilities(prev => prev.filter(a => a.id !== id));
  };

  const handleImportSkills = (newIds: string[]) => {
    setAbilityIds(prev => Array.from(new Set([...prev, ...newIds])));
  };

  const linkedSkills = useMemo(() => {
    return getEquipmentSkills({ abilityIds, abilities });
  }, [abilityIds, abilities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedDice = diceStr.trim() ? parseDiceFormula(diceStr.trim()) : undefined;

    onSave({
      ...equipment,
      name: name.trim(),
      slot,
      weight: typeof weight === 'number' && weight >= 0 ? weight : (weight === '' ? undefined : Number(weight) || 0),
      imageUrl: imageUrl.trim() || undefined,
      quantity: slot === 'consumable' ? Math.max(1, quantity) : equipment.quantity,
      description: description.trim() || undefined,
      rank,
      nature,
      symbol: {
        orientation: nature === 'classic' ? 'upright' : 'inverted',
        filled: nature === 'possessed',
        hasCircle: rank === 'S'
      },
      dice: parsedDice || undefined,
      statBonuses,
      properties,
      abilities,
      abilityIds
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#090a10] border border-white/15 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#050508]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Modifier l'équipement</h3>
              <p className="text-[11px] text-slate-400">Personnalisation sur la fiche du joueur</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          {/* Nom, Slot & Poids */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Nom de l'objet *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Type / Slot</label>
              <select
                value={slot}
                onChange={e => setSlot(e.target.value as HexeEquipmentSlot)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="weapon">Arme</option>
                <option value="armor">Armure</option>
                <option value="accessory">Accessoire</option>
                <option value="consumable">Consommable</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Poids unit. (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={weight}
                onChange={e => setWeight(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          {/* Illustration de l'équipement */}
          <HexeImagePicker
            label="Illustration de l'équipement"
            imageUrl={imageUrl}
            onChange={(url) => setImageUrl(url || '')}
            fallbackSlot={slot}
            api={api}
          />

          {slot === 'consumable' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Quantité</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                className="w-24 bg-[#050508] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Section Rangs & Pentacles — Applicable à tous les équipements */}
          <div className="border border-white/10 rounded-xl p-3 bg-black/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Symbolique & Rang (Pentacle Hexe)
                </label>
                <p className="text-[10px] text-slate-500">1 à 5 branches du pentacle ou anneau pour le rang ultime</p>
              </div>
              <HexePentacleBadge
                rank={rank}
                nature={nature}
                size={36}
                showLabel={true}
              />
            </div>

            {/* Rangs graphiques : aucun texte alphabétique */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">
                Rang ({RANK_DESCRIPTIONS[rank]})
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                {ALL_RANKS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRank(r)}
                    className={`py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all ${
                      rank === r
                        ? 'bg-rose-950/70 border-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                        : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <HexePentacleBadge
                      rank={r}
                      nature={nature}
                      symbol={{
                        orientation: nature === 'classic' ? 'upright' : 'inverted',
                        filled: nature === 'possessed',
                        hasCircle: r === 'S'
                      }}
                      size={24}
                    />
                    <span className="text-[9px] font-bold text-center leading-tight">
                      {RANK_DESCRIPTIONS[r]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nature / Volonté */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">
                Nature de la Volonté
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setNature('classic')}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    nature === 'classic'
                      ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                      : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] font-bold">Classique</div>
                  <div className="text-[9px] text-slate-500">Volonté du porteur</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNature('ego')}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    nature === 'ego'
                      ? 'bg-amber-950/60 border-amber-500/80 text-amber-300'
                      : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] font-bold">Ego</div>
                  <div className="text-[9px] text-slate-500">Volonté de l'objet</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNature('possessed')}
                  className={`p-2 rounded-lg text-left border transition-all ${
                    nature === 'possessed'
                      ? 'bg-red-950/70 border-red-500/80 text-red-300'
                      : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] font-bold">Possédée</div>
                  <div className="text-[9px] text-slate-500">Entité résidente</div>
                </button>
              </div>
            </div>

            {/* Formule de dés (facultative) */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">
                Formule de dés de base (Facultatif, ex: 1d8, 2d6+2)
              </label>
              <input
                type="text"
                placeholder="Facultatif (ex: 1d8, 2d6+2...)"
                value={diceStr}
                onChange={e => setDiceStr(e.target.value)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description narrative ou historique..."
              className="w-full bg-[#050508] border border-white/10 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          {/* Bonus de statistiques */}
          <div className="border border-white/10 rounded-xl p-3 bg-black/30 space-y-2.5">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Bonus de Statistiques</label>
            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
              {Object.entries(statBonuses).length === 0 ? (
                <span className="text-[11px] italic text-slate-500">Aucun bonus direct appliqué.</span>
              ) : (
                (Object.entries(statBonuses) as [HexeStatKey, number][]).map(([st, val]) => (
                  <span
                    key={st}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 rounded-lg px-2 py-0.5"
                  >
                    <span>{STAT_SHORT[st]} +{val}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBonus(st)}
                      className="text-emerald-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5 flex-wrap">
              <select
                value={newBonusStat}
                onChange={e => setNewBonusStat(e.target.value as HexeStatKey)}
                className="bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-rose-500"
              >
                {ALL_STATS.map(s => (
                  <option key={s} value={s}>{STAT_LABELS[s] || s}</option>
                ))}
              </select>
              <input
                type="number"
                min={-99}
                max={99}
                value={newBonusVal}
                onChange={e => setNewBonusVal(parseInt(e.target.value) || 0)}
                className="w-16 bg-[#050508] border border-white/10 rounded-lg px-2 py-1 text-center text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddBonus}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 rounded-lg font-bold transition-colors"
              >
                + Bonus
              </button>
            </div>
          </div>

          {/* Propriétés */}
          <div className="border border-white/10 rounded-xl p-3 bg-black/30 space-y-2.5">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Propriétés / Mots-clés</label>
            <div className="flex flex-wrap gap-1.5 min-h-[24px]">
              {properties.length === 0 ? (
                <span className="text-[11px] italic text-slate-500">Aucune propriété.</span>
              ) : (
                properties.map(p => (
                  <span
                    key={p}
                    className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5"
                  >
                    <Tag className="w-2.5 h-2.5 text-rose-400" />
                    <span>{p}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProp(p)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <input
                type="text"
                placeholder="Ex: tranchante, occulte, sacrée..."
                value={newProp}
                onChange={e => setNewProp(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddProp(); } }}
                className="flex-1 bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddProp}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 rounded-lg font-bold transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Capacités spéciales */}
          <div className="border border-white/10 rounded-xl p-3 bg-black/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Capacités spéciales ({linkedSkills.length})
                </label>
                <p className="text-[10px] text-slate-500">
                  Capacités associées depuis le Grimoire ou le catalogue Hexe
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>+ Importer une capacité</span>
              </button>
            </div>

            {linkedSkills.length === 0 ? (
              <div className="p-3 border border-dashed border-white/10 rounded-lg bg-[#050508] text-center">
                <p className="text-slate-400 text-xs">Aucune capacité spéciale sur cet équipement.</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Cliquez sur « + Importer une capacité » pour piocher dans le Grimoire sans créer de doublon.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedSkills.map(ab => (
                  <div
                    key={ab.id}
                    className="bg-slate-900/90 border-l-2 border-rose-500 border border-white/10 rounded-lg p-2.5 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Zap className="w-3 h-3 text-rose-400 shrink-0" />
                        <span className="font-bold text-rose-300">{ab.name}</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                          ab.activationType === 'passive'
                            ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                            : ab.activationType === 'toggle'
                            ? 'bg-amber-950/60 border-amber-800/40 text-amber-300'
                            : 'bg-rose-950/60 border-rose-800/40 text-rose-300'
                        }`}>
                          {ab.activationType === 'toggle' ? 'Toggle' : ab.activationType === 'active' ? 'Actif' : 'Passif'}
                        </span>
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
                      {ab.description && (
                        <p className="text-[11px] text-slate-300 mt-0.5">{ab.description}</p>
                      )}
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
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(ab.id)}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors"
                      title="Retirer cette capacité de l'équipement"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-[0_0_12px_rgba(225,29,72,0.35)] transition-all"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      {showImportModal && (
        <Suspense fallback={null}>
        <SkillImportModal
          alreadyLinkedIds={linkedSkills.map(s => s.id)}
          onImportSkillIds={handleImportSkills}
          onClose={() => setShowImportModal(false)}
        />
        </Suspense>
      )}
    </div>
  );
}

// ─── Modal d'Édition de Compétence ───────────────────────────────────────────

