import { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';
import {
  BookOpen, Plus, Search, Zap, Shield, Flame, Trash2, Edit3,
  Copy, ChevronDown, ChevronUp, Sparkles, Clock, Coins
} from 'lucide-react';
import type {
  HexeSkill, HexeActivationType, HexeEffect, HexeStatKey, HexeResourceKey
} from '../types';
import { ALL_STATS, STAT_LABELS } from '../types';

const STAT_SHORT: Record<HexeStatKey, string> = {
  str: 'STR',
  dex: 'DEX',
  agi: 'AGI',
  tec: 'TEC',
  vit: 'VIT',
  luc: 'LUC',
};
import {
  getSkillsCatalog, addSkillToCatalog, updateSkillInCatalog,
  removeSkillFromCatalog, subscribeSkills
} from '../hexeSkillStore';
import { parseDiceFormula, formatDiceFormula } from '../hexeDiceEngine';
import { invoke } from '@tauri-apps/api/core';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface FormState {
  name: string;
  description: string;
  activationType: HexeActivationType;
  skillLevel: number | '';
  costs: { mp?: number; stm?: number; hp?: number; chance?: number };
  duration: string;
  conditionText: string;
  diceFormula: string;
  effects: HexeEffect[];
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  activationType: 'active',
  skillLevel: '',
  costs: {},
  duration: '',
  conditionText: '',
  diceFormula: '',
  effects: []
};

interface HexeGrimoireWindowProps {
  api: SignetAPI;
}

export function HexeGrimoireWindow({ api }: HexeGrimoireWindowProps) {
  const [skills, setSkills] = useState<HexeSkill[]>(() => getSkillsCatalog());
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'passive' | 'toggle' | 'active'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Effect builder state in form
  const [newEffectType, setNewEffectType] = useState<'statLevel' | 'rollModifier' | 'resourceChange' | 'custom'>('statLevel');
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
  const [newEffCustomDesc, setNewEffCustomDesc] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeSkills(() => {
      setSkills(getSkillsCatalog());
    });
    return unsub;
  }, []);

  // Synchronisation avec les personnages existants
  const syncCharactersWithSkill = async (updatedSkill: HexeSkill) => {
    if (!isTauri()) return;
    try {
      const records: any[] = await invoke('get_characters');
      for (const rec of records) {
        let char = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
        if (!char || !Array.isArray(char.skills)) continue;

        let charChanged = false;
        char.skills = char.skills.map((s: HexeSkill) => {
          if (s.id === updatedSkill.id || s.name.toLowerCase() === updatedSkill.name.toLowerCase()) {
            charChanged = true;
            return {
              ...s,
              name: updatedSkill.name,
              description: updatedSkill.description,
              activationType: updatedSkill.activationType,
              effects: [...updatedSkill.effects],
              dice: updatedSkill.dice,
              skillLevel: updatedSkill.skillLevel,
              duration: updatedSkill.duration,
              conditions: updatedSkill.conditions,
              costs: updatedSkill.costs,
              custom: updatedSkill.custom
            };
          }
          return s;
        });

        if (charChanged) {
          await invoke('save_character', {
            id: char.id,
            name: char.name,
            ownerId: (char as any).owner_id || null,
            data: JSON.stringify(char)
          });

          const syncMsg = {
            type: 'MOD_EVENT',
            _sourceMod: 'system-hexe',
            modEventType: 'SYNC_CHARACTER',
            payload: char
          };

          if (api) {
            api.emit('NETWORK_OUTGOING', syncMsg);
            api.emit('NETWORK_INCOMING', syncMsg);
          }
        }
      }
    } catch (err) {
      console.error('[HexeGrimoire] Erreur synchronisation des personnages:', err);
    }
  };

  const handleStartCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsCreating(true);
  };

  const handleStartEdit = (skill: HexeSkill) => {
    setForm({
      name: skill.name,
      description: skill.description || '',
      activationType: skill.activationType,
      skillLevel: skill.skillLevel ?? '',
      costs: skill.costs || {},
      duration: skill.duration || '',
      conditionText: skill.conditions?.join(', ') || '',
      diceFormula: skill.dice ? formatDiceFormula(skill.dice) : '',
      effects: [...skill.effects]
    });
    setEditingId(skill.id);
    setIsCreating(true);
  };

  const handleDuplicate = (skill: HexeSkill) => {
    const clone = addSkillToCatalog({
      ...skill,
      name: `${skill.name} (Copie)`,
      custom: true
    });
    setExpandedCards(prev => new Set(prev).add(clone.id));
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Supprimer définitivement la compétence "${name}" du Grimoire ?`)) {
      removeSkillFromCatalog(id);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const parsedDice = form.diceFormula.trim() ? parseDiceFormula(form.diceFormula.trim()) : undefined;
    const conditions = form.conditionText.trim()
      ? form.conditionText.split(',').map(c => c.trim()).filter(Boolean)
      : undefined;

    const costsCleaned = Object.fromEntries(
      Object.entries(form.costs).filter(([, v]) => typeof v === 'number' && v > 0)
    );

    const skillPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      activationType: form.activationType,
      skillLevel: form.skillLevel !== '' ? Number(form.skillLevel) : undefined,
      costs: Object.keys(costsCleaned).length > 0 ? costsCleaned : undefined,
      duration: form.duration.trim() || undefined,
      conditions,
      dice: parsedDice || undefined,
      effects: form.effects,
      custom: true
    };

    if (editingId) {
      const updated: HexeSkill = {
        ...skillPayload,
        id: editingId
      };
      updateSkillInCatalog(editingId, updated);
      syncCharactersWithSkill(updated);
    } else {
      addSkillToCatalog(skillPayload);
    }

    setIsCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

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

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = skills.filter(item => {
    if (activeFilter !== 'all' && item.activationType !== activeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const inName = item.name.toLowerCase().includes(q);
      const inDesc = item.description?.toLowerCase().includes(q);
      const inEffects = item.effects.some(e =>
        e.type === 'custom' ? e.description.toLowerCase().includes(q) : false
      );
      return inName || inDesc || inEffects;
    }
    return true;
  });

  const counts = {
    all: skills.length,
    passive: skills.filter(s => s.activationType === 'passive').length,
    toggle: skills.filter(s => s.activationType === 'toggle').length,
    active: skills.filter(s => s.activationType === 'active').length,
  };

  const getActivationBadge = (type: HexeActivationType) => {
    switch (type) {
      case 'passive':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.5 uppercase tracking-wider">
            <Shield className="w-3 h-3 text-emerald-400" />
            Passif
          </span>
        );
      case 'toggle':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 rounded px-1.5 py-0.5 uppercase tracking-wider">
            <Zap className="w-3 h-3 text-amber-400" />
            Toggle
          </span>
        );
      case 'active':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 rounded px-1.5 py-0.5 uppercase tracking-wider">
            <Flame className="w-3 h-3 text-rose-400" />
            Actif
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050508] text-slate-200 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              Grimoire Hexe
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 font-mono font-normal">
                {skills.length} sorts & dons
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 truncate">Catalogue des compétences, effets et formules occultes</p>
          </div>
        </div>

        {!isCreating && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un don / sort</span>
          </button>
        )}
      </div>

      {/* Mode Forge / Formulaire */}
      {isCreating ? (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <form onSubmit={handleSaveForm} className="max-w-xl mx-auto space-y-4 pb-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                {editingId ? 'Modifier la Compétence' : 'Forger une Nouvelle Compétence'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsCreating(false); setEditingId(null); }}
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
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                    onClick={() => setNewEffectType('custom')}
                    className={`py-1 px-2 rounded text-[11px] font-bold border transition-colors ${
                      newEffectType === 'custom' ? 'bg-purple-950/70 border-purple-500 text-purple-300' : 'bg-black/20 border-white/5 text-slate-400'
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
                onClick={() => { setIsCreating(false); setEditingId(null); }}
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
      ) : (
        /* Mode Liste */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Barre de Recherche et Filtres */}
          <div className="p-3 border-b border-white/10 bg-black/20 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, effet ou description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', 'passive', 'toggle', 'active'] as const).map(tab => {
                const count = counts[tab];
                const isSel = activeFilter === tab;
                const label = tab === 'all' ? 'Toutes' : tab === 'passive' ? 'Passifs' : tab === 'toggle' ? 'Toggles' : 'Actifs';
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                      isSel
                        ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Liste des Cartes */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-[#090a10]/40">
                <BookOpen className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">Aucune compétence trouvée</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  {search ? 'Modifiez vos critères de recherche.' : 'Créez votre premier don ou sort avec le bouton ci-dessus.'}
                </p>
              </div>
            ) : (
              filtered.map(skill => {
                const isExpanded = expandedCards.has(skill.id);
                const hasDetails = !!skill.description || (skill.conditions && skill.conditions.length > 0) || skill.effects.length > 0;

                return (
                  <div
                    key={skill.id}
                    className="bg-[#090a10] border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-all group shadow-md"
                  >
                    <div className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                          {skill.activationType === 'passive' && <Shield className="w-4 h-4 text-emerald-400" />}
                          {skill.activationType === 'toggle' && <Zap className="w-4 h-4 text-amber-400" />}
                          {skill.activationType === 'active' && <Flame className="w-4 h-4 text-rose-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">{skill.name}</h4>
                            {getActivationBadge(skill.activationType)}
                            {skill.skillLevel && (
                              <span className="text-[10px] font-bold bg-white/5 border border-white/10 text-slate-400 rounded px-1.5 py-0.5 leading-none">
                                Niv. {skill.skillLevel}
                              </span>
                            )}
                            {skill.dice && (
                              <span className="text-[10px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded leading-none">
                                🎲 {formatDiceFormula(skill.dice)}
                              </span>
                            )}
                          </div>

                          {/* Résumé des coûts et effets */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {skill.costs && (
                              <>
                                {skill.costs.mp && (
                                  <span className="text-[10px] font-bold text-blue-300 bg-blue-950/60 border border-blue-800/40 rounded px-1.5 py-0.2">
                                    {skill.costs.mp} MP
                                  </span>
                                )}
                                {skill.costs.stm && (
                                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.2">
                                    {skill.costs.stm} STM
                                  </span>
                                )}
                                {skill.costs.hp && (
                                  <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 border border-rose-800/40 rounded px-1.5 py-0.2">
                                    {skill.costs.hp} HP
                                  </span>
                                )}
                              </>
                            )}

                            {skill.effects.slice(0, 2).map((eff, i) => (
                              <span
                                key={i}
                                className="text-[10px] text-slate-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.2 truncate max-w-[140px]"
                              >
                                {eff.type === 'statLevel' && `${STAT_SHORT[eff.stat]} +${eff.value} niv.`}
                                {eff.type === 'rollModifier' && `Jet +${eff.value}`}
                                {eff.type === 'resourceChange' && `${eff.operation} ${eff.resource.toUpperCase()}`}
                                {eff.type === 'custom' && eff.description}
                              </span>
                            ))}
                            {skill.effects.length > 2 && (
                              <span className="text-[10px] text-slate-500">
                                +{skill.effects.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {hasDetails && (
                          <button
                            onClick={() => toggleExpand(skill.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Voir les détails"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(skill)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-purple-400 transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(skill)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Dupliquer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(skill.id, skill.name)}
                          className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Zone de détails dépliée */}
                    {isExpanded && hasDetails && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5 bg-black/30 space-y-2">
                        {skill.description && (
                          <p className="text-xs text-slate-300 italic">{skill.description}</p>
                        )}

                        {skill.duration && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-purple-400" />
                            <span>Durée : <strong className="text-slate-200">{skill.duration}</strong></span>
                          </div>
                        )}

                        {skill.conditions && skill.conditions.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              Conditions :
                            </span>
                            {skill.conditions.map((c, i) => (
                              <span
                                key={i}
                                className="text-[10px] text-amber-300/90 bg-amber-950/40 border border-amber-800/40 rounded-full px-2 py-0.5"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}

                        {skill.effects.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                              Effets détaillés ({skill.effects.length}) :
                            </span>
                            {skill.effects.map((eff, i) => (
                              <div
                                key={i}
                                className="bg-slate-900/80 border-l-2 border-purple-500 border border-white/10 rounded p-2 text-xs"
                              >
                                {eff.type === 'statLevel' && (
                                  <div className="text-emerald-300 font-bold">
                                    Stat {STAT_LABELS[eff.stat]} : {eff.value > 0 ? `+${eff.value}` : eff.value} niveau(x)
                                  </div>
                                )}
                                {eff.type === 'rollModifier' && (
                                  <div className="text-cyan-300 font-bold">
                                    Modificateur au jet : {eff.value > 0 ? `+${eff.value}` : eff.value} direct {eff.condition ? `(${eff.condition})` : ''}
                                  </div>
                                )}
                                {eff.type === 'resourceChange' && (
                                  <div className="text-rose-300 font-bold">
                                    Ressource {eff.resource.toUpperCase()} ({eff.target === 'maximum' ? 'Maximum' : 'Actuelle'}) : {eff.operation} {eff.value ? `${eff.value}` : ''} {eff.dice ? formatDiceFormula(eff.dice) : ''}
                                  </div>
                                )}
                                {eff.type === 'custom' && (
                                  <div className="text-slate-200">
                                    {eff.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
