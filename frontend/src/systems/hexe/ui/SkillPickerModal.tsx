import React, { useState } from 'react';
import type {
  HexeSkill, HexeActivationType, HexeStatKey, HexeResourceKey, HexeEffect
} from '../types';
import { ALL_STATS, STAT_LABELS } from '../types';
import { parseDiceFormula, formatDiceFormula } from '../hexeDiceEngine';
import { instantiateSkill, addSkillToCatalog } from '../hexeSkillStore';
import {
  Shield, Zap, Layers, Plus, Search, X, Trash2
} from 'lucide-react';
import { HexeImagePicker, HexeItemImage } from './HexeImagePicker';

interface SkillPickerModalProps {
  catalogSkills: HexeSkill[];
  onAddSkill: (skill: HexeSkill) => void;
  onClose: () => void;
}

export function SkillPickerModal({
  catalogSkills,
  onAddSkill,
  onClose
}: SkillPickerModalProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<HexeActivationType | 'all'>('all');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // Formulaire de création personnalisée
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState<string | undefined>(undefined);
  const [customType, setCustomType] = useState<HexeActivationType>('active');
  const [customCostMp, setCustomCostMp] = useState(0);
  const [customCostStm, setCustomCostStm] = useState(0);
  const [customDiceStr, setCustomDiceStr] = useState('');
  const [customEffects, setCustomEffects] = useState<HexeEffect[]>([]);

  // Effet temporaire en cours d'ajout
  const [effType, setEffType] = useState<'statLevel' | 'resourceChange' | 'custom'>('statLevel');
  const [effStat, setEffStat] = useState<HexeStatKey>('str');
  const [effStatVal, setEffStatVal] = useState(1);
  const [effRes, setEffRes] = useState<HexeResourceKey>('hp');
  const [effResTarget, setEffResTarget] = useState<'current' | 'maximum'>('current');
  const [effResOp, setEffResOp] = useState<'restore' | 'spend' | 'add'>('restore');
  const [effResVal, setEffResVal] = useState(3);
  const [effResDiceStr, setEffResDiceStr] = useState('');
  const [effCustomDesc, setEffCustomDesc] = useState('');

  const handleAddEffectToCustom = () => {
    if (effType === 'statLevel') {
      setCustomEffects(prev => [...prev, { type: 'statLevel', stat: effStat, value: effStatVal }]);
    } else if (effType === 'resourceChange') {
      const parsedDice = effResDiceStr ? parseDiceFormula(effResDiceStr) : undefined;
      setCustomEffects(prev => [
        ...prev,
        {
          type: 'resourceChange',
          resource: effRes,
          target: effResTarget,
          operation: effResOp,
          value: effResVal || undefined,
          dice: parsedDice || undefined
        }
      ]);
      setEffResDiceStr('');
    } else if (effType === 'custom') {
      if (!effCustomDesc.trim()) return;
      setCustomEffects(prev => [...prev, { type: 'custom', description: effCustomDesc.trim() }]);
      setEffCustomDesc('');
    }
  };

  const handleSaveCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const costs: Partial<Record<HexeResourceKey, number>> = {};
    if (customCostMp > 0) costs.mp = customCostMp;
    if (customCostStm > 0) costs.stm = customCostStm;

    const parsedDice = customDiceStr ? parseDiceFormula(customDiceStr) : undefined;

    const newSkillData: Omit<HexeSkill, 'id'> = {
      name: customName.trim(),
      description: customDesc.trim() || undefined,
      imageUrl: customImageUrl,
      activationType: customType,
      costs: Object.keys(costs).length > 0 ? costs : undefined,
      dice: parsedDice || undefined,
      effects: customEffects,
      custom: true
    };

    // Ajoute au catalogue global pour réutilisation et apprend immédiatement au joueur
    const created = addSkillToCatalog(newSkillData);
    onAddSkill(instantiateSkill(created));
    onClose();
  };

  const filtered = catalogSkills.filter(s => {
    if (filterType !== 'all' && s.activationType !== filterType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = s.name.toLowerCase().includes(q);
    const matchDesc = (s.description || '').toLowerCase().includes(q);
    return matchName || matchDesc;
  });

  const getTypeBadge = (type: HexeActivationType) => {
    switch (type) {
      case 'passive':
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 rounded px-1.5 py-0.5 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 text-emerald-400" /> Passif
          </span>
        );
      case 'toggle':
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-950/60 border border-amber-800/40 text-amber-300 rounded px-1.5 py-0.5 flex items-center gap-1">
            <Layers className="w-2.5 h-2.5 text-amber-400" /> Toggle
          </span>
        );
      case 'active':
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-950/60 border border-rose-800/40 text-rose-300 rounded px-1.5 py-0.5 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-rose-400" /> Actif
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#090a10] border border-white/15 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#050508]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Grimoire des Compétences</h3>
              <p className="text-[11px] text-slate-400">Apprendre une compétence ou en forger une nouvelle</p>
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

        {/* Bascule Catalogue / Création personnalisée */}
        <div className="flex border-b border-white/10 bg-[#07080d] p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsCreatingCustom(false)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              !isCreatingCustom
                ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Catalogue ({catalogSkills.length})
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingCustom(true)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              isCreatingCustom
                ? 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            + Forger une compétence
          </button>
        </div>

        {isCreatingCustom ? (
          /* Formulaire de création sur-mesure */
          <form onSubmit={handleSaveCustomSkill} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Nom de la compétence *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Frappe abyssale, Bouclier de sang..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Mode d'activation</label>
                <select
                  value={customType}
                  onChange={e => setCustomType(e.target.value as HexeActivationType)}
                  className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="active">Actif (Déclenché)</option>
                  <option value="toggle">Toggle (Interrupteur)</option>
                  <option value="passive">Passif (Permanent)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Description</label>
              <textarea
                rows={2}
                placeholder="Effet narratif, incantation ou description..."
                value={customDesc}
                onChange={e => setCustomDesc(e.target.value)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <HexeImagePicker
              value={customImageUrl}
              onChange={setCustomImageUrl}
              fallbackType={customType}
              label="Illustration du Don ou Sort"
            />

            {/* Coûts et Dés */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Coût MP</label>
                <input
                  type="number"
                  min={0}
                  value={customCostMp}
                  onChange={e => setCustomCostMp(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Coût STM</label>
                <input
                  type="number"
                  min={0}
                  value={customCostStm}
                  onChange={e => setCustomCostStm(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Formule de dés</label>
                <input
                  type="text"
                  placeholder="Ex: 2d4, 3d8, 2d6+2"
                  value={customDiceStr}
                  onChange={e => setCustomDiceStr(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Liste des effets structurés */}
            <div className="border border-white/10 rounded-xl p-3 bg-black/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  Effets mécaniques ({customEffects.length})
                </label>
              </div>

              {customEffects.length > 0 && (
                <div className="space-y-1.5">
                  {customEffects.map((eff, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="text-slate-200">
                        {eff.type === 'statLevel' && `Stat : +${eff.value} niveau en ${STAT_LABELS[eff.stat]}`}
                        {eff.type === 'resourceChange' && `${eff.operation.toUpperCase()} ${eff.resource.toUpperCase()} (${eff.target === 'maximum' ? 'Max' : 'Actuel'}) : ${eff.dice ? formatDiceFormula(eff.dice) : eff.value}`}
                        {eff.type === 'carryCapacity' && `Port : ${eff.value > 0 ? `+${eff.value}` : eff.value} ${eff.modifierType === 'percent' ? '%' : 'kg'}`}
                        {eff.type === 'custom' && eff.description}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomEffects(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Constructeur d'effet */}
              <div className="bg-[#050508] border border-white/10 rounded-lg p-2.5 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={effType}
                    onChange={e => setEffType(e.target.value as any)}
                    className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-[11px]"
                  >
                    <option value="statLevel">Modifier Niveau de Stat</option>
                    <option value="resourceChange">Modifier une Ressource</option>
                    <option value="custom">Effet Descriptif</option>
                  </select>

                  {effType === 'statLevel' && (
                    <>
                      <select
                        value={effStat}
                        onChange={e => setEffStat(e.target.value as HexeStatKey)}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-[11px]"
                      >
                        {ALL_STATS.map((s: HexeStatKey) => (
                          <option key={s} value={s}>{STAT_LABELS[s]}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={-10}
                        max={10}
                        value={effStatVal}
                        onChange={e => setEffStatVal(parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-center text-[11px]"
                      />
                    </>
                  )}

                  {effType === 'resourceChange' && (
                    <>
                      <select
                        value={effRes}
                        onChange={e => setEffRes(e.target.value as HexeResourceKey)}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-[11px]"
                      >
                        <option value="hp">HP</option>
                        <option value="mp">MP</option>
                        <option value="stm">STM</option>
                        <option value="chance">Chance</option>
                      </select>
                      <select
                        value={effResTarget}
                        onChange={e => setEffResTarget(e.target.value as 'current' | 'maximum')}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-[11px]"
                      >
                        <option value="current">Actuel</option>
                        <option value="maximum">Maximum</option>
                      </select>
                      <select
                        value={effResOp}
                        onChange={e => setEffResOp(e.target.value as any)}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-[11px]"
                      >
                        <option value="restore">Restaurer</option>
                        <option value="spend">Dépenser</option>
                        <option value="add">Ajouter (+)</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Valeur"
                        value={effResVal}
                        onChange={e => setEffResVal(parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-center text-[11px]"
                      />
                    </>
                  )}
                </div>

                {effType === 'resourceChange' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Ou formule de dés :</span>
                    <input
                      type="text"
                      placeholder="Ex: 2d4 (laisser vide si fixe)"
                      value={effResDiceStr}
                      onChange={e => setEffResDiceStr(e.target.value)}
                      className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-[11px]"
                    />
                  </div>
                )}

                {effType === 'custom' && (
                  <input
                    type="text"
                    placeholder="Description de l'effet spécial..."
                    value={effCustomDesc}
                    onChange={e => setEffCustomDesc(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-white text-[11px]"
                  />
                )}

                <button
                  type="button"
                  onClick={handleAddEffectToCustom}
                  className="w-full py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 font-bold rounded transition-colors"
                >
                  + Ajouter cet effet
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-[0_0_12px_rgba(225,29,72,0.35)]"
              >
                Créer et Apprendre
              </button>
            </div>
          </form>
        ) : (
          /* Liste de sélection dans le catalogue */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Barre de recherche et filtres de type */}
            <div className="p-3 border-b border-white/10 bg-[#07080d] flex flex-col gap-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher une compétence..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {(['all', 'passive', 'toggle', 'active'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                      filterType === type
                        ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(225,29,72,0.3)]'
                        : 'bg-black/40 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {type === 'all' && 'Toutes'}
                    {type === 'passive' && 'Passifs'}
                    {type === 'toggle' && 'Toggles'}
                    {type === 'active' && 'Actifs'}
                  </button>
                ))}
              </div>
            </div>

            {/* Cartes du catalogue */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic">
                  Aucune compétence trouvée pour ces critères.
                </div>
              ) : (
                filtered.map(skill => (
                  <div
                    key={skill.id}
                    className="bg-[#050508] border border-white/10 hover:border-white/20 rounded-xl p-3 flex items-start justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <HexeItemImage
                        src={skill.imageUrl}
                        alt={skill.name}
                        fallbackType={skill.activationType}
                        className="w-8 h-8 rounded-lg shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{skill.name}</span>
                          {getTypeBadge(skill.activationType)}

                        {/* Coûts éventuels */}
                        {skill.costs?.mp && (
                          <span className="text-[9px] font-bold text-blue-300 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.2 rounded">
                            {skill.costs.mp} MP
                          </span>
                        )}
                        {skill.costs?.stm && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                            {skill.costs.stm} STM
                          </span>
                        )}
                        {skill.dice && (
                          <span className="text-[9px] font-black text-rose-300 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.2 rounded">
                            🎲 {formatDiceFormula(skill.dice)}
                          </span>
                        )}
                      </div>

                      {skill.description && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-2">{skill.description}</p>
                      )}

                      {/* Effets */}
                      {skill.effects?.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {skill.effects.map((eff, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-semibold text-slate-300 bg-white/5 border border-white/10 rounded px-1.5 py-0.2"
                            >
                              {eff.type === 'statLevel' && `+${eff.value} ${STAT_LABELS[eff.stat]}`}
                              {eff.type === 'rollModifier' && `+${eff.value} aux jets`}
                              {eff.type === 'resourceChange' && `${eff.operation.toUpperCase()} ${eff.resource.toUpperCase()}`}
                              {eff.type === 'carryCapacity' && `Port ${eff.value > 0 ? `+${eff.value}` : eff.value}${eff.modifierType === 'percent' ? '%' : 'kg'}`}
                              {eff.type === 'custom' && eff.description}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                    <button
                      type="button"
                      onClick={() => {
                        onAddSkill(instantiateSkill(skill));
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] shrink-0 flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Apprendre
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
