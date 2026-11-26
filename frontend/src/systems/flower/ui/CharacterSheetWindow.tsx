import { lazy, Suspense, useRef } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import { Flower2, Plus, Minus, ArrowLeft, Upload } from 'lucide-react';
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

  const tabs: { id: 'stats' | 'skills' | 'inventory'; label: string }[] = [
    { id: 'stats', label: 'Caractéristiques' },
    { id: 'skills', label: 'Compétences' },
    { id: 'inventory', label: 'Inventaire' },
  ];

  // Fusionne les joueurs de la BDD avec les joueurs actuellement connectés en direct
  const allAvailablePlayers = Array.from(new Set([...knownPlayers, ...ModManager.getPlayers()]));

  const stepBtn = `w-7 h-7 grid place-items-center rounded-lg transition-colors ${!isHost ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:text-white hover:bg-white/[.06]'}`;

  return (
    <div className="flex flex-col h-full bg-void text-white pointer-events-auto overflow-y-auto custom-scrollbar">

      {/* Identité : l'en-tête de la fenêtre porte déjà le titre, pas de second bandeau */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-4 shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 shrink-0 grid place-items-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[.06] transition-colors"
          title="Liste des personnages"
          aria-label="Retour à la liste des personnages"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div
          className="w-14 h-14 rounded-xl bg-surface border border-white/10 hover:border-white/25 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group transition-colors"
          onClick={() => fileInputRef.current?.click()}
          title="Modifier l'avatar"
        >
          {character.avatarUrl ? (
            <img src={api.library.getAssetUrl(character.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Flower2 className="w-6 h-6 text-zinc-500" />
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

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={character.name}
            onChange={(e) => updateCharacter(prev => ({ ...prev, name: e.target.value }))}
            onBlur={(e) => updateCharacter(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-transparent text-xl font-bold tracking-tight text-white outline-none border-b border-transparent hover:border-white/10 focus:border-rose-500 transition-colors truncate"
            placeholder="Nom du personnage"
          />
          <div className="mt-1 flex items-center gap-2 text-[13px] text-zinc-500 min-w-0">
            {isTauri() ? (
              <>
                <span className="shrink-0">Joué par</span>
                <select
                  value={character.owner_id === null ? '' : (character.owner_id || '')}
                  disabled={!isHost}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateCharacter(prev => ({ ...prev, owner_id: val.trim() === '' ? null : val }));
                  }}
                  className={`bg-transparent text-zinc-300 outline-none max-w-[160px] truncate ${!isHost ? 'opacity-60 cursor-not-allowed' : 'hover:text-white cursor-pointer'}`}
                >
                  <option value="" className="bg-surface">Aucun (PNJ)</option>
                  {allAvailablePlayers.map((p, i) => (
                    <option key={`${p}-${i}`} value={p} className="bg-surface">{p}</option>
                  ))}
                </select>
              </>
            ) : null}
            {isSaving && <span className="ml-auto text-xs text-zinc-500">Enregistrement…</span>}
          </div>
        </div>

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
          className="h-9 px-3 shrink-0 rounded-lg border border-white/10 text-[13px] text-zinc-300 hover:text-white hover:border-white/25 hover:bg-white/[.04] flex items-center gap-2 whitespace-nowrap transition-colors"
          title="Faire apparaître / retirer le pion sur la carte"
        >
          <Flower2 className="w-4 h-4 shrink-0" />
          Pion
        </button>
      </div>

      {/* Santé : même ligne que les ressources des autres fiches */}
      <div className="mx-5 shrink-0 rounded-xl border border-hairline bg-white/[.02]">
        <div className="flex items-center gap-3 h-11 px-4">
          <span className="w-16 shrink-0 text-[13px] text-zinc-400">Santé</span>
          <div className="flex-1 h-1 rounded-full bg-white/[.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, (character.hpCurrent / maxHp) * 100))}%` }}
            />
          </div>
          <input
            type="number"
            value={character.hpCurrent}
            disabled={!isHost}
            onChange={(e) => updateCharacter(prev => ({ ...prev, hpCurrent: Math.min(maxHp, Math.max(0, parseInt(e.target.value) || 0)) }))}
            aria-label="Points de vie actuels"
            className={`w-12 bg-transparent text-right num text-[13px] text-white outline-none border-b border-transparent focus:border-rose-500 ${!isHost ? 'opacity-70 cursor-not-allowed' : ''}`}
          />
          <span className="num text-[13px] text-zinc-600 -ml-1">/ {maxHp}</span>
          <span className="flex shrink-0">
            <button
              onClick={() => updateCharacter(prev => ({ ...prev, hpCurrent: Math.max(0, prev.hpCurrent - 1) }))}
              disabled={!isHost}
              className={stepBtn}
              aria-label="Diminuer la santé"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateCharacter(prev => ({ ...prev, hpCurrent: Math.min(maxHp, prev.hpCurrent + 1) }))}
              disabled={!isHost}
              className={stepBtn}
              aria-label="Augmenter la santé"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      </div>

      {/* Onglets : soulignement cramoisi sur l'actif */}
      <div className="mt-5 px-5 flex gap-6 border-b border-hairline shrink-0 overflow-x-auto" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-10 -mb-px text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-rose-600 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 p-5 overflow-y-auto custom-scrollbar">
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
