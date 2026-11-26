import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import type { FlowerCharacter } from '../types';
import { DEFAULT_FLOWER_STATS, calculateMaxHp, normalizeStatKey, getDiceForFlowers } from '../types';
import { simulateFlowerRoll } from '../utils/diceUtils';
import { ModManager } from '../../../core/services/ModManager';

// Détection de l'Hôte (Tauri)
export const isTauri = () => '__TAURI_INTERNALS__' in window;

/** État et actions de la fiche de personnage Flower (sauvegarde, sync réseau, jets, compendium). */
export function useFlowerCharacter(api: SignetAPI, characterId: string) {
  const [character, setCharacter] = useState<FlowerCharacter>({
    id: characterId || 'new-char',
    name: 'Nouveau Personnage',
    hpCurrent: 10, // Initialisé par défaut
    stats: { ...DEFAULT_FLOWER_STATS }
  });
  
  const [newStatName, setNewStatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'skills' | 'inventory'>('stats');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'equipped' | 'unequipped'>('all');
  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const [knownCustomStats, setKnownCustomStats] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  
  // Modal Compendium
  const [compendiumModalOpen, setCompendiumModalOpen] = useState(false);
  const [compendiumModalType, setCompendiumModalType] = useState<'skill' | 'item'>('skill');
  const [compendiumEntries, setCompendiumEntries] = useState<any[]>([]);

  // --- Fonctions CRUD pour Compétences ---
  const removeSkill = (id: string) => {
    updateCharacter(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(s => s.id !== id)
    }));
  };

  // --- Fonctions CRUD pour Inventaire ---
  const removeItem = (id: string) => {
    updateCharacter(prev => ({
      ...prev,
      inventory: (prev.inventory || []).filter(i => i.id !== id)
    }));
  };

  const updateItem = (id: string, field: string, value: any) => {
    updateCharacter(prev => ({
      ...prev,
      inventory: (prev.inventory || []).map(i => i.id === id ? { ...i, [field]: value } : i)
    }));
  };

  const handleToggleEquip = (item: any) => {
    // --- ACTIVITY LOG ---
    api.log({
      type: 'item',
      actor: character.name,
      actorId: character.id,
      accountName: character.owner_id || api.user.getName(),
      summary: `a ${item.isEquipped ? 'déséquipé' : 'équipé'} ${item.name}`,
      visibility: 'all'
    });

    if (!item.isEquipped) {
      // Action: EQUIP
      if (item.quantity > 1) {
        // Split
        const newItemId = Date.now().toString();
        updateCharacter(prev => {
          const inv = prev.inventory || [];
          const index = inv.findIndex(i => i.id === item.id);
          if (index === -1) return prev;
          
          const newInv = [...inv];
          newInv[index] = { ...newInv[index], quantity: newInv[index].quantity - 1 };
          newInv.push({ ...item, id: newItemId, quantity: 1, isEquipped: true });
          
          return { ...prev, inventory: newInv };
        });
      } else {
        updateItem(item.id, 'isEquipped', true);
      }
    } else {
      // Action: UNEQUIP
      // Tenter de fusionner avec un objet non-équipé identique
      updateCharacter(prev => {
        const inv = prev.inventory || [];
        const sameUnequipped = inv.find(i => 
          i.id !== item.id && 
          !i.isEquipped && 
          i.compendiumId === item.compendiumId && 
          i.name === item.name
        );
        
        if (sameUnequipped) {
          // Fusion
          return {
            ...prev,
            inventory: inv.map(i => {
              if (i.id === sameUnequipped.id) {
                return { ...i, quantity: i.quantity + item.quantity };
              }
              return i;
            }).filter(i => i.id !== item.id)
          };
        } else {
          // Juste déséquiper
          return {
            ...prev,
            inventory: inv.map(i => i.id === item.id ? { ...i, isEquipped: false } : i)
          };
        }
      });
    }
  };

  // --- Import Compendium ---
  const openCompendiumModal = async (type: 'skill' | 'item') => {
    setCompendiumModalType(type);
    setCompendiumModalOpen(true);
    setCompendiumEntries([]);
    if (isTauri()) {
      try {
        const rawData = await invoke('get_module_data', { moduleId: 'system-flower-compendium' }) as [string, string][];
        const parsed = rawData.map(([key, data]) => {
          const json = JSON.parse(data);
          return { id: key, ...json };
        }).filter(e => e.type === type);
        setCompendiumEntries(parsed);
      } catch (e) {
        console.error('[CharacterSheet] Erreur get compendium:', e);
      }
    }
  };

  const importCompendiumEntry = (entry: any) => {
    const newId = Date.now().toString();
    if (compendiumModalType === 'skill') {
      updateCharacter(prev => ({
        ...prev,
        skills: [...(prev.skills || []), { id: newId, compendiumId: entry.id, name: entry.name, description: entry.description }]
      }));
    } else {
      updateCharacter(prev => ({
        ...prev,
        inventory: [...(prev.inventory || []), { id: newId, compendiumId: entry.id, name: entry.name, quantity: 1, description: entry.description, modifiers: entry.modifiers, isEquipped: false }]
      }));
    }
    setCompendiumModalOpen(false);
  };

  // Chargement initial du personnage et des joueurs
  useEffect(() => {
    setIsHost(ModManager.getIsHost());

    if (isTauri()) {
      invoke('get_players').then((players: any) => {
        // Le backend renvoie directement un tableau de strings (Vec<String>)
        setKnownPlayers(players as string[]);
      }).catch(e => console.error("Erreur get_players", e));

      // Extraire toutes les statistiques personnalisées existantes
      invoke('get_characters').then((records: any) => {
        const statsSet = new Set<string>();
        for (const record of records) {
          const char = JSON.parse(record.data);
          if (char.stats) {
            Object.values(char.stats).forEach((s: any) => {
              if (s.isCustom) statsSet.add(s.name);
            });
          }
        }
        setKnownCustomStats(Array.from(statsSet));
      }).catch(e => console.error("Erreur extraction stats custom", e));
    }

    if (!characterId) return;

    if (isTauri()) {
      invoke<{ id: string; data: string }[]>('get_characters').then((records) => {
        const record = records.find(r => r.id === characterId);
        if (record) {
          let parsed = JSON.parse(record.data);
          // Si le perso vient d'être créé par le Codex, il n'a pas de stats
          if (!parsed.stats) parsed.stats = { ...DEFAULT_FLOWER_STATS };
          if (parsed.hpCurrent === undefined) parsed.hpCurrent = 10;
          setCharacter(parsed);
        }
      }).catch(console.error);
    } else {
      // Pour le joueur, on demande la fiche
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: 'system-flower',
        modEventType: 'REQUEST_CHARACTERS',
        payload: { playerId: api.user.getName() }
      });
    }
    
    // Écoute des mises à jour pour TOUT LE MONDE (MJ et Joueurs)
    const onSync = (msg: any) => {
      if (msg.modEventType === 'SYNC_CHARACTERS') {
        const char = msg.payload.find((c: any) => c.id === characterId);
        if (char) {
           let data = char.data ? JSON.parse(char.data) : char;
           if (!data.stats) data.stats = { ...DEFAULT_FLOWER_STATS };
           if (data.hpCurrent === undefined) data.hpCurrent = 10;
           setCharacter(data);
        }
      } else if (msg.modEventType === 'SYNC_CHARACTER') {
        if (msg.payload.id === characterId) {
           let data = msg.payload;
           if (!data.stats) data.stats = { ...DEFAULT_FLOWER_STATS };
           if (data.hpCurrent === undefined) data.hpCurrent = 10;
           setCharacter(data);
        }
      }
    };

    api.on('NETWORK_INCOMING', onSync);
    api.on('NETWORK_OUTGOING', onSync); // Permet à la fiche du MJ de se mettre à jour si le Compendium est modifié

    return () => {
      api.off('NETWORK_INCOMING', onSync);
      api.off('NETWORK_OUTGOING', onSync);
    };
  }, [api, characterId]);

  const saveCharacter = async (charToSave: FlowerCharacter) => {
    setIsSaving(true);
    if (isTauri()) {
      try {
        await invoke('save_character', {
          id: charToSave.id,
          name: charToSave.name,
          ownerId: charToSave.owner_id || null,
          data: JSON.stringify(charToSave)
        });
        
        // Le MJ notifie les joueurs de la mise à jour de la fiche
        api.emit('NETWORK_OUTGOING', {
          type: 'MOD_EVENT',
          _sourceMod: 'system-flower',
          modEventType: 'SYNC_CHARACTER',
          payload: charToSave
        });
      } catch (err) {
        console.error("Erreur save_character local", err);
      }
    } else {
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: 'system-flower',
        modEventType: 'SYNC_CHARACTER',
        payload: charToSave
      });
    }
    setTimeout(() => setIsSaving(false), 500);
  };

  const updateCharacter = (updater: (prev: FlowerCharacter) => FlowerCharacter) => {
    setCharacter(prev => {
      const maxHpBefore = calculateMaxHp(prev.stats, prev.inventory, prev.skills);
      const next = updater(prev);
      const maxHpAfter = calculateMaxHp(next.stats, next.inventory, next.skills);
      
      const diff = maxHpAfter - maxHpBefore;
      if (diff !== 0) {
        next.hpCurrent = Math.max(0, Math.min(next.hpCurrent + diff, maxHpAfter));
      } else {
        next.hpCurrent = Math.max(0, Math.min(next.hpCurrent, maxHpAfter));
      }
      
      saveCharacter(next);
      return next;
    });
  };

  const maxHp = calculateMaxHp(character.stats, character.inventory, character.skills);

  const handleStatChange = (statKey: string, newValue: number) => {
    updateCharacter(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [statKey]: { ...prev.stats[statKey], value: newValue }
      }
    }));
  };

  const rollStat = async (statKey: string, activeSkillIdToInclude?: string) => {
    
    const stat = character.stats[statKey];
    if (!stat) return;
    
    const diceString = getDiceForFlowers(stat.value);
    const rollArray = [diceString];
    let modText = '';
    
    const applyModsForRoll = (modifiers: any[] | undefined, qty: number, level: number, sourceName: string) => {
      if (!modifiers) return;
      for (const mod of modifiers) {
        if (normalizeStatKey(mod.target) === statKey) {
          const val = parseInt(mod.value);
          if (!isNaN(val)) {
            let multiplier = 1;
            if (mod.scaleStat) {
              const scale = normalizeStatKey(mod.scaleStat);
              if (scale === 'quantite') multiplier = qty;
              else if (scale === 'niveau' || scale === 'maitrise') multiplier = level;
              else multiplier = character.stats[scale]?.value || 0;
            }
            const finalVal = val * multiplier;
            if (finalVal !== 0) {
              rollArray.push(finalVal >= 0 ? `+${finalVal}` : `${finalVal}`);
              modText += ` ${finalVal >= 0 ? '+' : '-'} ${Math.abs(finalVal)} (${sourceName})`;
            }
          } else {
            rollArray.push(mod.value);
            modText += ` + ${mod.value} (${sourceName})`;
          }
        }
      }
    };
    
    // Check inventory for modifiers
    if (character.inventory) {
      for (const item of character.inventory) {
        if (item.isEquipped) {
          applyModsForRoll(item.modifiers, item.quantity, 0, item.name);
        }
      }
    }

    // Check skills for modifiers
    if (character.skills) {
      for (const skill of character.skills) {
        if (skill.id === activeSkillIdToInclude || skill.skillType === 'passive' || (skill.skillType === 'toggle' && skill.isActive)) {
          applyModsForRoll(skill.modifiers, 1, skill.level || 0, skill.name);
        }
      }
    }
    
    // Lancer les dés localement
    const fullFormula = rollArray.join(' ');
    const { total } = await simulateFlowerRoll(rollArray);

    // Animation + Chat
    api.emit('NETWORK_OUTGOING', {
      type: 'MOD_EVENT',
      _sourceMod: 'system-flower',
      modEventType: 'FLOWER_ROLL_ANIMATION',
      payload: { total, label: stat.name }
    });
    
    // --- ACTIVITY LOG ---
    api.log({
      type: 'dice',
      actor: character.name,
      actorId: character.id,
      accountName: character.owner_id || api.user.getName(),
      summary: `a lancé ${stat.name} (${fullFormula}) → ${total}`,
      details: { formula: fullFormula, result: total, stat: stat.name },
      visibility: 'all'
    });

    api.emit('NETWORK_OUTGOING', {
      type: 'CHAT_MESSAGE',
      payload: {
        id: Date.now().toString(),
        sender: character.name,
        text: `A utilisé **${stat.name}** [${stat.value} 🌸]\nLancer de ${fullFormula} 🎲 **Résultat : ${total}**\n*${modText.trim()}*`,
        timestamp: Date.now(),
      }
    });
  };

  const addCustomStat = (e: FormEvent) => {
    e.preventDefault();
    if (!newStatName.trim()) return;
    
    const key = normalizeStatKey(newStatName);
    updateCharacter(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [key]: { name: newStatName.trim(), value: 0, isCustom: true }
      }
    }));
    setNewStatName('');
  };

  const deleteCustomStat = (key: string) => {
    updateCharacter(prev => {
      const newStats = { ...prev.stats };
      delete newStats[key];
      return { ...prev, stats: newStats };
    });
  };

  const handleToggleSkill = (skillId: string) => {
    const updated = { ...character };
    if (!updated.skills) return;
    const skill = updated.skills.find(s => s.id === skillId);
    if (skill && skill.skillType === 'toggle') {
      skill.isActive = !skill.isActive;
      setCharacter(updated);
      saveCharacter(updated);
      
      // --- ACTIVITY LOG ---
      api.log({
        type: 'skill',
        actor: character.name,
        actorId: character.id,
        accountName: character.owner_id || api.user.getName(),
        summary: `a ${skill.isActive ? 'activé' : 'désactivé'} ${skill.name}`,
        visibility: 'all'
      });
    }
  };

  const handleSkillLevel = (skillId: string, level: number) => {
    if (!isTauri()) return;
    updateCharacter(prev => {
      if (!prev.skills) return prev;
      return {
        ...prev,
        skills: prev.skills.map(s => s.id === skillId ? { ...s, level } : s)
      };
    });
  };

  const handleItemLevel = (itemId: string, level: number) => {
    if (!isTauri()) return;
    updateCharacter(prev => {
      if (!prev.inventory) return prev;
      return {
        ...prev,
        inventory: prev.inventory.map(i => i.id === itemId ? { ...i, level } : i)
      };
    });
  };

  const handleConsumeItem = async (itemId: string) => {
    const inv = character.inventory || [];
    const itemIdx = inv.findIndex(i => i.id === itemId);
    if (itemIdx === -1) return;
    
    const item = inv[itemIdx];
    if (item.quantity <= 0) return;
    
    let healAmount = 0;
    const rollArray: string[] = [];
    let consumeText = '';

    if (item.modifiers) {
      for (const mod of item.modifiers) {
        const target = normalizeStatKey(mod.target);
        if (target === 'pv_actuel' || target === 'pv_actuels') {
          let multiplier = 1;
          if (mod.scaleStat) {
            const scale = normalizeStatKey(mod.scaleStat);
            if (scale === 'niveau' || scale === 'maitrise') multiplier = item.level || 0;
            else multiplier = character.stats[scale]?.value || 0;
          }

          if (mod.value.toLowerCase().includes('d')) {
            const parts = mod.value.toLowerCase().split('d');
            let numDice = parseInt(parts[0]);
            if (isNaN(numDice)) numDice = 1;
            const numSides = parseInt(parts[1]);
            
            const scaledDice = numDice * Math.max(1, multiplier);
            if (scaledDice > 0 && !isNaN(numSides)) {
              rollArray.push(`${scaledDice}d${numSides}`);
            }
          } else {
            const val = parseInt(mod.value);
            if (!isNaN(val)) {
              healAmount += val * multiplier;
            }
          }
        }
      }
    }

    if (rollArray.length > 0) {
      const { total: rollTotal } = await simulateFlowerRoll(rollArray);
      healAmount += rollTotal;
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: 'system-flower',
        modEventType: 'FLOWER_ROLL_ANIMATION',
        payload: { total: healAmount, label: item.name }
      });
    }

    updateCharacter(prev => {
      const pInv = prev.inventory || [];
      const pIdx = pInv.findIndex(i => i.id === itemId);
      if (pIdx === -1) return prev;
      
      const newInv = [...pInv];
      newInv[pIdx] = { ...pInv[pIdx], quantity: pInv[pIdx].quantity - 1 };
      const next = { ...prev, inventory: newInv };
      
      if (healAmount !== 0) {
        next.hpCurrent += healAmount;
        consumeText = healAmount > 0 ? `récupère ${healAmount} PV` : `perd ${Math.abs(healAmount)} PV`;
      }
      
      // --- ACTIVITY LOG ---
      api.log({
        type: 'item',
        actor: next.name,
        actorId: next.id,
        accountName: character.owner_id || api.user.getName(),
        summary: `a consommé ${item.name}${consumeText ? ` (${consumeText})` : ''}`,
        visibility: 'all'
      });

      api.emit('NETWORK_OUTGOING', {
        type: 'CHAT_MESSAGE',
        payload: {
          id: Date.now().toString(),
          sender: next.name,
          text: `A consommé **${item.name}**${consumeText ? ` et ${consumeText}` : ''} !${rollArray.length > 0 ? ` (Jets: ${rollArray.join(', ')})` : ''}`,
          timestamp: Date.now(),
        }
      });

      return next;
    });
  };

  const handleCastSkill = async (skillId: string) => {
    const skill = (character.skills || []).find(s => s.id === skillId);
    if (!skill) return;
    
    let healAmount = 0;
    const rollArray: string[] = [];
    let castText = '';
    const statsToRoll = new Set<string>();

    if (skill.modifiers) {
      for (const mod of skill.modifiers) {
        const target = normalizeStatKey(mod.target);
        if (target === 'pv_actuel' || target === 'pv_actuels') {
          let multiplier = 1;
          if (mod.scaleStat) {
            const scale = normalizeStatKey(mod.scaleStat);
            if (scale === 'niveau' || scale === 'maitrise') multiplier = skill.level || 0;
            else multiplier = character.stats[scale]?.value || 0;
          }

          if (mod.value.toLowerCase().includes('d')) {
            const parts = mod.value.toLowerCase().split('d');
            let numDice = parseInt(parts[0]);
            if (isNaN(numDice)) numDice = 1;
            const numSides = parseInt(parts[1]);
            
            const scaledDice = numDice * Math.max(1, multiplier); 
            if (scaledDice > 0 && !isNaN(numSides)) {
              rollArray.push(`${scaledDice}d${numSides}`);
            }
          } else {
            const val = parseInt(mod.value);
            if (!isNaN(val)) {
              healAmount += val * multiplier;
            }
          }
        } else if (target !== 'pv' && target !== 'pv_max') {
          // If the target is a stat, we should roll that stat using this skill!
          statsToRoll.add(target);
        }
      }
    }

    // 1. Perform stat rolls if any
    for (const statKey of Array.from(statsToRoll)) {
      if (character.stats[statKey]) {
        await rollStat(statKey, skill.id);
      }
    }

    // 2. Perform healing / self-damage logic if present
    if (rollArray.length > 0) {
      const { total: rollTotal } = await simulateFlowerRoll(rollArray);
      healAmount += rollTotal;
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: 'system-flower',
        modEventType: 'FLOWER_ROLL_ANIMATION',
        payload: { total: healAmount, label: skill.name }
      });
    }

    if (healAmount !== 0) {
      updateCharacter(prev => {
        const next = { ...prev };
        next.hpCurrent += healAmount;
        castText = healAmount > 0 ? `récupère ${healAmount} PV` : `perd ${Math.abs(healAmount)} PV`;
        
        // --- ACTIVITY LOG ---
        api.log({
          type: 'skill',
          actor: next.name,
          actorId: next.id,
          accountName: character.owner_id || api.user.getName(),
          summary: `a utilisé ${skill.name}${castText ? ` (${castText})` : ''}`,
          visibility: 'all'
        });

        api.emit('NETWORK_OUTGOING', {
          type: 'CHAT_MESSAGE',
          payload: {
            id: Date.now().toString(),
            sender: next.name,
            text: `A utilisé la compétence **${skill.name}**${castText ? ` et ${castText}` : ''} !${rollArray.length > 0 ? ` (Jets: ${rollArray.join(', ')})` : ''}`,
            timestamp: Date.now(),
          }
        });

        return next;
      });
    } else if (statsToRoll.size === 0) {
      // --- ACTIVITY LOG ---
      api.log({
        type: 'skill',
        actor: character.name,
        actorId: character.id,
        accountName: character.owner_id || api.user.getName(),
        summary: `a utilisé ${skill.name}`,
        visibility: 'all'
      });

      // If there was no stat roll and no healing, just emit a generic cast message
      api.emit('NETWORK_OUTGOING', {
        type: 'CHAT_MESSAGE',
        payload: {
          id: Date.now().toString(),
          sender: character.name,
          text: `A utilisé la compétence **${skill.name}** !${rollArray.length > 0 ? ` (Jets: ${rollArray.join(', ')})` : ''}`,
          timestamp: Date.now(),
        }
      });
    }
  };

  const setMasteryLevel = (id: string, type: 'skill' | 'item', level: number) => {
    if (type === 'skill') handleSkillLevel(id, level);
    else handleItemLevel(id, level);
  };

  return {
    character,
    setCharacter,
    newStatName,
    setNewStatName,
    isSaving,
    setIsSaving,
    activeTab,
    setActiveTab,
    inventoryFilter,
    setInventoryFilter,
    knownPlayers,
    setKnownPlayers,
    knownCustomStats,
    setKnownCustomStats,
    isHost,
    setIsHost,
    compendiumModalOpen,
    setCompendiumModalOpen,
    compendiumModalType,
    setCompendiumModalType,
    compendiumEntries,
    setCompendiumEntries,
    removeSkill,
    removeItem,
    updateItem,
    handleToggleEquip,
    openCompendiumModal,
    importCompendiumEntry,
    saveCharacter,
    updateCharacter,
    maxHp,
    handleStatChange,
    rollStat,
    addCustomStat,
    deleteCustomStat,
    handleToggleSkill,
    handleSkillLevel,
    handleItemLevel,
    handleConsumeItem,
    handleCastSkill,
    setMasteryLevel,
  };
}

export type FlowerSheetState = ReturnType<typeof useFlowerCharacter>;
