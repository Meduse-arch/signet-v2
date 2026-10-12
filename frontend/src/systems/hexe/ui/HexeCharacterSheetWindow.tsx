import { useState, useEffect } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import {
  Droplet, Shield, Star, Sparkles, ArrowLeft, Swords, Backpack, BookOpen,
  Trash2, ChevronDown, ChevronUp, Package, Tag, Zap, X, Search, ExternalLink,
  FlaskConical, Layers, Edit3, Plus, Play, ToggleLeft, ToggleRight, Dices
} from 'lucide-react';
import type {
  HexeCharacter, HexeEquipment, HexeStatKey, HexeEquipmentSlot,
  HexeSkill, HexeWeaponRank, HexeWeaponNature
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
  getSkillsCatalog, subscribeSkills
} from '../hexeSkillStore';
import { HexePentacleBadge } from './HexePentacleBadge';
import { SkillPickerModal } from './SkillPickerModal';
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
  { slot: 'accessory', label: 'Accessoires', icon: Sparkles, colorClass: 'text-purple-400' },
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

  // — Modal Sélecteur de Compétences
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [catalogSkills, setCatalogSkills] = useState<HexeSkill[]>([]);

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
                icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                label="MP"
                current={char.resources.mp}
                max={effectiveState.maxResources.mp}
                color="#a855f7"
                trackColor="rgba(168, 85, 247, 0.15)"
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
          {/* ── ONGLET ATTRIBUTS - 2 Colonnes propres et aérées ── */}
          {activeTab === 'attributs' && (() => {
            const effectiveState = calculateEffectiveState(char);
            return (
              <div className="grid grid-cols-2 gap-2.5">
                {ALL_STATS.map(stat => {
                  const baseLevel = char.stats[stat]?.level || 1;
                  const effectiveLevel = effectiveState.levels[stat] || baseLevel;
                  const effectiveDice = effectiveState.dice[stat] || getDiceForLevel(effectiveLevel);
                  const bonus = effectiveLevel - baseLevel;
                  const hasBonus = bonus > 0;

                return (
                  <div
                    key={stat}
                    className="bg-[#090a10] border border-white/10 hover:border-white/20 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between gap-2 transition-all group shadow-sm min-w-0"
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
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Arts & Incantations
                  </span>
                  <span className="text-[10px] font-bold bg-white/10 text-slate-300 rounded-full px-2 py-0.2 leading-none">
                    {(char.skills || []).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => api?.emit('SYSTEM_ACTION_TRIGGERED', 'hexe-grimoire')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-purple-300 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 rounded-lg transition-all whitespace-nowrap"
                    title="Ouvrir la fenêtre du Grimoire Hexe"
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>Grimoire</span>
                  </button>
                  <button
                    onClick={() => setShowSkillPicker(true)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>+ Compétence</span>
                  </button>
                </div>
              </div>

              {(char.skills || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 bg-[#07080d]/60 border border-dashed border-white/10 rounded-2xl p-6">
                  <BookOpen className="w-10 h-10 text-rose-500/40 mb-1" />
                  <p className="font-bold text-sm text-slate-300 text-center">
                    Aucune compétence acquise
                  </p>
                  <p className="text-xs text-slate-500 text-center max-w-sm">
                    Cliquez sur "+ Compétence" pour piocher dans le Grimoire ou forger une technique sur-mesure.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(char.skills || []).map(skill => {
                    const isToggle = skill.activationType === 'toggle';
                    const isActiveToggle = isToggle && (char.activeToggles || []).includes(skill.id);
                    const isPassive = skill.activationType === 'passive';
                    const isActive = skill.activationType === 'active';

                    return (
                      <div
                        key={skill.id}
                        className={`bg-[#090a10] border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          isActiveToggle
                            ? 'border-rose-500/80 shadow-[0_0_15px_rgba(225,29,72,0.2)] bg-rose-950/20'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">{skill.name}</span>

                            {isPassive && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 border border-white/10 text-slate-300 rounded px-1.5 py-0.5 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-purple-400" /> Passif
                              </span>
                            )}
                            {isToggle && (
                              <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 flex items-center gap-1 border ${
                                isActiveToggle
                                  ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                                  : 'bg-amber-950/60 border-amber-800/40 text-amber-300'
                              }`}>
                                <Layers className="w-2.5 h-2.5 text-amber-400" /> Toggle
                              </span>
                            )}
                            {isActive && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-950/60 border border-rose-800/40 text-rose-300 rounded px-1.5 py-0.5 flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5 text-rose-400" /> Actif
                              </span>
                            )}

                            {skill.costs?.mp && (
                              <span className="text-[9px] font-bold text-purple-400 bg-purple-950/60 border border-purple-800/40 px-1.5 py-0.2 rounded">
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
                                🎲 {skill.dice.terms?.map(t => `${t.count}d${t.sides}`).join('+')}
                              </span>
                            )}
                          </div>

                          {skill.description && (
                            <p className="text-[11px] text-slate-400 italic line-clamp-2">{skill.description}</p>
                          )}

                          {skill.effects?.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap pt-0.5">
                              {skill.effects.map((eff, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded px-1.5 py-0.2"
                                >
                                  {eff.type === 'statLevel' && `+${eff.value} ${STAT_LABELS[eff.stat]}`}
                                  {eff.type === 'rollModifier' && `+${eff.value} aux jets`}
                                  {eff.type === 'resourceChange' && `${eff.operation.toUpperCase()} ${eff.resource.toUpperCase()}`}
                                  {eff.type === 'custom' && eff.description}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isToggle && (
                            <button
                              onClick={() => handleToggleSkill(skill.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isActiveToggle
                                  ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10'
                              }`}
                            >
                              {isActiveToggle ? (
                                <>
                                  <ToggleRight className="w-4 h-4 text-white" />
                                  <span>Actif</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                                  <span>Inactif</span>
                                </>
                              )}
                            </button>
                          )}

                          {isActive && (
                            <button
                              onClick={() => handleTriggerSkill(skill)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Lancer</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteSkill(skill.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                            title="Oublier cette compétence"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal sélecteur de compétences */}
      {showSkillPicker && (
        <SkillPickerModal
          catalogSkills={catalogSkills}
          onAddSkill={handleAddSkill}
          onClose={() => setShowSkillPicker(false)}
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
  const hasDetails = (equip.abilities?.length ?? 0) > 0 || (equip.properties?.length ?? 0) > 0 || !!equip.description || equip.slot === 'weapon';
  const isConsumable = equip.slot === 'consumable';

  return (
    <div className={`bg-[#090a10] border rounded-xl overflow-hidden transition-all ${equip.isEquipped ? 'border-rose-500/60 shadow-[0_0_15px_rgba(225,29,72,0.15)]' : 'border-white/10'}`}>
      <div className="p-3 flex flex-col gap-2">
        {/* Ligne 1 : Nom, Badge Slot, et Bonus */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-white truncate">{equip.name}</span>
              {equip.slot === 'weapon' && (
                <HexePentacleBadge
                  rank={equip.rank || 'C'}
                  nature={equip.nature || 'classic'}
                  symbol={equip.symbol}
                  size={20}
                />
              )}
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

          {equip.slot === 'weapon' && (
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
                    ? "Arme d'Ego : Volonté propre de l'arme."
                    : equip.nature === 'possessed'
                    ? "Arme Possédée : Entité occulte résidente."
                    : "Arme Classique : Volonté directrice du porteur."}
                </div>
              </div>
              {equip.dice && (
                <span className="text-[10px] font-black text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-1 rounded shrink-0">
                  {formatDiceFormula(equip.dice)}
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

          {(equip.abilities?.length ?? 0) > 0 && equip.abilities!.map(ab => (
            <div key={ab.id} className="bg-slate-900/90 border-l-2 border-rose-500 border border-white/10 rounded p-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="text-xs font-bold text-rose-300">{ab.name}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{ab.description}</p>
              {ab.condition && (
                <p className="text-[10px] italic text-amber-400/90 mt-0.5">Condition : {ab.condition}</p>
              )}
            </div>
          ))}
        </div>
      )}
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
  const [abilities, setAbilities] = useState<{ id: string; name: string; description: string; condition?: string }[]>([
    ...(equipment.abilities ?? [])
  ]);

  // Form helpers
  const [newProp, setNewProp] = useState('');
  const [newBonusStat, setNewBonusStat] = useState<HexeStatKey>('str');
  const [newBonusVal, setNewBonusVal] = useState(1);
  const [newAbName, setNewAbName] = useState('');
  const [newAbDesc, setNewAbDesc] = useState('');
  const [newAbCond, setNewAbCond] = useState('');

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

  const handleAddAbility = () => {
    if (!newAbName.trim() || !newAbDesc.trim()) return;
    setAbilities(prev => [
      ...prev,
      {
        id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: newAbName.trim(),
        description: newAbDesc.trim(),
        condition: newAbCond.trim() || undefined
      }
    ]);
    setNewAbName('');
    setNewAbDesc('');
    setNewAbCond('');
  };

  const handleRemoveAbility = (id: string) => {
    setAbilities(prev => prev.filter(a => a.id !== id));
  };

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
      rank: slot === 'weapon' ? rank : undefined,
      nature: slot === 'weapon' ? nature : undefined,
      symbol: slot === 'weapon' ? {
        orientation: nature === 'classic' ? 'upright' : 'inverted',
        filled: nature === 'possessed',
        hasCircle: rank === 'S'
      } : undefined,
      dice: parsedDice || (slot === 'weapon' ? equipment.dice : undefined),
      statBonuses,
      properties,
      abilities
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

          {/* Section spécifique Arme : Rangs & Pentacles (Section 8) */}
          {slot === 'weapon' && (
            <div className="border border-white/10 rounded-xl p-3 bg-black/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                    Symbolique & Rang (Pentacle Hexe)
                  </label>
                  <p className="text-[10px] text-slate-500">Convention visuelle et narrative des armes</p>
                </div>
                <HexePentacleBadge
                  rank={rank}
                  nature={nature}
                  size={36}
                  showLabel={true}
                />
              </div>

              {/* Rangs F -> S */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">
                  Rang ({rank === 'S' ? 'Pentacle complet cerclé' : `${['F', 'D', 'C', 'B', 'A'].indexOf(rank) + 1} branche(s)`})
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {(['F', 'D', 'C', 'B', 'A', 'S'] as HexeWeaponRank[]).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRank(r)}
                      className={`py-1 rounded font-black text-xs border transition-all ${
                        rank === r
                          ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                          : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {r}
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
                    className={`p-1.5 rounded text-left border transition-all ${
                      nature === 'classic'
                        ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                        : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold">Classique</div>
                    <div className="text-[9px] text-slate-500">Volonté du porteur</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNature('ego')}
                    className={`p-1.5 rounded text-left border transition-all ${
                      nature === 'ego'
                        ? 'bg-amber-950/60 border-amber-500/80 text-amber-300'
                        : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold">Ego</div>
                    <div className="text-[9px] text-slate-500">Volonté de l'arme</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNature('possessed')}
                    className={`p-1.5 rounded text-left border transition-all ${
                      nature === 'possessed'
                        ? 'bg-red-950/70 border-red-500/80 text-red-300'
                        : 'bg-[#050508] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold">Possédée</div>
                    <div className="text-[9px] text-slate-500">Entité résidente</div>
                  </button>
                </div>
              </div>

              {/* Formule de dés */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold block">
                  Formule de Dés (ex: 1d8+2, 2d6)
                </label>
                <input
                  type="text"
                  placeholder="ex: 1d8+2, 2d6, 1d20..."
                  value={diceStr}
                  onChange={e => setDiceStr(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

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
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Capacités spéciales</label>
            <div className="space-y-2">
              {abilities.map(ab => (
                <div key={ab.id} className="bg-slate-900/90 border-l-2 border-rose-500 border border-white/10 rounded-lg p-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="font-bold text-rose-300">{ab.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">{ab.description}</p>
                    {ab.condition && (
                      <p className="text-[10px] italic text-amber-400/90 mt-0.5">Condition : {ab.condition}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAbility(ab.id)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-[#050508] border border-white/10 rounded-lg p-2.5 space-y-2">
              <input
                type="text"
                placeholder="Nom de la capacité..."
                value={newAbName}
                onChange={e => setNewAbName(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <textarea
                rows={2}
                placeholder="Description / effet mécanique..."
                value={newAbDesc}
                onChange={e => setNewAbDesc(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
              <input
                type="text"
                placeholder="Condition d'activation (optionnelle)..."
                value={newAbCond}
                onChange={e => setNewAbCond(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddAbility}
                className="w-full py-1 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                + Ajouter cette capacité
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
