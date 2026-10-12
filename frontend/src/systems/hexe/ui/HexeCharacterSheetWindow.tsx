import { useState, useEffect, useMemo } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import {
  Droplet, Shield, Star, Sparkles, ArrowLeft, Swords, Backpack, BookOpen,
  Trash2, ChevronDown, ChevronUp, Package, Tag, Zap, X, Search, ExternalLink,
  FlaskConical, Layers, Edit3, Plus, Play, ToggleLeft, ToggleRight, Dices, Flame, Coins
} from 'lucide-react';
import type {
  HexeCharacter, HexeEquipment, HexeStatKey, HexeEquipmentSlot,
  HexeSkill, HexeWeaponRank, HexeWeaponNature, HexeAbility, HexeActivationType,
  HexeResourceKey, HexeEffect
} from '../types';
import {
  ALL_STATS, DEFAULT_HEXE_STATS, getMaxHP, getMaxMP, getMaxSTM, getMaxChance,
  STAT_LABELS, SLOT_LABELS, getDiceForLevel
} from '../types';
import {
  calculateEffectiveState, executeSkillOrItem
} from '../hexeEffectEngine';
import {
  parseDiceFormula, formatDiceFormula, rollDiceFormula
} from '../hexeDiceEngine';
import {
  getSkillsCatalog, subscribeSkills, getCharacterAvailableSkills, getEquipmentSkills
} from '../hexeSkillStore';
import { HexePentacleBadge, ALL_RANKS, RANK_DESCRIPTIONS } from './HexePentacleBadge';
import { SkillImportModal } from './SkillImportModal';
import { invoke } from '@tauri-apps/api/core';
import { ModManager } from '../../../core/services/ModManager';
import {
  getTemplates, instantiateTemplate, subscribeTemplates
} from '../hexeEquipmentStore';
import type { HexeEquipmentTemplate } from '../hexeEquipmentStore';

const isTauri = () => '__TAURI_INTERNALS__' in window;

type SheetTab = 'attributs' | 'inventaire' | 'competences';

const STAT_SHORT: Record<HexeStatKey, string> = {
  str: 'STR', dex: 'DEX', agi: 'AGI', tec: 'TEC', vit: 'VIT', luc: 'LUC'
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

interface HexeCharacterSheetWindowProps {
  api: SignetAPI;
  characterId: string;
  onBack: () => void;
}

export function HexeCharacterSheetWindow({ api, characterId, onBack }: HexeCharacterSheetWindowProps) {
  const [char, setChar] = useState<HexeCharacter>({
    id: characterId || 'temp-1',
    name: 'Inquisiteur Anonyme',
    stats: { ...DEFAULT_HEXE_STATS },
    resources: {
      hp: getMaxHP(DEFAULT_HEXE_STATS.vit.level),
      mp: getMaxMP(DEFAULT_HEXE_STATS.tec.level),
      stm: getMaxSTM(DEFAULT_HEXE_STATS.agi.level),
      chance: getMaxChance(DEFAULT_HEXE_STATS.luc.level)
    },
    equipment: [],
    inventory: [],
  });

  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [activeTab, setActiveTab] = useState<SheetTab>('attributs');

  // — Sélecteur Arsenal
  const [showArsenalPicker, setShowArsenalPicker] = useState(false);
  const [arsenalTemplates, setArsenalTemplates] = useState<HexeEquipmentTemplate[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSlot, setPickerSlot] = useState<HexeEquipmentSlot | 'all'>('all');

  // — Expansion des cartes d'équipement
  const [expandedEquip, setExpandedEquip] = useState<Set<string>>(new Set());

  // — Édition directe d'un équipement sur la fiche
  const [editingEquipment, setEditingEquipment] = useState<HexeEquipment | null>(null);

  // — Compétences : expansion plié/déplié & édition
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [editingSkill, setEditingSkill] = useState<HexeSkill | null>(null);

  const toggleExpandSkill = (skillId: string) => {
    setExpandedSkills(prev => {
      const next = new Set(prev);
      next.has(skillId) ? next.delete(skillId) : next.add(skillId);
      return next;
    });
  };

  // — Sélecteur Grimoire (Compétences)
  const [showGrimoirePicker, setShowGrimoirePicker] = useState(false);
  const [grimoireSearch, setGrimoireSearch] = useState('');
  const [grimoireFilterType, setGrimoireFilterType] = useState<HexeActivationType | 'all'>('all');
  const [catalogSkills, setCatalogSkills] = useState<HexeSkill[]>([]);

  const availableSkills = useMemo(() => {
    return getCharacterAvailableSkills(char);
  }, [char]);

  useEffect(() => {
    setArsenalTemplates(getTemplates());
    const unsub = subscribeTemplates(() => {
      setArsenalTemplates(getTemplates());
    });
    return unsub;
  }, []);

  useEffect(() => {
    setCatalogSkills(getSkillsCatalog());
    const unsub = subscribeSkills(() => {
      setCatalogSkills(getSkillsCatalog());
    });
    return unsub;
  }, []);

  // Écoute des synchronisations temps réel (ex: Arsenal qui met à jour un template)
  useEffect(() => {
    const onSync = (msg: any) => {
      if (msg?.modEventType === 'SYNC_CHARACTER' && msg.payload?.id === characterId) {
        setChar(msg.payload);
      }
    };
    api.events.on('NETWORK_INCOMING', onSync);
    api.events.on('NETWORK_OUTGOING', onSync);
    return () => {
      api.events.off('NETWORK_INCOMING', onSync);
      api.events.off('NETWORK_OUTGOING', onSync);
    };
  }, [characterId, api]);

  useEffect(() => {
    setIsHost(ModManager.getIsHost());
    if (isTauri()) {
      invoke('get_players').then((players: any) => setKnownPlayers(players as string[])).catch(e => console.error(e));
    }
    if (!characterId) return;
    if (isTauri()) {
      invoke('get_characters').then((records: any) => {
        const record = (records as any[]).find(r => r.id === characterId);
        if (record) {
          let parsed = JSON.parse(record.data);
          if (!parsed.stats) parsed.stats = { ...DEFAULT_HEXE_STATS };
          if (!parsed.resources) parsed.resources = {
            hp: getMaxHP(parsed.stats.vit.level), mp: getMaxMP(parsed.stats.tec.level),
            stm: getMaxSTM(parsed.stats.agi.level), chance: getMaxChance(parsed.stats.luc.level)
          };
          if (!parsed.equipment) parsed.equipment = [];
          if (!parsed.inventory) parsed.inventory = [];
          setChar(parsed);
        }
      }).catch(e => console.error(e));
    } else {
      api.emit('NETWORK_OUTGOING', { type: 'MOD_EVENT', _sourceMod: 'system-hexe', modEventType: 'REQUEST_CHARACTERS', payload: {} });
    }
  }, [characterId, api]);

  // Synchronisation réseau
  const updateCharacterLocally = (updater: (prev: HexeCharacter) => HexeCharacter) => {
    setChar(prev => {
      const next = updater(prev);
      if (isTauri()) {
        invoke('save_character', { id: next.id, name: next.name, ownerId: next.owner_id || null, data: JSON.stringify(next) })
          .catch(err => console.error("Erreur save_character local", err));
      }
      api.emit('NETWORK_OUTGOING', { type: 'MOD_EVENT', _sourceMod: 'system-hexe', modEventType: 'SYNC_CHARACTER', payload: next });
      return next;
    });
  };

  const updateField = (field: keyof HexeCharacter, value: any) => {
    updateCharacterLocally(prev => ({ ...prev, [field]: value }));
  };

  const updateStat = (statKey: keyof HexeCharacter['stats'], delta: number) => {
    updateCharacterLocally(prev => {
      const currentLevel = prev.stats[statKey]?.level || 1;
      const newLevel = Math.max(1, currentLevel + delta);
      return {
        ...prev,
        stats: { ...prev.stats, [statKey]: { level: newLevel } }
      };
    });
  };

  const rollStat = async (statKey: HexeStatKey) => {
    const effectiveState = calculateEffectiveState(char);
    const effectiveLevel = effectiveState.levels[statKey];
    const diceStr = effectiveState.dice[statKey];
    const results = await api.requestRoll([diceStr]);
    const rawTotal = results && results.length > 0 ? results[0] : 0;

    const applicableMods = effectiveState.rollModifiers;
    const modTotal = applicableMods.reduce((sum, m) => sum + m.value, 0);
    const total = rawTotal + modTotal;
    const modText = modTotal !== 0 ? ` (${rawTotal} ${modTotal > 0 ? '+' : ''}${modTotal})` : '';

    api.emit('NETWORK_OUTGOING', {
      type: 'MOD_EVENT',
      modEventType: 'HEXE_ROLL_ANIMATION',
      payload: { total, label: `Jet de ${STAT_LABELS[statKey]}` }
    });
    api.emit('NETWORK_OUTGOING', {
      type: 'CHAT_MESSAGE',
      payload: {
        text: `*invoque les forces pour **${STAT_LABELS[statKey]}** (Niv. ${effectiveLevel})...\n🎲 **${diceStr}** ➔ **[ ${total} ]**${modText}*`,
        sender: char.name
      }
    });
  };

  const handleRollWeapon = (equip: HexeEquipment) => {
    if (!equip.dice) return;
    const rollResult = rollDiceFormula(equip.dice);
    const formulaStr = formatDiceFormula(equip.dice);
    const modText = rollResult.breakdown ? ` (${rollResult.breakdown})` : '';

    api.emit('NETWORK_OUTGOING', {
      type: 'MOD_EVENT',
      modEventType: 'HEXE_ROLL_ANIMATION',
      payload: { total: rollResult.total, label: `Attaque : ${equip.name}` }
    });

    api.emit('NETWORK_OUTGOING', {
      type: 'CHAT_MESSAGE',
      payload: {
        text: `*frappe avec **${equip.name}** [${formulaStr}] ➔ **[ ${rollResult.total} ]**${modText}*`,
        sender: char.name
      }
    });

    api.log({
      type: 'action',
      actor: char.name,
      actorId: char.id,
      accountName: api.user.getName(),
      summary: `a frappé avec ${equip.name} (${formulaStr}) : ${rollResult.total}`,
      details: rollResult as unknown as Record<string, unknown>,
      visibility: 'all'
    });
  };

  // ─── Gestion compétences & activation ───────────────────────────────────────

  const handleToggleSkill = (skillId: string) => {
    const active = new Set(char.activeToggles || []);
    if (active.has(skillId)) {
      active.delete(skillId);
    } else {
      active.add(skillId);
    }
    updateCharacterLocally(prev => ({
      ...prev,
      activeToggles: Array.from(active) as string[]
    }));
  };

  const handleTriggerSkill = (skill: HexeSkill) => {
    const execResult = executeSkillOrItem(char, skill);
    if (!execResult.success) {
      alert(execResult.message);
      return;
    }

    updateCharacterLocally(() => execResult.char);

    api.emit('NETWORK_OUTGOING', {
      type: 'CHAT_MESSAGE',
      payload: {
        text: execResult.message,
        sender: char.name
      }
    });

    api.log({
      type: 'action',
      actor: char.name,
      actorId: char.id,
      accountName: api.user.getName(),
      summary: `a utilisé ${skill.name}`,
      details: execResult as unknown as Record<string, unknown>,
      visibility: 'all'
    });
  };

  const handleAddSkill = (skill: HexeSkill) => {
    updateCharacterLocally(prev => ({
      ...prev,
      skills: [...(prev.skills || []), skill]
    }));
  };

  const handleDeleteSkill = (skillId: string) => {
    updateCharacterLocally(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(s => s.id !== skillId),
      activeToggles: (prev.activeToggles || []).filter(id => id !== skillId)
    }));
  };

  const handleSaveSkill = (updated: HexeSkill) => {
    updateCharacterLocally(prev => {
      const existing = (prev.skills || []).some(s => s.id === updated.id);
      const nextSkills = existing
        ? (prev.skills || []).map(s => s.id === updated.id ? updated : s)
        : [...(prev.skills || []), updated];
      return {
        ...prev,
        skills: nextSkills
      };
    });
    setEditingSkill(null);
  };

  // ─── Gestion équipements & consommables ─────────────────────────────────────

  const addEquipmentFromArsenal = (template: HexeEquipmentTemplate) => {
    // Si c'est un consommable, gestion de pile (stacking) par nom
    if (template.slot === 'consumable') {
      const existing = (char.equipment ?? []).find(
        e => e.slot === 'consumable' && e.name.toLowerCase() === template.name.toLowerCase()
      );
      if (existing) {
        updateCharacterLocally(prev => ({
          ...prev,
          equipment: (prev.equipment ?? []).map(e =>
            e.id === existing.id ? { ...e, quantity: (e.quantity ?? 1) + 1 } : e
          )
        }));
        return;
      }
    }

    const newEquip = instantiateTemplate(template);
    if (template.slot === 'consumable') {
      newEquip.quantity = 1;
      newEquip.isEquipped = false;
    }
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: [...(prev.equipment ?? []), newEquip]
    }));
  };

  const toggleEquipped = (equipId: string) => {
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: (prev.equipment ?? []).map(e => {
        if (e.id !== equipId) return e;
        if (e.slot === 'consumable') return e;
        return { ...e, isEquipped: !e.isEquipped };
      })
    }));
  };

  const updateEquipmentQty = (equipId: string, delta: number) => {
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: (prev.equipment ?? []).map(e => {
        if (e.id !== equipId) return e;
        const newQty = (e.quantity ?? 1) + delta;
        return { ...e, quantity: newQty };
      }).filter(e => (e.quantity ?? 1) > 0)
    }));
  };

  const handleConsumeItem = (equip: HexeEquipment) => {
    const execResult = executeSkillOrItem(char, {
      name: equip.name,
      effects: equip.effects || [],
      dice: equip.dice
    });

    if (!execResult.success) {
      alert(execResult.message);
      return;
    }

    const updatedChar = {
      ...execResult.char,
      equipment: (execResult.char.equipment ?? []).map(e => {
        if (e.id !== equip.id) return e;
        const newQty = (e.quantity ?? 1) - 1;
        return { ...e, quantity: newQty };
      }).filter(e => (e.quantity ?? 1) > 0)
    };

    updateCharacterLocally(() => updatedChar);

    api.log({
      type: 'item',
      actor: char.name,
      actorId: char.id,
      accountName: api.user.getName(),
      summary: `a consommé 1x ${equip.name}`,
      details: execResult as unknown as Record<string, unknown>,
      visibility: 'all'
    });

    api.emit('NETWORK_OUTGOING', {
      type: 'CHAT_MESSAGE',
      payload: {
        text: `*consomme **${equip.name}*** ${execResult.message.replace(`A activé **${equip.name}**`, '')}`,
        sender: char.name
      }
    });
  };

  const deleteEquipment = (equipId: string) => {
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: (prev.equipment ?? []).filter(e => e.id !== equipId)
    }));
  };

  const handleSaveEquipment = (updated: HexeEquipment) => {
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: (prev.equipment ?? []).map(e => e.id === updated.id ? updated : e)
    }));
    setEditingEquipment(null);
  };

  const toggleExpandEquip = (equipId: string) => {
    setExpandedEquip(prev => {
      const next = new Set(prev);
      next.has(equipId) ? next.delete(equipId) : next.add(equipId);
      return next;
    });
  };

  // ─── Rétrocompatibilité objets simples existants ────────────────────────────

  const updateItemQty = (itemId: string, delta: number) => {
    updateCharacterLocally(prev => ({
      ...prev,
      inventory: (prev.inventory ?? []).map(i =>
        i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
      ).filter(i => i.quantity > 0)
    }));
  };

  const deleteItem = (itemId: string) => {
    updateCharacterLocally(prev => ({
      ...prev,
      inventory: (prev.inventory ?? []).filter(i => i.id !== itemId)
    }));
  };

  const equippedItems = (char.equipment ?? []).filter(e => e.isEquipped && e.slot !== 'consumable');
  const bagItems = (char.equipment ?? []).filter(e => !e.isEquipped);
  const legacyItems = char.inventory ?? [];
  const totalBagCount = bagItems.length + legacyItems.length;

  const tabs: { id: SheetTab; label: string; icon: React.ReactNode }[] = [
    { id: 'attributs',   label: 'Attributs',   icon: <Swords   className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'inventaire',  label: 'Inventaire',  icon: <Backpack  className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'competences', label: 'Compétences', icon: <BookOpen  className="w-3.5 h-3.5 shrink-0" /> },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#050508] text-white font-sans overflow-hidden select-none border border-white/10 shadow-2xl">
      {/* 1. Header Plein & Opaque (Retour & Titre) */}
      <div className="bg-[#090a10] border-b border-white/10 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Retour
        </button>

        <span className="text-[10px] uppercase tracking-widest text-rose-400 font-black bg-rose-950/60 border border-rose-800/50 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(225,29,72,0.2)]">
          Fiche de Personnage
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {/* 2. Hero du personnage (Avatar, Nom, Propriétaire) - Plein & Opaque */}
        <div className="bg-[#090a10] border-b border-white/10 p-3 sm:p-4 flex items-center gap-3 shrink-0">
          <div
            className="w-13 h-13 rounded-xl border border-white/15 bg-black/60 shadow-[0_0_20px_rgba(225,29,72,0.15)] flex items-center justify-center relative overflow-hidden group shrink-0 cursor-pointer"
            title="Changer l'avatar"
          >
            {char.avatarUrl ? (
              <img
                src={api.library.getAssetUrl(char.avatarUrl)}
                alt="Avatar"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <Swords className="w-6 h-6 text-rose-400/80 group-hover:text-rose-300 transition-colors" />
            )}
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              accept="image/*"
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  const hash = await api.library.uploadAsset(e.target.files[0]);
                  if (hash) updateField('avatarUrl', hash);
                }
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={char.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nom du personnage..."
              className="w-full bg-transparent text-base sm:text-lg font-black text-white outline-none border-b border-white/10 focus:border-rose-500 transition-colors tracking-tight placeholder-slate-600 truncate"
            />
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {isHost ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Lié à :</span>
                  <select
                    value={char.owner_id || ''}
                    onChange={(e) => updateField('owner_id', e.target.value || null)}
                    className="bg-[#050508] border border-white/10 text-white rounded px-2 py-0.5 text-xs outline-none focus:border-rose-500 max-w-[130px] truncate"
                  >
                    <option value="">Aucun (PNJ)</option>
                    {knownPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 truncate">
                  {char.owner_id ? `Joué par ${char.owner_id}` : 'Personnage Non Joueur'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Barres de ressources vitales (dynamiquement recalculées avec bonus d'effets/compétences) */}
        {(() => {
          const effectiveState = calculateEffectiveState(char);
          return (
            <div className="bg-[#07080d] border-b border-white/10 p-2.5 sm:p-3 shrink-0 grid grid-cols-2 gap-2">
              <CompactResourceBar
                icon={<Droplet className="w-3.5 h-3.5 text-rose-400" />}
                label="HP"
                current={char.resources.hp}
                max={effectiveState.maxResources.hp}
                color="#e11d48"
                trackColor="rgba(225, 29, 72, 0.15)"
                onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, hp: Math.max(0, p.resources.hp - 1) } }))}
                onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, hp: Math.min(effectiveState.maxResources.hp, p.resources.hp + 1) } }))}
              />
              <CompactResourceBar
                icon={<Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                label="MP"
                current={char.resources.mp}
                max={effectiveState.maxResources.mp}
                color="#2563eb"
                trackColor="rgba(37, 99, 235, 0.15)"
                onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, mp: Math.max(0, p.resources.mp - 1) } }))}
                onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, mp: Math.min(effectiveState.maxResources.mp, p.resources.mp + 1) } }))}
              />
              <CompactResourceBar
                icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />}
                label="STM"
                current={char.resources.stm}
                max={effectiveState.maxResources.stm}
                color="#10b981"
                trackColor="rgba(16, 185, 129, 0.15)"
                onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, stm: Math.max(0, p.resources.stm - 1) } }))}
                onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, stm: Math.min(effectiveState.maxResources.stm, p.resources.stm + 1) } }))}
              />
              <CompactResourceBar
                icon={<Star className="w-3.5 h-3.5 text-amber-400" />}
                label="Chance"
                current={char.resources.chance}
                max={effectiveState.maxResources.chance}
                color="#f59e0b"
                trackColor="rgba(245, 158, 11, 0.15)"
                onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, chance: Math.max(0, p.resources.chance - 1) } }))}
                onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, chance: Math.min(effectiveState.maxResources.chance, p.resources.chance + 1) } }))}
              />
            </div>
          );
        })()}

        {/* 4. Barre d'onglets - Compacte & Scroll-safe */}
        <div className="flex border-b border-white/10 shrink-0 bg-[#090a10] overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[85px] flex items-center justify-center gap-1.5 py-2.5 px-1.5 text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-400 bg-rose-600/10'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 5. Contenu des onglets */}
        <div className="flex-1 p-4">
          {/* ── ONGLET ATTRIBUTS - 2 Colonnes propres et aérées avec pentagramme cramoisi en filigrane ── */}
          {activeTab === 'attributs' && (() => {
            const effectiveState = calculateEffectiveState(char);
            return (
              <div className="relative">
                {/* Pentagramme en filigrane cramoisi éclatant (couleur logo Signet/Hexe #e11d48) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-35 sm:opacity-40">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-72 h-72 sm:w-80 sm:h-80 drop-shadow-[0_0_24px_rgba(225,29,72,0.65)] transition-transform duration-700 group-hover:scale-105"
                  >
                    {/* Anneaux extérieurs et cercles ésotériques */}
                    <circle cx="50" cy="50" r="47" stroke="#e11d48" strokeWidth="1" fill="none" opacity="0.6" />
                    <circle cx="50" cy="50" r="44" stroke="#e11d48" strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.8" />
                    <circle cx="50" cy="50" r="24" stroke="#e11d48" strokeWidth="1" strokeDasharray="1.5 1.5" fill="none" opacity="0.5" />
                    
                    {/* Pentagramme complet tracé avec ses branches d'entrelacs */}
                    <polygon
                      points="50,4 62.5,38.5 98.5,38.5 69.5,60 80.5,95 50,73.5 19.5,95 30.5,60 1.5,38.5 37.5,38.5"
                      fill="#e11d48"
                      fillOpacity="0.08"
                      stroke="#e11d48"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />

                    {/* Sommets illuminés en rouge cramoisi néon */}
                    {[
                      { x: 50, y: 4 },
                      { x: 98.5, y: 38.5 },
                      { x: 80.5, y: 95 },
                      { x: 19.5, y: 95 },
                      { x: 1.5, y: 38.5 }
                    ].map((pt, idx) => (
                      <circle key={idx} cx={pt.x} cy={pt.y} r="2.2" fill="#e11d48" stroke="#050508" strokeWidth="0.8" />
                    ))}

                    {/* Noyau central du pentagramme */}
                    <circle cx="50" cy="50" r="3" fill="#e11d48" opacity="0.85" />
                  </svg>
                </div>

                <div className="grid grid-cols-2 gap-2.5 relative z-10">
                  {ALL_STATS.map(stat => {
                    const baseLevel = char.stats[stat]?.level || 1;
                    const effectiveLevel = effectiveState.levels[stat] || baseLevel;
                    const effectiveDice = effectiveState.dice[stat] || getDiceForLevel(effectiveLevel);
                    const bonus = effectiveLevel - baseLevel;
                    const hasBonus = bonus > 0;

                  return (
                    <div
                      key={stat}
                      className="bg-[#090a10]/80 backdrop-blur-md border border-white/10 hover:border-rose-500/40 hover:bg-[#090a10]/90 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between gap-2 transition-all group shadow-sm min-w-0"
                    >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-white truncate">
                        {STAT_LABELS[stat].split(' ')[0]}
                      </span>
                      <span className="text-[9px] font-black uppercase text-rose-400 tracking-wider bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.5 rounded shrink-0">
                        {STAT_SHORT[stat as HexeStatKey]}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/5">
                      {/* Contrôle de niveau */}
                      <div className="flex items-center gap-1 bg-[#050508] px-1.5 py-1 rounded-lg border border-white/10 shrink-0">
                        <button
                          onClick={() => updateStat(stat, -1)}
                          className="w-4 h-4 rounded text-slate-400 hover:text-white font-bold flex items-center justify-center text-xs"
                          title="Diminuer niveau"
                        >
                          -
                        </button>
                        <div className="flex items-center gap-0.5 px-0.5">
                          <span className="font-black text-xs text-white leading-none">
                            {baseLevel}
                          </span>
                          {hasBonus && (
                            <span className="text-[9px] font-bold text-emerald-400 leading-none">
                              +{bonus}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => updateStat(stat, 1)}
                          className="w-4 h-4 rounded text-slate-400 hover:text-white font-bold flex items-center justify-center text-xs"
                          title="Augmenter niveau"
                        >
                          +
                        </button>
                      </div>

                      {/* Bouton de jet de dé */}
                      <button
                        onClick={() => rollStat(stat as HexeStatKey)}
                        className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap shrink-0 ml-auto"
                        title={`Lancer ${effectiveDice} pour ${STAT_LABELS[stat]}`}
                      >
                        <span className="text-[11px]">🎲</span>
                        <span>{effectiveDice}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

          {/* ── ONGLET INVENTAIRE ── */}
          {/* ── ONGLET INVENTAIRE ── */}
          {activeTab === 'inventaire' && (
            <div className="flex flex-col gap-6">
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate block">
                              {item.name}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-400 rounded px-1.5 py-0.5 leading-none shrink-0">
                              Objet
                            </span>
                          </div>
                          {item.description && (
                            <span className="text-[10px] text-slate-400 italic truncate block mt-0.5">
                              {item.description}
                            </span>
                          )}
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
          )}

          {/* ── ONGLET COMPÉTENCES ── */}
          {activeTab === 'competences' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-1 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Compétences
                  </span>
                  <span className="text-[10px] font-bold bg-white/10 text-slate-300 rounded-full px-2 py-0.2 leading-none">
                    {availableSkills.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {availableSkills.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allExpanded = availableSkills.every(s => expandedSkills.has(s.skill.id));
                        if (allExpanded) {
                          setExpandedSkills(new Set());
                        } else {
                          setExpandedSkills(new Set(availableSkills.map(s => s.skill.id)));
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap"
                      title={availableSkills.every(s => expandedSkills.has(s.skill.id)) ? 'Tout replier' : 'Tout déplier'}
                    >
                      {availableSkills.every(s => expandedSkills.has(s.skill.id)) ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Tout replier</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Tout déplier</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowGrimoirePicker(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>{showGrimoirePicker ? 'Fermer Grimoire' : '+ Grimoire'}</span>
                  </button>
                </div>
              </div>

              {/* Sélecteur Grimoire (Piocher des compétences comme l'Arsenal) */}
              {showGrimoirePicker && (
                <GrimoirePickerPanel
                  skills={catalogSkills}
                  search={grimoireSearch}
                  setSearch={setGrimoireSearch}
                  filterType={grimoireFilterType}
                  setFilterType={setGrimoireFilterType}
                  learnedSkillIds={(char.skills || []).map(s => s.id)}
                  onSelect={handleAddSkill}
                  onOpenGrimoireWindow={() => api?.emit('SYSTEM_ACTION_TRIGGERED', 'hexe-grimoire')}
                  onClose={() => setShowGrimoirePicker(false)}
                />
              )}

              {availableSkills.length === 0 && !showGrimoirePicker ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 bg-[#07080d]/60 border border-dashed border-white/10 rounded-2xl p-6">
                  <BookOpen className="w-10 h-10 text-rose-500/40 mb-1" />
                  <p className="font-bold text-sm text-slate-300 text-center">
                    Aucune compétence acquise ou disponible
                  </p>
                  <p className="text-xs text-slate-500 text-center max-w-sm">
                    Cliquez sur "+ Grimoire" pour piocher une compétence, ou équipez un objet en conférant.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cartes de Compétences au style visuel de l'inventaire */}
                  {(['active', 'toggle', 'passive'] as const).map(groupType => {
                    const groupEntries = availableSkills.filter(item => item.skill.activationType === groupType);
                    if (groupEntries.length === 0) return null;

                    const groupLabel = groupType === 'active' ? 'Capacités Actives & Sorts' : groupType === 'toggle' ? 'Auras & Toggles' : 'Dons & Passifs';
                    const groupIcon = groupType === 'active' ? <Flame className="w-4 h-4 text-rose-400" /> : groupType === 'toggle' ? <Zap className="w-4 h-4 text-amber-400" /> : <Shield className="w-4 h-4 text-emerald-400" />;

                    return (
                      <div key={groupType} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          {groupIcon}
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{groupLabel}</span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">({groupEntries.length})</span>
                        </div>

                        <div className="space-y-2">
                          {groupEntries.map(({ skill, sources, isLearned }) => {
                            const isToggle = skill.activationType === 'toggle';
                            const isActiveToggle = isToggle && (char.activeToggles || []).includes(skill.id);
                            const isPassive = skill.activationType === 'passive';
                            const isActive = skill.activationType === 'active';
                            const isExpanded = expandedSkills.has(skill.id);
                            const hasDetails = !!skill.description || (skill.effects && skill.effects.length > 0) || !!skill.duration || (skill.conditions && skill.conditions.length > 0);

                            return (
                              <div
                                key={skill.id}
                                className={`bg-[#090a10] border rounded-xl overflow-hidden transition-all ${
                                  isActiveToggle
                                    ? 'border-rose-500/80 shadow-[0_0_15px_rgba(225,29,72,0.25)] bg-rose-950/20'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className="p-3 flex flex-col gap-2">
                                  {/* Ligne 1 : En-tête de la carte */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                        isPassive ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-400' : isToggle ? 'bg-amber-950/50 border-amber-800/40 text-amber-400' : 'bg-rose-950/50 border-rose-800/40 text-rose-400'
                                      }`}>
                                        {isPassive && <Shield className="w-4 h-4" />}
                                        {isToggle && <Zap className="w-4 h-4" />}
                                        {isActive && <Flame className="w-4 h-4" />}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="text-xs font-bold text-white truncate">{skill.name}</h4>
                                          <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border ${
                                            isPassive
                                              ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                                              : isToggle
                                              ? isActiveToggle
                                                ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                                                : 'bg-amber-950/60 border-amber-800/40 text-amber-300'
                                              : 'bg-rose-950/60 border-rose-800/40 text-rose-300'
                                          }`}>
                                            {isPassive ? 'Passif' : isToggle ? (isActiveToggle ? 'Toggle (Actif)' : 'Toggle (Inactif)') : 'Actif'}
                                          </span>

                                          {/* Distinction capacités apprises vs accordées par un objet */}
                                          {isLearned && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-white/5 border border-white/10 text-slate-300">
                                              Appris
                                            </span>
                                          )}
                                          {sources.filter(s => s !== 'Appris').map(sourceName => (
                                            <span
                                              key={sourceName}
                                              className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-rose-950/70 border border-rose-800/50 text-rose-300 flex items-center gap-1 shadow-sm"
                                              title={`Accordé par l'équipement porté : ${sourceName}`}
                                            >
                                              <Swords className="w-2.5 h-2.5 text-rose-400" />
                                              <span>{sourceName}</span>
                                            </span>
                                          ))}

                                          {skill.skillLevel && (
                                            <span className="text-[9px] font-bold bg-white/5 border border-white/10 text-slate-400 rounded px-1.5 py-0.5">
                                              Niv. {skill.skillLevel}
                                            </span>
                                          )}
                                        </div>

                                        {/* Coûts et dés */}
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          {skill.costs?.mp && (
                                            <span className="text-[9px] font-bold text-blue-300 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.2 rounded">
                                              {skill.costs.mp} MP
                                            </span>
                                          )}
                                          {skill.costs?.stm && (
                                            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                                              {skill.costs.stm} STM
                                            </span>
                                          )}
                                          {skill.costs?.hp && (
                                            <span className="text-[9px] font-bold text-rose-300 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.2 rounded">
                                              {skill.costs.hp} HP
                                            </span>
                                          )}
                                          {skill.costs?.chance && (
                                            <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded">
                                              {skill.costs.chance} Chance
                                            </span>
                                          )}
                                          {skill.dice && (
                                            <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                                              🎲 {formatDiceFormula(skill.dice)}
                                            </span>
                                          )}
                                          {skill.duration && (
                                            <span className="text-[9px] text-slate-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.2">
                                              ⏱ {skill.duration}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions & Bouton Plié/Déplié */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isToggle && (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleSkill(skill.id)}
                                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                            isActiveToggle
                                              ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                                              : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10'
                                          }`}
                                        >
                                          {isActiveToggle ? <ToggleRight className="w-4 h-4 text-white" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                                          <span>{isActiveToggle ? 'Actif' : 'Inactif'}</span>
                                        </button>
                                      )}

                                      {isActive && (
                                        <button
                                          type="button"
                                          onClick={() => handleTriggerSkill(skill)}
                                          className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap"
                                        >
                                          <Play className="w-3.5 h-3.5 fill-current" />
                                          <span>Lancer</span>
                                        </button>
                                      )}

                                      {isPassive && (
                                        <span className="text-[10px] font-semibold text-emerald-400/90 italic px-2 py-0.5">
                                          Permanent
                                        </span>
                                      )}

                                      {/* Bouton modifier la compétence */}
                                      <button
                                        type="button"
                                        onClick={() => setEditingSkill(skill)}
                                        className="p-1 rounded text-slate-500 hover:text-white transition-colors"
                                        title="Modifier cette compétence sur la fiche"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>

                                      {isLearned ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSkill(skill.id)}
                                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                                          title="Oublier cette compétence apprise"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <span
                                          className="p-1 text-slate-500"
                                          title={`Accordé par : ${sources.join(', ')}. Déséquipez l'objet pour retirer.`}
                                        >
                                          <Shield className="w-3.5 h-3.5 text-rose-400/60" />
                                        </span>
                                      )}

                                      {/* Bouton plié/déplié (Chevron) */}
                                      {hasDetails && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandSkill(skill.id)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                                          title={isExpanded ? 'Replier les détails' : 'Déplier les détails'}
                                        >
                                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Détails dépliés : Description, Conditions & Effets */}
                                {isExpanded && hasDetails && (
                                  <div className="px-3 pb-3 pt-2 border-t border-white/5 bg-black/40 space-y-2">
                                    {skill.description && (
                                      <p className="text-[11px] text-slate-300 italic border-l-2 border-rose-500/60 pl-2">
                                        {skill.description}
                                      </p>
                                    )}

                                    {skill.conditions && skill.conditions.length > 0 && (
                                      <div className="flex gap-1 flex-wrap">
                                        {skill.conditions.map((cond, i) => (
                                          <span key={i} className="text-[9px] font-medium bg-white/5 border border-white/10 text-amber-300/90 rounded-full px-2 py-0.5">
                                            Condition : {cond}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {skill.effects?.length > 0 && (
                                      <div className="flex gap-1.5 flex-wrap pt-0.5">
                                        {skill.effects.map((eff, i) => (
                                          <span
                                            key={i}
                                            className="text-[9px] font-semibold text-slate-200 bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
                                          >
                                            {eff.type === 'statLevel' && `${STAT_SHORT[eff.stat]} ${eff.value > 0 ? `+${eff.value}` : eff.value} niv.`}
                                            {eff.type === 'rollModifier' && `Jet ${eff.value > 0 ? `+${eff.value}` : eff.value} ${eff.condition ? `(${eff.condition})` : ''}`}
                                            {eff.type === 'resourceChange' && `${eff.operation} ${eff.resource.toUpperCase()} ${eff.value ? `(${eff.value})` : ''} ${eff.dice ? `(${formatDiceFormula(eff.dice)})` : ''}`}
                                            {eff.type === 'custom' && eff.description}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal d'édition directe de l'équipement sur la fiche */}
      {editingEquipment && (
        <EquipmentEditModal
          equipment={editingEquipment}
          onSave={handleSaveEquipment}
          onClose={() => setEditingEquipment(null)}
        />
      )}

      {/* Modal d'édition directe d'une compétence sur la fiche */}
      {editingSkill && (
        <SkillEditModal
          skill={editingSkill}
          onSave={handleSaveSkill}
          onClose={() => setEditingSkill(null)}
        />
      )}
    </div>
  );
}

// ─── Composants Utilitaires (Thème sombre conforme à la charte) ───────────────

interface InventorySectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function InventorySection({ title, icon, count, action, children }: InventorySectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</span>
          <span className="text-[10px] font-bold bg-white/10 text-slate-300 rounded-full px-2 py-0.2 leading-none">
            {count}
          </span>
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

interface EquipmentCardProps {
  equip: HexeEquipment;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleEquip: () => void;
  onRollWeapon?: () => void;
  onConsume?: () => void;
  onUpdateQty?: (delta: number) => void;
  onEdit?: () => void;
  onDelete: () => void;
}

function EquipmentCard({
  equip, expanded, onToggleExpand, onToggleEquip, onRollWeapon, onConsume, onUpdateQty, onEdit, onDelete
}: EquipmentCardProps) {
  const bonusEntries = Object.entries(equip.statBonuses ?? {}) as [HexeStatKey, number][];
  const linkedSkills = getEquipmentSkills(equip);
  const hasDetails = linkedSkills.length > 0 || (equip.properties?.length ?? 0) > 0 || !!equip.description || equip.slot === 'weapon';
  const isConsumable = equip.slot === 'consumable';

  return (
    <div className={`bg-[#090a10] border rounded-xl overflow-hidden transition-all ${equip.isEquipped ? 'border-rose-500/60 shadow-[0_0_15px_rgba(225,29,72,0.15)]' : 'border-white/10'}`}>
      <div className="p-3 flex flex-col gap-2">
        {/* Ligne 1 : Nom, Badge Slot, et Bonus */}
        <div className="flex items-start justify-between gap-2">
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

          {/* Bouton déplier détails si présents */}
          {hasDetails && (
            <button
              onClick={onToggleExpand}
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
                    onClick={() => onUpdateQty && onUpdateQty(-1)}
                    className="w-4 h-4 text-slate-400 hover:text-white font-bold text-xs"
                    title="Diminuer"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-white w-4 text-center">
                    {equip.quantity ?? 1}
                  </span>
                  <button
                    onClick={() => onUpdateQty && onUpdateQty(1)}
                    className="w-4 h-4 text-slate-400 hover:text-white font-bold text-xs"
                    title="Augmenter"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={onConsume}
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
                    onClick={onRollWeapon}
                    className="px-2 py-1 text-[10px] font-bold rounded-lg transition-colors bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 flex items-center gap-1 shadow-sm whitespace-nowrap"
                    title={`Lancer les dés (${formatDiceFormula(equip.dice)})`}
                  >
                    <Dices className="w-3 h-3 text-rose-400" />
                    <span>{formatDiceFormula(equip.dice)}</span>
                  </button>
                )}
                <button
                  onClick={onToggleEquip}
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
                onClick={onEdit}
                className="p-1 rounded text-slate-500 hover:text-white transition-colors"
                title="Modifier cet équipement sur la fiche"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onDelete}
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
}

interface GrimoirePickerPanelProps {
  skills: HexeSkill[];
  search: string;
  setSearch: (v: string) => void;
  filterType: HexeActivationType | 'all';
  setFilterType: (f: HexeActivationType | 'all') => void;
  learnedSkillIds: string[];
  onSelect: (skill: HexeSkill) => void;
  onOpenGrimoireWindow: () => void;
  onClose: () => void;
}

function GrimoirePickerPanel({
  skills, search, setSearch, filterType, setFilterType, learnedSkillIds, onSelect, onOpenGrimoireWindow, onClose
}: GrimoirePickerPanelProps) {
  const filtered = skills.filter(s => {
    if (filterType !== 'all' && s.activationType !== filterType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = s.name.toLowerCase().includes(q);
    const matchDesc = (s.description || '').toLowerCase().includes(q);
    const matchEff = (s.effects || []).some(e => e.type === 'custom' && e.description.toLowerCase().includes(q));
    return matchName || matchDesc || matchEff;
  });

  const SKILL_FILTER_OPTIONS: {
    type: HexeActivationType | 'all';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
  }[] = [
    { type: 'all', label: 'Toutes', icon: Layers, colorClass: 'text-slate-400' },
    { type: 'active', label: 'Actifs', icon: Flame, colorClass: 'text-rose-400' },
    { type: 'toggle', label: 'Toggles', icon: Zap, colorClass: 'text-amber-400' },
    { type: 'passive', label: 'Passifs', icon: Shield, colorClass: 'text-emerald-400' },
  ];

  return (
    <div className="bg-slate-950 border border-white/15 rounded-xl p-3 flex flex-col gap-3 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Piocher dans le Grimoire
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenGrimoireWindow}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 rounded-lg transition-colors"
            title="Ouvrir la forge du Grimoire dans une fenêtre dédiée"
          >
            <ExternalLink className="w-3 h-3 text-rose-400" /> Forger...
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Chercher une compétence dans le Grimoire..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {SKILL_FILTER_OPTIONS.map(({ type, label, icon: Icon, colorClass }) => {
            const count = type === 'all'
              ? skills.length
              : skills.filter(s => s.activationType === type).length;
            const isActive = filterType === type;

            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.35)]'
                    : 'bg-black/40 border-white/5 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : colorClass}`} />
                <span>{label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    isActive
                      ? 'bg-black/30 text-rose-100'
                      : 'bg-white/5 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            Aucune compétence trouvée. Ouvrez le Grimoire pour en forger de nouvelles.
          </div>
        ) : (
          filtered.map(s => {
            const isAlreadyLearned = learnedSkillIds.includes(s.id);
            return (
              <div
                key={s.id}
                className="bg-slate-900/60 border border-white/10 hover:border-white/20 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">{s.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.2 border ${
                      s.activationType === 'passive'
                        ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                        : s.activationType === 'toggle'
                        ? 'bg-amber-950/60 border-amber-800/40 text-amber-300'
                        : 'bg-rose-950/60 border-rose-800/40 text-rose-300'
                    }`}>
                      {s.activationType === 'passive' ? 'Passif' : s.activationType === 'toggle' ? 'Toggle' : 'Actif'}
                    </span>
                    {s.dice && (
                      <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                        🎲 {formatDiceFormula(s.dice)}
                      </span>
                    )}
                    {s.costs?.mp && (
                      <span className="text-[9px] text-blue-300 bg-blue-950/60 px-1 rounded font-bold">
                        {s.costs.mp} MP
                      </span>
                    )}
                    {s.costs?.stm && (
                      <span className="text-[9px] text-emerald-300 bg-emerald-950/60 px-1 rounded font-bold">
                        {s.costs.stm} STM
                      </span>
                    )}
                  </div>

                  {s.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 italic">
                      {s.description}
                    </p>
                  )}
                </div>

                {isAlreadyLearned ? (
                  <span className="px-2.5 py-1 text-[11px] font-bold text-slate-500 bg-white/5 border border-white/10 rounded-lg shrink-0">
                    Acquise
                  </span>
                ) : (
                  <button
                    onClick={() => onSelect(s)}
                    className="px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shrink-0 transition-colors shadow-[0_0_10px_rgba(225,29,72,0.3)] whitespace-nowrap"
                  >
                    Prendre
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface ArsenalPickerPanelProps {
  templates: HexeEquipmentTemplate[];
  search: string;
  setSearch: (v: string) => void;
  slotFilter: HexeEquipmentSlot | 'all';
  setSlotFilter: (s: HexeEquipmentSlot | 'all') => void;
  onSelect: (template: HexeEquipmentTemplate) => void;
  onOpenArsenalWindow: () => void;
  onClose: () => void;
}

function ArsenalPickerPanel({
  templates, search, setSearch, slotFilter, setSlotFilter, onSelect, onOpenArsenalWindow, onClose
}: ArsenalPickerPanelProps) {
  const filtered = templates.filter(t => {
    if (slotFilter !== 'all' && t.slot !== slotFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = t.name.toLowerCase().includes(q);
    const matchProps = (t.properties || []).some(p => p.toLowerCase().includes(q));
    const matchAb = (t.abilities || []).some(a => a.name.toLowerCase().includes(q));
    return matchName || matchProps || matchAb;
  });

  return (
    <div className="bg-slate-950 border border-white/15 rounded-xl p-3 flex flex-col gap-3 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Piocher dans l'Arsenal
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenArsenalWindow}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 rounded-lg transition-colors"
            title="Ouvrir la forge de l'Arsenal dans une fenêtre dédiée"
          >
            <ExternalLink className="w-3 h-3 text-rose-400" /> Forger...
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Chercher un équipement dans l'Arsenal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {SLOT_FILTER_OPTIONS.map(({ slot, label, icon: Icon, colorClass }) => {
            const count = slot === 'all'
              ? templates.length
              : templates.filter(t => t.slot === slot).length;
            const isActive = slotFilter === slot;

            return (
              <button
                key={slot}
                onClick={() => setSlotFilter(slot)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.35)]'
                    : 'bg-black/40 border-white/5 text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <Icon className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : colorClass}`} />
                <span>{label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                    isActive
                      ? 'bg-black/30 text-rose-100'
                      : 'bg-white/5 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            Aucun équipement disponible. Ouvrez l'Arsenal pour en forger de nouveaux.
          </div>
        ) : (
          filtered.map(t => {
            const bonusEntries = Object.entries(t.statBonuses || {}) as [HexeStatKey, number][];
            return (
              <div
                key={t.id}
                className="bg-slate-900/60 border border-white/10 hover:border-white/20 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">{t.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.2 border flex items-center gap-1 ${
                      t.slot === 'consumable'
                        ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
                        : t.slot === 'other'
                          ? 'bg-sky-950/50 border-sky-700/40 text-sky-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                    }`}>
                      {t.slot === 'consumable' && <FlaskConical className="w-2.5 h-2.5" />}
                      {t.slot === 'other' && <Package className="w-2.5 h-2.5" />}
                      {SLOT_LABELS[t.slot]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {bonusEntries.map(([st, val]) => (
                      <span key={st} className="text-[9px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.2 leading-tight">
                        {STAT_SHORT[st]} +{val}
                      </span>
                    ))}
                    {(t.properties || []).map(p => (
                      <span key={p} className="text-[9px] text-slate-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.2">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onSelect(t)}
                  className="px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shrink-0 transition-colors shadow-[0_0_10px_rgba(225,29,72,0.3)] whitespace-nowrap"
                >
                  Prendre
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface CompactResourceBarProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number;
  color: string;
  trackColor: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

function CompactResourceBar({ icon, label, current, max, color, trackColor, onDecrement, onIncrement }: CompactResourceBarProps) {
  const pct = Math.min(100, Math.max(0, (current / max) * 100));
  return (
    <div className="bg-[#090a10] border border-white/10 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between gap-1.5 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0" style={{ color }}>
          {icon}
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider truncate">{label}</span>
        </div>
        <div className="text-xs font-black text-white shrink-0">
          {current}<span className="text-[10px] font-medium text-slate-400">/{max}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
        <div
          className="h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(225,29,72,0.4)]"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Contrôles - / + */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          {Math.round(pct)}%
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onDecrement}
            className="w-6 h-5 rounded bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-300 hover:text-white transition-colors"
            title="Diminuer"
          >
            -
          </button>
          <button
            onClick={onIncrement}
            className="w-6 h-5 rounded bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center font-bold text-xs text-slate-300 hover:text-white transition-colors"
            title="Augmenter"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal d'Édition d'Équipement ─────────────────────────────────────────────

interface EquipmentEditModalProps {
  equipment: HexeEquipment;
  onSave: (updated: HexeEquipment) => void;
  onClose: () => void;
}

function EquipmentEditModal({ equipment, onSave, onClose }: EquipmentEditModalProps) {
  const [name, setName] = useState(equipment.name);
  const [slot, setSlot] = useState<HexeEquipmentSlot>(equipment.slot);
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
          {/* Nom & Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          </div>

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
        <SkillImportModal
          alreadyLinkedIds={linkedSkills.map(s => s.id)}
          onImportSkillIds={handleImportSkills}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}

// ─── Modal d'Édition de Compétence ───────────────────────────────────────────

interface SkillEditModalProps {
  skill: HexeSkill;
  onSave: (updated: HexeSkill) => void;
  onClose: () => void;
}

function SkillEditModal({ skill, onSave, onClose }: SkillEditModalProps) {
  const [name, setName] = useState(skill.name);
  const [activationType, setActivationType] = useState<HexeActivationType>(skill.activationType || 'passive');
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
      <div className="bg-[#090a10] border border-white/15 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#050508]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Modifier la compétence</h3>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          {/* Mode d'activation */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold block">Mode d'activation</label>
            <div className="grid grid-cols-3 gap-2">
              {(['passive', 'toggle', 'active'] as HexeActivationType[]).map(t => {
                const isSel = activationType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivationType(t)}
                    className={`p-2 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      isSel
                        ? t === 'passive'
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : t === 'toggle'
                          ? 'bg-amber-950/70 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'bg-rose-950/70 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(225,29,72,0.25)]'
                        : 'bg-[#050508] border-white/10 text-slate-400 hover:border-white/20'
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
              <label className="text-[10px] text-slate-400 font-bold block">Nom de la compétence *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">Niveau</label>
              <input
                type="number"
                min="0"
                max="10"
                placeholder="Ex: 1"
                value={skillLevel}
                onChange={e => setSkillLevel(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold block">Description narrative</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description ou explication du sort ou don..."
              className="w-full bg-[#050508] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500 custom-scrollbar"
            />
          </div>

          {/* Coûts en ressources (si non passif) */}
          {activationType !== 'passive' && (
            <div className="p-2.5 bg-[#050508] border border-white/10 rounded-xl space-y-2">
              <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Coûts en ressources (Activation ou Entretien)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[9px] text-blue-300 font-bold block mb-0.5">MP (Mana)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costs.mp || ''}
                    onChange={e => setCosts(p => ({ ...p, mp: Number(e.target.value) || undefined }))}
                    className="w-full bg-slate-900 border border-blue-900/40 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-emerald-300 font-bold block mb-0.5">STM (Endurance)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costs.stm || ''}
                    onChange={e => setCosts(p => ({ ...p, stm: Number(e.target.value) || undefined }))}
                    className="w-full bg-slate-900 border border-emerald-900/40 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-rose-300 font-bold block mb-0.5">HP (Sacrifice)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costs.hp || ''}
                    onChange={e => setCosts(p => ({ ...p, hp: Number(e.target.value) || undefined }))}
                    className="w-full bg-slate-900 border border-rose-900/40 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-amber-300 font-bold block mb-0.5">Chance</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costs.chance || ''}
                    onChange={e => setCosts(p => ({ ...p, chance: Number(e.target.value) || undefined }))}
                    className="w-full bg-slate-900 border border-amber-900/40 rounded px-2 py-1 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Durée & Conditions & Dés */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">Durée (opt.)</label>
              <input
                type="text"
                placeholder="Ex: 3 tours..."
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">Conditions (opt.)</label>
              <input
                type="text"
                placeholder="Ex: Contact, Nuit..."
                value={conditionText}
                onChange={e => setConditionText(e.target.value)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold block">Dés (opt.)</label>
              <input
                type="text"
                placeholder="Ex: 2d6+2"
                value={diceStr}
                onChange={e => setDiceStr(e.target.value)}
                className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1.5 text-amber-300 font-mono"
              />
            </div>
          </div>

          {/* Effets mécaniques */}
          <div className="p-3 bg-slate-950/80 border border-white/10 rounded-xl space-y-3">
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
                      {eff.type === 'custom' && (
                        <span className="text-slate-300 italic truncate">« {eff.description} »</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEffect(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => setNewEffectType('statLevel')}
                  className={`py-1 px-1.5 rounded text-[10px] font-bold border transition-colors ${
                    newEffectType === 'statLevel' ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300' : 'bg-black/20 border-white/5 text-slate-400'
                  }`}
                >
                  Niveau Stat
                </button>
                <button
                  type="button"
                  onClick={() => setNewEffectType('rollModifier')}
                  className={`py-1 px-1.5 rounded text-[10px] font-bold border transition-colors ${
                    newEffectType === 'rollModifier' ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300' : 'bg-black/20 border-white/5 text-slate-400'
                  }`}
                >
                  Modif. Jet
                </button>
                <button
                  type="button"
                  onClick={() => setNewEffectType('resourceChange')}
                  className={`py-1 px-1.5 rounded text-[10px] font-bold border transition-colors ${
                    newEffectType === 'resourceChange' ? 'bg-rose-950/70 border-rose-500 text-rose-300' : 'bg-black/20 border-white/5 text-slate-400'
                  }`}
                >
                  Ressource
                </button>
                <button
                  type="button"
                  onClick={() => setNewEffectType('custom')}
                  className={`py-1 px-1.5 rounded text-[10px] font-bold border transition-colors ${
                    newEffectType === 'custom' ? 'bg-rose-950/70 border-rose-500 text-rose-300' : 'bg-black/20 border-white/5 text-slate-400'
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
                      placeholder="Condition (ex: Jet d'attaque)"
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
                <input
                  type="text"
                  placeholder="Description de l'effet narratif..."
                  value={newEffCustomDesc}
                  onChange={e => setNewEffCustomDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white"
                />
              )}

              <button
                type="button"
                onClick={handleAddEffect}
                className="w-full py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 font-bold transition-colors"
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
    </div>
  );
}
