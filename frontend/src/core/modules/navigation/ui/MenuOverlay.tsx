import { useState, useEffect } from 'react';
import { X, LogOut, Search, Pin } from 'lucide-react';
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

  // Échap ferme le menu
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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

  const renderSection = (actionList: RegisteredAction[], title: string, pinnedCount: number) => (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-medium text-zinc-400">{title}</h2>
        <span className="num text-xs text-zinc-600">{pinnedCount} / {CATEGORY_LIMIT} dans la barre</span>
      </div>

      {actionList.length === 0 ? (
        <p className="px-1 text-sm text-zinc-600">Aucun résultat</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {actionList.map(action => {
            const isPinned = pinnedIds.includes(action.actionId);
            const isActive = activeIds.includes(action.actionId);
            const isCategoryFull = !isPinned && pinnedCount >= CATEGORY_LIMIT;

            return (
              <div
                key={action.actionId}
                className={`group flex items-center rounded-xl border transition-colors ${
                  isActive ? 'border-white/15 bg-white/[.06]' : 'border-hairline bg-white/[.02] hover:border-white/15 hover:bg-white/[.04]'
                }`}
              >
                <button
                  onClick={() => {
                    coreEventBus.emit(action.onClickEvent, action.actionId);
                    onClose();
                  }}
                  className="flex-1 min-w-0 flex items-center gap-3 h-14 pl-4 text-left"
                >
                  <span className={`w-5 h-5 shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:!text-current [&>svg]:stroke-[1.5] transition-colors ${
                    isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-200'
                  }`}>
                    {action.icon}
                  </span>
                  <span className={`text-sm truncate ${isActive ? 'text-white font-medium' : 'text-zinc-300 group-hover:text-white'}`}>
                    {action.label}
                  </span>
                  {isActive && <span className="ml-auto mr-1 text-xs text-rose-300 shrink-0">Ouvert</span>}
                </button>

                <button
                  onClick={() => !isCategoryFull && onTogglePin(action.actionId)}
                  disabled={isCategoryFull}
                  aria-pressed={isPinned}
                  aria-label={isPinned ? `Retirer ${action.label} de la barre` : `Épingler ${action.label} à la barre`}
                  title={isCategoryFull
                    ? `Barre pleine (${CATEGORY_LIMIT} par catégorie)`
                    : isPinned ? 'Retirer de la barre' : 'Épingler à la barre'}
                  className={`mr-2 w-8 h-8 shrink-0 grid place-items-center rounded-lg transition-[color,background-color,opacity] ${
                    isPinned
                      ? 'text-rose-400 hover:bg-rose-500/10'
                      : isCategoryFull
                        ? 'text-zinc-700 opacity-0 group-hover:opacity-100 cursor-not-allowed'
                        : 'text-zinc-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in pointer-events-auto">
      {/* Fond : la table reste devinée derrière */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />

      {/* Panneau du menu */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal"
        className="relative w-full max-w-4xl max-h-full flex flex-col rounded-2xl bg-surface/90 backdrop-blur-xl border border-hairline shadow-2xl"
      >
        {/* En-tête : marque + recherche */}
        <div className="flex items-center gap-4 px-6 h-16 border-b border-hairline shrink-0">
          <img src="/logo.svg" alt="" className="w-6 h-6 opacity-90 shrink-0" />
          <span className="text-base font-bold text-white shrink-0">Signet</span>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher une fenêtre ou un outil"
              aria-label="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-black/40 border border-hairline text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            title="Fermer (Échap)"
            className="w-9 h-9 grid place-items-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu : sections */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-6 flex flex-col gap-8">
          {(systemActions.length > 0 || searchQuery) && renderSection(systemActions, 'Systèmes de jeu', systemPinnedCount)}
          {(coreActions.length > 0 || searchQuery) && renderSection(coreActions, 'Outils de la table', classicPinnedCount)}
        </div>

        {/* Pied : retour au jeu, sortie */}
        <div className="flex items-center justify-between gap-4 px-6 h-16 border-t border-hairline shrink-0">
          <span className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
            <kbd className="font-mono text-[11px] text-zinc-400 border border-white/10 border-b-2 rounded-md px-1.5 py-0.5">Échap</kbd>
            pour revenir à la table
          </span>
          <button
            onClick={onReturnToHub}
            className="ml-auto h-10 px-4 rounded-lg text-sm text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 whitespace-nowrap transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Quitter la session
          </button>
        </div>
      </div>
    </div>
  );
}
