import { useState } from 'react';
import { Zap, Shield, Flame, Trash2, Sparkles, Coins } from 'lucide-react';
import type { HexeEffect, HexeStatKey, HexeResourceKey, HexeActivationType } from '../../types';
import { ALL_STATS, STAT_LABELS } from '../../types';
import { STAT_SHORT } from '../../constants';
import { parseDiceFormula, formatDiceFormula } from '../../hexeDiceEngine';
import { HexeImagePicker } from '../HexeImagePicker';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import type { FormState } from './grimoireForm';

interface GrimoireSkillFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editingId: string | null;
  api: SignetAPI;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function GrimoireSkillForm({ form, setForm, editingId, api, onSubmit, onCancel }: GrimoireSkillFormProps) {
  // Effect builder state in form
  const [newEffectType, setNewEffectType] = useState<'statLevel' | 'rollModifier' | 'resourceChange' | 'carryCapacity' | 'custom'>('statLevel');
  const [newEffStat, setNewEffStat] = useState<HexeStatKey>('str');
  const [newEffStatVal, setNewEffStatVal] = useState<number>(1);
  const [newEffCapacityType, setNewEffCapacityType] = useState<'flat' | 'percent'>('flat');
  const [newEffCapacityVal, setNewEffCapacityVal] = useState<number>(5);
  const [newEffRollVal, setNewEffRollVal] = useState<number>(2);
  const [newEffRollCond, setNewEffRollCond] = useState<string>('');
  const [newEffRes, setNewEffRes] = useState<HexeResourceKey>('hp');
  const [newEffResTarget, setNewEffResTarget] = useState<'current' | 'maximum'>('current');
  const [newEffResOp, setNewEffResOp] = useState<'restore' | 'spend' | 'add' | 'set'>('restore');
  const [newEffResMode, setNewEffResMode] = useState<'value' | 'dice'>('value');
  const [newEffResVal, setNewEffResVal] = useState<number>(5);
  const [newEffResDice, setNewEffResDice] = useState<string>('2d4');
  const [newEffCustomDesc, setNewEffCustomDesc] = useState<string>('');

  const handleAddEffect = () => {
    let eff: HexeEffect | null = null;
    if (newEffectType === 'statLevel') {
      eff = {
        type: 'statLevel',
        stat: newEffStat,
        value: newEffStatVal
      };
    } else if (newEffectType === 'rollModifier') {
      eff = {
        type: 'rollModifier',
        value: newEffRollVal,
        condition: newEffRollCond.trim() || undefined
      };
    } else if (newEffectType === 'resourceChange') {
      if (newEffResMode === 'value') {
        eff = {
          type: 'resourceChange',
          resource: newEffRes,
          target: newEffResTarget,
          operation: newEffResOp,
          value: Number(newEffResVal) || 0
        };
      } else {
        const parsedD = parseDiceFormula(newEffResDice);
        if (parsedD) {
          eff = {
            type: 'resourceChange',
            resource: newEffRes,
            target: newEffResTarget,
            operation: newEffResOp,
            dice: parsedD
          };
        }
      }
    } else if (newEffectType === 'carryCapacity') {
      eff = {
        type: 'carryCapacity',
        modifierType: newEffCapacityType,
        value: Number(newEffCapacityVal) || 0
      };
    } else if (newEffectType === 'custom') {
      if (newEffCustomDesc.trim()) {
        eff = {
          type: 'custom',
          description: newEffCustomDesc.trim()
        };
      }
    }

    if (eff) {
      setForm(prev => ({
        ...prev,
        effects: [...prev.effects, eff!]
      }));
      setNewEffCustomDesc('');
    }
  };

  const handleRemoveEffect = (idx: number) => {
    setForm(prev => ({
      ...prev,
      effects: prev.effects.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <form onSubmit={onSubmit} className="max-w-xl mx-auto space-y-4 pb-6">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            {editingId ? 'Modifier la Compétence' : 'Forger une Nouvelle Compétence'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white"
          >
            Annuler
          </button>
        </div>

        {/* Type d'activation */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5">Mode d'activation</label>
          <div className="grid grid-cols-3 gap-2">
            {(['passive', 'toggle', 'active'] as HexeActivationType[]).map(t => {
              const isSel = form.activationType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, activationType: t }))}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    isSel
                      ? t === 'passive'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : t === 'toggle'
                        ? 'bg-amber-950/70 border-amber-500 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-rose-950/70 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(225,29,72,0.2)]'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {t === 'passive' && <Shield className="w-4 h-4" />}
                  {t === 'toggle' && <Zap className="w-4 h-4" />}
                  {t === 'active' && <Flame className="w-4 h-4" />}
                  <span className="capitalize">{t === 'passive' ? 'Passif' : t === 'toggle' ? 'Toggle' : 'Actif'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nom & Niveau */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <label className="text-xs font-bold text-slate-300 block mb-1">Nom du Don ou Sort *</label>
            <input
              type="text"
              required
              placeholder="Ex: Vision Nocturne, Boule de Feu..."
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Niveau (opt.)</label>
            <input
              type="number"
              min="0"
              max="10"
              placeholder="Ex: 1"
              value={form.skillLevel}
              onChange={e => setForm(p => ({ ...p, skillLevel: e.target.value ? Number(e.target.value) : '' }))}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">Description narrative</label>
          <textarea
            rows={2}
            placeholder="Explication narrative et fonctionnement de la capacité..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 custom-scrollbar"
          />
        </div>

        {/* Illustration de la compétence */}
        <HexeImagePicker
          value={form.imageUrl}
          onChange={val => setForm(p => ({ ...p, imageUrl: val }))}
          api={api}
          fallbackType={form.activationType}
          label="Illustration du Don ou Sort"
        />

        {/* Coûts en ressources */}
        {form.activationType !== 'passive' && (
          <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Coûts en ressources (Activation ou Entretien)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-blue-300 font-bold block mb-0.5">MP (Mana)</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.costs.mp || ''}
                  onChange={e => setForm(p => ({ ...p, costs: { ...p.costs, mp: Number(e.target.value) || undefined } }))}
                  className="w-full bg-slate-900/80 border border-blue-900/40 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-emerald-300 font-bold block mb-0.5">STM (Endurance)</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.costs.stm || ''}
                  onChange={e => setForm(p => ({ ...p, costs: { ...p.costs, stm: Number(e.target.value) || undefined } }))}
                  className="w-full bg-slate-900/80 border border-emerald-900/40 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-rose-300 font-bold block mb-0.5">HP (Sacrifice)</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.costs.hp || ''}
                  onChange={e => setForm(p => ({ ...p, costs: { ...p.costs, hp: Number(e.target.value) || undefined } }))}
                  className="w-full bg-slate-900/80 border border-rose-900/40 rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-amber-300 font-bold block mb-0.5">Chance</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.costs.chance || ''}
                  onChange={e => setForm(p => ({ ...p, costs: { ...p.costs, chance: Number(e.target.value) || undefined } }))}
                  className="w-full bg-slate-900/80 border border-amber-900/40 rounded px-2 py-1 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Durée & Conditions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Durée (opt.)</label>
            <input
              type="text"
              placeholder="Ex: 3 tours, Jusqu'au repos..."
              value={form.duration}
              onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Conditions (opt.)</label>
            <input
              type="text"
              placeholder="Ex: Au corps-à-corps, En extérieur"
              value={form.conditionText}
              onChange={e => setForm(p => ({ ...p, conditionText: e.target.value }))}
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Formule de dés */}
        <div>
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1">
            <span>Formule de jet de dés (opt.)</span>
            {form.diceFormula && (
              <span className="text-[10px] font-mono text-amber-400">
                {parseDiceFormula(form.diceFormula) ? '✓ Formule valide' : '⚠️ Syntaxe invalide'}
              </span>
            )}
          </label>
          <input
            type="text"
            placeholder="Ex: 2d4, 1d20, 3d8, 2d6+2"
            value={form.diceFormula}
            onChange={e => setForm(p => ({ ...p, diceFormula: e.target.value }))}
            className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-amber-300"
          />
        </div>

        {/* Constructeur Multi-Effets */}
        <div className="p-3 bg-slate-950/90 border border-white/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Effets mécaniques & descriptifs ({form.effects.length})
            </span>
            <span className="text-[10px] text-slate-400">Section 4 du document de règles</span>
          </div>

          {/* Liste des effets déjà ajoutés */}
          {form.effects.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {form.effects.map((eff, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/10 text-xs"
                >
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {eff.type === 'statLevel' && (
                      <span className="text-emerald-300 font-bold">
                        Niveau Stat : {STAT_SHORT[eff.stat]} {eff.value > 0 ? `+${eff.value}` : eff.value}
                      </span>
                    )}
                    {eff.type === 'rollModifier' && (
                      <span className="text-cyan-300 font-bold">
                        Jet : {eff.value > 0 ? `+${eff.value}` : eff.value} direct {eff.condition ? `(${eff.condition})` : ''}
                      </span>
                    )}
                    {eff.type === 'resourceChange' && (
                      <span className="text-rose-300 font-bold">
                        Ressource : {eff.operation} {eff.target === 'maximum' ? 'MAX' : ''} {eff.resource.toUpperCase()} {eff.value ? `(${eff.value})` : ''} {eff.dice ? `(${formatDiceFormula(eff.dice)})` : ''}
                      </span>
                    )}
                    {eff.type === 'carryCapacity' && (
                      <span className="text-amber-300 font-bold">
                        Port : {eff.value > 0 ? `+${eff.value}` : eff.value} {eff.modifierType === 'percent' ? '%' : 'kg'}
                      </span>
                    )}
                    {eff.type === 'custom' && (
                      <span className="text-slate-300 italic truncate">
                        « {eff.description} »
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEffect(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire d'ajout d'effet */}
          <div className="p-2.5 rounded-lg bg-black/30 border border-dashed border-white/10 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => setNewEffectType('statLevel')}
                className={`py-1 px-2 rounded text-[11px] font-bold border transition-colors ${
                  newEffectType === 'statLevel' ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300' : 'bg-black/20 border-white/5 text-slate-400'
                }`}
              >
                Niveau Stat
              </button>
              <button
                type="button"
                onClick={() => setNewEffectType('rollModifier')}
                className={`py-1 px-2 rounded text-[11px] font-bold border transition-colors ${
                  newEffectType === 'rollModifier' ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300' : 'bg-black/20 border-white/5 text-slate-400'
                }`}
              >
                Modif. Jet
              </button>
              <button
                type="button"
                onClick={() => setNewEffectType('resourceChange')}
                className={`py-1 px-2 rounded text-[11px] font-bold border transition-colors ${
                  newEffectType === 'resourceChange' ? 'bg-rose-950/70 border-rose-500 text-rose-300' : 'bg-black/20 border-white/5 text-slate-400'
                }`}
              >
                Ressource
              </button>
              <button
                type="button"
                onClick={() => setNewEffectType('carryCapacity')}
                className={`py-1 px-2 rounded text-[11px] font-bold border transition-colors ${
                  newEffectType === 'carryCapacity' ? 'bg-amber-950/70 border-amber-500 text-amber-300' : 'bg-black/20 border-white/5 text-slate-400'
                }`}
              >
                Poids / Port
              </button>
              <button
                type="button"
                onClick={() => setNewEffectType('custom')}
                className={`py-1 px-2 rounded text-[11px] font-bold border transition-colors ${
                  newEffectType === 'custom' ? 'bg-rose-950/70 border-rose-500 text-rose-300' : 'bg-black/20 border-white/5 text-slate-400'
                }`}
              >
                Descriptif
              </button>
            </div>

            {/* Détail selon type d'effet */}
            {newEffectType === 'statLevel' && (
              <div className="flex items-center gap-2">
                <select
                  value={newEffStat}
                  onChange={e => setNewEffStat(e.target.value as HexeStatKey)}
                  className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                >
                  {ALL_STATS.map(s => (
                    <option key={s} value={s}>{STAT_LABELS[s]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newEffStatVal}
                  onChange={e => setNewEffStatVal(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-center text-white"
                />
                <span className="text-xs text-slate-400">niveaux</span>
              </div>
            )}

            {newEffectType === 'rollModifier' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Bonus</span>
                  <input
                    type="number"
                    value={newEffRollVal}
                    onChange={e => setNewEffRollVal(Number(e.target.value))}
                    className="w-16 bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-center text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Condition (ex: Jet d'attaque, Magie)"
                    value={newEffRollCond}
                    onChange={e => setNewEffRollCond(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {newEffectType === 'resourceChange' && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newEffRes}
                    onChange={e => setNewEffRes(e.target.value as HexeResourceKey)}
                    className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="hp">HP (Vie)</option>
                    <option value="mp">MP (Mana)</option>
                    <option value="stm">STM (Endurance)</option>
                    <option value="chance">Chance</option>
                  </select>
                  <select
                    value={newEffResTarget}
                    onChange={e => setNewEffResTarget(e.target.value as any)}
                    className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="current">Valeur actuelle</option>
                    <option value="maximum">Maximum</option>
                  </select>
                  <select
                    value={newEffResOp}
                    onChange={e => setNewEffResOp(e.target.value as any)}
                    className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="restore">Restaurer</option>
                    <option value="spend">Dépenser / Subir</option>
                    <option value="add">Ajouter (+)</option>
                    <option value="set">Fixer (=)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded border border-white/10 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setNewEffResMode('value')}
                      className={`px-2 py-0.5 text-[10px] font-bold ${newEffResMode === 'value' ? 'bg-white/20 text-white' : 'text-slate-400'}`}
                    >
                      Fixe
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEffResMode('dice')}
                      className={`px-2 py-0.5 text-[10px] font-bold ${newEffResMode === 'dice' ? 'bg-white/20 text-white' : 'text-slate-400'}`}
                    >
                      Dés
                    </button>
                  </div>
                  {newEffResMode === 'value' ? (
                    <input
                      type="number"
                      value={newEffResVal}
                      onChange={e => setNewEffResVal(Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-center text-white"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="2d4"
                      value={newEffResDice}
                      onChange={e => setNewEffResDice(e.target.value)}
                      className="w-24 bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs font-mono text-amber-300"
                    />
                  )}
                </div>
              </div>
            )}

            {newEffectType === 'carryCapacity' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setNewEffCapacityType('flat')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      newEffCapacityType === 'flat' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fixe (+kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEffCapacityType('percent')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      newEffCapacityType === 'percent' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pourcent (+%)
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Valeur :</span>
                  <input
                    type="number"
                    value={newEffCapacityVal}
                    onChange={e => setNewEffCapacityVal(Number(e.target.value) || 0)}
                    className="w-20 bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono"
                    placeholder="Ex: 5"
                  />
                  <span className="text-xs font-bold text-amber-300">
                    {newEffCapacityType === 'flat' ? 'kg' : '%'}
                  </span>
                </div>
              </div>
            )}

            {newEffectType === 'custom' && (
              <div>
                <input
                  type="text"
                  placeholder="Description de l'effet narratif..."
                  value={newEffCustomDesc}
                  onChange={e => setNewEffCustomDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleAddEffect}
              className="w-full py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 font-bold transition-colors"
            >
              + Ajouter cet effet à la compétence
            </button>
          </div>
        </div>

        {/* Boutons Finaux */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)]"
          >
            {editingId ? 'Enregistrer les modifications' : 'Créer dans le Grimoire'}
          </button>
        </div>
      </form>
    </div>
  );
}
