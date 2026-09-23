import React, { useEffect, useState } from 'react';
import { SignetAPI } from '../../../services/SignetAPI';
import { LogStore } from '../LogStore';
import type { LogEntry, LogEntryType } from '../types';
import { Dices, Backpack, Zap, Settings, AlignLeft } from 'lucide-react';
import { ModManager } from '../../../services/ModManager';

interface ActivityLogWindowProps {
  api: SignetAPI;
}

export function ActivityLogWindow({ api }: ActivityLogWindowProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState<LogEntryType | 'all'>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // On vérifie le statut du joueur via le ModManager
    setIsHost(ModManager.getIsHost());

    const updateLogs = () => {
      setEntries([...LogStore.getAll()]);
    };
    const unsubscribe = LogStore.subscribe(updateLogs);
    updateLogs(); // Init

    return () => unsubscribe();
  }, []);

  const myName = api.user.getName();

  const filteredEntries = entries.filter(entry => {
    // 1. Visibility Check
    if (entry.visibility === 'self' && entry.accountName !== myName) return false;
    if (entry.visibility === 'gm' && !isHost) return false;
    
    // 2. Type Filter
    if (typeFilter !== 'all' && entry.type !== typeFilter) return false;

    // 3. Actor Filter
    if (actorFilter !== 'all' && entry.actorId !== actorFilter) return false;

    // 4. Account Filter
    if (accountFilter !== 'all' && entry.accountName !== accountFilter) return false;

    return true;
  });

  // Comptes uniques pour le filtre
  const accounts = Array.from(new Set(entries.map(e => e.accountName)));

  // Acteurs uniques (filtrés par compte et basés sur l'ID, avec le nom le plus récent)
  const actorsMap = new Map<string, string>();
  entries.forEach(e => {
    if (accountFilter === 'all' || e.accountName === accountFilter) {
      if (e.actorId) {
        actorsMap.set(e.actorId, e.actor); // Le dernier log écrase le précédent, donc on a le nom le plus récent
      }
    }
  });

  const getIconForType = (type: LogEntryType) => {
    switch (type) {
      case 'dice': return <Dices className="w-4 h-4 text-rose-400" />;
      case 'item': return <Backpack className="w-4 h-4 text-blue-400" />;
      case 'skill': return <Zap className="w-4 h-4 text-purple-400" />;
      case 'system': return <Settings className="w-4 h-4 text-slate-400" />;
      case 'action': return <AlignLeft className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full pointer-events-auto bg-black/40 backdrop-blur-md overflow-hidden">
      {/* Filters */}
      <div className="flex gap-2 p-3 bg-white/5 border-b border-white/10 shrink-0">
        <select 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="bg-black/80 text-xs text-slate-300 rounded px-2 py-1.5 border border-white/10 outline-none focus:border-rose-500/50 transition-colors"
        >
          <option value="all">Tous les types</option>
          <option value="dice">Dés</option>
          <option value="item">Équipement</option>
          <option value="skill">Compétences</option>
          <option value="action">Actions</option>
          <option value="system">Système</option>
        </select>

        {isHost && (
          <>
            <select 
              value={accountFilter} 
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setActorFilter('all'); // Reset l'acteur quand on change de compte
              }}
              className="bg-black/80 text-xs text-slate-300 rounded px-2 py-1.5 border border-white/10 outline-none focus:border-rose-500/50 transition-colors"
            >
              <option value="all">Tous</option>
              {accounts.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <select 
              value={actorFilter} 
              onChange={(e) => setActorFilter(e.target.value)}
              className="bg-black/80 text-xs text-slate-300 rounded px-2 py-1.5 border border-white/10 outline-none focus:border-rose-500/50 transition-colors"
            >
              <option value="all">Tous les acteurs</option>
              {Array.from(actorsMap.entries()).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Log List (Plus récent en haut) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar flex flex-col">
        {filteredEntries.slice().reverse().map(entry => (
          <div key={entry.id} className="flex items-start gap-3 py-1 group">
            <div className="mt-0.5 shrink-0 p-1.5 rounded-md bg-white/5 border border-white/10">
              {getIconForType(entry.type)}
            </div>
            <div className="flex-1 leading-snug pt-0.5">
              <span className="text-rose-300 font-semibold text-sm mr-1">{entry.actor}</span>
              {isHost && <span className="text-zinc-500 text-xs italic mr-2">({entry.accountName})</span>}
              <span className="text-slate-400 text-sm">{entry.summary}</span>
              <div className="text-slate-600 text-[10px] mt-1 opacity-50 group-hover:opacity-100 transition-opacity">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {filteredEntries.length === 0 && (
          <div className="text-center text-slate-500 text-sm italic mt-8">
            Le journal est vide.
          </div>
        )}
      </div>
    </div>
  );
}
