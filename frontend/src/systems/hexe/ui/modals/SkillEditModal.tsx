import { useState } from 'react';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import { Shield, Sparkles, Trash2, Zap, X, Edit3, Flame, Coins } from 'lucide-react';
import type { HexeStatKey, HexeSkill, HexeActivationType, HexeResourceKey, HexeEffect } from '../../types';
import { ALL_STATS, STAT_LABELS } from '../../types';
import { parseDiceFormula, formatDiceFormula } from '../../hexeDiceEngine';
import { HexeImagePicker } from '../HexeImagePicker';
import { STAT_SHORT } from '../../constants';

// ─── Modal d'Édition de Compétence ───────────────────────────────────────────

interface SkillEditModalProps {
  skill: HexeSkill;
  onSave: (updated: HexeSkill) => void;
  onClose: () => void;
  api?: SignetAPI;
}

export function SkillEditModal({ skill, onSave, onClose, api }: SkillEditModalProps) {
  const [name, setName] = useState(skill.name);
  const [activationType, setActivationType] = useState<HexeActivationType>(skill.activationType || 'passive');
  const [imageUrl, setImageUrl] = useState<string>(skill.imageUrl ?? '');
  const [skillLevel, setSkillLevel] = useState<number | ''>(skill.skillLevel ?? '');
  const [description, setDescription] = useState(skill.description ?? '');
  const [duration, setDuration] = useState(skill.duration ?? '');
  const [conditionText, setConditionText] = useState((skill.conditions || []).join(', '));
  const [diceStr, setDiceStr] = useState(skill.dice ? formatDiceFormula(skill.dice) : '');
  const [costs, setCosts] = useState<{ mp?: number; stm?: number; hp?: number; chance?: number }>({
    mp: skill.costs?.mp,
    stm: skill.costs?.stm,
    hp: skill.costs?.hp,
    chance: skill.costs?.chance
  });
  const [effects, setEffects] = useState<HexeEffect[]>([...(skill.effects || [])]);

  // Sous-formulaire d'ajout d'effet
  const [newEffectType, setNewEffectType] = useState<'statLevel' | 'rollModifier' | 'resourceChange' | 'carryCapacity' | 'custom'>('statLevel');
  const [newEffStat, setNewEffStat] = useState<HexeStatKey>('str');
  const [newEffStatVal, setNewEffStatVal] = useState<number>(1);
  const [newEffRollVal, setNewEffRollVal] = useState<number>(2);
  const [newEffRollCond, setNewEffRollCond] = useState<string>('');
  const [newEffRes, setNewEffRes] = useState<HexeResourceKey>('hp');
  const [newEffResTarget, setNewEffResTarget] = useState<'current' | 'maximum'>('current');
  const [newEffResOp, setNewEffResOp] = useState<'restore' | 'spend' | 'add' | 'set'>('restore');
  const [newEffResMode, setNewEffResMode] = useState<'value' | 'dice'>('value');
  const [newEffResVal, setNewEffResVal] = useState<number>(5);
  const [newEffResDice, setNewEffResDice] = useState<string>('2d4');
  const [newEffCapacityType, setNewEffCapacityType] = useState<'flat' | 'percent'>('flat');
  const [newEffCapacityVal, setNewEffCapacityVal] = useState<number>(5);
  const [newEffCustomDesc, setNewEffCustomDesc] = useState<string>('');

  const handleAddEffect = () => {
    let eff: HexeEffect | null = null;
    if (newEffectType === 'statLevel') {
      eff = { type: 'statLevel', stat: newEffStat, value: newEffStatVal };
    } else if (newEffectType === 'rollModifier') {
      eff = { type: 'rollModifier', value: newEffRollVal, condition: newEffRollCond.trim() || undefined };
    } else if (newEffectType === 'resourceChange') {
      if (newEffResMode === 'value') {
        eff = { type: 'resourceChange', resource: newEffRes, target: newEffResTarget, operation: newEffResOp, value: newEffResVal };
      } else {
        const parsed = parseDiceFormula(newEffResDice.trim());
        if (parsed) {
          eff = { type: 'resourceChange', resource: newEffRes, target: newEffResTarget, operation: newEffResOp, dice: parsed };
        } else {
          eff = { type: 'resourceChange', resource: newEffRes, target: newEffResTarget, operation: newEffResOp, value: 1 };
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
        eff = { type: 'custom', description: newEffCustomDesc.trim() };
      }
    }
    if (eff) {
      setEffects(prev => [...prev, eff!]);
      if (newEffectType === 'custom') setNewEffCustomDesc('');
    }
  };

  const handleRemoveEffect = (idx: number) => {
    setEffects(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedDice = diceStr.trim() ? parseDiceFormula(diceStr.trim()) : undefined;
    const condList = conditionText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const activeCosts: Partial<Record<HexeResourceKey, number>> = {};
    if (activationType !== 'passive') {
      if (costs.mp && costs.mp > 0) activeCosts.mp = costs.mp;
      if (costs.stm && costs.stm > 0) activeCosts.stm = costs.stm;
      if (costs.hp && costs.hp > 0) activeCosts.hp = costs.hp;
      if (costs.chance && costs.chance > 0) activeCosts.chance = costs.chance;
    }

    onSave({
      ...skill,
      name: name.trim(),
      activationType,
      imageUrl: imageUrl.trim() || undefined,
      skillLevel: typeof skillLevel === 'number' && skillLevel > 0 ? skillLevel : undefined,
      description: description.trim() || undefined,
      duration: duration.trim() || undefined,
      conditions: condList.length > 0 ? condList : undefined,
      costs: Object.keys(activeCosts).length > 0 ? activeCosts : undefined,
      dice: parsedDice || undefined,
      effects
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-white/15 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-void/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Modifier la compétence</h3>
              <p className="text-[11px] text-zinc-400">Personnalisation sur la fiche du joueur</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          {/* Mode d'activation */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 font-bold block">Mode d'activation</label>
            <div className="grid grid-cols-3 gap-2">
              {(['passive', 'toggle', 'active'] as HexeActivationType[]).map(t => {
                const isSel = activationType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivationType(t)}
                    className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-[color,background-color,border-color,opacity,transform] ${
                      isSel
                        ? t === 'passive'
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                          : t === 'toggle'
                          ? 'bg-amber-950/70 border-amber-500 text-amber-200'
                          : 'bg-rose-950/70 border-rose-500 text-rose-200'
                        : 'bg-void border-white/10 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    {t === 'passive' && <Shield className="w-3.5 h-3.5" />}
                    {t === 'toggle' && <Zap className="w-3.5 h-3.5" />}
                    {t === 'active' && <Flame className="w-3.5 h-3.5" />}
                    <span className="capitalize">{t === 'passive' ? 'Passif' : t === 'toggle' ? 'Toggle' : 'Actif'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nom & Niveau */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[11px] text-zinc-400 font-bold block">Nom de la compétence *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-void border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-bold block">Niveau</label>
              <input
                type="number"
                min="0"
                max="10"
                placeholder="Ex: 1"
                value={skillLevel}
                onChange={e => setSkillLevel(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-void border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Illustration de la compétence */}
          <HexeImagePicker
            label="Illustration de la compétence"
            imageUrl={imageUrl}
            onChange={(url) => setImageUrl(url || '')}
            fallbackType={activationType}
            api={api}
          />

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400 font-bold block">Description narrative</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description ou explication du sort ou don..."
              className="w-full bg-void border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500 custom-scrollbar"
            />
          </div>

          {/* Coûts en ressources (si non passif) */}
          {activationType !== 'passive' && (
            <div className="p-2.5 bg-void border border-white/10 rounded-xl space-y-2">
              <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Coûts en ressources (Activation ou Entretien)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[11px] text-blue-300 font-bold block mb-0.5">MP (Mana)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costs.mp || ''}
                    onChange={e => setCosts(p => ({ ...p, mp: Number(e.target.value) || undefined }))}
                    className="w-full bg-surface-raised border border-blue-900/40 rounded-lg px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-300 font-bold block mb-0.5">STM (Endurance)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costs.stm || ''}
                    onChange={e => setCosts(p => ({ ...p, stm: Number(e.target.value) || undefined }))}
                    className="w-full bg-surface-raised border border-emerald-900/40 rounded-lg px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-rose-300 font-bold block mb-0.5">HP (Sacrifice)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costs.hp || ''}
                    onChange={e => setCosts(p => ({ ...p, hp: Number(e.target.value) || undefined }))}
                    className="w-full bg-surface-raised border border-rose-500/30 rounded-lg px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-amber-300 font-bold block mb-0.5">Chance</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costs.chance || ''}
                    onChange={e => setCosts(p => ({ ...p, chance: Number(e.target.value) || undefined }))}
                    className="w-full bg-surface-raised border border-amber-900/40 rounded-lg px-2 py-1 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Durée & Conditions & Dés */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-bold block">Durée (opt.)</label>
              <input
                type="text"
                placeholder="Ex: 3 tours..."
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full bg-void border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-bold block">Conditions (opt.)</label>
              <input
                type="text"
                placeholder="Ex: Contact, Nuit..."
                value={conditionText}
                onChange={e => setConditionText(e.target.value)}
                className="w-full bg-void border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400 font-bold block">Dés (opt.)</label>
              <input
                type="text"
                placeholder="Ex: 2d6+2"
                value={diceStr}
                onChange={e => setDiceStr(e.target.value)}
                className="w-full bg-void border border-white/10 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono"
              />
            </div>
          </div>

          {/* Effets mécaniques */}
          <div className="p-3 bg-void/80 border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                Effets mécaniques & descriptifs ({effects.length})
              </span>
            </div>

            {effects.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {effects.map((eff, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/10 text-xs"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {eff.type === 'statLevel' && (
                        <span className="text-emerald-300 font-bold">
                          Stat : {STAT_SHORT[eff.stat]} {eff.value > 0 ? `+${eff.value}` : eff.value}
                        </span>
                      )}
                      {eff.type === 'rollModifier' && (
                        <span className="text-cyan-300 font-bold">
                          Jet : {eff.value > 0 ? `+${eff.value}` : eff.value} {eff.condition ? `(${eff.condition})` : ''}
                        </span>
                      )}
                      {eff.type === 'resourceChange' && (
                        <span className="text-rose-300 font-bold">
                          {eff.operation} {eff.target === 'maximum' ? 'MAX ' : ''}{eff.resource.toUpperCase()} {eff.value ? `(${eff.value})` : ''} {eff.dice ? `(${formatDiceFormula(eff.dice)})` : ''}
                        </span>
                      )}
                      {eff.type === 'carryCapacity' && (
                        <span className="text-amber-300 font-bold">
                          Capacité de port : {eff.value > 0 ? `+${eff.value}` : eff.value} {eff.modifierType === 'percent' ? '%' : 'kg'}
                        </span>
                      )}
                      {eff.type === 'custom' && (
                        <span className="text-zinc-300 truncate">« {eff.description} »</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEffect(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
                      title="Supprimer l'effet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter un effet */}
            <div className="p-2.5 rounded-lg bg-black/30 border border-dashed border-white/10 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
                <button
                  type="button"
                  onClick={() => setNewEffectType('statLevel')}
                  className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    newEffectType === 'statLevel' ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300' : 'bg-black/20 border-white/5 text-zinc-400'
                  }`}
                >
                  Niveau Stat
                </button>
                <button
                  type="button"
                  onClick={() => setNewEffectType('rollModifier')}
                  className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    newEffectType === 'rollModifier' ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300' : 'bg-black/20 border-white/5 text-zinc-400'
                  }`}
                >
                  Modif. Jet
                </button>
                <button
                  type="button"
                  onClick={() => setNewEffectType('resourceChange')}
                  className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    newEffectType === 'resourceChange' ? 'bg-rose-950/70 border-rose-500 text-rose-300' : 'bg-black/20 border-white/5 text-zinc-400'
                  }`}
                >
                  Ressource
                </button>
                <button
                  type="button"
                  onClick={() => setNewEffectType('carryCapacity')}
                  className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    newEffectType === 'carryCapacity' ? 'bg-amber-950/70 border-amber-500 text-amber-300' : 'bg-black/20 border-white/5 text-zinc-400'
                  }`}
                >
                  Poids / Port
                </button>
                <button
                  type="button"
                  onClick={() => setNewEffectType('custom')}
                  className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                    newEffectType === 'custom' ? 'bg-rose-950/70 border-rose-500 text-rose-300' : 'bg-black/20 border-white/5 text-zinc-400'
                  }`}
                >
                  Descriptif
                </button>
              </div>

              {newEffectType === 'statLevel' && (
                <div className="flex items-center gap-2">
                  <select
                    value={newEffStat}
                    onChange={e => setNewEffStat(e.target.value as HexeStatKey)}
                    className="bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    {ALL_STATS.map(s => (
                      <option key={s} value={s}>{STAT_LABELS[s]}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={newEffStatVal}
                    onChange={e => setNewEffStatVal(Number(e.target.value))}
                    className="w-16 bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-center text-white"
                  />
                  <span className="text-xs text-zinc-400">niveaux</span>
                </div>
              )}

              {newEffectType === 'rollModifier' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-400">Bonus</span>
                    <input
                      type="number"
                      value={newEffRollVal}
                      onChange={e => setNewEffRollVal(Number(e.target.value))}
                      className="w-16 bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-center text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Condition (ex: Jet d'attaque)"
                      value={newEffRollCond}
                      onChange={e => setNewEffRollCond(e.target.value)}
                      className="w-full bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
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
                      className="bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="hp">HP (Vie)</option>
                      <option value="mp">MP (Mana)</option>
                      <option value="stm">STM (Endurance)</option>
                      <option value="chance">Chance</option>
                    </select>
                    <select
                      value={newEffResTarget}
                      onChange={e => setNewEffResTarget(e.target.value as any)}
                      className="bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="current">Valeur actuelle</option>
                      <option value="maximum">Maximum</option>
                    </select>
                    <select
                      value={newEffResOp}
                      onChange={e => setNewEffResOp(e.target.value as any)}
                      className="bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value="restore">Restaurer</option>
                      <option value="spend">Dépenser / Subir</option>
                      <option value="add">Ajouter (+)</option>
                      <option value="set">Fixer (=)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-white/10 overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setNewEffResMode('value')}
                        className={`px-2 py-0.5 text-[11px] font-bold ${newEffResMode === 'value' ? 'bg-white/20 text-white' : 'text-zinc-400'}`}
                      >
                        Fixe
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewEffResMode('dice')}
                        className={`px-2 py-0.5 text-[11px] font-bold ${newEffResMode === 'dice' ? 'bg-white/20 text-white' : 'text-zinc-400'}`}
                      >
                        Dés
                      </button>
                    </div>
                    {newEffResMode === 'value' ? (
                      <input
                        type="number"
                        value={newEffResVal}
                        onChange={e => setNewEffResVal(Number(e.target.value))}
                        className="w-20 bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-center text-white"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder="2d4"
                        value={newEffResDice}
                        onChange={e => setNewEffResDice(e.target.value)}
                        className="w-24 bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-amber-300"
                      />
                    )}
                  </div>
                </div>
              )}

              {newEffectType === 'carryCapacity' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-surface-raised border border-white/10 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setNewEffCapacityType('flat')}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                        newEffCapacityType === 'flat' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Fixe (+kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEffCapacityType('percent')}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                        newEffCapacityType === 'percent' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Pourcent (+%)
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-400">Valeur :</span>
                    <input
                      type="number"
                      value={newEffCapacityVal}
                      onChange={e => setNewEffCapacityVal(Number(e.target.value) || 0)}
                      className="w-20 bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      placeholder="Ex: 5"
                    />
                    <span className="text-xs font-bold text-amber-300">
                      {newEffCapacityType === 'flat' ? 'kg' : '%'}
                    </span>
                  </div>
                </div>
              )}

              {newEffectType === 'custom' && (
                <input
                  type="text"
                  placeholder="Description de l'effet narratif..."
                  value={newEffCustomDesc}
                  onChange={e => setNewEffCustomDesc(e.target.value)}
                  className="w-full bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                />
              )}

              <button
                type="button"
                onClick={handleAddEffect}
                className="w-full py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-200 font-bold transition-colors"
              >
                + Ajouter cet effet
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-[color,background-color,border-color,opacity,transform]"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
