import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import type {
  HexeCharacter, HexeEquipment, HexeStatKey, HexeEquipmentSlot,
  HexeSkill, HexeActivationType
} from '../types';
import {
  DEFAULT_HEXE_STATS, getMaxHP, getMaxMP, getMaxSTM, getMaxChance, STAT_LABELS
} from '../types';
import { calculateEffectiveState, executeSkillOrItem } from '../hexeEffectEngine';
import { formatDiceFormula, rollDiceFormula } from '../hexeDiceEngine';
import {
  getSkillsCatalog, subscribeSkills, getCharacterAvailableSkills
} from '../hexeSkillStore';
import { invoke } from '@tauri-apps/api/core';
import { ModManager } from '../../../core/services/ModManager';
import { getTemplates, instantiateTemplate, subscribeTemplates } from '../hexeEquipmentStore';
import type { HexeEquipmentTemplate } from '../hexeEquipmentStore';

const isTauri = () => '__TAURI_INTERNALS__' in window;

export type SheetTab = 'attributs' | 'inventaire' | 'competences';

export function useHexeCharacterSheet(api: SignetAPI, characterId: string) {
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

  // Ref vers l'état courant : permet des handlers stables (useCallback) sans closure périmée
  const charRef = useRef(char);
  charRef.current = char;

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

  const effectiveState = useMemo(() => {
    return calculateEffectiveState(char);
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
  const updateCharacterLocally = useCallback((updater: (prev: HexeCharacter) => HexeCharacter) => {
    setChar(prev => {
      const next = updater(prev);
      if (isTauri()) {
        invoke('save_character', { id: next.id, name: next.name, ownerId: next.owner_id || null, data: JSON.stringify(next) })
          .catch(err => console.error("Erreur save_character local", err));
      }
      api.emit('NETWORK_OUTGOING', { type: 'MOD_EVENT', _sourceMod: 'system-hexe', modEventType: 'SYNC_CHARACTER', payload: next });
      return next;
    });
  }, [api]);

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

  const handleRollWeapon = useCallback((equip: HexeEquipment) => {
    const char = charRef.current;
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
  }, [api]);

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

  const toggleEquipped = useCallback((equipId: string) => {
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: (prev.equipment ?? []).map(e => {
        if (e.id !== equipId) return e;
        if (e.slot === 'consumable') return e;
        return { ...e, isEquipped: !e.isEquipped };
      })
    }));
  }, [updateCharacterLocally]);

  const updateEquipmentQty = useCallback((equipId: string, delta: number) => {
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: (prev.equipment ?? []).map(e => {
        if (e.id !== equipId) return e;
        const newQty = (e.quantity ?? 1) + delta;
        return { ...e, quantity: newQty };
      }).filter(e => (e.quantity ?? 1) > 0)
    }));
  }, [updateCharacterLocally]);

  const handleConsumeItem = useCallback((equip: HexeEquipment) => {
    const char = charRef.current;
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
  }, [api, updateCharacterLocally]);

  const deleteEquipment = useCallback((equipId: string) => {
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: (prev.equipment ?? []).filter(e => e.id !== equipId)
    }));
  }, [updateCharacterLocally]);

  const handleSaveEquipment = (updated: HexeEquipment) => {
    updateCharacterLocally(prev => ({
      ...prev,
      equipment: (prev.equipment ?? []).map(e => e.id === updated.id ? updated : e)
    }));
    setEditingEquipment(null);
  };

  const toggleExpandEquip = useCallback((equipId: string) => {
    setExpandedEquip(prev => {
      const next = new Set(prev);
      next.has(equipId) ? next.delete(equipId) : next.add(equipId);
      return next;
    });
  }, []);

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

  return {
    char, knownPlayers, isHost, activeTab, setActiveTab,
    showArsenalPicker, setShowArsenalPicker, arsenalTemplates, pickerSearch, setPickerSearch, pickerSlot, setPickerSlot,
    expandedEquip, editingEquipment, setEditingEquipment,
    expandedSkills, setExpandedSkills, editingSkill, setEditingSkill, toggleExpandSkill,
    showGrimoirePicker, setShowGrimoirePicker, grimoireSearch, setGrimoireSearch,
    grimoireFilterType, setGrimoireFilterType, catalogSkills,
    availableSkills, effectiveState,
    updateCharacterLocally, updateField, updateStat, rollStat, handleRollWeapon,
    handleToggleSkill, handleTriggerSkill, handleAddSkill, handleDeleteSkill, handleSaveSkill,
    addEquipmentFromArsenal, toggleEquipped, updateEquipmentQty, handleConsumeItem,
    deleteEquipment, handleSaveEquipment, toggleExpandEquip, updateItemQty, deleteItem,
    equippedItems, bagItems, legacyItems, totalBagCount,
  };
}

export type HexeSheetState = ReturnType<typeof useHexeCharacterSheet>;
