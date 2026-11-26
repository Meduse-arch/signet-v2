import { lazy, Suspense } from 'react';
import type { SignetAPI } from '../../../core/services/SignetAPI';
import { Shield, Plus, Package } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useArsenalTemplates } from './arsenal/useArsenalTemplates';
import { ArsenalFilterBar } from './arsenal/ArsenalFilterBar';
import { ArsenalItemCard } from './arsenal/ArsenalItemCard';
import { ArsenalEditForm } from './arsenal/ArsenalEditForm';
const SkillImportModal = lazy(() => import('./SkillImportModal').then(m => ({ default: m.SkillImportModal })));

interface HexeArsenalWindowProps {
  api?: SignetAPI;
}

export function HexeArsenalWindow({ api }: HexeArsenalWindowProps) {
  const a = useArsenalTemplates(api);

  return (
    <div className="w-full h-full flex flex-col bg-[#050508] text-white overflow-hidden border border-white/10 shadow-2xl font-sans">
      {/* Header - Solid Opaque */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-white/10 bg-[#090a10] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(225,29,72,0.25)]">
            <Shield className="w-5 h-5 text-rose-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
              Arsenal Hexe
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-full shrink-0">
                Module Équipements
              </span>
            </h2>
            <p className="text-xs text-slate-400 truncate">Forge de règles, armes, armures & reliques occultes</p>
          </div>
        </div>

        {!a.isCreating && (
          <Button
            onClick={a.handleStartCreate}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 px-3 py-1.5 shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap ml-auto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Créer un équipement</span>
          </Button>
        )}
      </div>

      {/* Mode Édition / Création */}
      {a.isCreating ? (
        <ArsenalEditForm
          form={a.form}
          setForm={a.setForm}
          editingId={a.editingId}
          formLinkedSkills={a.formLinkedSkills}
          api={api}
          onSubmit={a.handleSaveForm}
          onCancel={a.handleCancel}
          onOpenSkillImport={() => a.setShowSkillImportModal(true)}
        />
      ) : (
        /* Vue principale : Liste & Recherche */
        <div className="flex-1 flex flex-col overflow-hidden bg-[#050508]">
          <ArsenalFilterBar
            templates={a.templates}
            search={a.search}
            setSearch={a.setSearch}
            filterSlot={a.filterSlot}
            setFilterSlot={a.setFilterSlot}
          />

          {/* Grille / Liste des items */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
            {a.filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-[#090a10]/40">
                <Package className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">Aucun équipement trouvé</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  {a.search ? 'Modifiez vos critères de recherche.' : 'Créez votre première arme ou armure avec le bouton ci-dessus.'}
                </p>
              </div>
            ) : (
              a.filtered.map(item => (
                <ArsenalItemCard
                  key={item.id}
                  item={item}
                  expanded={a.expandedCards.has(item.id)}
                  api={api}
                  onToggleExpand={a.toggleExpand}
                  onEdit={a.handleStartEdit}
                  onDuplicate={a.handleDuplicate}
                  onDelete={a.handleDelete}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal d'importation de capacités */}
      {a.showSkillImportModal && (
        <Suspense fallback={null}>
          <SkillImportModal
            alreadyLinkedIds={a.formLinkedSkills.map(s => s.id)}
            onImportSkillIds={a.handleImportSkillIds}
            onClose={() => a.setShowSkillImportModal(false)}
            onOpenGrimoire={() => {
              if (api) {
                api.emit('SYSTEM_ACTION_TRIGGERED', 'hexe-grimoire');
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
