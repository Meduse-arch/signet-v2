import React, { useState } from 'react';
import { coreEventBus } from '../../../../core/services/EventBus';
import type { RegisteredAction } from '../../../../core/services/ModManager';

interface TaskbarProps {
  onOpenMenu: () => void;
  pinnedActions: RegisteredAction[];
  activeIds: string[];
}

export function Taskbar({ onOpenMenu, pinnedActions, activeIds }: TaskbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Séparation système (gauche) / classique (droite) pour le positionnement
  // L'ORDRE dans chaque groupe respecte l'ordre d'épinglage (pas un ordre prédéfini)
  const leftActions = pinnedActions.filter(a => a.modId.startsWith('system-'));
  const rightActions = pinnedActions.filter(a => !a.modId.startsWith('system-'));

  const renderAction = (action: RegisteredAction) => {
    const isActive = activeIds.includes(action.actionId);
    return (
      <button
        key={action.actionId}
        onClick={() => coreEventBus.emit(action.onClickEvent, action.actionId)}
        className={`relative group/btn p-2 flex flex-col items-center justify-center transition-all duration-300 ${
          isActive
            ? 'text-rose-300 -translate-y-1'
            : 'text-white/45 hover:text-white/90 hover:-translate-y-1'
        }`}
        title={action.label}
      >
        <div className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full drop-shadow-md transition-transform duration-300 group-hover/btn:scale-110">
          {action.icon}
        </div>
        {/* Ligne cramoisie sous l'icône — même style que sous le logo */}
        <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-rose-600 transition-all duration-300 ${
          isActive ? 'w-5 opacity-80' : 'w-0 opacity-0'
        }`} />
        {/* Tooltip */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#050508]/95 text-white/90 text-[10px] uppercase tracking-[0.2em] font-bold py-1 px-3 rounded-sm opacity-0 group-hover/btn:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap border border-white/5 backdrop-blur-xl shadow-xl">
          {action.label}
        </div>
      </button>
    );
  };

  return (
    // Zone de hover uniquement autour de la barre (pas toute la largeur)
    // pour ne pas bloquer les éléments en bas à gauche/droite (ex: input chat)
    <div
      className="absolute bottom-0 left-0 w-full z-[90] pointer-events-none flex justify-center items-end"
      style={{ height: '80px' }}
    >
      {/* Barre avec zone de hover agrandie via pt-8 — pointer-events seulement sur la barre */}
      <div
        className="relative pointer-events-auto flex items-center pb-5 pt-8"
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Fond glassmorphism — apparaît au hover */}
        <div
          className={`absolute inset-x-[-24px] inset-y-[-10px] rounded-2xl transition-all duration-500 ${
            isExpanded
              ? 'opacity-100 bg-black/50 backdrop-blur-xl border border-white/8 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]'
              : 'opacity-0 backdrop-blur-none'
          }`}
        />

        <div className="relative flex items-center gap-1">
          {/* Items épinglés gauche (1-4, ordre d'épinglage) */}
          <div
            className="flex items-center gap-1 overflow-hidden transition-all duration-400 ease-out"
            style={{
              maxWidth: isExpanded ? `${leftActions.length * 44}px` : '0px',
              opacity: isExpanded ? 1 : 0,
              marginRight: isExpanded && leftActions.length > 0 ? '8px' : '0px',
            }}
          >
            {leftActions.map(renderAction)}
            {leftActions.length > 0 && rightActions.length > 0 && (
              <div className="w-px h-4 bg-white/15 mx-1 shrink-0" />
            )}
          </div>

          {/* Logo Signet — toujours visible, centré, discret */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu();
            }}
            className="relative group/logo p-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:-translate-y-1 shrink-0"
            title="Menu Principal (Grimoire)"
          >
            <img
              src="/logo.svg"
              alt="Signet"
              className={`transition-all duration-400 ${
                isExpanded
                  ? 'w-7 h-7 opacity-95 drop-shadow-[0_0_14px_rgba(225,29,72,0.6)] group-hover/logo:drop-shadow-[0_0_22px_rgba(225,29,72,0.9)]'
                  : 'w-6 h-6 opacity-45 group-hover/logo:opacity-70 drop-shadow-[0_0_6px_rgba(225,29,72,0.2)]'
              }`}
            />
            {/* Ligne rouge sous le logo */}
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-[2px] bg-rose-600 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(225,29,72,0.8)] ${
              isExpanded
                ? 'w-6 opacity-60 group-hover/logo:opacity-100 group-hover/logo:w-8'
                : 'w-1 opacity-0 group-hover/logo:opacity-30 group-hover/logo:w-3'
            }`} />
          </button>

          {/* Items épinglés droite (5-8, ordre d'épinglage) */}
          <div
            className="flex items-center gap-1 overflow-hidden transition-all duration-400 ease-out"
            style={{
              maxWidth: isExpanded ? `${rightActions.length * 44}px` : '0px',
              opacity: isExpanded ? 1 : 0,
              marginLeft: isExpanded && rightActions.length > 0 ? '8px' : '0px',
            }}
          >
            {rightActions.map(renderAction)}
          </div>
        </div>
      </div>
    </div>
  );
}
