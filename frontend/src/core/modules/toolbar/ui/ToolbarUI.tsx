import React, { useState, useRef, useEffect } from 'react';
import { Hand, MousePointer2, Grid3x3, ImageIcon, Magnet, Move, Ruler, Wrench, UploadCloud, Plus, Users, Eye, Play, Pencil, Trash2 } from 'lucide-react';
import { coreEventBus } from '../../../services/EventBus';
import { ModManager } from '../../../services/ModManager';

interface MapAsset {
  name: string;
  url: string;
  hash?: string;
}

const isTauri = () => '__TAURI_INTERNALS__' in window;


export function ToolbarUI() {
  const [activeTab, setActiveTab] = useState<'tools' | 'maps'>('tools');
  const [activeTool, setActiveTool] = useState<'pan' | 'select' | 'duo' | 'ruler'>('pan');
  const [showGrid, setShowGrid] = useState(false); // Fix: Par défaut à false
  const [snapToGrid, setSnapToGrid] = useState(true);
  const isHost = ModManager.getIsHost();

  // État des Cartes
  const [maps, setMaps] = useState<MapAsset[]>([]);
  const [playerLocations, setPlayerLocations] = useState<Record<string, string>>({});
  const [players, setPlayers] = useState<string[]>(ModManager.getPlayers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMapIndex, setEditingMapIndex] = useState<number | null>(null);
  const [newMapName, setNewMapName] = useState('');
  const [newMapSource, setNewMapSource] = useState<'url' | 'file'>('url');
  const [newMapUrl, setNewMapUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Détection du mode Slim (plié)
  const [isSlim, setIsSlim] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setIsSlim(entry.contentRect.width < 150);
      }
    });
    observer.observe(containerRef.current);
    
    const handlePlayersChanged = (newPlayers: string[]) => setPlayers(newPlayers);
    coreEventBus.on('PLAYERS_CHANGED', handlePlayersChanged);

    return () => {
      observer.disconnect();
      coreEventBus.off('PLAYERS_CHANGED', handlePlayersChanged);
    };
  }, []);

  // Chargement des cartes sauvegardées pour le MJ
  useEffect(() => {
    if (isHost && isTauri()) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('get_module_data', { moduleId: 'core-toolbar' })
          .then((data: any) => {
            const mapsEntry = data.find((d: any) => d[0] === 'maps');
            if (mapsEntry) {
              try {
                setMaps(JSON.parse(mapsEntry[1]));
              } catch (e) {
                console.error('[ToolbarUI] Erreur parse maps:', e);
              }
            }
            const locEntry = data.find((d: any) => d[0] === 'playerLocations');
            if (locEntry) {
              try {
                setPlayerLocations(JSON.parse(locEntry[1]));
              } catch (e) {
                console.error('[ToolbarUI] Erreur parse playerLocations:', e);
              }
            }
          })
          .catch(err => console.error('[ToolbarUI] Erreur chargement maps:', err));
      });
    }
  }, [isHost]);

  // Sauvegarde des cartes quand la liste change
  useEffect(() => {
    if (isHost && isTauri() && maps.length > 0) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('save_module_data', { 
          moduleId: 'core-toolbar', 
          key: 'maps', 
          data: JSON.stringify(maps) 
        }).catch(err => console.error('[ToolbarUI] Erreur sauvegarde maps:', err));
      });
    }
  }, [maps, isHost]);

  // Sauvegarde de playerLocations
  useEffect(() => {
    if (isHost && isTauri() && Object.keys(playerLocations).length > 0) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('save_module_data', { 
          moduleId: 'core-toolbar', 
          key: 'playerLocations', 
          data: JSON.stringify(playerLocations) 
        }).catch(err => console.error('[ToolbarUI] Erreur sauvegarde loc:', err));
      });
    }
  }, [playerLocations, isHost]);

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

  const handleGroupMap = (url: string) => {
    coreEventBus.emit('NETWORK_OUTGOING', { type: 'SET_MAP', payload: { url } });
    coreEventBus.emit('CANVAS_SET_MAP_LOCAL', url);
    // Assigner tous les joueurs à cette carte
    setPlayerLocations(prev => {
      const next = { ...prev };
      players.forEach(p => next[p] = url);
      return next;
    });
  };

  const handleSoloMap = (url: string) => {
    coreEventBus.emit('CANVAS_SET_MAP_LOCAL', url);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Seules les images sont supportées !");
      return;
    }

    setIsUploading(true);
    // On importe SignetAPI dynamiquement pour éviter la dépendance circulaire
    const apiModule = await import('../../../services/SignetAPI');
    // Simulation: Normalement on aurait l'instance api via le ModManager. 
    // Pour l'upload, on peut recréer l'accès direct au backend
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const buffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      const extension = file.name.split('.').pop() || 'png';
      
      const hash = await invoke<string>('upload_asset', { data, extension });
      const finalName = newMapName.trim() || file.name;
      const url = window.__TAURI_INTERNALS__ ? `http://signet.localhost/library/${hash}` : hash;
      
      setMaps((prev) => [...prev, { name: finalName, url, hash }]);
      setShowAddForm(false);
      setNewMapName('');
    } catch (e) {
      console.error(e);
      alert("Erreur upload");
    } finally {
      setIsUploading(false);
    }
  };

  const submitAddForm = () => {
    if (newMapSource === 'url') {
      if (!newMapUrl) return;
      
      if (editingMapIndex !== null) {
        // Mode édition
        setMaps(prev => prev.map((m, i) => i === editingMapIndex ? { ...m, name: newMapName.trim() || m.name, url: newMapUrl } : m));
      } else {
        // Mode ajout
        setMaps((prev) => [...prev, { name: newMapName.trim() || 'Nouvelle Carte', url: newMapUrl }]);
      }
      setShowAddForm(false);
      setEditingMapIndex(null);
      setNewMapName('');
      setNewMapUrl('');
    }
  };

  const handleEditMap = (index: number) => {
    const map = maps[index];
    if (map.hash) {
      alert("L'édition d'URL n'est pas supportée pour les fichiers locaux uploadés.");
      return;
    }
    setNewMapName(map.name);
    setNewMapUrl(map.url);
    setNewMapSource('url');
    setEditingMapIndex(index);
    setShowAddForm(true);
  };

  const handleDeleteMap = (index: number) => {
    if (confirm("Supprimer cette carte de la bibliothèque ?")) {
      setMaps(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-zinc-950 pointer-events-auto">
      
      {/* Sélecteur d'Onglets : caché en mode slim */}
      {!isSlim && (
        <div className="flex border-b border-zinc-800 shrink-0">
          <button 
            onClick={() => setActiveTab('tools')}
            className={`flex-1 flex items-center justify-center p-3 transition-colors ${activeTab === 'tools' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-zinc-400 hover:text-white'}`}
            title="Outils de jeu"
          >
            <Wrench className="w-5 h-5" />
          </button>
          {isHost && (
            <button 
              onClick={() => setActiveTab('maps')}
              className={`flex-1 flex items-center justify-center p-3 transition-colors ${activeTab === 'maps' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-zinc-400 hover:text-white'}`}
              title="Bibliothèque de Cartes"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {(activeTab === 'tools' || isSlim) ? (
          <div className="flex flex-col gap-2">
            <button onClick={() => handleToolChange('pan')} title="Déplacer la caméra" className={`p-3 rounded flex items-center ${isSlim ? 'justify-center' : 'w-full'} transition-colors ${activeTool === 'pan' ? 'bg-rose-950 text-rose-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <Hand className="w-5 h-5 shrink-0" />
              {!isSlim && <span className="ml-3 font-medium whitespace-nowrap">Déplacer la caméra</span>}
            </button>
            <button onClick={() => handleToolChange('select')} title="Sélectionner" className={`p-3 rounded flex items-center ${isSlim ? 'justify-center' : 'w-full'} transition-colors ${activeTool === 'select' ? 'bg-rose-950 text-rose-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <MousePointer2 className="w-5 h-5 shrink-0" />
              {!isSlim && <span className="ml-3 font-medium whitespace-nowrap">Sélectionner</span>}
            </button>
            <button onClick={() => handleToolChange('duo')} title="Ambidextre" className={`p-3 rounded flex items-center ${isSlim ? 'justify-center' : 'w-full'} transition-colors ${activeTool === 'duo' ? 'bg-rose-950 text-rose-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <Move className="w-5 h-5 shrink-0" />
              {!isSlim && <span className="ml-3 font-medium whitespace-nowrap">Ambidextre</span>}
            </button>
            <button onClick={() => handleToolChange('ruler')} title="Règle" className={`p-3 rounded flex items-center ${isSlim ? 'justify-center' : 'w-full'} transition-colors ${activeTool === 'ruler' ? 'bg-rose-950 text-rose-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <Ruler className="w-5 h-5 shrink-0" />
              {!isSlim && <span className="ml-3 font-medium whitespace-nowrap">Règle</span>}
            </button>

            <hr className="border-white/10 w-full my-2" />

            <button onClick={handleToggleSnap} title="Magnétisme" className={`p-3 rounded flex items-center ${isSlim ? 'justify-center' : 'w-full'} transition-colors ${snapToGrid ? 'bg-rose-950 text-rose-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <Magnet className="w-5 h-5 shrink-0" />
              {!isSlim && <span className="ml-3 font-medium whitespace-nowrap">Magnétisme</span>}
            </button>
            <button onClick={handleToggleGrid} title="Afficher Grille" className={`p-3 rounded flex items-center ${isSlim ? 'justify-center' : 'w-full'} transition-colors ${showGrid ? 'bg-rose-950 text-rose-300' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <Grid3x3 className="w-5 h-5 shrink-0" />
              {!isSlim && <span className="ml-3 font-medium whitespace-nowrap">Afficher Grille</span>}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 min-w-[250px]">
            {/* Formulaire d'ajout de carte */}
            {showAddForm ? (
              <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg flex flex-col gap-3 mb-2">
                <input 
                  type="text" 
                  placeholder="Nom de la carte (ex: Taverne)" 
                  value={newMapName}
                  onChange={e => setNewMapName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white"
                />
                
                <div className="flex rounded overflow-hidden border border-zinc-700">
                  <button onClick={() => setNewMapSource('url')} className={`flex-1 py-1 text-xs font-medium ${newMapSource === 'url' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>URL Web</button>
                  <button onClick={() => setNewMapSource('file')} className={`flex-1 py-1 text-xs font-medium ${newMapSource === 'file' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>Fichier Local</button>
                </div>

                {newMapSource === 'url' ? (
                  <>
                    <input 
                      type="text" 
                      placeholder="https://..." 
                      value={newMapUrl}
                      onChange={e => setNewMapUrl(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white"
                    />
                    <button onClick={submitAddForm} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded text-sm transition-colors">
                      Valider
                    </button>
                  </>
                ) : (
                  <div 
                    className="border-2 border-dashed border-zinc-600 rounded p-4 flex flex-col items-center justify-center cursor-pointer hover:border-rose-400 transition-colors bg-zinc-950"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { if(e.target.files) handleFileUpload(e.target.files[0]) }} />
                    {isUploading ? (
                      <span className="text-xs text-rose-400 font-medium animate-pulse">Hachage Rust...</span>
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 text-zinc-400 mb-1" />
                        <span className="text-xs text-zinc-400 font-medium">Glissez ou Cliquez</span>
                      </>
                    )}
                  </div>
                )}
                
                <button onClick={() => { setShowAddForm(false); setEditingMapIndex(null); }} className="text-xs text-zinc-500 hover:text-white uppercase font-semibold">Annuler</button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setNewMapName('');
                  setNewMapUrl('');
                  setEditingMapIndex(null);
                  setShowAddForm(true);
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center gap-2 py-2 rounded transition-colors mb-2"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium text-sm">Nouvelle Carte</span>
              </button>
            )}

            {/* Ruban des joueurs non assignés (Drag & Drop) */}
            {isHost && players.filter(p => !playerLocations[p]).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col gap-2 mb-2 shadow-[0_0_15px_rgba(225,29,72,0.1)]">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <Users className="w-3 h-3" />
                  Nouveaux Joueurs
                </div>
                <div className="flex flex-wrap gap-2">
                  {players.filter(p => !playerLocations[p]).map((p) => (
                    <div 
                      key={p}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', p);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      className="bg-zinc-800 border border-zinc-700 hover:border-rose-400 hover:bg-zinc-700 text-white text-xs px-2 py-1 rounded cursor-grab active:cursor-grabbing transition-colors"
                      title="Glisser vers une carte"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liste des cartes */}
            <div className="flex flex-col gap-2">
              {maps.length === 0 && !showAddForm ? (
                <div className="text-center text-zinc-600 text-xs italic py-4">Aucune carte dans la session.</div>
              ) : (
                maps.map((map, i) => (
                  <div 
                    key={i}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const player = e.dataTransfer.getData('text/plain');
                      if (player) {
                        coreEventBus.emit('NETWORK_OUTGOING', { 
                          type: 'MOVE_PLAYER_MAP', 
                          payload: { username: player, url: map.url } 
                        });
                        setPlayerLocations(prev => ({ ...prev, [player]: map.url }));
                      }
                    }}
                    className="relative group h-24 rounded-lg overflow-hidden border border-zinc-700 hover:border-rose-500 transition-colors"
                  >
                    <img src={map.url} className="w-full h-full object-cover pointer-events-none" alt={map.name} />
                    
                    {/* Affichage des joueurs sur cette carte */}
                    <div className="absolute top-1 left-1 right-1 flex flex-wrap gap-1 z-10">
                      {players.filter(p => playerLocations[p] === map.url).map(p => (
                        <div 
                          key={p} 
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', p);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className="bg-zinc-900/90 text-white text-[10px] px-1.5 py-0.5 rounded border border-zinc-500 cursor-grab active:cursor-grabbing shadow-sm"
                          title="Déplacer vers une autre carte"
                        >
                          {p}
                        </div>
                      ))}
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-between p-2 pointer-events-none">
                      <div className="flex justify-end"></div>
                      <span className="text-white font-medium text-sm truncate drop-shadow-md mt-auto">{map.name}</span>
                    </div>

                    {/* Boutons d'édition (Haut Droite) */}
                    <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {!map.hash && (
                        <button onClick={(e) => { e.stopPropagation(); handleEditMap(i); }} className="bg-zinc-800 hover:bg-zinc-700 text-white p-1.5 rounded" title="Modifier l'URL">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteMap(i); }} className="bg-red-900/80 hover:bg-red-600 text-white p-1.5 rounded" title="Supprimer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Boutons d'action visibles au survol (Bas) */}
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 px-2 z-20">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSoloMap(map.url); }}
                        className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold py-1 rounded flex items-center justify-center gap-1 transition-colors"
                        title="Y aller seul"
                      >
                        <Play className="w-3 h-3" /> Go
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleGroupMap(map.url); }}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-1 rounded flex items-center justify-center gap-1 transition-colors shadow-[0_0_10px_rgba(225,29,72,0.5)]"
                        title="Amener tout le monde"
                      >
                        <Eye className="w-3 h-3" /> Tous
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
