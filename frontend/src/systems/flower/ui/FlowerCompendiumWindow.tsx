import React, { useState, useEffect } from 'react';
import { SignetAPI } from '../../../core/services/SignetAPI';
import { Book, Plus, Trash2, Library, Swords, Backpack } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

// Dynamically import invoke since we might not be in Tauri
let invoke: any = null;
if (window.__TAURI_INTERNALS__) {
  import('@tauri-apps/api/core').then(m => invoke = m.invoke).catch(e => console.error(e));
}

import type { FlowerSkill, FlowerItem } from '../types';

const COMPENDIUM_MODULE_ID = 'system-flower-compendium';

const isTauri = () => '__TAURI_INTERNALS__' in window;

interface CompendiumEntry {
  id: string;
  type: 'skill' | 'item';
  data: FlowerSkill | FlowerItem;
}

export function FlowerCompendiumWindow({ api }: { api: SignetAPI }) {
  const [entries, setEntries] = useState<CompendiumEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'skill' | 'item'>('skill');
  const BASE_STATS = ['PV Max', 'PV Actuel', 'Force', 'Résistance', 'Résistance Magique', 'Dextérité', 'Puissance Magique'];
  const [allStats, setAllStats] = useState<string[]>(BASE_STATS);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FlowerSkill & FlowerItem>>({});

  useEffect(() => {
    // Chargement initial (léger délai pour laisser invoke se charger dynamiquement)
    setTimeout(() => {
      loadCompendium();
    }, 100);

    // Écoute en temps réel des synchronisations de personnages pour mettre à jour
    // la liste des stats disponibles dans les modificateurs (cible + scaling)
    const onSync = (msg: any) => {
      if (msg.modEventType === 'SYNC_CHARACTER' && msg.payload?.stats) {
        const newCustom = new Set<string>();
        Object.values(msg.payload.stats).forEach((s: any) => {
          if (s.isCustom && s.name) newCustom.add(s.name);
        });
        // Mise à jour seulement si de nouvelles stats sont détectées (évite les re-renders inutiles)
        setAllStats(prev => {
          const added = [...newCustom].filter(s => !prev.includes(s));
          if (added.length === 0) return prev;
          console.log('[Compendium] Nouvelles stats détectées:', added);
          return [...prev, ...added];
        });
      }
    };

    api.events.on('NETWORK_INCOMING', onSync);
    api.events.on('NETWORK_OUTGOING', onSync); // Pour le MJ qui sauvegarde lui-même

    return () => {
      api.events.off('NETWORK_INCOMING', onSync);
      api.events.off('NETWORK_OUTGOING', onSync);
    };
  }, []);

  const loadCompendium = async () => {
    if (!isTauri() || !invoke) return;
    try {
      const rawData = await invoke('get_module_data', { moduleId: COMPENDIUM_MODULE_ID }) as [string, string][];
      const parsed: CompendiumEntry[] = rawData.map(([key, data]) => {
        const json = JSON.parse(data);
        return {
          id: key,
          type: json.type,
          data: json
        };
      });
      setEntries(parsed);

      // Charger les stats personnalisées de tous les personnages
      const charRecords = await invoke('get_characters') as any[];
      const customStats = new Set<string>();
      for (const record of charRecords) {
        try {
          const char = JSON.parse(record.data);
          if (char.stats) {
            Object.values(char.stats).forEach((s: any) => {
              if (s.isCustom && s.name) customStats.add(s.name);
            });
          }
        } catch (e) {}
      }
      setAllStats([
        ...BASE_STATS,
        ...Array.from(customStats)
      ]);
    } catch (e) {
      console.error('[Compendium] Erreur chargement:', e);
    }
  };

  const syncCharacters = async (entry: CompendiumEntry) => {
    if (!isTauri() || !invoke) return;
    try {
      const records = await invoke('get_characters') as any[];
      for (const record of records) {
        const char = JSON.parse(record.data);
        let charChanged = false;
        
        if (entry.type === 'skill' && char.skills) {
          for (const s of char.skills) {
            if (s.compendiumId === entry.id) {
              s.name = entry.data.name;
              s.description = entry.data.description;
              s.skillType = (entry.data as any).skillType;
              s.modifiers = (entry.data as any).modifiers;
              charChanged = true;
            }
          }
        } else if (entry.type === 'item' && char.inventory) {
          for (const i of char.inventory) {
            if (i.compendiumId === entry.id) {
              i.name = entry.data.name;
              i.description = entry.data.description;
              i.modifiers = (entry.data as any).modifiers;
              charChanged = true;
            }
          }
        }
        
        if (charChanged) {
          await invoke('save_character', {
            id: char.id,
            name: char.name,
            ownerId: char.owner_id || null,
            data: JSON.stringify(char)
          });
          
          const syncMsg = {
            type: 'MOD_EVENT',
            _sourceMod: 'system-flower',
            modEventType: 'SYNC_CHARACTER',
            payload: char
          };
          
          api.emit('NETWORK_OUTGOING', syncMsg);
          // Loopback local pour que les fenêtres ouvertes du MJ se mettent à jour
          api.emit('NETWORK_INCOMING', syncMsg);
        }
      }
    } catch (e) {
      console.error('[Compendium] Erreur sync:', e);
    }
  };

  const saveEntry = async (entry: CompendiumEntry) => {
    if (!isTauri() || !invoke) return;
    try {
      await invoke('save_module_data', {
        moduleId: COMPENDIUM_MODULE_ID,
        key: entry.id,
        data: JSON.stringify({ ...entry.data, type: entry.type })
      });
      await syncCharacters(entry);
      loadCompendium();
    } catch (e) {
      console.error('[Compendium] Erreur sauvegarde:', e);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!isTauri() || !invoke) return;
    if (!confirm('Supprimer définitivement cet élément du Compendium ?')) return;
    try {
      await invoke('delete_module_data', { moduleId: COMPENDIUM_MODULE_ID, key: id });
      loadCompendium();
    } catch (e) {
      console.error('[Compendium] Erreur suppression:', e);
    }
  };

  const handleAddNew = () => {
    const newId = `comp_${Date.now()}`;
    setEditingId(newId);
    if (activeTab === 'skill') {
      setEditForm({ id: newId, name: 'Nouvelle Compétence', description: '' });
    } else {
      setEditForm({ id: newId, name: 'Nouvel Objet', description: '' });
    }
  };

  const handleSaveForm = () => {
    if (!editingId || !editForm.name) return;
    const newEntry: CompendiumEntry = {
      id: editingId,
      type: activeTab,
      data: editForm as any
    };
    saveEntry(newEntry);
    setEditingId(null);
    setEditForm({});
  };

  const filteredEntries = entries.filter(e => e.type === activeTab);

  if (!isTauri()) {
    return <div className="p-4 text-center text-zinc-400">Le compendium est réservé au MJ (Application Bureau).</div>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/80 text-white overflow-hidden backdrop-blur-xl border border-white/10 shadow-2xl">
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-black/40">
        <Library className="w-6 h-6 text-rose-400" />
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">
            Compendium Flower
          </h2>
          <p className="text-xs text-slate-400">Gérez les compétences et objets du système</p>
        </div>
      </div>

      <div className="flex border-b border-white/10 bg-black/20">
        <button
          onClick={() => { setActiveTab('skill'); setEditingId(null); }}
          className={`flex-1 py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'skill' ? 'border-rose-500 text-rose-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          <Swords className="w-4 h-4" /> Compétences
        </button>
        <button
          onClick={() => { setActiveTab('item'); setEditingId(null); }}
          className={`flex-1 py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'item' ? 'border-rose-500 text-rose-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          <Backpack className="w-4 h-4" /> Objets
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {editingId ? (
          <div className="bg-white/5 border border-white/10 p-4 rounded-lg space-y-4">
            <h3 className="font-bold text-rose-300 mb-2">Édition</h3>
            
            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Nom</label>
              <input 
                type="text" 
                value={editForm.name || ''} 
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
              />
            </div>

            {activeTab === 'skill' && (
              <div>
                <label className="block text-xs uppercase text-zinc-500 mb-1">Type de Compétence</label>
                <select 
                  value={editForm.skillType || 'active'}
                  onChange={(e) => setEditForm({ ...editForm, skillType: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 text-white"
                >
                  <option value="active">Active (Classique)</option>
                  <option value="toggle">Activable (Toggle)</option>
                  <option value="passive">Passive (Innée)</option>
                </select>
              </div>
            )}

            {activeTab === 'item' && (
              <div>
                <label className="block text-xs uppercase text-zinc-500 mb-1">Catégorie d'Objet</label>
                <select 
                  value={editForm.itemType || 'neutral'}
                  onChange={(e) => setEditForm({ ...editForm, itemType: e.target.value as any })}
                  className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm focus:outline-none focus:border-rose-500 text-white"
                >
                  <option value="neutral">⚪ Neutre (Standard)</option>
                  <option value="equippable">🛡️ Équipable</option>
                  <option value="consumable">🧪 Consommable</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Modificateurs (optionnel)</label>
              <div className="space-y-2">
                {(editForm.modifiers || []).map((mod: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center flex-wrap">
                    <input
                      list="mod-targets"
                      value={mod.target}
                      placeholder="Cible (ex: force, pv)"
                      onChange={(e) => {
                        const newMods = [...(editForm.modifiers || [])];
                        newMods[idx].target = e.target.value;
                        setEditForm({ ...editForm, modifiers: newMods });
                      }}
                      className="bg-black/50 border border-white/10 rounded p-2 text-sm focus:outline-none flex-1 min-w-[120px]"
                    />
                    <datalist id="mod-targets">
                      {allStats.map(s => <option key={s} value={s} />)}
                    </datalist>
                    <input 
                      type="text" 
                      value={mod.value}
                      placeholder="+3 ou 1d20"
                      onChange={(e) => {
                        const newMods = [...(editForm.modifiers || [])];
                        newMods[idx].value = e.target.value;
                        setEditForm({ ...editForm, modifiers: newMods });
                      }}
                      className="w-20 bg-black/50 border border-white/10 rounded p-2 text-sm focus:outline-none"
                    />
                    <input
                      list={`scale-targets-${idx}`}
                      value={mod.scaleStat || ''}
                      placeholder="-- Sans Scaling --"
                      onChange={(e) => {
                        const newMods = [...(editForm.modifiers || [])];
                        newMods[idx].scaleStat = e.target.value === '' ? undefined : e.target.value;
                        setEditForm({ ...editForm, modifiers: newMods });
                      }}
                      className="bg-black/50 border border-white/10 rounded p-2 text-sm focus:outline-none flex-1 min-w-[120px] text-zinc-300"
                    />
                    <datalist id={`scale-targets-${idx}`}>
                      <option value="">-- Sans Scaling --</option>
                      {activeTab === 'skill' && <option value="niveau">Maîtrise</option>}
                      {activeTab === 'item' && <option value="niveau">Maîtrise</option>}
                      {activeTab === 'item' && <option value="quantite">Quantité</option>}
                      {allStats.map(s => <option key={`scale-${s}`} value={s} />)}
                    </datalist>
                    <Button variant="ghost" size="sm" className="px-2" onClick={() => {
                      const newMods = (editForm.modifiers || []).filter((_, i: number) => i !== idx);
                      setEditForm({ ...editForm, modifiers: newMods });
                    }}><Trash2 className="w-4 h-4 text-rose-400 hover:text-rose-300" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  const newMods = [...(editForm.modifiers || []), { target: '', value: '1' }];
                  setEditForm({ ...editForm, modifiers: newMods });
                }} className="w-full justify-center text-xs text-zinc-400 border-white/10 mt-2">
                  <Plus className="w-3 h-3 mr-1" /> Ajouter un Modificateur
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase text-zinc-500 mb-1">Description</label>
              <textarea 
                value={editForm.description || ''} 
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm h-24 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
              />
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <Button variant="ghost" onClick={() => setEditingId(null)}>Annuler</Button>
              <Button onClick={handleSaveForm}>Sauvegarder</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Button className="w-full mb-4 gap-2" variant="outline" onClick={handleAddNew}>
              <Plus className="w-4 h-4" /> 
              {activeTab === 'skill' ? 'Nouvelle Compétence' : 'Nouvel Objet'}
            </Button>
            
            {filteredEntries.length === 0 ? (
              <p className="text-center text-zinc-500 italic mt-8">Aucun élément dans cette catégorie.</p>
            ) : (
              filteredEntries.map(entry => (
                <div key={entry.id} className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center justify-between group hover:bg-white/10 transition-colors">
                  <div>
                    <h4 className="font-bold text-zinc-200">{entry.data.name}</h4>
                    <p className="text-xs text-zinc-400 line-clamp-1">{entry.data.description}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingId(entry.id);
                      setEditForm(entry.data as any);
                    }}>
                      Modifier
                    </Button>
                    <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300" onClick={() => deleteEntry(entry.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
