import React from 'react';
import { coreEventBus } from '../../../../core/services/EventBus';
import type { RegisteredAction } from '../../../../core/services/ModManager';

interface TaskbarProps {
  onOpenMenu: () => void;
  pinnedActions: RegisteredAction[];
  activeIds: string[];
}

export function Taskbar({ onOpenMenu, pinnedActions, activeIds }: TaskbarProps) {
  return (
    <div className="absolute bottom-0 left-0 w-full z-40 pointer-events-none flex justify-center pb-6">
      <div className="pointer-events-auto flex items-end gap-6 px-8 py-2">
        {/* Main Signet Button (Menu) */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu();
          }}
          className="relative group p-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:-translate-y-1"
          title="Menu Principal"
        >
          <img src="/logo.svg" alt="Signet" className="w-7 h-7 opacity-70 group-hover:opacity-100 transition-all duration-300 drop-shadow-[0_0_8px_rgba(225,29,72,0.4)]" />
          
          {/* Ligne rouge (active au survol) */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-[2px] bg-rose-600/30 group-hover:w-full group-hover:bg-rose-600 transition-all duration-300 shadow-[0_0_10px_rgba(225,29,72,0.8)]" />
        </button>

        {pinnedActions.length > 0 && <div className="w-1 h-1 rounded-full bg-white/10 mx-2 mb-4" />}

        {/* Pinned actions */}
        {pinnedActions.map(action => {
          const isActive = activeIds.includes(action.actionId);
          return (
            <button 
              key={action.actionId}
              onClick={() => coreEventBus.emit(action.onClickEvent, action.actionId)}
              className={`relative group p-2 flex flex-col items-center justify-center transition-all duration-300 ${
                isActive
                  ? 'text-rose-50 -translate-y-1'
                  : 'text-white/40 hover:text-white/90 hover:-translate-y-1'
              }`}
            >
              <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full drop-shadow-md mb-1 transition-transform duration-300 group-hover:scale-110">
                {action.icon}
              </div>
              
              {/* Soulignement Crimson Red (Couleur Logo) */}
              <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-[2px] transition-all duration-300 shadow-[0_0_10px_rgba(225,29,72,0.8)] ${
                isActive 
                  ? 'w-full opacity-100 bg-rose-600' 
                  : 'w-1 opacity-0 group-hover:w-full group-hover:opacity-50 bg-rose-600'
              }`} />

              {/* Tooltip ultra-minimaliste */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#050508]/95 text-white/90 text-[10px] uppercase tracking-[0.2em] font-bold py-1.5 px-4 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap border border-white/5 backdrop-blur-xl shadow-xl translate-y-2 group-hover:translate-y-0">
                {action.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
