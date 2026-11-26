import { lazy, Suspense } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import { ArrowLeft, Swords, Backpack, BookOpen } from 'lucide-react';
import { useHexeCharacterSheet } from '../hooks/useHexeCharacterSheet';
import type { SheetTab } from '../hooks/useHexeCharacterSheet';
import { CompactResourceBar } from './sheet/CompactResourceBar';
import { AttributesTab } from './sheet/AttributesTab';
import { InventoryTab } from './sheet/InventoryTab';
import { SkillsTab } from './sheet/SkillsTab';

const EquipmentEditModal = lazy(() => import('./modals/EquipmentEditModal').then(m => ({ default: m.EquipmentEditModal })));
const SkillEditModal = lazy(() => import('./modals/SkillEditModal').then(m => ({ default: m.SkillEditModal })));

interface HexeCharacterSheetWindowProps {
  api: SignetAPI;
  characterId: string;
  onBack: () => void;
}

export function HexeCharacterSheetWindow({ api, characterId, onBack }: HexeCharacterSheetWindowProps) {
  const sheet = useHexeCharacterSheet(api, characterId);
  const {
    char, knownPlayers, isHost, activeTab, setActiveTab, effectiveState, updateCharacterLocally, updateField,
    editingEquipment, setEditingEquipment, handleSaveEquipment, editingSkill, setEditingSkill, handleSaveSkill,
  } = sheet;

  const tabs: { id: SheetTab; label: string; icon: React.ReactNode }[] = [
    { id: 'attributs',   label: 'Attributs',   icon: <Swords   className="w-4 h-4 shrink-0" /> },
    { id: 'inventaire',  label: 'Inventaire',  icon: <Backpack  className="w-4 h-4 shrink-0" /> },
    { id: 'competences', label: 'Compétences', icon: <BookOpen  className="w-4 h-4 shrink-0" /> },
  ];

  const resource = (key: 'hp' | 'mp' | 'stm' | 'chance') => ({
    current: char.resources[key],
    max: effectiveState.maxResources[key],
    onDecrement: () => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, [key]: Math.max(0, p.resources[key] - 1) } })),
    onIncrement: () => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, [key]: Math.min(effectiveState.maxResources[key], p.resources[key] + 1) } })),
  });

  return (
    <div className="w-full h-full flex flex-col bg-void text-white font-sans overflow-hidden select-none">
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">

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
            className="w-14 h-14 rounded-xl border border-white/10 bg-surface flex items-center justify-center relative overflow-hidden group shrink-0 cursor-pointer hover:border-white/25 transition-colors"
            title="Changer l'avatar"
          >
            {char.avatarUrl ? (
              <img
                src={api.library.getAssetUrl(char.avatarUrl)}
                alt="Avatar"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Swords className="w-6 h-6 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
            )}
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer z-20"
              accept="image/*"
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  const hash = await api.library.uploadAsset(e.target.files[0]);
                  if (hash) updateField('avatarUrl', hash);
                }
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={char.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Nom du personnage"
              className="w-full bg-transparent text-xl font-bold tracking-tight text-white outline-none border-b border-transparent hover:border-white/10 focus:border-rose-500 transition-colors placeholder-zinc-600 truncate"
            />
            <div className="mt-1 flex items-center gap-2 text-[13px] text-zinc-500 min-w-0">
              {isHost ? (
                <>
                  <span className="shrink-0">Joué par</span>
                  <select
                    value={char.owner_id || ''}
                    onChange={(e) => updateField('owner_id', e.target.value || null)}
                    className="bg-transparent text-zinc-300 hover:text-white outline-none cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="" className="bg-surface">Aucun (PNJ)</option>
                    {knownPlayers.map(p => <option key={p} value={p} className="bg-surface">{p}</option>)}
                  </select>
                </>
              ) : (
                <span className="truncate">{char.owner_id ? `Joué par ${char.owner_id}` : 'Personnage non joueur'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Ressources : lignes alignées (valeurs recalculées avec bonus d'effets/compétences) */}
        <div className="mx-5 shrink-0 rounded-xl border border-hairline bg-white/[.02] divide-y divide-white/[.06]">
          <CompactResourceBar label="HP" color="#e11d48" {...resource('hp')} />
          <CompactResourceBar label="MP" color="#38bdf8" {...resource('mp')} />
          <CompactResourceBar label="STM" color="#34d399" {...resource('stm')} />
          <CompactResourceBar label="Chance" color="#fbbf24" {...resource('chance')} />
        </div>

        {/* Onglets : soulignement cramoisi sur l'actif */}
        <div className="mt-5 px-5 flex gap-6 border-b border-hairline shrink-0 overflow-x-auto" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-10 -mb-px flex items-center gap-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-rose-600 text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <div className="flex-1 p-5">
          {activeTab === 'attributs' && <AttributesTab sheet={sheet} />}
          {activeTab === 'inventaire' && <InventoryTab sheet={sheet} api={api} />}
          {activeTab === 'competences' && <SkillsTab sheet={sheet} api={api} />}
        </div>
      </div>

      <Suspense fallback={null}>
        {editingEquipment && (
          <EquipmentEditModal
            equipment={editingEquipment}
            onSave={handleSaveEquipment}
            onClose={() => setEditingEquipment(null)}
            api={api}
          />
        )}
        {editingSkill && (
          <SkillEditModal
            skill={editingSkill}
            onSave={handleSaveSkill}
            onClose={() => setEditingSkill(null)}
            api={api}
          />
        )}
      </Suspense>
    </div>
  );
}
