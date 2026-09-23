import React, { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';
import type { FlowerCharacter } from '../types';
import { DEFAULT_FLOWER_STATS, getDiceForFlowers, calculateMaxHp, normalizeStatKey } from '../types';
import { Flower2, Plus, Minus, Skull, Save, ArrowLeft, Upload, Shield, Zap } from 'lucide-react';
import { simulateFlowerRoll } from '../utils/diceUtils';
import { useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { invoke } from '@tauri-apps/api/core';
import { ModManager } from '../../../core/services/ModManager';

// Détection de l'Hôte (Tauri)
const isTauri = () => '__TAURI_INTERNALS__' in window;

interface CharacterSheetWindowProps {
  api: SignetAPI;
  characterId: string;
  onBack: () => void;
}

export function CharacterSheetWindow({ api, characterId, onBack }: CharacterSheetWindowProps) {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      invoke('get_characters').then((records: any[]) => {
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

  const addCustomStat = (e: React.FormEvent) => {
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

  const renderFlowers = (statKey: string, value: number) => {
    const renderCore = () => {
      // Si la valeur est strictement supérieure à 5, on affiche une fleur + le multiplicateur
      if (value > 5) {
        return (
          <div className="flex items-center justify-center min-w-[120px] gap-2">
            <Flower2 className="w-5 h-5 text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]" />
            <span className="text-pink-300 font-bold text-sm">x {value}</span>
          </div>
        );
      }

      // Sinon, on affiche exactement 5 fleurs
      const flowers = [];
      for (let i = 1; i <= 5; i++) {
        flowers.push(
          <button 
            key={i} 
            disabled={!isHost}
            onClick={() => handleStatChange(statKey, i)}
            className={`transition-all focus:outline-none ${!isHost ? 'cursor-default' : 'hover:scale-125'} ${i <= value ? 'text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]' : 'text-zinc-600'}`}
          >
            <Flower2 className="w-5 h-5" />
          </button>
        );
      }
      return <div className="flex gap-1 min-w-[120px] justify-center">{flowers}</div>;
    };

    return (
      <div className="flex items-center gap-2">
        <button 
          onClick={() => handleStatChange(statKey, Math.max(0, value - 1))}
          disabled={!isHost}
          className={`w-6 h-6 flex items-center justify-center bg-black/40 rounded transition-colors border border-white/5 shrink-0 ${!isHost ? 'text-zinc-700 opacity-30 cursor-not-allowed' : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30'}`}
        >
          <Minus className="w-3 h-3" />
        </button>
        
        {renderCore()}

        <button 
          onClick={() => handleStatChange(statKey, value + 1)}
          disabled={!isHost}
          className={`w-6 h-6 flex items-center justify-center bg-black/40 rounded transition-colors border border-white/5 shrink-0 ${!isHost ? 'text-zinc-700 opacity-30 cursor-not-allowed' : 'text-zinc-400 hover:text-pink-400 hover:bg-pink-950/30'}`}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
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

  const hasMasteryScaling = (obj: any) => {
    if (!obj.modifiers) return false;
    for (const mod of obj.modifiers) {
      if (mod.scaleStat) {
        const scale = normalizeStatKey(mod.scaleStat);
        if (scale === 'niveau' || scale === 'maitrise') return true;
      }
    }
    return false;
  };

  const renderStars = (id: string, level: number = 0, type: 'skill' | 'item' = 'skill') => {
    const setLevel = (newLevel: number) => {
      const clamped = Math.max(0, Math.min(5, newLevel));
      if (type === 'skill') handleSkillLevel(id, clamped);
      else handleItemLevel(id, clamped);
    };

    return (
      <div className="flex items-center gap-1">
        {isTauri() && isHost && (
          <button 
            onClick={() => setLevel(level - 1)}
            className="w-5 h-5 flex items-center justify-center bg-black/40 text-zinc-500 rounded hover:text-fuchsia-400 hover:bg-fuchsia-950/30 transition-colors border border-white/5"
            title="Diminuer la maîtrise"
          >
            <Minus className="w-3 h-3" />
          </button>
        )}
        <div className="flex -space-x-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setLevel(s)}
              disabled={!isHost}
              className={`transition-colors ${s <= level ? 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]' : 'text-zinc-700 hover:text-zinc-500'} ${!isHost ? 'cursor-default' : ''}`}
              title={isTauri() && isHost ? "Changer le niveau (Maîtrise)" : "Niveau de maîtrise"}
            >
              <Flower2 className={`w-4 h-4 ${s <= level ? 'fill-current' : ''}`} />
            </button>
          ))}
        </div>
        {isTauri() && isHost && (
          <button 
            onClick={() => setLevel(level + 1)}
            className="w-5 h-5 flex items-center justify-center bg-black/40 text-zinc-500 rounded hover:text-fuchsia-400 hover:bg-fuchsia-950/30 transition-colors border border-white/5"
            title="Augmenter la maîtrise"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    );
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

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-white p-4 sm:p-6 gap-4 sm:gap-6 pointer-events-auto overflow-y-auto custom-scrollbar border border-rose-900/30 rounded-xl relative backdrop-blur-md shadow-[inset_0_0_50px_rgba(225,29,72,0.04)]">
      
      {/* Boutons Haut Droite */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end max-w-[60%]">
        <button 
          onClick={() => {
            api.emit('CANVAS_TOGGLE_TOKEN', {
              id: character.id,
              name: character.name.substring(0, 2).toUpperCase(),
              x: 5,
              y: 5,
              color: character.owner_id ? 'bg-indigo-900 text-indigo-200 border-indigo-500' : 'bg-rose-950 text-rose-200 border-rose-800',
              owner: character.owner_id,
              avatarUrl: character.avatarUrl
            });
          }}
          className="bg-rose-900/40 text-rose-300 hover:bg-rose-800/60 hover:text-white px-3 py-1.5 rounded-lg border border-rose-500/30 flex items-center gap-2 text-xs transition-colors shadow-lg whitespace-nowrap"
          title="Faire apparaître / retirer le pion sur la carte"
        >
          <Flower2 className="w-3 h-3 shrink-0" /> Placer/Retirer Pion
        </button>
        <button 
          onClick={onBack}
          className="bg-black/50 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 hover:border-rose-500/30 flex items-center gap-2 text-xs transition-colors shadow-lg whitespace-nowrap"
        >
          <ArrowLeft className="w-3 h-3" /> Retour
        </button>
      </div>

      {/* En-tête du personnage */}
      <div className="flex items-center gap-3 sm:gap-4 border-b border-rose-500/20 pb-4 pr-4">
        <div 
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-rose-950/50 border border-rose-500/20 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group"
          onClick={() => fileInputRef.current?.click()}
          title="Modifier l'avatar"
        >
          {character.avatarUrl ? (
            <img src={api.library.getAssetUrl(character.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Flower2 className="w-8 h-8 text-pink-400 opacity-50" />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Upload className="w-4 h-4 text-white" />
          </div>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={async (e) => {
              if (e.target.files && e.target.files[0]) {
                const hash = await api.library.uploadAsset(e.target.files[0]);
                if (hash) {
                  updateCharacter(prev => ({ ...prev, avatarUrl: hash }));
                }
              }
            }} 
          />
        </div>
        <div className="flex-1">
          <input 
            type="text" 
            value={character.name} 
            onChange={(e) => updateCharacter(prev => ({ ...prev, name: e.target.value }))}
            onBlur={(e) => updateCharacter(prev => ({ ...prev, name: e.target.value }))}
            className="bg-transparent text-2xl font-black text-white focus:outline-none focus:border-b border-rose-500 w-full"
            placeholder="Nom du personnage"
          />
          <div className="text-rose-400/60 text-xs mt-1 uppercase tracking-widest font-bold flex items-center justify-between">
            Système Flower
            {isSaving && <span className="text-rose-500 animate-pulse">Sauvegarde...</span>}
          </div>
        </div>
      </div>

      {/* Assignation */}
      {isTauri() && (() => {
        // Fusionne les joueurs de la BDD avec les joueurs actuellement connectés en direct
        const connectedPlayers = ModManager.getPlayers();
        const allAvailablePlayers = Array.from(new Set([...knownPlayers, ...connectedPlayers]));

        return (
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5">
            <span className="text-xs text-zinc-500 uppercase font-bold">Assigné à :</span>
            <select 
              value={character.owner_id === null ? '' : (character.owner_id || '')} 
              disabled={!isHost}
              onChange={(e) => {
                const val = e.target.value;
                if (val.trim() === '') {
                  updateCharacter(prev => ({ ...prev, owner_id: null }));
                } else {
                  updateCharacter(prev => ({ ...prev, owner_id: val }));
                }
              }}
              className={`bg-transparent text-sm text-slate-300 focus:outline-none border-b border-transparent focus:border-rose-500 flex-1 py-1 ${!isHost ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <option value="" className="bg-slate-900">-- PNJ (Aucun Joueur) --</option>
              {allAvailablePlayers.map((p, i) => (
                <option key={`${p}-${i}`} value={p} className="bg-slate-900">{p}</option>
              ))}
            </select>
          </div>
        );
      })()}

      {/* Points de Vie */}
      <div className="bg-rose-950/30 border border-rose-500/20 rounded-lg p-4 flex flex-col items-center gap-2">
        <div className="text-rose-400 text-sm font-bold uppercase flex items-center gap-2">
          <Skull className="w-4 h-4" /> Santé
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => updateCharacter(prev => ({ ...prev, hpCurrent: Math.max(0, prev.hpCurrent - 1) }))}
            disabled={!isHost}
            className={`w-8 h-8 flex items-center justify-center bg-rose-900/40 rounded transition-colors border border-rose-500/30 ${!isHost ? 'text-rose-900 opacity-50 cursor-not-allowed' : 'text-rose-300 hover:bg-rose-700/50 hover:text-white'}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <div className="flex items-end gap-1">
            <input 
              type="number" 
              value={character.hpCurrent} 
              disabled={!isHost}
              onChange={(e) => updateCharacter(prev => ({ ...prev, hpCurrent: Math.min(maxHp, Math.max(0, parseInt(e.target.value) || 0)) }))}
              className={`bg-black/50 border border-rose-500/30 rounded px-2 py-1 text-2xl font-black text-rose-300 w-16 text-center focus:outline-none focus:border-rose-400 ${!isHost ? 'opacity-70 cursor-not-allowed' : ''}`}
            />
            <span className="text-rose-500 font-bold mb-2">/ {maxHp}</span>
          </div>

          <button 
            onClick={() => updateCharacter(prev => ({ ...prev, hpCurrent: Math.min(maxHp, prev.hpCurrent + 1) }))}
            disabled={!isHost}
            className={`w-8 h-8 flex items-center justify-center bg-rose-900/40 rounded transition-colors border border-rose-500/30 ${!isHost ? 'text-rose-900 opacity-50 cursor-not-allowed' : 'text-rose-300 hover:bg-rose-700/50 hover:text-white'}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="w-full bg-black/50 h-3 rounded-full mt-2 overflow-hidden border border-rose-900">
          <div 
            className="h-full bg-gradient-to-r from-rose-700 to-rose-400 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, (character.hpCurrent / maxHp) * 100))}%` }}
          />
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-3 border-b border-rose-900/50 mt-2 flex-wrap">
        <button 
          onClick={() => setActiveTab('stats')}
          className={`pb-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'stats' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-zinc-500 hover:text-rose-300'}`}
        >
          Caractéristiques
        </button>
        <button 
          onClick={() => setActiveTab('skills')}
          className={`pb-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'skills' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-zinc-500 hover:text-rose-300'}`}
        >
          Compétences
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`pb-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'inventory' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-zinc-500 hover:text-rose-300'}`}
        >
          Inventaire
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {activeTab === 'stats' && (
          <div className="flex flex-col gap-3">
            {Object.entries(character.stats).map(([key, stat]) => (
              <div key={key} className="flex items-center justify-between bg-black/30 p-2 rounded-md border border-white/5 hover:border-rose-500/30 transition-colors group/stat">
                <button 
                  onClick={() => rollStat(key)}
                  className="text-left font-bold text-zinc-300 hover:text-rose-300 transition-colors w-40 truncate"
                >
                  {stat.name}
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-12 text-right font-mono">
                    {getDiceForFlowers(stat.value)}
                  </span>
                  {renderFlowers(key, stat.value)}
                  {stat.isCustom && isTauri() && (
                    <button
                      onClick={() => deleteCustomStat(key)}
                      className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-all opacity-0 group-hover/stat:opacity-100"
                      title={`Supprimer la stat "${stat.name}"`}
                    >
                      <Skull className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Ajout de Statistique Personnalisée (Interface MJ) */}
            <div className="mt-4 pt-4 border-t border-rose-900/50">
              <form onSubmit={addCustomStat} className="flex gap-2">
                <input 
                  list="known-custom-stats"
                  type="text" 
                  value={newStatName} 
                  onChange={(e) => setNewStatName(e.target.value)}
                  placeholder="Nouvelle Statistique (ex: Perception)"
                  className="flex-1 bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
                />
                <datalist id="known-custom-stats">
                  {knownCustomStats.map((s, i) => <option key={`${s}-${i}`} value={s} />)}
                </datalist>
                <Button type="submit" variant="glass" className="px-3" disabled={!newStatName.trim()}>
                  <Plus className="w-4 h-4 text-rose-400" />
                </Button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="flex flex-col gap-4">
            {isTauri() && (
              <Button variant="glass" onClick={() => openCompendiumModal('skill')} className="w-full justify-center text-rose-300 border-rose-900/50 hover:bg-rose-900/30">
                <Plus className="w-4 h-4 mr-2" /> Importer une Compétence
              </Button>
            )}
            
            {(!character.skills || character.skills.length === 0) && (
              <div className="text-center text-zinc-500 italic mt-4 text-sm">
                Aucune compétence pour le moment.
              </div>
            )}
            
            {character.skills?.map(skill => (
              <div key={skill.id} className="bg-black/30 p-3 rounded-md border border-white/5 flex flex-col gap-2 relative group">
                <button 
                  onClick={() => removeSkill(skill.id)}
                  className="absolute top-2 right-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer la compétence"
                >
                  <Skull className="w-4 h-4" />
                </button>
                <div className="flex flex-col gap-1 pr-6">
                  <div className="flex items-center justify-between">
                    <div className="text-rose-300 font-bold flex items-center gap-2">
                      {skill.name || 'Compétence Sans Nom'}
                      {skill.skillType && (
                        <span className="text-[10px] opacity-70 uppercase tracking-widest bg-white/10 px-1.5 py-0.5 rounded">
                          {skill.skillType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {(!skill.skillType || skill.skillType === 'active') && (
                        <button 
                          onClick={() => handleCastSkill(skill.id)}
                          className="p-1.5 rounded transition-all bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          title="Lancer la compétence"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                      )}
                      {skill.skillType === 'toggle' && (
                        <button 
                          onClick={() => handleToggleSkill(skill.id)}
                          className={`p-1.5 rounded transition-all shadow-lg ${skill.isActive ? 'bg-rose-600 text-white shadow-rose-500/50' : 'bg-black/50 text-zinc-500 hover:bg-white/10 border border-white/5'}`}
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                      )}
                      {hasMasteryScaling(skill) && renderStars(skill.id, skill.level, 'skill')}
                    </div>
                  </div>
                  {skill.modifiers && skill.modifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {skill.modifiers.map((mod, i) => (
                        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${skill.skillType === 'toggle' && !skill.isActive ? 'bg-zinc-800 text-zinc-500 line-through' : 'bg-rose-950/50 text-rose-400 border border-rose-900/30'}`}>
                          {mod.value} {mod.target} {mod.scaleStat ? `(Scale: ${mod.scaleStat})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-black/40 text-sm text-zinc-400 rounded p-2 border border-transparent min-h-[40px] whitespace-pre-line">
                  {skill.description || 'Aucune description.'}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-indigo-900/50 mb-4">
              <h3 className="font-bold text-indigo-400">Sac à Dos</h3>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setInventoryFilter('all')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${inventoryFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                >Tous</button>
                <button 
                  onClick={() => setInventoryFilter('equipped')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${inventoryFilter === 'equipped' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                >Équipés</button>
                <button 
                  onClick={() => setInventoryFilter('unequipped')}
                  className={`px-3 py-1 text-xs rounded transition-colors ${inventoryFilter === 'unequipped' ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                >Dans le Sac</button>
              </div>

              {isTauri() && (
                <Button onClick={() => openCompendiumModal('item')} variant="glass" size="sm" className="gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" /> Ajouter
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {(!character.inventory || character.inventory.length === 0) ? (
                <p className="text-center text-zinc-500 italic py-8">L'inventaire est vide.</p>
              ) : (
                character.inventory
                  .filter(i => inventoryFilter === 'all' ? true : inventoryFilter === 'equipped' ? i.isEquipped : !i.isEquipped)
                  .map(item => (
                    <div key={item.id} className="bg-black/30 p-3 rounded-md border border-white/5 flex flex-col gap-2 relative group">
                      <button 
                        onClick={() => removeItem(item.id)}
                  className="absolute top-2 right-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer l'objet"
                >
                  <Skull className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3 pr-6">
                  <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded border border-white/10 shrink-0">
                    <span className="text-xs text-zinc-500">Qte</span>
                    <input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="bg-transparent text-white font-bold w-12 text-center focus:outline-none focus:bg-white/10"
                    />
                  </div>
                  
                  {(!item.itemType || item.itemType === 'equippable') && (
                    <button 
                      onClick={() => handleToggleEquip(item)}
                      className={`shrink-0 p-1.5 rounded transition-all ${item.isEquipped ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-black/50 text-zinc-600 hover:text-zinc-400 border border-white/5'}`}
                      title={item.isEquipped ? "Déséquiper" : "Équiper"}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}

                  {item.itemType === 'consumable' && (
                    <button 
                      onClick={() => handleConsumeItem(item.id)}
                      className="shrink-0 p-1.5 rounded transition-all bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      title="Consommer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </button>
                  )}

                  <div className={`flex-1 font-bold ${(!item.itemType || item.itemType === 'equippable') && item.isEquipped ? 'text-indigo-300' : 'text-zinc-300'}`}>
                    <div className="flex items-center gap-2">
                      <span>{item.name || 'Objet Sans Nom'}</span>
                      {hasMasteryScaling(item) && renderStars(item.id, item.level, 'item')}
                    </div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${(!item.itemType || item.itemType === 'equippable') && item.isEquipped ? 'text-indigo-400 bg-indigo-900/30' : 'text-zinc-500 bg-zinc-800/50'}`}>
                        {item.modifiers.map(m => `+${m.value} ${m.target}`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-black/40 text-sm text-zinc-400 rounded p-2 border border-transparent min-h-[40px]">
                  {item.description || 'Aucune description.'}
                </div>
              </div>
            ))
          )}
          </div>
        </div>
        )}
      </div>

      {/* Modal Compendium */}
      {compendiumModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col p-4">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <h3 className="font-bold text-white text-lg">
              {compendiumModalType === 'skill' ? 'Bibliothèque de Compétences' : 'Bibliothèque d\'Objets'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setCompendiumModalOpen(false)}>Fermer</Button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {compendiumEntries.length === 0 ? (
              <p className="text-zinc-500 text-center italic mt-10">Aucun élément dans le compendium.</p>
            ) : (
              compendiumEntries.map(entry => (
                <div key={entry.id} className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center justify-between group hover:bg-white/10 transition-colors">
                  <div>
                    <h4 className="font-bold text-zinc-200">{entry.name}</h4>
                    <p className="text-xs text-zinc-400 line-clamp-1">{entry.description}</p>
                  </div>
                  <Button size="sm" onClick={() => importCompendiumEntry(entry)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Importer
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
