import React, { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';
import type { HexeCharacter } from '../types';
import { DEFAULT_HEXE_STATS, getDiceForLevel, getMaxHP, getMaxMP, getMaxSTM, getMaxChance, STAT_LABELS } from '../types';
import { Droplet, Flame, Shield, Star, Sparkles, ArrowLeft, Swords, Backpack, BookOpen } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ModManager } from '../../../core/services/ModManager';

const isTauri = () => '__TAURI_INTERNALS__' in window;

type SheetTab = 'attributs' | 'inventaire' | 'competences';

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
    }
  });

  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [activeTab, setActiveTab] = useState<SheetTab>('attributs');

  useEffect(() => {
    setIsHost(ModManager.getIsHost());
    if (isTauri()) {
      invoke('get_players').then((players: any) => setKnownPlayers(players as string[])).catch(e => console.error(e));
    }
    if (!characterId) return;
    if (isTauri()) {
      invoke('get_characters').then((records: any[]) => {
        const record = records.find(r => r.id === characterId);
        if (record) {
          let parsed = JSON.parse(record.data);
          if (!parsed.stats) parsed.stats = { ...DEFAULT_HEXE_STATS };
          if (!parsed.resources) parsed.resources = {
            hp: getMaxHP(parsed.stats.vit.level), mp: getMaxMP(parsed.stats.tec.level),
            stm: getMaxSTM(parsed.stats.agi.level), chance: getMaxChance(parsed.stats.luc.level)
          };
          setChar(parsed);
        }
      });
    } else {
      api.emit('NETWORK_OUTGOING', { type: 'MOD_EVENT', _sourceMod: 'system-hexe', modEventType: 'REQUEST_CHARACTERS', payload: {} });
    }
  }, [characterId]);

  useEffect(() => {
    const handleNetwork = (msg: any) => {
      if (msg.type === 'MOD_EVENT' && msg._sourceMod === 'system-hexe') {
        if (msg.modEventType === 'SYNC_CHARACTER' && msg.payload.id === characterId) setChar(msg.payload);
        else if (msg.modEventType === 'SYNC_CHARACTERS' && !isTauri()) {
          const c = msg.payload.find((p: any) => p.id === characterId);
          if (c) setChar(c);
        }
      }
    };
    api.on('NETWORK_INCOMING', handleNetwork);
    return () => api.off('NETWORK_INCOMING', handleNetwork);
  }, [api, characterId]);

  const updateCharacterLocally = (updater: (prev: HexeCharacter) => HexeCharacter) => {
    setChar(prev => {
      const next = updater(prev);
      api.emit('NETWORK_OUTGOING', { type: 'MOD_EVENT', _sourceMod: 'system-hexe', modEventType: 'SYNC_CHARACTER', payload: next });
      return next;
    });
  };

  const updateStat = (statKey: keyof HexeCharacter['stats'], delta: number) => {
    updateCharacterLocally(prev => {
      const newLevel = Math.max(1, prev.stats[statKey].level + delta);
      const newStats = { ...prev.stats, [statKey]: { level: newLevel } };
      return { ...prev, stats: newStats, resources: {
        hp: getMaxHP(newStats.vit.level), mp: getMaxMP(newStats.tec.level),
        stm: getMaxSTM(newStats.agi.level), chance: getMaxChance(newStats.luc.level)
      }};
    });
  };

  const updateField = (field: keyof HexeCharacter, value: any) => {
    updateCharacterLocally(prev => ({ ...prev, [field]: value }));
  };

  const rollStat = (statKey: keyof HexeCharacter['stats']) => {
    const level = char.stats[statKey].level;
    const diceStr = getDiceForLevel(level);
    const sides = parseInt(diceStr.split('d')[1]);
    const total = Math.floor(Math.random() * sides) + 1;
    api.emit('NETWORK_OUTGOING', { type: 'MOD_EVENT', modEventType: 'HEXE_ROLL_ANIMATION', payload: { total, label: `Jet de ${STAT_LABELS[statKey]}` } });
    api.emit('NETWORK_OUTGOING', { type: 'CHAT_MESSAGE', payload: { text: `*invoque les forces rituelles pour **${STAT_LABELS[statKey]}**...*\n🎲 **${diceStr}** ➔ **[ ${total} ]**`, sender: char.name } });
  };

  const tabs: { id: SheetTab; label: string; icon: React.ReactNode }[] = [
    { id: 'attributs',   label: 'Attributs',   icon: <Swords   className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'inventaire',  label: 'Inventaire',  icon: <Backpack  className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'competences', label: 'Competences', icon: <BookOpen  className="w-3.5 h-3.5 shrink-0" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-[#eaddce] text-[#3e2723] rounded-lg border-4 border-[#8b5a2b] font-serif shadow-[inset_0_0_50px_rgba(139,90,43,0.3)] overflow-hidden relative">
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/old-wall.png')" }}></div>

      <div className="relative z-10 flex items-center justify-between px-2 py-1.5 border-b border-[#8b5a2b]/30 bg-[#f1e6d4] shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[#5c3a21] hover:bg-[#d5c3aa] hover:text-[#3e2723] transition-colors text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar relative flex flex-col">

        <div className="relative px-4 pt-4 pb-3 border-b-2 border-[#8b5a2b] flex items-center gap-4 bg-gradient-to-b from-[#d5c3aa] to-transparent shrink-0">
          <div className="w-16 h-16 rounded-full border-4 border-[#8b5a2b] bg-[#cbb598] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.3)] relative overflow-hidden group shrink-0" title="Changer l'avatar">
            {char.avatarUrl ? (
              <img src={api.library.getAssetUrl(char.avatarUrl)} alt="Avatar" className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-multiply group-hover:opacity-100 transition-opacity" />
            ) : (
              <svg viewBox="0 0 100 100" className="w-10 h-10 text-[#8b5a2b] opacity-60 group-hover:opacity-100 transition-opacity">
                <polygon points="50,5 76.5,86.4 7.3,36 92.7,36 23.5,86.4" fill="none" stroke="currentColor" strokeWidth="3" />
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="3" />
              </svg>
            )}
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*"
              onChange={async (e) => { if (e.target.files?.[0]) { const hash = await api.library.uploadAsset(e.target.files[0]); if (hash) updateField('avatarUrl', hash); } }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <input type="text" value={char.name} onChange={(e) => updateField('name', e.target.value)}
              className="w-full bg-transparent text-2xl font-black text-[#4e342e] outline-none border-b border-[#8b5a2b]/50 focus:border-[#8b5a2b] transition-colors font-serif"
              style={{ textShadow: "1px 1px 0px rgba(255,255,255,0.5)" }}
            />
            <div className="mt-1.5">
              {isHost ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5d4037] font-semibold">Lie a :</span>
                  <select value={char.owner_id || ''} onChange={(e) => updateField('owner_id', e.target.value || null)}
                    className="bg-[#e0ccb4] border border-[#8b5a2b]/50 text-[#3e2723] rounded px-2 py-0.5 text-xs outline-none font-sans">
                    <option value="">Aucun (PNJ)</option>
                    {knownPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              ) : (
                <div className="text-xs italic text-[#8b5a2b]">{char.owner_id ? `Joue par ${char.owner_id}` : 'Personnage Non Joueur'}</div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-10 px-4 pt-3 pb-2 border-b border-[#8b5a2b]/30 bg-[#f1e6d4]/60 shrink-0 flex flex-col gap-1.5">
          <CompactResourceBar icon={<Droplet  className="w-3 h-3" />} label="HP"     current={char.resources.hp}     max={getMaxHP(char.stats.vit.level)}    color="#9b111e" trackColor="#f9d0d4"
            onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, hp: Math.max(0, p.resources.hp - 1) } }))}
            onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, hp: Math.min(getMaxHP(p.stats.vit.level), p.resources.hp + 1) } }))}
          />
          <CompactResourceBar icon={<Sparkles className="w-3 h-3" />} label="MP"     current={char.resources.mp}     max={getMaxMP(char.stats.tec.level)}    color="#0f52ba" trackColor="#c8d8f8"
            onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, mp: Math.max(0, p.resources.mp - 1) } }))}
            onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, mp: Math.min(getMaxMP(p.stats.tec.level), p.resources.mp + 1) } }))}
          />
          <CompactResourceBar icon={<Shield   className="w-3 h-3" />} label="STM"    current={char.resources.stm}    max={getMaxSTM(char.stats.agi.level)}   color="#228b22" trackColor="#c8e8c8"
            onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, stm: Math.max(0, p.resources.stm - 1) } }))}
            onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, stm: Math.min(getMaxSTM(p.stats.agi.level), p.resources.stm + 1) } }))}
          />
          <CompactResourceBar icon={<Star     className="w-3 h-3" />} label="Chance" current={char.resources.chance} max={getMaxChance(char.stats.luc.level)} color="#b8860b" trackColor="#f5e4b0"
            onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, chance: Math.max(0, p.resources.chance - 1) } }))}
            onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, chance: Math.min(getMaxChance(p.stats.luc.level), p.resources.chance + 1) } }))}
          />
        </div>

        <div className="relative z-10 flex border-b-2 border-[#8b5a2b] shrink-0 bg-[#d5c3aa]">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#eaddce] text-[#3e2723] border-b-2 border-[#8b5a2b] -mb-[2px]'
                  : 'text-[#7a5c3a] hover:bg-[#cbb598]/50 hover:text-[#3e2723]'
              }`}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 relative z-10 p-4">

          {activeTab === 'attributs' && (
            <div className="border-2 border-[#8b5a2b] rounded-sm p-4 relative bg-[#f1e6d4] shadow-inner">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 text-[#3e2723]">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                  <polygon points="50,5 76.5,86.4 7.3,36 92.7,36 23.5,86.4" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-y-5 gap-x-6 relative z-10">
                {(Object.keys(char.stats) as Array<keyof HexeCharacter['stats']>).map(stat => (
                  <div key={stat} className="flex flex-col border-b border-[#8b5a2b]/20 pb-2">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-base text-[#4e342e] capitalize">{STAT_LABELS[stat].split(' ')[0]}</span>
                      <span className="text-[10px] font-bold text-[#8b5a2b]">{STAT_LABELS[stat].split(' ')[1]}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5 bg-[#e0ccb4] px-2 py-0.5 rounded-sm border border-[#cbb598] shadow-inner">
                        <button onClick={() => updateStat(stat, -1)} className="w-4 h-4 rounded hover:bg-[#d5c3aa] text-[#5c3a21] font-bold flex items-center justify-center text-sm leading-none">-</button>
                        <div className="w-5 text-center font-black text-lg text-[#3e2723] leading-tight">{char.stats[stat].level}</div>
                        <button onClick={() => updateStat(stat, 1)} className="w-4 h-4 rounded hover:bg-[#d5c3aa] text-[#5c3a21] font-bold flex items-center justify-center text-sm leading-none">+</button>
                      </div>
                      <button onClick={() => rollStat(stat)}
                        className="px-2 py-0.5 bg-gradient-to-b from-[#8b5a2b] to-[#5c3a21] hover:from-[#724a23] hover:to-[#4a2e1a] text-[#f4e4bc] font-bold rounded shadow-md border border-[#3e2723] flex items-center gap-1.5 transition-transform active:scale-95 text-xs"
                        title="Lancer le de">
                        <Flame className="w-3 h-3" />
                        {getDiceForLevel(char.stats[stat].level)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'inventaire' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
              <Backpack className="w-10 h-10 text-[#8b5a2b]" />
              <p className="text-[#5c3a21] font-bold italic text-sm text-center">L'inventaire sera grave ici...</p>
            </div>
          )}

          {activeTab === 'competences' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
              <BookOpen className="w-10 h-10 text-[#8b5a2b]" />
              <p className="text-[#5c3a21] font-bold italic text-sm text-center">Les arts occultes seront inscrits ici...</p>
            </div>
          )}

        </div>
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
    <div className="flex items-center gap-1.5">
      {/* Icône + Label */}
      <div className="flex items-center gap-1 w-14 shrink-0" style={{ color }}>
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      {/* Bouton − */}
      <button
        onClick={onDecrement}
        className="w-4 h-4 shrink-0 rounded flex items-center justify-center font-bold text-xs leading-none text-[#5c3a21] hover:bg-[#d5c3aa] transition-colors"
        style={{ border: `1px solid ${color}55` }}
      >−</button>
      {/* Barre */}
      <div className="flex-1 h-2 rounded-full border border-[#8b5a2b]/40 overflow-hidden" style={{ backgroundColor: trackColor }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {/* Bouton + */}
      <button
        onClick={onIncrement}
        className="w-4 h-4 shrink-0 rounded flex items-center justify-center font-bold text-xs leading-none text-[#5c3a21] hover:bg-[#d5c3aa] transition-colors"
        style={{ border: `1px solid ${color}55` }}
      >+</button>
      {/* Valeur */}
      <div className="text-[10px] font-black text-[#3e2723] w-9 text-right shrink-0">
        {current}<span className="font-normal opacity-60">/{max}</span>
      </div>
    </div>
  );
}
