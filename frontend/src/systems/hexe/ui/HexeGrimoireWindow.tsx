import type { SignetAPI } from '../../../core/services/SignetAPI';
import { BookOpen, Plus } from 'lucide-react';
import { useGrimoireTemplates } from './grimoire/useGrimoireTemplates';
import { GrimoireFilterBar } from './grimoire/GrimoireFilterBar';
import { GrimoireSkillCard } from './grimoire/GrimoireSkillCard';
import { GrimoireSkillForm } from './grimoire/GrimoireSkillForm';

interface HexeGrimoireWindowProps {
  api: SignetAPI;
}

export function HexeGrimoireWindow({ api }: HexeGrimoireWindowProps) {
  const g = useGrimoireTemplates(api);

  return (
    <div className="flex flex-col h-full bg-[#050508] text-slate-200 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(225,29,72,0.25)]">
            <BookOpen className="w-5 h-5 text-rose-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              Grimoire Hexe
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 font-mono font-normal">
                {g.skills.length} sorts & dons
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 truncate">Catalogue des compétences, effets et formules occultes</p>
          </div>
        </div>

        {!g.isCreating && (
          <button
            onClick={g.handleStartCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un don / sort</span>
          </button>
        )}
      </div>

      {/* Mode Forge / Formulaire */}
      {g.isCreating ? (
        <GrimoireSkillForm
          form={g.form}
          setForm={g.setForm}
          editingId={g.editingId}
          api={api}
          onSubmit={g.handleSaveForm}
          onCancel={g.handleCancel}
        />
      ) : (
        /* Mode Liste */
        <div className="flex-1 flex flex-col min-h-0">
          <GrimoireFilterBar
            search={g.search}
            setSearch={g.setSearch}
            activeFilter={g.activeFilter}
            setActiveFilter={g.setActiveFilter}
            counts={g.counts}
          />

          {/* Liste des Cartes */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
            {g.filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-[#090a10]/40">
                <BookOpen className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">Aucune compétence trouvée</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  {g.search ? 'Modifiez vos critères de recherche.' : 'Créez votre premier don ou sort avec le bouton ci-dessus.'}
                </p>
              </div>
            ) : (
              g.filtered.map(skill => (
                <GrimoireSkillCard
                  key={skill.id}
                  skill={skill}
                  expanded={g.expandedCards.has(skill.id)}
                  api={api}
                  onToggleExpand={g.toggleExpand}
                  onEdit={g.handleStartEdit}
                  onDuplicate={g.handleDuplicate}
                  onDelete={g.handleDelete}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
