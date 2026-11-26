import { useState, useEffect } from 'react';
import { coreEventBus } from '../../../../core/services/EventBus';
import type { RegisteredAction } from '../../../../core/services/ModManager';

interface TaskbarProps {
  onOpenMenu: () => void;
  pinnedActions: RegisteredAction[];
  activeIds: string[];
}

type WindowLayout = 'free' | 'combat';

const LAYOUTS: { id: WindowLayout; label: string }[] = [
  { id: 'free', label: 'Libre' },
  { id: 'combat', label: 'Combat' },
];

export function Taskbar({ onOpenMenu, pinnedActions, activeIds }: TaskbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [layout, setLayout] = useState<WindowLayout>('free');

  // Repli de secours : le pointeur peut quitter la fenêtre (ou la fenêtre perdre le focus)
  // sans qu'un événement de sortie n'arrive sur la barre.
  useEffect(() => {
    const collapse = () => setIsExpanded(false);
    window.addEventListener('blur', collapse);
    document.addEventListener('mouseleave', collapse);
    return () => {
      window.removeEventListener('blur', collapse);
      document.removeEventListener('mouseleave', collapse);
    };
  }, []);

  const applyLayout = (next: WindowLayout) => {
    setLayout(next);
    coreEventBus.emit('WINDOW_LAYOUT_CHANGE', next);
  };

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
        draggable={false}
        aria-label={action.label}
        aria-pressed={isActive}
        className={`relative group/btn w-9 h-9 shrink-0 flex items-center justify-center rounded-lg transition-colors ${
          isActive ? 'text-rose-300' : 'text-zinc-500 hover:text-white hover:bg-white/5'
        }`}
        title={action.label}
      >
        <div className="w-[18px] h-[18px] [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.5] [&>svg]:text-current">
          {action.icon}
        </div>
        {/* Soulignement cramoisi de l'élément actif */}
        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] w-4 rounded-full bg-rose-600 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
        {/* Infobulle */}
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-surface text-zinc-200 text-xs py-1 px-2.5 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-hairline">
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
        onPointerEnter={() => setIsExpanded(true)}
        onPointerLeave={() => setIsExpanded(false)}
        onPointerCancel={() => setIsExpanded(false)}
      >
        {/* Fond verre dépoli — apparaît au survol */}
        <div
          className={`absolute inset-x-[-20px] inset-y-[-6px] rounded-2xl pointer-events-none transition-opacity duration-300 ${
            isExpanded ? 'opacity-100 bg-surface/80 backdrop-blur-xl border border-hairline' : 'opacity-0'
          }`}
        />

        <div className="relative flex items-center gap-1">
          {/* Items épinglés gauche (ordre d'épinglage) */}
          <div
            className="flex items-center gap-1 overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-out"
            style={{
              maxWidth: isExpanded ? `${leftActions.length * 44}px` : '0px',
              opacity: isExpanded ? 1 : 0,
              marginRight: isExpanded && leftActions.length > 0 ? '8px' : '0px',
            }}
          >
            {leftActions.map(renderAction)}
            {leftActions.length > 0 && rightActions.length > 0 && (
              <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
            )}
          </div>

          {/* Logo Signet — toujours visible, discret */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu();
            }}
            draggable={false}
            className="relative group/logo p-2 flex items-center justify-center cursor-pointer shrink-0"
            title="Menu principal"
            aria-label="Menu principal"
          >
            <img
              src="/logo.svg"
              alt=""
              draggable={false}
              className={`transition-[width,height,opacity] duration-300 ${
                isExpanded ? 'w-7 h-7 opacity-95' : 'w-6 h-6 opacity-45 group-hover/logo:opacity-70'
              }`}
            />
            <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] bg-rose-600 rounded-full transition-[width,opacity] duration-300 ${
              isExpanded ? 'w-5 opacity-70 group-hover/logo:opacity-100' : 'w-1 opacity-0'
            }`} />
          </button>

          {/* Items épinglés droite (ordre d'épinglage) */}
          <div
            className="flex items-center gap-1 overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-out"
            style={{
              maxWidth: isExpanded ? `${rightActions.length * 44}px` : '0px',
              opacity: isExpanded ? 1 : 0,
              marginLeft: isExpanded && rightActions.length > 0 ? '8px' : '0px',
            }}
          >
            {rightActions.map(renderAction)}
          </div>

          {/* Agencement des fenêtres : Libre / Combat */}
          <div
            className="overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-out"
            style={{
              maxWidth: isExpanded ? '160px' : '0px',
              opacity: isExpanded ? 1 : 0,
              marginLeft: isExpanded ? '8px' : '0px',
            }}
          >
            <div role="group" aria-label="Agencement des fenêtres" className="flex p-0.5 rounded-[10px] bg-black/40 border border-hairline">
              {LAYOUTS.map(l => (
                <button
                  key={l.id}
                  onClick={() => applyLayout(l.id)}
                  aria-pressed={layout === l.id}
                  title="Mémorise vos fenêtres ouvertes et leurs positions pour cette disposition"
                  className={`h-7 px-3 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    layout === l.id ? 'bg-white/[.09] text-white shadow-[inset_0_-2px_0_#e11d48]' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
