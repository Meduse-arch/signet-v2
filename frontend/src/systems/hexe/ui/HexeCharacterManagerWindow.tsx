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

export function HexeCharacterManagerWindow({ api, onOpenSheet }: CharacterManagerWindowProps) {
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
      console.log("[HexeManager] Demande de la liste des personnages au MJ...");
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: 'system-hexe',
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
      if (msg.type === 'MOD_EVENT' && msg._sourceMod === 'system-hexe') {
        if (msg.modEventType === 'SYNC_CHARACTERS') {
          // Un joueur reçoit la liste complète
          if (!isTauri()) {
            console.log("[HexeManager] Joueur: Réception de SYNC_CHARACTERS", msg.payload);
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
      name: 'Nouvel Inquisiteur',
      owner_id: null,
      stats: {
        str: { level: 1 },
        dex: { level: 1 },
        agi: { level: 1 },
        tec: { level: 1 },
        vit: { level: 1 },
        luc: { level: 1 }
      },
      resources: {
        hp: 11,
        mp: 11,
        stm: 11,
        chance: 1
      }
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
        console.log("[HexeManager] Personnage créé et diffusé");
        
        // Broadcast
        api.emit('NETWORK_OUTGOING', {
          type: 'MOD_EVENT',
          _sourceMod: 'system-hexe',
          modEventType: 'SYNC_CHARACTER',
          payload: newChar
        });
      } catch (err) {
        console.error("Erreur création personnage", err);
      }
    } else {
      api.emit('NETWORK_OUTGOING', {
        type: 'MOD_EVENT',
        _sourceMod: 'system-hexe',
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
          _sourceMod: 'system-hexe',
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
    <div className="flex flex-col h-full bg-[#eaddce] text-[#3e2723] p-4 gap-4 pointer-events-auto border-4 border-[#8b5a2b] rounded-lg shadow-[inset_0_0_50px_rgba(139,90,43,0.3)] font-serif relative">
      {/* Texture de vieux papier */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/old-wall.png')" }}></div>

      {/* En-tête / Recherche */}
      <div className="flex items-center gap-2 bg-[#f1e6d4] border-2 border-[#8b5a2b] rounded-lg p-2 shadow-inner relative z-10">
        <Search className="w-5 h-5 text-[#8b5a2b]" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="bg-transparent border-none outline-none flex-1 text-sm font-semibold text-[#3e2723] placeholder:text-[#8b5a2b]/60"
        />
      </div>

      {/* Filtres & Actions (MJ uniquement) */}
      {isTauri() && (
        <div className="flex flex-col gap-2 relative z-10">
          <Button variant="glass" onClick={handleCreate} className="w-full gap-2 border-[#8b5a2b] hover:bg-[#8b5a2b]/20 text-[#4e342e] font-bold">
            <Plus className="w-4 h-4" /> Créer un Inquisiteur
          </Button>
          
          <div className="flex bg-[#d5c3aa] border border-[#8b5a2b] rounded-lg p-1">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${activeFilter === 'all' ? 'bg-[#8b5a2b] text-[#f4e4bc] font-bold' : 'text-[#5c3a21] hover:text-[#3e2723]'}`}
            >
              Tous
            </button>
            <button 
              onClick={() => setActiveFilter('players')}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${activeFilter === 'players' ? 'bg-[#8b5a2b] text-[#f4e4bc] font-bold' : 'text-[#5c3a21] hover:text-[#3e2723]'}`}
            >
              Joueurs
            </button>
            <button 
              onClick={() => setActiveFilter('npcs')}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${activeFilter === 'npcs' ? 'bg-[#8b5a2b] text-[#f4e4bc] font-bold' : 'text-[#5c3a21] hover:text-[#3e2723]'}`}
            >
              PNJ
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2 relative z-10">
        {loading ? (
          <div className="text-center text-[#5c3a21] text-sm mt-10 animate-pulse font-bold">Incantation en cours...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#8b5a2b] text-sm mt-10 italic">
            {isTauri() ? "Aucun inquisiteur trouvé dans le grimoire." : "Le Maître de Jeu ne t'a confié aucun inquisiteur."}
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-[#f1e6d4] shadow-sm border border-[#8b5a2b]/50 rounded hover:border-[#8b5a2b] hover:bg-[#eaddce] transition-all">
              <div className="flex items-center gap-3">
                {c.avatarUrl ? (
                  <img 
                    src={c.avatarUrl.startsWith('blob:') ? c.avatarUrl : (isTauri() ? `http://signet.localhost/library/${c.avatarUrl}` : (FileTransferService.getFileUrl(c.avatarUrl) || ''))} 
                    alt={c.name} 
                    className="w-10 h-10 rounded-full object-cover border border-[#8b5a2b]"
                    onError={(e) => {
                      if (!isTauri() && !c.avatarUrl.startsWith('blob:') && !FileTransferService.hasFile(c.avatarUrl)) {
                        api.emit('NETWORK_OUTGOING', { type: 'REQUEST_FILE', payload: { hash: c.avatarUrl } });
                      }
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full border border-[#8b5a2b] bg-[#e0ccb4] flex items-center justify-center ${!c.owner_id ? 'text-[#8b5a2b]' : 'text-[#4e342e]'}`}>
                    {!c.owner_id ? <Skull className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-[#3e2723] truncate max-w-[120px] sm:max-w-[160px] text-lg">{c.name}</div>
                  <div className="text-xs text-[#8b5a2b] truncate italic">
                    {c.owner_id ? `Lié à : ${c.owner_id}` : 'PNJ'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" onClick={() => openSheet(c.id)} className="text-xs px-3 text-[#4e342e] hover:bg-[#d5c3aa]">
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
                      color: c.owner_id ? 'bg-[#3e2723] text-[#eaddce] border-[#8b5a2b]' : 'bg-[#7a1c1c] text-white border-[#4a0d0d]',
                      owner: c.owner_id,
                      avatarUrl: c.avatarUrl
                    });
                  }} 
                  className="text-[#8b5a2b] hover:text-[#4e342e] hover:bg-[#d5c3aa] px-2" 
                  title="Placer / Retirer sur la carte"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
                {isTauri() && (
                  <Button variant="ghost" onClick={() => handleDelete(c.id)} className="text-red-700 hover:text-red-900 hover:bg-red-200/50 px-2" title="Supprimer">
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
