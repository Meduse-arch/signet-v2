import { useState } from 'react';
import { Plus, Edit3, X, Check, Tag, Zap, BookOpen } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import type { HexeEquipmentSlot, HexeStatKey, HexeSkill } from '../../types';
import { HexePentacleBadge, ALL_RANKS, RANK_DESCRIPTIONS } from '../HexePentacleBadge';
import { HexeImagePicker } from '../HexeImagePicker';
import { formatDiceFormula } from '../../hexeDiceEngine';
import { STAT_SHORT } from '../../constants';
import type { EquipmentFormState } from '../../constants';

const ALL_STATS: HexeStatKey[] = ['str', 'dex', 'agi', 'tec', 'vit', 'luc'];
const STAT_NAMES: Record<HexeStatKey, string> = {
  str: 'Force (STR)',
  dex: 'Dextérité (DEX)',
  agi: 'Agilité (AGI)',
  tec: 'Technique (TEC)',
  vit: 'Vitalité (VIT)',
  luc: 'Chance (LUC)'
};

interface ArsenalEditFormProps {
  form: EquipmentFormState;
  setForm: React.Dispatch<React.SetStateAction<EquipmentFormState>>;
  editingId: string | null;
  formLinkedSkills: HexeSkill[];
  api?: SignetAPI;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onOpenSkillImport: () => void;
}

export function ArsenalEditForm({
  form, setForm, editingId, formLinkedSkills, api, onSubmit, onCancel, onOpenSkillImport
}: ArsenalEditFormProps) {
  const [newProp, setNewProp] = useState('');
  const [newBonusStat, setNewBonusStat] = useState<HexeStatKey>('str');
  const [newBonusVal, setNewBonusVal] = useState(1);

  const addBonus = () => {
    setForm(prev => ({
      ...prev,
      statBonuses: {
        ...prev.statBonuses,
        [newBonusStat]: (prev.statBonuses[newBonusStat] || 0) + newBonusVal
      }
    }));
  };

  const removeBonus = (stat: HexeStatKey) => {
    setForm(prev => {
      const next = { ...prev.statBonuses };
      delete next[stat];
      return { ...prev, statBonuses: next };
    });
  };

  const addProperty = () => {
    const trimmed = newProp.trim();
    if (!trimmed || form.properties.includes(trimmed)) return;
    setForm(prev => ({ ...prev, properties: [...prev.properties, trimmed] }));
    setNewProp('');
  };

  const removeProperty = (prop: string) => {
    setForm(prev => ({ ...prev, properties: prev.properties.filter(p => p !== prop) }));
  };

  const handleRemoveLinkedSkill = (skillId: string) => {
    setForm(prev => ({
      ...prev,
      abilityIds: (prev.abilityIds || []).filter(id => id !== skillId),
      abilities: (prev.abilities || []).filter(a => a.id !== skillId)
    }));
  };

  return (
  <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-[#050508]">
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto space-y-4 bg-[#090a10] border border-white/10 rounded-xl p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
          {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {editingId ? 'Modifier l\'équipement' : 'Nouvel équipement dans l\'Arsenal'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nom & Slot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Nom de l'objet *
          </label>
          <input
            type="text"
            required
            placeholder="ex: Lame de l'Inquisiteur, Cotte de mailles..."
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Emplacement / Type
          </label>
          <select
            value={form.slot}
            onChange={e => setForm(prev => ({ ...prev, slot: e.target.value as HexeEquipmentSlot }))}
            className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          >
            <option value="weapon">Arme</option>
            <option value="armor">Armure</option>
            <option value="accessory">Accessoire</option>
            <option value="consumable">Consommable (Potion, élixir, parchemin...)</option>
            <option value="other">Autre (Relique, outil, objet de quête...)</option>
          </select>
        </div>
      </div>

      {/* Poids & Illustration de l'équipement */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Poids unitaire (kg / charge)
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="ex: 1.5 (défaut 0)"
            value={form.weight}
            onChange={e => setForm(prev => ({ ...prev, weight: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0) }))}
            className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          />
          <span className="text-[10px] text-slate-500 mt-1 block">
            Comptabilisé dans la charge maximale du personnage.
          </span>
        </div>

        <div className="sm:col-span-2">
          <HexeImagePicker
            value={form.imageUrl}
            onChange={val => setForm(p => ({ ...p, imageUrl: val }))}
            api={api}
            fallbackSlot={form.slot}
            label="Illustration de l'équipement"
          />
        </div>
      </div>

      {/* Section Rangs & Pentacles (Section 8) — Applicable à tous les équipements */}
      <div className="border border-white/10 rounded-lg p-3 bg-[#050508]/60 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Symbolique & Rang (Pentacle Hexe)
            </label>
            <p className="text-[11px] text-slate-500">1 à 5 branches du pentacle ou anneau pour le rang ultime</p>
          </div>
          <HexePentacleBadge
            rank={form.rank || 'C'}
            nature={form.nature || 'classic'}
            size={36}
            showLabel={true}
          />
        </div>

        {/* Rangs graphiques par branches : aucun affichage de lettre */}
        <div className="space-y-1.5">
          <label className="block text-[11px] text-slate-400 font-bold">
            Rang ({RANK_DESCRIPTIONS[form.rank || 'C']})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {ALL_RANKS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, rank: r }))}
                className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1.5 border transition-all ${
                  form.rank === r
                    ? 'bg-rose-950/70 border-rose-500 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                    : 'bg-[#090a10] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <HexePentacleBadge
                  rank={r}
                  nature={form.nature || 'classic'}
                  symbol={{
                    orientation: form.nature === 'classic' ? 'upright' : 'inverted',
                    filled: form.nature === 'possessed',
                    hasCircle: r === 'S'
                  }}
                  size={28}
                />
                <span className="text-[10px] font-bold text-center leading-tight">
                  {RANK_DESCRIPTIONS[r]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Nature / Volonté */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-400 font-bold">
            Nature de la Volonté
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, nature: 'classic' }))}
              className={`p-2 rounded-lg text-left border transition-all ${
                form.nature === 'classic'
                  ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                  : 'bg-[#090a10] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold">Classique</div>
              <div className="text-[10px] text-slate-500">Volonté du porteur</div>
            </button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, nature: 'ego' }))}
              className={`p-2 rounded-lg text-left border transition-all ${
                form.nature === 'ego'
                  ? 'bg-amber-950/60 border-amber-500/80 text-amber-300'
                  : 'bg-[#090a10] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold">Ego</div>
              <div className="text-[10px] text-slate-500">Volonté de l'objet</div>
            </button>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, nature: 'possessed' }))}
              className={`p-2 rounded-lg text-left border transition-all ${
                form.nature === 'possessed'
                  ? 'bg-red-950/70 border-red-500/80 text-red-300'
                  : 'bg-[#090a10] border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold">Possédée</div>
              <div className="text-[10px] text-slate-500">Entité résidente</div>
            </button>
          </div>
        </div>

        {/* Formule de dés (facultative) */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-400 font-bold">
            Formule de Dés de Base (Facultatif — Dégâts ou jet spécifique, ex: 1d8, 2d6, 2d4+2)
          </label>
          <input
            type="text"
            placeholder="Facultatif (ex: 1d8, 2d6+2...)"
            value={form.diceFormula || ''}
            onChange={e => setForm(prev => ({ ...prev, diceFormula: e.target.value }))}
            className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Bonus de statistiques */}
      <div className="border border-white/10 rounded-lg p-3 bg-[#050508]/60">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Bonus de Statistiques (Profil de renfort)
        </label>

        {/* Badges existants */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(form.statBonuses).length === 0 ? (
            <span className="text-xs italic text-slate-500">Aucun bonus direct (statuts/capacités pures).</span>
          ) : (
            Object.entries(form.statBonuses).map(([stat, val]) => (
              <span
                key={stat}
                className="inline-flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-600/50 text-emerald-300 text-xs font-bold px-2 py-1 rounded-md"
              >
                {STAT_SHORT[stat as HexeStatKey]} +{val}
                <button
                  type="button"
                  onClick={() => removeBonus(stat as HexeStatKey)}
                  className="hover:text-red-400 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Ajout d'un bonus */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={newBonusStat}
            onChange={e => setNewBonusStat(e.target.value as HexeStatKey)}
            className="bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
          >
            {ALL_STATS.map(s => (
              <option key={s} value={s}>{STAT_NAMES[s]}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 font-bold">+</span>
            <input
              type="number"
              min={1}
              max={10}
              value={newBonusVal}
              onChange={e => setNewBonusVal(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-rose-500"
            />
          </div>
          <button
            type="button"
            onClick={addBonus}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded text-slate-200 border border-white/10 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" /> Ajouter le bonus
          </button>
        </div>
      </div>

      {/* Propriétés / Mots-clés */}
      <div className="border border-white/10 rounded-lg p-3 bg-black/20">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Propriétés & Mots-clés (ex: légère, perforante, bénie, lourde...)
        </label>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {form.properties.length === 0 ? (
            <span className="text-xs italic text-slate-500">Aucune propriété.</span>
          ) : (
            form.properties.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1 bg-slate-800/80 border border-white/15 text-slate-200 text-xs px-2.5 py-1 rounded-full font-medium"
              >
                <Tag className="w-2.5 h-2.5 text-rose-400" />
                {p}
                <button
                  type="button"
                  onClick={() => removeProperty(p)}
                  className="hover:text-red-400 ml-1 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ajouter une propriété (ex: perforante)..."
            value={newProp}
            onChange={e => setNewProp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProperty(); } }}
            className="flex-1 bg-slate-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
          <button
            type="button"
            onClick={addProperty}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded text-slate-200 border border-white/10 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" /> Ajouter
          </button>
        </div>
      </div>

      {/* Capacités spéciales */}
      <div className="border border-white/10 rounded-lg p-3 bg-black/20 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Capacités spéciales ({formLinkedSkills.length})
            </label>
            <p className="text-[10px] text-slate-500">
              Capacités associées depuis le Grimoire ou le catalogue Hexe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (api) {
                  api.emit('SYSTEM_ACTION_TRIGGERED', 'hexe-grimoire');
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              title="Ouvrir le Grimoire pour forger de nouvelles compétences"
            >
              <BookOpen className="w-3 h-3 text-rose-400" />
              <span>Grimoire</span>
            </button>
            <button
              type="button"
              onClick={onOpenSkillImport}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Importer une capacité</span>
            </button>
          </div>
        </div>

        {formLinkedSkills.length === 0 ? (
          <div className="p-4 border border-dashed border-white/10 rounded-lg bg-black/30 text-center">
            <p className="text-xs text-slate-400">Aucune capacité spéciale associée.</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Cliquez sur « + Importer une capacité » pour lier une technique du catalogue sans doublon.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {formLinkedSkills.map(skill => (
              <div
                key={skill.id}
                className="bg-slate-900/90 border-l-2 border-rose-500 border border-white/10 rounded-lg p-2.5 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5 flex-wrap">
                    <Zap className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>{skill.name}</span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                      skill.activationType === 'passive'
                        ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                        : skill.activationType === 'toggle'
                        ? 'bg-amber-950/60 border-amber-800/40 text-amber-300'
                        : 'bg-rose-950/60 border-rose-800/40 text-rose-300'
                    }`}>
                      {skill.activationType === 'passive' ? 'Passif' : skill.activationType === 'toggle' ? 'Toggle' : 'Actif'}
                    </span>
                    {skill.dice && (
                      <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                        🎲 {formatDiceFormula(skill.dice)}
                      </span>
                    )}
                    {skill.costs?.mp && (
                      <span className="text-[9px] text-blue-300 bg-blue-950/60 px-1 rounded">
                        {skill.costs.mp} MP
                      </span>
                    )}
                    {skill.costs?.stm && (
                      <span className="text-[9px] text-emerald-300 bg-emerald-950/60 px-1 rounded">
                        {skill.costs.stm} STM
                      </span>
                    )}
                    {skill.costs?.hp && (
                      <span className="text-[9px] text-rose-300 bg-rose-950/60 px-1 rounded">
                        {skill.costs.hp} HP
                      </span>
                    )}
                    {skill.costs?.chance && (
                      <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1 rounded">
                        {skill.costs.chance} Chance
                      </span>
                    )}
                  </div>
                  {skill.description && (
                    <div className="text-xs text-slate-300 mt-0.5">{skill.description}</div>
                  )}
                  {skill.conditions?.length ? (
                    <div className="text-[10px] text-amber-400/90 italic mt-1 font-medium">
                      Condition : {skill.conditions.join(', ')}
                    </div>
                  ) : null}
                  {skill.effects?.length ? (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {skill.effects.map((eff, i) => (
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
                  onClick={() => handleRemoveLinkedSkill(skill.id)}
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

      {/* Description & Lore */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
          Description & Historique
        </label>
        <textarea
          rows={3}
          placeholder="Origine, particularités visuelles ou notes d'inquisition..."
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
        />
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-slate-400 hover:text-white text-xs"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 px-4 shadow-[0_0_15px_rgba(225,29,72,0.3)]"
        >
          <Check className="w-4 h-4 shrink-0" />
          {editingId ? 'Sauvegarder les modifications' : 'Enregistrer dans l\'Arsenal'}
        </Button>
      </div>
    </form>
  </div>
  );
}
