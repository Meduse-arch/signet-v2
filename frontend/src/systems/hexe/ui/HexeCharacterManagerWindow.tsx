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
    <div className="flex flex-col h-full bg-[#050508] text-white p-3 sm:p-4 gap-3 pointer-events-auto font-sans relative overflow-hidden">
      {/* En-tête / Recherche */}
      <div className="flex items-center gap-2 bg-[#090a10] border border-white/10 rounded-xl px-3 py-2 shadow-inner shrink-0">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un inquisiteur..."
          className="bg-transparent border-none outline-none flex-1 text-xs text-white placeholder-slate-500"
        />
      </div>

      {/* Filtres & Actions (MJ uniquement) */}
      {isTauri() && (
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={handleCreate}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un Inquisiteur</span>
          </button>
          
          <div className="flex bg-[#090a10] border border-white/10 rounded-lg p-1">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`flex-1 text-[11px] py-1 rounded font-bold transition-colors ${activeFilter === 'all' ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(225,29,72,0.3)]' : 'text-slate-400 hover:text-white'}`}
            >
              Tous
            </button>
            <button 
              onClick={() => setActiveFilter('players')}
              className={`flex-1 text-[11px] py-1 rounded font-bold transition-colors ${activeFilter === 'players' ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(225,29,72,0.3)]' : 'text-slate-400 hover:text-white'}`}
            >
              Joueurs
            </button>
            <button 
              onClick={() => setActiveFilter('npcs')}
              className={`flex-1 text-[11px] py-1 rounded font-bold transition-colors ${activeFilter === 'npcs' ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(225,29,72,0.3)]' : 'text-slate-400 hover:text-white'}`}
            >
              PNJ
            </button>
          </div>
        </div>
      )}

      {/* Liste des personnages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
        {loading ? (
          <div className="text-center text-slate-400 text-xs mt-10 animate-pulse font-bold">Chargement des inquisiteurs...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 text-xs mt-10 italic">
            {isTauri() ? "Aucun inquisiteur trouvé dans le grimoire." : "Le Maître de Jeu ne t'a confié aucun inquisiteur."}
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-[#090a10] border border-white/10 hover:border-white/20 rounded-xl transition-all shadow-sm gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {c.avatarUrl ? (
                  <img 
                    src={c.avatarUrl.startsWith('blob:') ? c.avatarUrl : (isTauri() ? `http://signet.localhost/library/${c.avatarUrl}` : (FileTransferService.getFileUrl(c.avatarUrl) || ''))} 
                    alt={c.name} 
                    className="w-10 h-10 rounded-xl object-cover border border-white/15 shrink-0"
                    onError={(e) => {
                      if (!isTauri() && !c.avatarUrl.startsWith('blob:') && !FileTransferService.hasFile(c.avatarUrl)) {
                        api.emit('NETWORK_OUTGOING', { type: 'REQUEST_FILE', payload: { hash: c.avatarUrl } });
                      }
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-xl border border-white/15 bg-black/40 flex items-center justify-center shrink-0 ${!c.owner_id ? 'text-rose-400' : 'text-purple-400'}`}>
                    {!c.owner_id ? <Skull className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-white truncate text-xs sm:text-sm">{c.name}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {c.owner_id ? `Lié à : ${c.owner_id}` : 'PNJ (Non lié)'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openSheet(c.id)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold transition-colors"
                >
                  Ouvrir
                </button>
                <button 
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
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors" 
                  title="Placer / Retirer sur la carte"
                >
                  <MapPin className="w-4 h-4" />
                </button>
                {isTauri() && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
