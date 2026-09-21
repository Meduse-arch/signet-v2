import React, { useState } from 'react';
import { Hand, MousePointer2, ChevronDown, ChevronUp, Grid3x3, Image as ImageIcon, Magnet, Move, Ruler } from 'lucide-react';
import { coreEventBus } from '../../../services/EventBus';
import { ModManager } from '../../../services/ModManager';

export function ToolbarUI() {
  const [activeTool, setActiveTool] = useState<'pan' | 'select' | 'duo' | 'ruler'>('pan');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const isHost = ModManager.getIsHost();

  const handleToolChange = (tool: 'pan' | 'select' | 'duo' | 'ruler') => {
    setActiveTool(tool);
    coreEventBus.emit('CANVAS_TOOL_CHANGED', tool);
  };

  const handleToggleGrid = () => {
    const nextState = !showGrid;
    setShowGrid(nextState);
    coreEventBus.emit('CANVAS_TOGGLE_GRID', nextState);
  };

  const handleToggleSnap = () => {
    const newState = !snapToGrid;
    setSnapToGrid(newState);
    coreEventBus.emit('CANVAS_TOGGLE_SNAP', newState);
  };

  const handleSetMap = () => {
    const url = prompt('Entrez l\'URL de l\'image de fond :');
    if (url !== null) {
      coreEventBus.emit('NETWORK_OUTGOING', {
        type: 'SET_MAP',
        payload: { url }
      });
      // L'émetteur (MJ) doit aussi s'appliquer la carte à lui-même
      coreEventBus.emit('CANVAS_SET_MAP_LOCAL', url);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 pointer-events-auto overflow-hidden">
      {/* Outils Principaux */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleToolChange('pan')}
          className="relative p-3 rounded text-slate-300 hover:text-white transition-colors group flex items-center w-full"
          title="Déplacer la caméra (Pan)"
        >
          <div className="w-8 flex justify-center shrink-0">
            <Hand className="w-6 h-6" />
          </div>
          <span className="ml-4 font-medium whitespace-nowrap opacity-0 md:opacity-100 transition-opacity">Déplacer la caméra</span>
          <div className={`absolute bottom-0 left-3 right-3 md:left-3 md:right-auto md:w-8 h-[2px] transition-colors ${activeTool === 'pan' ? 'bg-rose-600' : 'bg-transparent group-hover:bg-rose-600/50'}`} />
        </button>

        <button
          onClick={() => handleToolChange('select')}
          className="relative p-3 rounded text-slate-300 hover:text-white transition-colors group flex items-center w-full"
          title="Sélectionner / Déplacer les pions"
        >
          <div className="w-8 flex justify-center shrink-0">
            <MousePointer2 className="w-6 h-6" />
          </div>
          <span className="ml-4 font-medium whitespace-nowrap opacity-0 md:opacity-100 transition-opacity">Sélectionner</span>
          <div className={`absolute bottom-0 left-3 right-3 md:left-3 md:right-auto md:w-8 h-[2px] transition-colors ${activeTool === 'select' ? 'bg-rose-600' : 'bg-transparent group-hover:bg-rose-600/50'}`} />
        </button>

        <button
          onClick={() => handleToolChange('duo')}
          className="relative p-3 rounded text-slate-300 hover:text-white transition-colors group flex items-center w-full"
          title="Mode Ambidextre (Caméra + Pions)"
        >
          <div className="w-8 flex justify-center shrink-0">
            <Move className="w-6 h-6" />
          </div>
          <span className="ml-4 font-medium whitespace-nowrap opacity-0 md:opacity-100 transition-opacity">Mode Ambidextre</span>
          <div className={`absolute bottom-0 left-3 right-3 md:left-3 md:right-auto md:w-8 h-[2px] transition-colors ${activeTool === 'duo' ? 'bg-rose-600' : 'bg-transparent group-hover:bg-rose-600/50'}`} />
        </button>

        <button
          onClick={() => handleToolChange('ruler')}
          className="relative p-3 rounded text-slate-300 hover:text-white transition-colors group flex items-center w-full"
          title="Mesurer une distance (Règle)"
        >
          <div className="w-8 flex justify-center shrink-0">
            <Ruler className="w-6 h-6" />
          </div>
          <span className="ml-4 font-medium whitespace-nowrap opacity-0 md:opacity-100 transition-opacity">Règle</span>
          <div className={`absolute bottom-0 left-3 right-3 md:left-3 md:right-auto md:w-8 h-[2px] transition-colors ${activeTool === 'ruler' ? 'bg-rose-600' : 'bg-transparent group-hover:bg-rose-600/50'}`} />
        </button>
      </div>

      <hr className="border-white/10 my-2" />

      {/* Outils Secondaires */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleToggleSnap}
          className="relative p-3 rounded text-slate-300 hover:text-white transition-colors group flex items-center w-full"
          title="Magnétisme (Placement Libre ou Case par Case)"
        >
          <div className="w-8 flex justify-center shrink-0">
            <Magnet className="w-6 h-6" />
          </div>
          <span className="ml-4 font-medium whitespace-nowrap opacity-0 md:opacity-100 transition-opacity">Magnétisme</span>
          <div className={`absolute bottom-0 left-3 right-3 md:left-3 md:right-auto md:w-8 h-[2px] transition-colors ${snapToGrid ? 'bg-rose-600' : 'bg-transparent group-hover:bg-rose-600/50'}`} />
        </button>

        <button
          onClick={handleToggleGrid}
          className="relative p-3 rounded text-slate-300 hover:text-white transition-colors group flex items-center w-full"
          title="Afficher/Masquer la grille"
        >
          <div className="w-8 flex justify-center shrink-0">
            <Grid3x3 className="w-6 h-6" />
          </div>
          <span className="ml-4 font-medium whitespace-nowrap opacity-0 md:opacity-100 transition-opacity">Afficher Grille</span>
          <div className={`absolute bottom-0 left-3 right-3 md:left-3 md:right-auto md:w-8 h-[2px] transition-colors ${showGrid ? 'bg-rose-600' : 'bg-transparent group-hover:bg-rose-600/50'}`} />
        </button>

        {isHost && (
          <button
            onClick={handleSetMap}
            className="relative p-3 rounded text-slate-300 hover:text-white transition-colors group flex items-center w-full"
            title="Définir l'image de fond (Map)"
          >
            <div className="w-8 flex justify-center shrink-0">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="ml-4 font-medium whitespace-nowrap opacity-0 md:opacity-100 transition-opacity">Changer la Carte</span>
            <div className="absolute bottom-0 left-3 right-3 md:left-3 md:right-auto md:w-8 h-[2px] transition-colors bg-transparent group-hover:bg-rose-600/50" />
          </button>
        )}
      </div>
    </div>
  );
}
