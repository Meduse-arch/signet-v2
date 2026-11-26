import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, GripHorizontal, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { coreEventBus } from '../../core/services/EventBus';
import { PopoutButton } from './PopoutButton';
import type { WindowPosition } from '../../core/services/ModManager';
import { windowPositions } from '../../core/services/windowLayouts';

interface DraggableWindowProps {
  windowId: string;
  title: string;
  /** Sous-titre discret (ex. système de jeu) */
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultPosition?: WindowPosition;
  isOpen: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
  onFocus: () => void;
  zIndex: number;
  occupiedZones?: string[];
  transparent?: boolean;
  hideHeader?: boolean;
  startSlim?: boolean;
  collapseMode?: 'slim' | 'hide';
}

export function DraggableWindow({ 
  windowId, 
  title, 
  subtitle,
  icon, 
  children, 
  defaultPosition = 'floating',
  defaultWidth,
  defaultHeight,
  isOpen,
  onFocus,
  zIndex,
  occupiedZones = [],
  transparent = false,
  hideHeader = false,
  startSlim = false,
  collapseMode = 'hide'
}: DraggableWindowProps) {
  const [dockState, setDockState] = useState<WindowPosition>(() => {
    // Si la zone demandée est occupée par une AUTRE fenêtre au démarrage, on force en flottant
    if (['left', 'right', 'top', 'bottom'].includes(defaultPosition) && occupiedZones.includes(defaultPosition)) {
      return 'floating';
    }
    return defaultPosition;
  });
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ w: defaultWidth ?? 460, h: defaultHeight ?? 580 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(startSlim);
  const [isPopout, setIsPopout] = useState(false);
  const [snapPreview, setSnapPreview] = useState<WindowPosition | null>(null);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const externalWinRef = useRef<Window | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });
  const sizeStartPos = useRef({ w: 0, h: 0 });
  const hasMoved = useRef(false);

  // Reset position if opened and floating
  useEffect(() => {
    if (isOpen && dockState === 'floating') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Largeur/hauteur réellement rendues (cf. maxWidth/maxHeight plus bas)
      const effW = Math.min(size.w, w - 16);
      const effH = Math.min(size.h, h - 32);
      setPos({ x: Math.max(8, w / 2 - effW / 2), y: Math.max(16, h / 2 - effH / 2) });
    }
  }, [isOpen, dockState]);

  // Mémorise la position flottante (pour les dispositions Libre / Combat)
  useEffect(() => {
    windowPositions.set(windowId, pos);
  }, [windowId, pos]);

  // Applique une position demandée par une disposition (placement direct, sans animer left/top)
  useEffect(() => {
    const handleSetPosition = (payload: { windowId: string; x: number; y: number }) => {
      if (payload.windowId !== windowId || dockState !== 'floating') return;
      setPos({ x: payload.x, y: payload.y });
    };
    coreEventBus.on('WINDOW_SET_POSITION', handleSetPosition);
    return () => coreEventBus.off('WINDOW_SET_POSITION', handleSetPosition);
  }, [dockState, windowId]);

  // Informer le gestionnaire global de la zone occupée
  useEffect(() => {
    coreEventBus.emit('WINDOW_DOCK_CHANGE', { windowId, state: dockState });
  }, [dockState, windowId]);

  // Garde-fou Responsif
  useEffect(() => {
    const handleResize = () => {
      if (dockState === 'floating') {
        setPos(prev => {
          const effW = Math.min(size.w, window.innerWidth - 16);
          const effH = Math.min(size.h, window.innerHeight - 32);
          const maxX = Math.max(0, window.innerWidth - effW);
          const maxY = Math.max(0, window.innerHeight - effH);
          return {
            x: Math.min(Math.max(0, prev.x), maxX),
            y: Math.min(Math.max(0, prev.y), maxY)
          };
        });
      }
    };
    window.addEventListener('resize', handleResize);
    // On l'appelle une fois au montage au cas où
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [dockState, size.w, size.h]);

  // --- POP-OUT EFFECT ---
  useEffect(() => {
    if (isPopout && externalWinRef.current) {
      const extWin = externalWinRef.current;
      extWin.document.title = title;
      
      // Copier les styles Tailwind
      const copyStyles = () => {
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
          extWin.document.head.appendChild(node.cloneNode(true));
        });
      };
      copyStyles();
      
      extWin.document.body.className = "bg-[#050508] text-zinc-200 overflow-hidden";
      
      const div = extWin.document.createElement('div');
      div.className = "w-full h-full pointer-events-auto flex flex-col";
      extWin.document.body.appendChild(div);
      
      containerRef.current = div;

      const handleUnload = () => {
        setIsPopout(false);
      };
      extWin.addEventListener('beforeunload', handleUnload);
      
      // Force re-render pour attacher le portal
      setPos(p => ({...p}));

      return () => {
        extWin.removeEventListener('beforeunload', handleUnload);
      };
    } else if (!isPopout && externalWinRef.current) {
      externalWinRef.current.close();
      externalWinRef.current = null;
      containerRef.current = null;
    }
  }, [isPopout, title]);

  useEffect(() => {
    return () => {
      if (externalWinRef.current) {
        externalWinRef.current.close();
      }
    };
  }, []);

  const snapPreviewRef = useRef<WindowPosition | null>(null);

  const updateSnapPreview = (preview: WindowPosition | null) => {
    snapPreviewRef.current = preview;
    setSnapPreview(preview);
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (isResizing) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        setSize({
          w: Math.max(250, sizeStartPos.current.w + dx),
          h: Math.max(180, sizeStartPos.current.h + dy)
        });
        return;
      }

      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      
      if (!hasMoved.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        hasMoved.current = true;
        // Transition to floating if docked
        if (dockState !== 'floating') {
          const rect = windowRef.current?.getBoundingClientRect();
          if (rect) {
             let startX = rect.left;
             let startY = rect.top;
             if (isCollapsed) {
                startX = dockState === 'right' ? window.innerWidth - 350 : 0;
                setIsCollapsed(false);
             }
             if (dockState === 'fullscreen') {
                startX = Math.max(0, e.clientX - size.w / 2); // Center the new floating window under the mouse
                startY = Math.max(0, e.clientY - 20);
             }
             windowStartPos.current = { x: startX, y: startY };
             setPos({ x: startX, y: startY });
          }
          setDockState('floating');
        }
      }

      if (hasMoved.current) {
        setPos({
          x: windowStartPos.current.x + dx,
          y: windowStartPos.current.y + dy
        });

        // Détection des bords pour l'aimantation (Snap)
        const edgeThreshold = 50;
        let newSnap: WindowPosition | null = null;
        if (e.clientX > window.innerWidth - edgeThreshold) {
          newSnap = 'right';
        } else if (e.clientX < edgeThreshold) {
          newSnap = 'left';
        } else if (e.clientY < edgeThreshold) {
          newSnap = 'fullscreen';
        }
        
        // Bloquer l'aimantation si la zone est déjà occupée (sauf fullscreen)
        if (newSnap && ['left', 'right', 'top', 'bottom'].includes(newSnap) && occupiedZones.includes(newSnap)) {
          newSnap = null;
        }
        updateSnapPreview(newSnap);
      }
    };

    const handlePointerUp = () => {
      if (isResizing) {
        setIsResizing(false);
        return;
      }

      setIsDragging(false);

      if (hasMoved.current && snapPreviewRef.current) {
        setDockState(snapPreviewRef.current);
        updateSnapPreview(null);
        setIsCollapsed(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    // F11 / unmaximize : WebView2 redimensionne et peut perdre le pointerup → drag verrouillé.
    window.addEventListener('blur', handlePointerUp);
    window.addEventListener('resize', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
      window.removeEventListener('resize', handlePointerUp);
    };
  }, [isDragging, isResizing, dockState, isCollapsed]);

  const handlePointerDown = (e: React.PointerEvent) => {
    onFocus();
    if (e.target instanceof HTMLElement && e.target.closest('.no-drag')) {
      return; 
    }

    e.preventDefault();
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    windowStartPos.current = { ...pos };
  };

  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    sizeStartPos.current = { ...size };
  };

  const handleClose = () => {
    coreEventBus.emit('WINDOW_CLOSE', windowId);
  };

  let containerStyles = "fixed flex flex-col transition-transform duration-300 ease-in-out";
  if (transparent) {
    containerStyles += " pointer-events-none";
  } else {
    containerStyles += " bg-void/95 backdrop-blur-xl border border-hairline shadow-2xl pointer-events-auto";
  }

  let inlineStyles: React.CSSProperties = { zIndex, display: isOpen ? 'flex' : 'none' };
  
  // Largeur dynamique selon l'état collapsed
  const dockedWidth = (isCollapsed && collapseMode === 'slim') ? 72 : 350;

  if (dockState === 'floating') {
    if (!transparent) containerStyles += " rounded-xl overflow-hidden"; // Overflow hidden only when floating to keep rounded corners
    inlineStyles = {
      ...inlineStyles,
      left: pos.x,
      top: pos.y,
      width: transparent ? 'auto' : size.w,
      // Quand replié : hauteur auto (barre de titre seule)
      height: isCollapsed ? 'auto' : (transparent ? 'auto' : size.h),
      maxWidth: 'calc(100vw - 1rem)',
      maxHeight: isCollapsed ? 'none' : 'calc(100vh - 2rem)',
      // Jamais left/top/width/height : seuls opacity/transform sont animés
      transition: (isDragging || isResizing) ? 'none' : 'opacity 0.3s ease-out, transform 0.3s ease-out'
    };
  } else if (dockState === 'right') {
    containerStyles += transparent ? " right-0 top-0 h-full" : " right-0 top-0 h-full border-l";
    inlineStyles.width = transparent ? 'auto' : dockedWidth;
    if (isCollapsed && collapseMode === 'hide') inlineStyles.transform = 'translateX(100%)';
  } else if (dockState === 'left') {
    containerStyles += transparent ? " left-0 top-0 h-full" : " left-0 top-0 h-full border-r";
    inlineStyles.width = transparent ? 'auto' : dockedWidth;
    if (isCollapsed && collapseMode === 'hide') inlineStyles.transform = 'translateX(-100%)';
  } else if (dockState === 'fullscreen') {
    containerStyles += " inset-0 w-full h-full";
  }

  // Rendu Pop-Out (React Portal)
  if (isPopout) {
    if (!containerRef.current) return null;
    return createPortal(
      <div className="flex flex-col h-full w-full">
        <div className="bg-surface border-b border-hairline h-10 px-3.5 flex items-center shrink-0">
          <h3 className="text-zinc-200 text-[13px] font-medium">{title}{subtitle && <span className="ml-2 text-xs font-normal text-zinc-500">{subtitle}</span>}</h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {children}
        </div>
      </div>,
      containerRef.current
    );
  }

  return (
    <>
      {snapPreview && (
        <div 
          className={`fixed transition-opacity bg-rose-500/10 border-rose-500/50 backdrop-blur-sm z-[40]
            ${snapPreview === 'right' ? 'right-0 top-0 h-full w-[350px] border-l-2' : ''}
            ${snapPreview === 'left' ? 'left-0 top-0 h-full w-[350px] border-r-2' : ''}
            ${snapPreview === 'fullscreen' ? 'inset-0 w-full h-full border-2' : ''}
          `}
        />
      )}

      <div 
        ref={windowRef}
        className={containerStyles}
        style={inlineStyles}
        onPointerDown={onFocus}
      >
        {/* Onglet de pliage (Chevron) visible uniquement si docké left/right */}
        {(dockState === 'right' || dockState === 'left') && (
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-10 h-16 bg-[#050508]/95 backdrop-blur-xl border-y border-white/10 flex items-center justify-center cursor-pointer text-white/50 hover:text-white transition-colors collapse-tab pointer-events-auto
              ${dockState === 'right' ? '-left-10 border-l rounded-l-xl shadow-[-10px_0_20px_rgba(0,0,0,0.5)]' : '-right-10 border-r rounded-r-xl shadow-[10px_0_20px_rgba(0,0,0,0.5)]'}
            `}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {dockState === 'right' ? (
              isCollapsed ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />
            ) : (
              isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />
            )}
          </div>
        )}

        {/* Header Drag Area */}
        {/* Header : toujours visible si flottant replié, pour permettre le dé-repliement */}
        {!hideHeader && (!isCollapsed || dockState === 'floating') && (
          <div
            className={`pointer-events-auto bg-surface border-b border-hairline h-10 pl-3.5 pr-2 flex justify-between items-center shrink-0 ${dockState === 'fullscreen' ? '' : 'cursor-grab active:cursor-grabbing'}`}
            onPointerDown={dockState === 'fullscreen' ? undefined : handlePointerDown}
          >
            <div className="flex items-center gap-2.5 min-w-0 pointer-events-none select-none">
              {icon ? (
                <div className="w-4 h-4 shrink-0 text-zinc-500 [&>svg]:w-full [&>svg]:h-full">
                  {icon}
                </div>
              ) : (
                <GripHorizontal className="w-4 h-4 shrink-0 text-zinc-500" />
              )}
              <h3 className="text-zinc-200 text-[13px] font-medium truncate">
                {title}
                {subtitle && <span className="ml-2 text-xs font-normal text-zinc-500">{subtitle}</span>}
              </h3>
            </div>

            <div className="flex items-center gap-0.5 pointer-events-auto">
              {/* Boutons d'état (Plein écran / Flottant) */}
              {dockState !== 'fullscreen' && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setDockState('fullscreen'); }}
                   className="w-7 h-7 grid place-items-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[.06] transition-colors no-drag cursor-pointer relative z-[100]"
                   title="Plein Écran"
                   aria-label="Passer en plein écran"
                 >
                   <Maximize2 className="w-4 h-4 pointer-events-none" />
                 </button>
              )}

              {dockState === 'fullscreen' && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); setDockState('floating'); }}
                   className="w-7 h-7 grid place-items-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[.06] transition-colors no-drag cursor-pointer relative z-[100]"
                   title="Réduire en fenêtre"
                   aria-label="Réduire en fenêtre"
                 >
                   <Minimize2 className="w-4 h-4 pointer-events-none" />
                 </button>
              )}

              <PopoutButton 
                windowId={windowId} 
                title={title} 
                size={size} 
                onPopout={() => handleClose()} 
              />

              {/* Bouton Collapse (replier/déplier) — masqué en fullscreen */}
              {dockState !== 'fullscreen' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
                  className="w-7 h-7 grid place-items-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[.06] transition-colors no-drag cursor-pointer relative z-[100]"
                  title={isCollapsed ? 'Déplier la fenêtre' : 'Replier la fenêtre'}
                  aria-label={isCollapsed ? 'Déplier la fenêtre' : 'Replier la fenêtre'}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed
                    ? <ChevronDown className="w-4 h-4 pointer-events-none" />
                    : <ChevronUp className="w-4 h-4 pointer-events-none" />
                  }
                </button>
              )}

              <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }} 
                className="w-7 h-7 grid place-items-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors no-drag cursor-pointer relative z-[100]"
                title="Fermer"
                aria-label="Fermer la fenêtre"
              >
                <X className="w-4 h-4 pointer-events-none" />
              </button>
            </div>
          </div>
        )}
        
        {/* Transparent or Slim Drag Grip (Visible when header is hidden or collapsed) */}
        {/* Grip slim : visible si header caché ou si docké+replié (pas si flottant+replié, le header reste affiché) */}
        {(hideHeader || (isCollapsed && dockState !== 'floating')) && dockState !== 'fullscreen' && (
          <div 
            className="w-full flex justify-center p-2 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity pointer-events-auto shrink-0"
            onPointerDown={handlePointerDown}
          >
            <GripHorizontal className="w-5 h-5 text-zinc-400" />
          </div>
        )}
        
        {/* Content Area : masqué si fenêtre flottante repliée */}
        {!(isCollapsed && dockState === 'floating') && (
          <div className={`flex-1 overflow-y-auto custom-scrollbar pointer-events-auto relative ${transparent ? '' : 'bg-[#050508]/50'}`}>
            {children}
          </div>
        )}

        {/* Handle de redimensionnement */}
        {dockState === 'floating' && !transparent && !isCollapsed && (
          <div 
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 z-50 text-white/20 hover:text-white/50 pointer-events-auto"
            onPointerDown={handleResizeDown}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M10 0v10H0L10 0z" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}
