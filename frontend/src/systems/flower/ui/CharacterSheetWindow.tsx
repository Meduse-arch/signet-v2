import React, { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';
import type { FlowerCharacter } from '../types';
import { DEFAULT_FLOWER_STATS, getDiceForFlowers, calculateMaxHp } from '../types';
import { Flower2, Plus, Minus, Skull, Save, ArrowLeft, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { invoke } from '@tauri-apps/api/core';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chargement initial du personnage
  useEffect(() => {
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
      
      const onSync = (msg: any) => {
        if (msg.type === 'SYNC_CHARACTERS') {
          const char = msg.payload.characters.find((c: any) => c.id === characterId);
          if (char) {
             let data = char.data || char;
             if (!data.stats) data.stats = { ...DEFAULT_FLOWER_STATS };
             if (data.hpCurrent === undefined) data.hpCurrent = 10;
             setCharacter(data);
          }
        }
      };
      api.on('NETWORK_INCOMING', onSync);
      return () => {
        api.off('NETWORK_INCOMING', onSync);
      };
    }
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
      const next = updater(prev);
      saveCharacter(next);
      return next;
    });
  };

  const maxHp = calculateMaxHp(character.stats);

  const handleStatChange = (statKey: string, newValue: number) => {
    updateCharacter(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [statKey]: { ...prev.stats[statKey], value: newValue }
      }
    }));
  };

  const rollStat = async (statKey: string) => {
    const stat = character.stats[statKey];
    if (!stat) return;
    
    const diceString = getDiceForFlowers(stat.value);
    
    // On lance les dés via le backend
    const results = await api.requestRoll([diceString]);
    
    // On envoie le message dans le chat
    if (results && results.length > 0) {
      const total = results.reduce((a, b) => a + b, 0);
      api.emit('NETWORK_OUTGOING', {
        type: 'CHAT_MESSAGE',
        payload: {
          id: Date.now().toString(),
          sender: character.name,
          text: `A utilisé **${stat.name}** [${stat.value} 🌸]\nLancer de ${diceString} 🎲 **Résultat : ${total}**`,
          timestamp: Date.now(),
        }
      });
      
      // On déclenche aussi l'animation locale
      api.emit('LOCAL_DICE_ROLL_ANIMATION', { total, label: `${stat.name}` });
    }
  };

  const addCustomStat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatName.trim()) return;
    
    const key = newStatName.trim().toLowerCase().replace(/\s+/g, '_');
    updateCharacter(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [key]: { name: newStatName.trim(), value: 0, isCustom: true }
      }
    }));
    setNewStatName('');
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
            onClick={() => handleStatChange(statKey, i)}
            className={`transition-all hover:scale-125 focus:outline-none ${i <= value ? 'text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.8)]' : 'text-zinc-600'}`}
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
          className="w-6 h-6 flex items-center justify-center bg-black/40 text-zinc-400 rounded hover:text-rose-400 hover:bg-rose-950/30 transition-colors border border-white/5 shrink-0"
        >
          <Minus className="w-3 h-3" />
        </button>
        
        {renderCore()}

        <button 
          onClick={() => handleStatChange(statKey, value + 1)}
          className="w-6 h-6 flex items-center justify-center bg-black/40 text-zinc-400 rounded hover:text-pink-400 hover:bg-pink-950/30 transition-colors border border-white/5 shrink-0"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 text-white p-6 gap-6 pointer-events-auto overflow-y-auto custom-scrollbar border-2 border-pink-900/30 rounded-xl relative shadow-[inset_0_0_50px_rgba(244,114,182,0.05)]">
      
      {/* Boutons Haut Droite */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
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
          className="bg-pink-900/40 text-pink-300 hover:bg-pink-800/60 hover:text-white px-3 py-1.5 rounded-lg border border-pink-500/30 flex items-center gap-2 text-xs transition-colors shadow-lg"
          title="Faire apparaître / retirer le pion sur la carte"
        >
          <Flower2 className="w-3 h-3" /> Placer/Retirer Pion
        </button>
        <button 
          onClick={onBack}
          className="bg-black/50 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 hover:border-pink-500/30 flex items-center gap-2 text-xs transition-colors shadow-lg"
        >
          <ArrowLeft className="w-3 h-3" /> Retour
        </button>
      </div>

      {/* En-tête du personnage */}
      <div className="flex items-center gap-4 border-b border-pink-500/20 pb-4 pr-32">
        <div 
          className="w-16 h-16 rounded-full bg-pink-950 border border-pink-500/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group"
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
            className="bg-transparent text-2xl font-bold text-pink-100 focus:outline-none focus:border-b border-pink-500 w-full"
            placeholder="Nom du personnage"
          />
          <div className="text-pink-400/50 text-xs mt-1 uppercase tracking-widest font-bold flex items-center justify-between">
            Système Flower
            {isSaving && <span className="text-pink-500 animate-pulse">Sauvegarde...</span>}
          </div>
        </div>
      </div>

      {/* Assignation */}
      {isTauri() && (
        <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5">
          <span className="text-xs text-zinc-500 uppercase font-bold">Assigné à :</span>
          <input 
            type="text" 
            value={character.owner_id || ''} 
            onChange={(e) => updateCharacter(prev => ({ ...prev, owner_id: e.target.value || null }))}
            className="bg-transparent text-sm text-indigo-300 focus:outline-none border-b border-transparent focus:border-indigo-500 flex-1"
            placeholder="Joueur (Laisser vide si PNJ)"
          />
        </div>
      )}

      {/* Points de Vie */}
      <div className="bg-rose-950/30 border border-rose-500/20 rounded-lg p-4 flex flex-col items-center gap-2">
        <div className="text-rose-400 text-sm font-bold uppercase flex items-center gap-2">
          <Skull className="w-4 h-4" /> Santé
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => updateCharacter(prev => ({ ...prev, hpCurrent: Math.max(0, prev.hpCurrent - 1) }))}
            className="w-8 h-8 flex items-center justify-center bg-rose-900/40 text-rose-300 rounded hover:bg-rose-700/50 hover:text-white transition-colors border border-rose-500/30"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <div className="flex items-end gap-1">
            <input 
              type="number" 
              value={character.hpCurrent} 
              onChange={(e) => updateCharacter(prev => ({ ...prev, hpCurrent: parseInt(e.target.value) || 0 }))}
              className="bg-black/50 border border-rose-500/30 rounded px-2 py-1 text-2xl font-black text-rose-300 w-16 text-center focus:outline-none focus:border-rose-400"
            />
            <span className="text-rose-500 font-bold mb-2">/ {maxHp}</span>
          </div>

          <button 
            onClick={() => updateCharacter(prev => ({ ...prev, hpCurrent: prev.hpCurrent + 1 }))}
            className="w-8 h-8 flex items-center justify-center bg-rose-900/40 text-rose-300 rounded hover:bg-rose-700/50 hover:text-white transition-colors border border-rose-500/30"
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

      {/* Statistiques (Fleurs) */}
      <div>
        <h3 className="text-pink-400 text-sm font-bold uppercase tracking-widest mb-4 border-b border-pink-900 pb-1">
          Caractéristiques
        </h3>
        <div className="flex flex-col gap-3">
          {Object.entries(character.stats).map(([key, stat]) => (
            <div key={key} className="flex items-center justify-between bg-black/30 p-2 rounded-md border border-white/5 hover:border-pink-500/30 transition-colors">
              <button 
                onClick={() => rollStat(key)}
                className="text-left font-bold text-zinc-300 hover:text-pink-300 transition-colors w-40 truncate"
              >
                {stat.name}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-12 text-right font-mono">
                  {getDiceForFlowers(stat.value)}
                </span>
                {renderFlowers(key, stat.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ajout de Statistique Personnalisée (Interface MJ) */}
      <div className="mt-4 pt-4 border-t border-pink-900/50">
        <form onSubmit={addCustomStat} className="flex gap-2">
          <input 
            type="text" 
            value={newStatName} 
            onChange={(e) => setNewStatName(e.target.value)}
            placeholder="Nouvelle Statistique (ex: Perception)"
            className="flex-1 bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50"
          />
          <Button type="submit" variant="glass" className="px-3" disabled={!newStatName.trim()}>
            <Plus className="w-4 h-4 text-pink-400" />
          </Button>
        </form>
      </div>

    </div>
  );
}
