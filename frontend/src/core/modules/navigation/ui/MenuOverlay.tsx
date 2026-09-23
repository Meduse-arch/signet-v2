import React, { useState } from 'react';
import { X, LogOut, Search, Pin, PinOff, Puzzle, Terminal } from 'lucide-react';
import { coreEventBus } from '../../../../core/services/EventBus';
import type { RegisteredAction } from '../../../../core/services/ModManager';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToHub: () => void;
  actions: RegisteredAction[];
  pinnedIds: string[];
  activeIds: string[];
  onTogglePin: (actionId: string) => void;
}

export function MenuOverlay({ isOpen, onClose, onReturnToHub, actions, pinnedIds, activeIds, onTogglePin }: MenuOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const CATEGORY_LIMIT = 4;

  // Partir de `actions` (registre réel) pour éviter de compter des IDs périmés en localStorage
  const systemPinnedCount = actions.filter(a =>
    a.modId.startsWith('system-') && pinnedIds.includes(a.actionId)
  ).length;
  const classicPinnedCount = actions.filter(a =>
    !a.modId.startsWith('system-') && pinnedIds.includes(a.actionId)
  ).length;

  if (!isOpen) return null;

  // Filtrage par recherche
  const filteredActions = actions.filter(action => 
    action.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Groupement
  const systemActions = filteredActions.filter(a => a.modId.startsWith('system-'));
  const coreActions = filteredActions.filter(a => !a.modId.startsWith('system-'));

  const renderActionGrid = (actionList: typeof actions, title: string, icon: React.ReactNode) => (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center gap-3 text-white/50 border-b border-white/5 pb-2">
        {icon}
        <h2 className="text-xl font-bold tracking-widest uppercase">{title}</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 w-full max-w-7xl">
        {actionList.map((action) => {
          const isPinned = pinnedIds.includes(action.actionId);
          const isActive = activeIds.includes(action.actionId);
          const isSystem = action.modId.startsWith('system-');
          const categoryCount = isSystem ? systemPinnedCount : classicPinnedCount;
          const isCategoryFull = !isPinned && categoryCount >= CATEGORY_LIMIT;
          
          return (
            <div key={action.actionId} className="relative group">
              <button 
                onClick={() => !isCategoryFull && onTogglePin(action.actionId)}
                disabled={isCategoryFull}
                className={`absolute -top-3 -right-3 p-2 rounded-full z-10 transition-all duration-300 shadow-lg ${
                  isCategoryFull
                    ? 'bg-zinc-800/50 text-zinc-600 opacity-50 scale-90 cursor-not-allowed'
                    : isPinned 
                      ? 'bg-rose-500 text-white opacity-100 scale-100' 
                      : 'bg-zinc-800 text-zinc-400 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 hover:bg-zinc-700 hover:text-white'
                }`}
                title={isCategoryFull 
                  ? `Limite atteinte (max ${CATEGORY_LIMIT} par catégorie)` 
                  : isPinned ? 'Désépingler de la barre' : 'Épingler à la barre'
                }
              >
                {isCategoryFull ? <span className="text-xs font-bold">✕</span> : isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>

              <button 
                onClick={() => {
                  coreEventBus.emit(action.onClickEvent, action.actionId);
                  onClose(); 
                }}
                className={`w-full flex flex-col items-center justify-center gap-6 p-8 rounded-3xl transition-all shadow-xl group ${
                  isActive 
                    ? 'bg-white/15 border border-white/30 hover:bg-white/20 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]'
                }`}
              >
                <div className={`w-12 h-12 transition-colors [&>svg]:w-full [&>svg]:h-full drop-shadow-md ${
                  isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white'
                }`}>
                  {action.icon}
                </div>
                <span className={`text-lg font-bold text-center ${
                  isActive ? 'text-white' : 'text-white/60 group-hover:text-white'
                }`}>
                  {action.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {actionList.length === 0 && (
        <div className="text-zinc-500 font-medium tracking-widest uppercase italic py-4">
          Aucun résultat.
        </div>
      )}
    </div>
  );

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center animate-fade-in pointer-events-auto">
      {/* Background with heavy blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={onClose} />

      {/* Main Grimoire Content */}
      <div className="relative w-full h-full p-12 lg:p-24 flex flex-col">
        {/* Top bar: Logo + Search */}
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 shrink-0">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="Signet" className="w-16 h-16 opacity-90 drop-shadow-[0_0_15px_rgba(225,29,72,0.5)]" />
            <h1 className="text-5xl font-black text-white tracking-widest uppercase drop-shadow-lg">Signet</h1>
          </div>
          
          <div className="w-full md:w-[400px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input 
               type="text" 
               placeholder="Rechercher une application, un réglage..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-sm font-medium tracking-wide shadow-inner"
            />
          </div>
        </div>

        {/* Applications Grid */}
        <div className="flex-1 w-full flex flex-col gap-12 overflow-y-auto pb-12 pr-4 custom-scrollbar">
          
          {/* Section Systèmes de Jeu */}
          {(systemActions.length > 0 || searchQuery) && renderActionGrid(systemActions, "Systèmes de jeu", <Puzzle className="w-6 h-6" />)}
          
          {/* Section Core / Utilitaires */}
          {(coreActions.length > 0 || searchQuery) && renderActionGrid(coreActions, "Utilitaires & Core", <Terminal className="w-6 h-6" />)}

        </div>

        {/* Footer Actions */}
        <div className="w-full flex justify-end items-center gap-6 mt-12">
          <button onClick={onClose} className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-base flex items-center gap-3 transition-colors shadow-lg">
            <X className="w-5 h-5" />
            Retourner au Jeu
          </button>
          
          <button onClick={onReturnToHub} className="px-8 py-4 rounded-full bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-200 hover:text-white font-bold text-base flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(225,29,72,0.2)] hover:shadow-[0_0_40px_rgba(225,29,72,0.4)]">
            <LogOut className="w-5 h-5" />
            Quitter la Session
          </button>
        </div>
      </div>
    </div>
  );
}
