import React, { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';
import { Search, UserPlus, BookUser, User, Skull, Trash2, MapPin, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { invoke } from '@tauri-apps/api/core';
import { FileTransferService } from '../../../core/services/FileTransferService';

// Détection de l'Hôte (Tauri)
const isTauri = () => '__TAURI_INTERNALS__' in window;

interface CharacterManagerWindowProps {
  api: SignetAPI;
  onOpenSheet: (id: string) => void;
}

export function CharacterManagerWindow({ api, onOpenSheet }: CharacterManagerWindowProps) {
  const [characters, setCharacters] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'players' | 'npcs'>('all');

  const fetchCharacters = async () => {
    setLoading(true);
    if (isTauri()) {
      // Hôte : lire directement depuis SQLite
      try {
        const records: any[] = await invoke('get_characters');
        const parsed = records.map(r => JSON.parse(r.data));
        setCharacters(parsed);
      } catch (err) {
        console.error("Erreur lecture DB", err);
      }
    } else {
      // Joueur : Demander à l'Hôte via P2P
      console.log("[CharacterManagerWindow] Demande de la liste des personnages au MJ...");
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: 'system-flower',
        modEventType: 'REQUEST_CHARACTERS',
        payload: {}
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  useEffect(() => {
    // Écoute des messages réseau
    const handleNetwork = async (msg: any) => {
      if (msg.type === 'MOD_EVENT' && msg._sourceMod === 'system-flower') {
        if (msg.modEventType === 'SYNC_CHARACTERS') {
          // Un joueur reçoit la liste complète
          if (!isTauri()) {
            console.log("[CharacterManagerWindow] Joueur: Réception de SYNC_CHARACTERS", msg.payload);
            setCharacters(msg.payload);
            setLoading(false);
          }
        } else if (msg.modEventType === 'SYNC_CHARACTER') {
          const char = msg.payload;
          if (isTauri()) {
            // Un joueur a sauvegardé sa fiche
            try {
              await invoke('save_character', {
                id: char.id,
                name: char.name,
                ownerId: char.owner_id || null,
                data: JSON.stringify(char)
              });
              fetchCharacters(); // Mettre à jour l'UI de l'Hôte
            } catch(err) {
              console.error("Erreur save_character distant", err);
            }
          } else {
            setCharacters(prev => {
              const index = prev.findIndex(c => c.id === char.id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = char;
                return updated;
              }
              return [...prev, char];
            });
          }
        } else if (msg.modEventType === 'DELETE_CHARACTER') {
          const { id } = msg.payload;
          if (isTauri()) {
            try {
              await invoke('delete_character', { id });
              fetchCharacters(); // Mettre à jour l'UI de l'Hôte
            } catch(err) {
              console.error("Erreur delete_character distant", err);
            }
          } else {
            setCharacters(prev => prev.filter(c => c.id !== id));
          }
        }
      }
    };
    
    api.on('NETWORK_INCOMING', handleNetwork);
    return () => {
      api.off('NETWORK_INCOMING', handleNetwork);
    };
  }, [api]);

  const handleCreate = async () => {
    const id = `char_${Date.now()}`;
    const newChar = {
      id,
      name: 'Nouvelle Entité',
      owner_id: null
    };

    if (isTauri()) {
      try {
        await invoke('save_character', {
          id,
          name: newChar.name,
          ownerId: newChar.owner_id,
          data: JSON.stringify(newChar)
        });
        fetchCharacters();
        console.log("[CharacterManagerWindow] Personnage créé et diffusé");
        
        // Broadcast
        api.emit('NETWORK_OUTGOING', {
          type: 'MOD_EVENT',
          _sourceMod: 'system-flower',
          modEventType: 'SYNC_CHARACTER',
          payload: newChar
        });
      } catch (err) {
        console.error("Erreur création personnage", err);
      }
    } else {
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: 'system-flower',
        modEventType: 'SYNC_CHARACTER',
        payload: newChar
      });
    }
  };

  const handleDelete = async (charId: string) => {
    if (window.confirm("Es-tu sûr de vouloir supprimer définitivement ce personnage ?")) {
      if (isTauri()) {
        try {
          await invoke('delete_character', { id: charId });
          fetchCharacters();
        } catch (err) {
          console.error("Erreur lors de la suppression", err);
        }
      } else {
        api.emit('NETWORK_OUTGOING', {
          type: 'MOD_EVENT',
          _sourceMod: 'system-flower',
          modEventType: 'DELETE_CHARACTER',
          payload: { id: charId }
        });
      }
    }
  };

  const openSheet = (charId: string) => {
    onOpenSheet(charId);
  };

  // Filtrage selon le rôle et la recherche
  const visibleCharacters = characters.filter(c => {
    // Si c'est l'Hôte (MJ), on applique le filtre d'onglet
    if (isTauri()) {
      if (activeFilter === 'players' && !c.owner_id) return false;
      if (activeFilter === 'npcs' && c.owner_id) return false;
      return true;
    }
    // Si c'est un joueur, il ne voit que ses propres personnages
    return c.owner_id === api.user.getName();
  });

  const filtered = visibleCharacters.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-white p-4 gap-4 pointer-events-auto border border-white/10 rounded-xl backdrop-blur-md">
      
      {/* En-tête / Recherche */}
      <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg p-2">
        <Search className="w-5 h-5 text-zinc-500" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un personnage..."
          className="bg-transparent border-none outline-none flex-1 text-sm"
        />
      </div>

      {/* Filtres & Actions (MJ uniquement) */}
      {isTauri() && (
        <div className="flex flex-col gap-2">
          <Button variant="glass" onClick={handleCreate} className="w-full gap-2 border-rose-500/30 hover:bg-rose-500/20 text-rose-300">
            <Plus className="w-4 h-4" /> Créer une Entité
          </Button>
          
          <div className="flex bg-black/40 rounded-lg p-1">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${activeFilter === 'all' ? 'bg-white/10 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Tous
            </button>
            <button 
              onClick={() => setActiveFilter('players')}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${activeFilter === 'players' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Joueurs
            </button>
            <button 
              onClick={() => setActiveFilter('npcs')}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${activeFilter === 'npcs' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              PNJ
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
        {loading ? (
          <div className="text-center text-zinc-500 text-sm mt-10 animate-pulse">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm mt-10">
            {isTauri() ? "Aucun personnage trouvé." : "Tu ne possèdes aucun personnage. Le MJ doit t'en assigner un."}
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-black/40 backdrop-blur-sm border border-white/5 rounded-lg hover:border-rose-500/30 hover:bg-white/5 transition-all">
              <div className="flex items-center gap-3">
                {c.avatarUrl ? (
                  <img 
                    src={c.avatarUrl.startsWith('blob:') ? c.avatarUrl : (isTauri() ? `http://signet.localhost/library/${c.avatarUrl}` : (FileTransferService.getFileUrl(c.avatarUrl) || ''))} 
                    alt={c.name} 
                    className="w-8 h-8 rounded object-cover bg-zinc-800"
                    onError={(e) => {
                      // Si l'image n'est pas encore téléchargée côté joueur, demander le téléchargement
                      if (!isTauri() && !c.avatarUrl.startsWith('blob:') && !FileTransferService.hasFile(c.avatarUrl)) {
                        api.emit('NETWORK_OUTGOING', { type: 'REQUEST_FILE', payload: { hash: c.avatarUrl } });
                      }
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`w-8 h-8 rounded bg-zinc-800/80 flex items-center justify-center ${!c.owner_id ? 'text-rose-400' : 'text-slate-300'}`}>
                    {!c.owner_id ? <Skull className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-zinc-200 truncate max-w-[120px] sm:max-w-[160px]">{c.name}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    {c.owner_id ? `Lié à: ${c.owner_id}` : 'PNJ (Non lié)'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" onClick={() => openSheet(c.id)} className="text-xs px-3">
                  Ouvrir
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    api.emit('CANVAS_TOGGLE_TOKEN', {
                      id: c.id,
                      name: c.name.substring(0, 2).toUpperCase(),
                      x: 5,
                      y: 5,
                      color: c.owner_id ? 'bg-indigo-900 text-indigo-200 border-indigo-500' : 'bg-rose-950 text-rose-200 border-rose-800',
                      owner: c.owner_id,
                      avatarUrl: c.avatarUrl
                    });
                  }} 
                  className="text-pink-400 hover:text-pink-300 hover:bg-pink-950/30 px-2" 
                  title="Placer / Retirer sur la carte"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
                {isTauri() && (
                  <Button variant="ghost" onClick={() => handleDelete(c.id)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-2" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
