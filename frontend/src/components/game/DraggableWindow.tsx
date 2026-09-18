import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, GripHorizontal, ArrowRightToLine, ArrowLeftToLine, ChevronRight, ChevronLeft, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { coreEventBus } from '../../core/services/EventBus';
import { PopoutButton } from './PopoutButton';
import type { WindowPosition } from '../../core/services/ModManager';

interface DraggableWindowProps {
  windowId: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultPosition?: WindowPosition;
  isOpen: boolean;
  onFocus: () => void;
  zIndex: number;
  occupiedZones?: string[];
}

export function DraggableWindow({ 
  windowId, 
  title, 
  icon, 
  children, 
  defaultPosition = 'floating',
  isOpen,
  onFocus,
  zIndex,
  occupiedZones = []
}: DraggableWindowProps) {
  const [dockState, setDockState] = useState<WindowPosition>(() => {
    // Si la zone demandée est occupée par une AUTRE fenêtre au démarrage, on force en flottant
    if (['left', 'right', 'top', 'bottom'].includes(defaultPosition) && occupiedZones.includes(defaultPosition)) {
      return 'floating';
    }
    return defaultPosition;
  });
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ w: 400, h: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
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
      setPos({ x: w / 2 - size.w / 2, y: h / 2 - size.h / 2 });
    }
  }, [isOpen, dockState]);

  // Informer le gestionnaire global de la zone occupée
  useEffect(() => {
    coreEventBus.emit('WINDOW_DOCK_CHANGE', { windowId, state: dockState });
  }, [dockState, windowId]);

  // Garde-fou Responsif
  useEffect(() => {
    const handleResize = () => {
      if (dockState === 'floating') {
        setPos(prev => {
          const maxX = Math.max(0, window.innerWidth - size.w);
          const maxY = Math.max(0, window.innerHeight - size.h);
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
          w: Math.max(300, sizeStartPos.current.w + dx),
          h: Math.max(200, sizeStartPos.current.h + dy)
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

    const handlePointerUp = (e: PointerEvent) => {
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

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
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

  let containerStyles = "fixed flex flex-col bg-[#050508]/95 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 ease-in-out pointer-events-auto";
  let inlineStyles: React.CSSProperties = { zIndex, display: isOpen ? 'flex' : 'none' };

  if (dockState === 'floating') {
    containerStyles += " rounded-xl overflow-hidden"; // Overflow hidden only when floating to keep rounded corners
    inlineStyles = {
      ...inlineStyles,
      left: pos.x,
      top: pos.y,
      width: size.w,
      height: size.h,
      transition: (isDragging || isResizing) ? 'none' : 'all 0.3s ease-out'
    };
  } else if (dockState === 'right') {
    containerStyles += " right-0 top-0 h-full w-[350px] border-l";
    if (isCollapsed) inlineStyles.transform = 'translateX(100%)';
  } else if (dockState === 'left') {
    containerStyles += " left-0 top-0 h-full w-[350px] border-r";
    if (isCollapsed) inlineStyles.transform = 'translateX(-100%)';
  } else if (dockState === 'fullscreen') {
    containerStyles += " inset-0 w-full h-full";
  }

  // Rendu Pop-Out (React Portal)
  if (isPopout) {
    if (!containerRef.current) return null;
    return createPortal(
      <div className="flex flex-col h-full w-full">
        <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center shrink-0">
          <h3 className="text-zinc-300 text-sm font-bold tracking-widest uppercase">{title} (Pop-out)</h3>
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
          className={`fixed transition-all bg-rose-500/10 border-rose-500/50 backdrop-blur-sm z-[40]
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
        <div 
          className={`bg-white/5 border-b border-white/10 p-3 flex justify-between items-center shrink-0 ${dockState === 'fullscreen' ? '' : 'cursor-grab active:cursor-grabbing'}`}
          onPointerDown={dockState === 'fullscreen' ? undefined : handlePointerDown}
        >
          <div className="flex items-center gap-2 pointer-events-none select-none">
            {icon ? (
              <div className="w-4 h-4 text-zinc-400">
                {icon}
              </div>
            ) : (
              <GripHorizontal className="w-4 h-4 text-zinc-500" />
            )}
            <h3 className="text-zinc-300 text-sm font-bold tracking-widest uppercase">{title}</h3>
          </div>
          
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Boutons d'état (Plein écran / Flottant) */}
            {dockState !== 'fullscreen' && (
               <button 
                 onClick={(e) => { e.stopPropagation(); setDockState('fullscreen'); }}
                 className="text-white/30 hover:text-white transition-colors p-1 no-drag cursor-pointer relative z-[100]"
                 title="Plein Écran"
               >
                 <Maximize2 className="w-4 h-4 pointer-events-none" />
               </button>
            )}

            {dockState === 'fullscreen' && (
               <button 
                 onClick={(e) => { e.stopPropagation(); setDockState('floating'); }}
                 className="text-white/30 hover:text-white transition-colors p-1 no-drag cursor-pointer relative z-[100]"
                 title="Réduire en fenêtre"
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

            <button 
              onClick={(e) => { e.stopPropagation(); handleClose(); }} 
              className="text-white/30 hover:text-rose-400 transition-colors p-1 no-drag cursor-pointer relative z-[100]"
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pointer-events-auto relative">
          {children}
        </div>

        {/* Handle de redimensionnement */}
        {dockState === 'floating' && (
          <div 
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 z-50 text-white/20 hover:text-white/50"
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
