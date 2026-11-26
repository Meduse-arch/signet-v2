import { lazy, Suspense } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import { Droplet, Shield, Star, Sparkles, ArrowLeft, Swords, Backpack, BookOpen } from 'lucide-react';
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
    { id: 'attributs',   label: 'Attributs',   icon: <Swords   className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'inventaire',  label: 'Inventaire',  icon: <Backpack  className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'competences', label: 'Compétences', icon: <BookOpen  className="w-3.5 h-3.5 shrink-0" /> },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#050508] text-white font-sans overflow-hidden select-none border border-white/10 shadow-2xl">
      {/* 1. Header Plein & Opaque (Retour & Titre) */}
      <div className="bg-[#090a10] border-b border-white/10 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Retour
        </button>

        <span className="text-[10px] uppercase tracking-widest text-rose-400 font-black bg-rose-950/60 border border-rose-800/50 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(225,29,72,0.2)]">
          Fiche de Personnage
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {/* 2. Hero du personnage (Avatar, Nom, Propriétaire) - Plein & Opaque */}
        <div className="bg-[#090a10] border-b border-white/10 p-3 sm:p-4 flex items-center gap-3 shrink-0">
          <div
            className="w-13 h-13 rounded-xl border border-white/15 bg-black/60 shadow-[0_0_20px_rgba(225,29,72,0.15)] flex items-center justify-center relative overflow-hidden group shrink-0 cursor-pointer"
            title="Changer l'avatar"
          >
            {char.avatarUrl ? (
              <img
                src={api.library.getAssetUrl(char.avatarUrl)}
                alt="Avatar"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <Swords className="w-6 h-6 text-rose-400/80 group-hover:text-rose-300 transition-colors" />
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
              placeholder="Nom du personnage..."
              className="w-full bg-transparent text-base sm:text-lg font-black text-white outline-none border-b border-white/10 focus:border-rose-500 transition-colors tracking-tight placeholder-slate-600 truncate"
            />
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {isHost ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] text-slate-400 font-semibold shrink-0">Lié à :</span>
                  <select
                    value={char.owner_id || ''}
                    onChange={(e) => updateField('owner_id', e.target.value || null)}
                    className="bg-[#050508] border border-white/10 text-white rounded px-2 py-0.5 text-xs outline-none focus:border-rose-500 max-w-[130px] truncate"
                  >
                    <option value="">Aucun (PNJ)</option>
                    {knownPlayers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 truncate">
                  {char.owner_id ? `Joué par ${char.owner_id}` : 'Personnage Non Joueur'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Barres de ressources vitales (dynamiquement recalculées avec bonus d'effets/compétences) */}
            <div className="bg-[#07080d] border-b border-white/10 p-2.5 sm:p-3 shrink-0 grid grid-cols-2 gap-2">
              <CompactResourceBar
                icon={<Droplet className="w-3.5 h-3.5 text-rose-400" />}
                label="HP"
                current={char.resources.hp}
                max={effectiveState.maxResources.hp}
                color="#e11d48"
                trackColor="rgba(225, 29, 72, 0.15)"
                onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, hp: Math.max(0, p.resources.hp - 1) } }))}
                onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, hp: Math.min(effectiveState.maxResources.hp, p.resources.hp + 1) } }))}
              />
              <CompactResourceBar
                icon={<Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                label="MP"
                current={char.resources.mp}
                max={effectiveState.maxResources.mp}
                color="#2563eb"
                trackColor="rgba(37, 99, 235, 0.15)"
                onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, mp: Math.max(0, p.resources.mp - 1) } }))}
                onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, mp: Math.min(effectiveState.maxResources.mp, p.resources.mp + 1) } }))}
              />
              <CompactResourceBar
                icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />}
                label="STM"
                current={char.resources.stm}
                max={effectiveState.maxResources.stm}
                color="#10b981"
                trackColor="rgba(16, 185, 129, 0.15)"
                onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, stm: Math.max(0, p.resources.stm - 1) } }))}
                onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, stm: Math.min(effectiveState.maxResources.stm, p.resources.stm + 1) } }))}
              />
              <CompactResourceBar
                icon={<Star className="w-3.5 h-3.5 text-amber-400" />}
                label="Chance"
                current={char.resources.chance}
                max={effectiveState.maxResources.chance}
                color="#f59e0b"
                trackColor="rgba(245, 158, 11, 0.15)"
                onDecrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, chance: Math.max(0, p.resources.chance - 1) } }))}
                onIncrement={() => updateCharacterLocally(p => ({ ...p, resources: { ...p.resources, chance: Math.min(effectiveState.maxResources.chance, p.resources.chance + 1) } }))}
              />
            </div>

        {/* 4. Barre d'onglets - Compacte & Scroll-safe */}
        <div className="flex border-b border-white/10 shrink-0 bg-[#090a10] overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[85px] flex items-center justify-center gap-1.5 py-2.5 px-1.5 text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-400 bg-rose-600/10'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 5. Contenu des onglets */}
        <div className="flex-1 p-4">
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
