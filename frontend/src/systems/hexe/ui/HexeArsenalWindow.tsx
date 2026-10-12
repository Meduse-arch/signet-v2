import { useState, useEffect, useMemo } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import {
  Shield, Swords, Sparkles, Plus, Trash2, Edit3, Copy, Search, Tag, Zap, X, Check,
  ChevronDown, ChevronUp, Package, FlaskConical, Layers, BookOpen
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { invoke } from '@tauri-apps/api/core';
import type {
  HexeEquipmentSlot, HexeStatKey, HexeCharacter,
  HexeWeaponRank, HexeWeaponNature, HexeAbility
} from '../types';
import { SLOT_LABELS } from '../types';
import {
  getTemplates, addTemplate, removeTemplate, updateTemplate,
  subscribeTemplates
} from '../hexeEquipmentStore';
import type { HexeEquipmentTemplate } from '../hexeEquipmentStore';
import { HexePentacleBadge, ALL_RANKS, RANK_DESCRIPTIONS } from './HexePentacleBadge';
import { parseDiceFormula, formatDiceFormula } from '../hexeDiceEngine';
import { getEquipmentSkills } from '../hexeSkillStore';
import { SkillImportModal } from './SkillImportModal';

interface HexeArsenalWindowProps {
  api?: SignetAPI;
}

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const ALL_STATS: HexeStatKey[] = ['str', 'dex', 'agi', 'tec', 'vit', 'luc'];
const STAT_SHORT: Record<HexeStatKey, string> = {
  str: 'STR', dex: 'DEX', agi: 'AGI', tec: 'TEC', vit: 'VIT', luc: 'LUC'
};
const STAT_NAMES: Record<HexeStatKey, string> = {
  str: 'Force (STR)',
  dex: 'Dextérité (DEX)',
  agi: 'Agilité (AGI)',
  tec: 'Technique (TEC)',
  vit: 'Vitalité (VIT)',
  luc: 'Chance (LUC)'
};

const SLOT_FILTER_OPTIONS: {
  slot: HexeEquipmentSlot | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}[] = [
  { slot: 'all', label: 'Tous', icon: Layers, colorClass: 'text-slate-400' },
  { slot: 'weapon', label: 'Armes', icon: Swords, colorClass: 'text-rose-400' },
  { slot: 'armor', label: 'Armures', icon: Shield, colorClass: 'text-amber-400' },
  { slot: 'accessory', label: 'Accessoires', icon: Sparkles, colorClass: 'text-cyan-400' },
  { slot: 'consumable', label: 'Consommables', icon: FlaskConical, colorClass: 'text-emerald-400' },
  { slot: 'other', label: 'Autre', icon: Package, colorClass: 'text-sky-400' },
];

interface FormState {
  name: string;
  slot: HexeEquipmentSlot;
  statBonuses: Partial<Record<HexeStatKey, number>>;
  properties: string[];
  abilities: HexeAbility[];
  abilityIds: string[];
  description: string;
  rank?: HexeWeaponRank;
  nature?: HexeWeaponNature;
  diceFormula?: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  slot: 'weapon',
  statBonuses: {},
  properties: [],
  abilities: [],
  abilityIds: [],
  description: '',
  rank: 'C',
  nature: 'classic',
  diceFormula: '',
};

export function HexeArsenalWindow({ api }: HexeArsenalWindowProps) {
  const [templates, setTemplates] = useState<HexeEquipmentTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [filterSlot, setFilterSlot] = useState<HexeEquipmentSlot | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showSkillImportModal, setShowSkillImportModal] = useState(false);

  const [newProp, setNewProp] = useState('');
  const [newBonusStat, setNewBonusStat] = useState<HexeStatKey>('str');
  const [newBonusVal, setNewBonusVal] = useState(1);

  // Cartes dépliées
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTemplates(getTemplates());
    const unsubscribe = subscribeTemplates(() => {
      setTemplates(getTemplates());
    });
    return unsubscribe;
  }, []);

  const handleStartCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsCreating(true);
  };

  const handleStartEdit = (template: HexeEquipmentTemplate) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      slot: template.slot,
      statBonuses: { ...(template.statBonuses || {}) },
      properties: [...(template.properties || [])],
      abilities: [...(template.abilities || [])],
      abilityIds: [...(template.abilityIds || [])],
      description: template.description || '',
      rank: template.rank || 'C',
      nature: template.nature || 'classic',
      diceFormula: template.dice ? formatDiceFormula(template.dice) : ''
    });
    setIsCreating(true);
  };

  const handleDuplicate = (template: HexeEquipmentTemplate) => {
    addTemplate({
      name: `${template.name} (Copie)`,
      slot: template.slot,
      statBonuses: { ...(template.statBonuses || {}) },
      properties: [...(template.properties || [])],
      abilities: (template.abilities || []).map(a => ({ ...a, id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
      abilityIds: [...(template.abilityIds || [])],
      description: template.description || '',
      rank: template.rank,
      nature: template.nature,
      symbol: template.symbol ? { ...template.symbol } : undefined,
      dice: template.dice ? { ...template.dice, terms: template.dice.terms.map(t => ({ ...t })) } : undefined,
      effects: template.effects ? [...template.effects] : undefined
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Supprimer définitivement "${name}" de l'Arsenal ?`)) {
      removeTemplate(id);
      if (editingId === id) {
        setIsCreating(false);
        setEditingId(null);
      }
    }
  };

  const syncCharactersWithTemplate = async (templateId: string, updatedTemplate: HexeEquipmentTemplate) => {
    if (!isTauri()) return;
    try {
      const records = (await invoke('get_characters')) as any[];
      for (const record of records) {
        if (!record.data) continue;
        let char: HexeCharacter;
        try {
          char = JSON.parse(record.data);
        } catch {
          continue;
        }

        let charChanged = false;
        if (Array.isArray(char.equipment)) {
          char.equipment = char.equipment.map(equip => {
            // Correspondance par templateId ou par nom si pas encore associé
            if (equip.templateId === templateId || (!equip.templateId && equip.name.toLowerCase() === updatedTemplate.name.toLowerCase())) {
              charChanged = true;
              return {
                ...equip,
                templateId,
                name: updatedTemplate.name,
                slot: updatedTemplate.slot,
                rank: updatedTemplate.rank,
                nature: updatedTemplate.nature,
                symbol: updatedTemplate.symbol,
                dice: updatedTemplate.dice,
                effects: updatedTemplate.effects,
                statBonuses: { ...(updatedTemplate.statBonuses || {}) },
                properties: [...(updatedTemplate.properties || [])],
                abilities: [...(updatedTemplate.abilities || [])],
                abilityIds: [...(updatedTemplate.abilityIds || [])],
                resourceModifiers: updatedTemplate.resourceModifiers ? [...updatedTemplate.resourceModifiers] : undefined,
                description: updatedTemplate.description,
                // Préserve l'équipement porté et la quantité du personnage
                isEquipped: equip.isEquipped,
                quantity: equip.quantity,
              };
            }
            return equip;
          });
        }

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
      console.error('[HexeArsenal] Erreur lors de la synchronisation des personnages:', err);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const parsedDice = form.diceFormula?.trim() ? parseDiceFormula(form.diceFormula.trim()) : undefined;
    const rank = form.rank || 'C';
    const nature = form.nature || 'classic';
    const symbol = {
      orientation: nature === 'classic' ? ('upright' as const) : ('inverted' as const),
      filled: nature === 'possessed',
      hasCircle: rank === 'S'
    };

    if (editingId) {
      const updatedTemplate: HexeEquipmentTemplate = {
        id: editingId,
        name: form.name.trim(),
        slot: form.slot,
        rank,
        nature,
        symbol,
        dice: parsedDice || undefined,
        statBonuses: form.statBonuses,
        properties: form.properties,
        abilities: form.abilities,
        abilityIds: form.abilityIds,
        description: form.description.trim()
      };
      updateTemplate(editingId, updatedTemplate);
      syncCharactersWithTemplate(editingId, updatedTemplate);
    } else {
      addTemplate({
        name: form.name.trim(),
        slot: form.slot,
        rank,
        nature,
        symbol,
        dice: parsedDice || undefined,
        statBonuses: form.statBonuses,
        properties: form.properties,
        abilities: form.abilities,
        abilityIds: form.abilityIds,
        description: form.description.trim()
      });
    }

    setIsCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

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

  const handleImportSkillIds = (skillIds: string[]) => {
    setForm(prev => ({
      ...prev,
      abilityIds: Array.from(new Set([...(prev.abilityIds || []), ...skillIds]))
    }));
  };

  const formLinkedSkills = useMemo(() => {
    return getEquipmentSkills(form);
  }, [form.abilityIds, form.abilities]);

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = templates.filter(t => {
    if (filterSlot !== 'all' && t.slot !== filterSlot) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = t.name.toLowerCase().includes(q);
    const matchDesc = (t.description || '').toLowerCase().includes(q);
    const matchProps = (t.properties || []).some(p => p.toLowerCase().includes(q));
    const itemSkills = getEquipmentSkills(t);
    const matchAb = itemSkills.some(a => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
    return matchName || matchDesc || matchProps || matchAb;
  });

  const getSlotIcon = (slot: HexeEquipmentSlot) => {
    switch (slot) {
      case 'weapon': return <Swords className="w-4 h-4 text-rose-400" />;
      case 'armor': return <Shield className="w-4 h-4 text-amber-400" />;
      case 'accessory': return <Sparkles className="w-4 h-4 text-cyan-400" />;
      case 'consumable': return <FlaskConical className="w-4 h-4 text-emerald-400" />;
      case 'other': return <Package className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050508] text-white overflow-hidden border border-white/10 shadow-2xl font-sans">
      {/* Header - Solid Opaque */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-white/10 bg-[#090a10] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(225,29,72,0.25)]">
            <Shield className="w-5 h-5 text-rose-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
              Arsenal Hexe
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-full shrink-0">
                Module Équipements
              </span>
            </h2>
            <p className="text-xs text-slate-400 truncate">Forge de règles, armes, armures & reliques occultes</p>
          </div>
        </div>

        {!isCreating && (
          <Button
            onClick={handleStartCreate}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 px-3 py-1.5 shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap ml-auto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Créer un équipement</span>
          </Button>
        )}
      </div>

      {/* Mode Édition / Création */}
      {isCreating ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-[#050508]">
          <form onSubmit={handleSaveForm} className="max-w-2xl mx-auto space-y-4 bg-[#090a10] border border-white/10 rounded-xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
                {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingId ? 'Modifier l\'équipement' : 'Nouvel équipement dans l\'Arsenal'}
              </h3>
              <button
                type="button"
                onClick={() => { setIsCreating(false); setEditingId(null); }}
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
                    onClick={() => setShowSkillImportModal(true)}
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
                onClick={() => { setIsCreating(false); setEditingId(null); }}
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
      ) : (
        /* Vue principale : Liste & Recherche */
        <div className="flex-1 flex flex-col overflow-hidden bg-[#050508]">
          {/* Barre de filtres et recherche */}
          <div className="p-3 border-b border-white/10 bg-[#090a10] flex flex-col gap-2.5 shrink-0">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher par nom, propriété, capacité..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtre par slot : onglets avec icônes et compteurs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
              {SLOT_FILTER_OPTIONS.map(({ slot, label, icon: Icon, colorClass }) => {
                const count = slot === 'all'
                  ? templates.length
                  : templates.filter(t => t.slot === slot).length;
                const isActive = filterSlot === slot;

                return (
                  <button
                    key={slot}
                    onClick={() => setFilterSlot(slot)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_12px_rgba(225,29,72,0.35)]'
                        : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : colorClass}`} />
                    <span>{label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                        isActive
                          ? 'bg-black/30 text-rose-100'
                          : 'bg-white/5 text-slate-400 group-hover:text-slate-200 group-hover:bg-white/10'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grille / Liste des items */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-[#090a10]/40">
                <Package className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">Aucun équipement trouvé</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  {search ? 'Modifiez vos critères de recherche.' : 'Créez votre première arme ou armure avec le bouton ci-dessus.'}
                </p>
              </div>
            ) : (
              filtered.map(item => {
                const isExpanded = expandedCards.has(item.id);
                const bonusEntries = Object.entries(item.statBonuses || {}) as [HexeStatKey, number][];
                const isWeapon = item.slot === 'weapon';
                const itemSkills = getEquipmentSkills(item);
                const hasDetails = itemSkills.length > 0 || (item.properties?.length || 0) > 0 || !!item.description || isWeapon;

                return (
                  <div
                    key={item.id}
                    className="bg-[#090a10] border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-all group shadow-md"
                  >
                    <div className="p-3 flex items-center justify-between gap-3">
                      {/* Titre & Slot */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                          {getSlotIcon(item.slot)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-400 rounded px-1.5 py-0.5 leading-none">
                              {SLOT_LABELS[item.slot]}
                            </span>
                            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded px-1.5 py-0.5">
                              <HexePentacleBadge
                                rank={item.rank || 'C'}
                                nature={item.nature || 'classic'}
                                symbol={item.symbol}
                                size={18}
                              />
                              <span className="text-[10px] font-bold text-rose-300">
                                {RANK_DESCRIPTIONS[item.rank || 'C']}
                              </span>
                              {item.dice && (
                                <span className="text-[10px] font-mono font-semibold text-amber-300 ml-1">
                                  🎲 {formatDiceFormula(item.dice)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Résumé des bonus et tags */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {bonusEntries.map(([stat, val]) => (
                              <span
                                key={stat}
                                className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.2 leading-tight"
                              >
                                {STAT_SHORT[stat]} +{val}
                              </span>
                            ))}

                            {(item.properties || []).slice(0, 3).map(p => (
                              <span
                                key={p}
                                className="text-[10px] text-slate-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.2"
                              >
                                {p}
                              </span>
                            ))}
                            {(item.properties || []).length > 3 && (
                              <span className="text-[10px] text-slate-500">
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
                            onClick={() => toggleExpand(item.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Voir les détails"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(item)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors"
                          title="Dupliquer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
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
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30">
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
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase tracking-wider text-slate-300">
                                {item.nature === 'ego' ? "D'Ego (Volonté de l'objet)" : item.nature === 'possessed' ? "Possédée (Entité résidente)" : "Classique (Volonté du porteur)"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {item.dice ? (
                                <span>Formule de jet : <strong className="text-amber-300 font-mono">{formatDiceFormula(item.dice)}</strong></span>
                              ) : (
                                <span className="italic text-slate-500">Aucune formule de dés (facultative)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-300 italic">{item.description}</p>
                        )}

                        {(item.properties || []).length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              Propriétés :
                            </span>
                            {item.properties!.map(p => (
                              <span
                                key={p}
                                className="text-[10px] text-slate-200 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1"
                              >
                                <Tag className="w-2.5 h-2.5 text-rose-400" />
                                {p}
                              </span>
                            ))}
                          </div>
                        )}

                        {itemSkills.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                              Capacités spéciales ({itemSkills.length}) :
                            </span>
                            {itemSkills.map(ab => (
                              <div
                                key={ab.id}
                                className="bg-slate-900/80 border-l-2 border-rose-500 border border-white/10 rounded p-2 text-xs"
                              >
                                <div className="font-bold text-rose-300 flex items-center justify-between gap-1 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <Zap className="w-3 h-3 text-rose-400 shrink-0" />
                                    <span>{ab.name}</span>
                                    {ab.activationType && (
                                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-300">
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
                                  </div>
                                </div>
                                <p className="text-slate-300 mt-0.5">{ab.description}</p>
                                {ab.conditions?.length ? (
                                  <p className="text-[10px] text-amber-400/90 italic mt-0.5">
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
              })
            )}
          </div>
        </div>
      )}

      {/* Modal d'importation de capacités */}
      {showSkillImportModal && (
        <SkillImportModal
          alreadyLinkedIds={formLinkedSkills.map(s => s.id)}
          onImportSkillIds={handleImportSkillIds}
          onClose={() => setShowSkillImportModal(false)}
          onOpenGrimoire={() => {
            if (api) {
              api.emit('SYSTEM_ACTION_TRIGGERED', 'hexe-grimoire');
            }
          }}
        />
      )}
    </div>
  );
}
