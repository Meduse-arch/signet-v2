import { lazy, Suspense, useRef } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import { Flower2, Plus, Minus, Skull, ArrowLeft, Upload } from 'lucide-react';
import { ModManager } from '../../../core/services/ModManager';
import { useFlowerCharacter, isTauri } from '../hooks/useFlowerCharacter';
import { StatsTab } from './sheet/StatsTab';
import { SkillsTab } from './sheet/SkillsTab';
import { InventoryTab } from './sheet/InventoryTab';
const CompendiumModal = lazy(() => import('./sheet/CompendiumModal').then(m => ({ default: m.CompendiumModal })));

interface CharacterSheetWindowProps {
  api: SignetAPI;
  characterId: string;
  onBack: () => void;
}

export function CharacterSheetWindow({ api, characterId, onBack }: CharacterSheetWindowProps) {
  const sheet = useFlowerCharacter(api, characterId);
  const {
    character, isSaving, activeTab, setActiveTab, knownPlayers, isHost, updateCharacter, maxHp, compendiumModalOpen, compendiumModalType, compendiumEntries, setCompendiumModalOpen, importCompendiumEntry
  } = sheet;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col h-full bg-[#050508] text-white p-4 sm:p-6 gap-4 sm:gap-6 pointer-events-auto overflow-y-auto custom-scrollbar border border-rose-900/30 rounded-xl relative shadow-[inset_0_0_50px_rgba(225,29,72,0.04)]">
      
      {/* Boutons Haut Droite */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end max-w-[60%]">
        <button 
          onClick={() => {
            api.emit('CANVAS_TOGGLE_TOKEN', {
              id: character.id,
              name: character.name.substring(0, 2).toUpperCase(),
              x: 5,
              y: 5,
              color: character.owner_id ? 'bg-indigo-900 text-indigo-200 border-indigo-500' : 'bg-rose-950 text-rose-200 border-rose-800',
              owner: character.owner_id,
              avatarUrl: character.avatarUrl
            });
          }}
          className="bg-rose-900/40 text-rose-300 hover:bg-rose-800/60 hover:text-white px-3 py-1.5 rounded-lg border border-rose-500/30 flex items-center gap-2 text-xs transition-colors shadow-lg whitespace-nowrap"
          title="Faire apparaître / retirer le pion sur la carte"
        >
          <Flower2 className="w-3 h-3 shrink-0" /> Placer/Retirer Pion
        </button>
        <button 
          onClick={onBack}
          className="bg-black/50 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 hover:border-rose-500/30 flex items-center gap-2 text-xs transition-colors shadow-lg whitespace-nowrap"
        >
          <ArrowLeft className="w-3 h-3" /> Retour
        </button>
      </div>

      {/* En-tête du personnage */}
      <div className="flex items-center gap-3 sm:gap-4 border-b border-rose-500/20 pb-4 pr-4">
        <div 
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-rose-950/50 border border-rose-500/20 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group"
          onClick={() => fileInputRef.current?.click()}
          title="Modifier l'avatar"
        >
          {character.avatarUrl ? (
            <img src={api.library.getAssetUrl(character.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Flower2 className="w-8 h-8 text-pink-400 opacity-50" />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Upload className="w-4 h-4 text-white" />
          </div>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={async (e) => {
              if (e.target.files && e.target.files[0]) {
                const hash = await api.library.uploadAsset(e.target.files[0]);
                if (hash) {
                  updateCharacter(prev => ({ ...prev, avatarUrl: hash }));
                }
              }
            }} 
          />
        </div>
        <div className="flex-1">
          <input 
            type="text" 
            value={character.name} 
            onChange={(e) => updateCharacter(prev => ({ ...prev, name: e.target.value }))}
            onBlur={(e) => updateCharacter(prev => ({ ...prev, name: e.target.value }))}
            className="bg-transparent text-2xl font-black text-white focus:outline-none focus:border-b border-rose-500 w-full"
            placeholder="Nom du personnage"
          />
          <div className="text-rose-400/60 text-xs mt-1 uppercase tracking-widest font-bold flex items-center justify-between">
            Système Flower
            {isSaving && <span className="text-rose-500 animate-pulse">Sauvegarde...</span>}
          </div>
        </div>
      </div>

      {/* Assignation */}
      {isTauri() && (() => {
        // Fusionne les joueurs de la BDD avec les joueurs actuellement connectés en direct
        const connectedPlayers = ModManager.getPlayers();
        const allAvailablePlayers = Array.from(new Set([...knownPlayers, ...connectedPlayers]));

        return (
          <div className="flex items-center gap-2 bg-black/30 p-2 rounded border border-white/5">
            <span className="text-xs text-zinc-500 uppercase font-bold">Assigné à :</span>
            <select 
              value={character.owner_id === null ? '' : (character.owner_id || '')} 
              disabled={!isHost}
              onChange={(e) => {
                const val = e.target.value;
                if (val.trim() === '') {
                  updateCharacter(prev => ({ ...prev, owner_id: null }));
                } else {
                  updateCharacter(prev => ({ ...prev, owner_id: val }));
                }
              }}
              className={`bg-transparent text-sm text-slate-300 focus:outline-none border-b border-transparent focus:border-rose-500 flex-1 py-1 ${!isHost ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <option value="" className="bg-slate-900">-- PNJ (Aucun Joueur) --</option>
              {allAvailablePlayers.map((p, i) => (
                <option key={`${p}-${i}`} value={p} className="bg-slate-900">{p}</option>
              ))}
            </select>
          </div>
        );
      })()}

      {/* Points de Vie */}
      <div className="bg-rose-950/30 border border-rose-500/20 rounded-lg p-4 flex flex-col items-center gap-2">
        <div className="text-rose-400 text-sm font-bold uppercase flex items-center gap-2">
          <Skull className="w-4 h-4" /> Santé
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => updateCharacter(prev => ({ ...prev, hpCurrent: Math.max(0, prev.hpCurrent - 1) }))}
            disabled={!isHost}
            className={`w-8 h-8 flex items-center justify-center bg-rose-900/40 rounded transition-colors border border-rose-500/30 ${!isHost ? 'text-rose-900 opacity-50 cursor-not-allowed' : 'text-rose-300 hover:bg-rose-700/50 hover:text-white'}`}
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <div className="flex items-end gap-1">
            <input 
              type="number" 
              value={character.hpCurrent} 
              disabled={!isHost}
              onChange={(e) => updateCharacter(prev => ({ ...prev, hpCurrent: Math.min(maxHp, Math.max(0, parseInt(e.target.value) || 0)) }))}
              className={`bg-black/50 border border-rose-500/30 rounded px-2 py-1 text-2xl font-black text-rose-300 w-16 text-center focus:outline-none focus:border-rose-400 ${!isHost ? 'opacity-70 cursor-not-allowed' : ''}`}
            />
            <span className="text-rose-500 font-bold mb-2">/ {maxHp}</span>
          </div>

          <button 
            onClick={() => updateCharacter(prev => ({ ...prev, hpCurrent: Math.min(maxHp, prev.hpCurrent + 1) }))}
            disabled={!isHost}
            className={`w-8 h-8 flex items-center justify-center bg-rose-900/40 rounded transition-colors border border-rose-500/30 ${!isHost ? 'text-rose-900 opacity-50 cursor-not-allowed' : 'text-rose-300 hover:bg-rose-700/50 hover:text-white'}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="w-full bg-black/50 h-3 rounded-full mt-2 overflow-hidden border border-rose-900">
          <div 
            className="h-full bg-gradient-to-r from-rose-700 to-rose-400 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, (character.hpCurrent / maxHp) * 100))}%` }}
          />
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-3 border-b border-rose-900/50 mt-2 flex-wrap">
        <button 
          onClick={() => setActiveTab('stats')}
          className={`pb-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'stats' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-zinc-500 hover:text-rose-300'}`}
        >
          Caractéristiques
        </button>
        <button 
          onClick={() => setActiveTab('skills')}
          className={`pb-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'skills' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-zinc-500 hover:text-rose-300'}`}
        >
          Compétences
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`pb-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'inventory' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-zinc-500 hover:text-rose-300'}`}
        >
          Inventaire
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {activeTab === 'stats' && <StatsTab sheet={sheet} />}
        {activeTab === 'skills' && <SkillsTab sheet={sheet} />}
        {activeTab === 'inventory' && <InventoryTab sheet={sheet} />}
      </div>

      {/* Modal Compendium (chargée à la demande) */}
      {compendiumModalOpen && (
        <Suspense fallback={null}>
          <CompendiumModal
            type={compendiumModalType}
            entries={compendiumEntries}
            onClose={() => setCompendiumModalOpen(false)}
            onImport={importCompendiumEntry}
          />
        </Suspense>
      )}

    </div>
  );
}
