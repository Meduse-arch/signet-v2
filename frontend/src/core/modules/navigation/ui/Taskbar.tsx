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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
        {/* Main Signet Button (Menu) */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu();
          }}
          className="relative group p-3 rounded-xl hover:bg-rose-500/20 transition-all flex items-center justify-center cursor-pointer"
          title="Menu Principal"
        >
          <div className="absolute inset-0 rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <img src="/logo.svg" alt="Signet" className="w-6 h-6 opacity-90 drop-shadow-[0_0_10px_rgba(225,29,72,0.8)]" />
        </button>

        {pinnedActions.length > 0 && <div className="w-px h-8 bg-white/10 mx-1" />}

        {/* Pinned actions */}
        {pinnedActions.map(action => {
          const isActive = activeIds.includes(action.actionId);
          return (
            <button 
              key={action.actionId}
              onClick={() => coreEventBus.emit(action.onClickEvent)}
              className={`relative group w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
                isActive
                  ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-105'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
              }`}
            >
              <div className="w-6 h-6 [&>svg]:w-full [&>svg]:h-full drop-shadow-md">
                {action.icon}
              </div>
              
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-bold py-1 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
                {action.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
