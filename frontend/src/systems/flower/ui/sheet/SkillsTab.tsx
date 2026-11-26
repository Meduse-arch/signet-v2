import { Plus, Skull, Zap } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { FlowerSheetState } from '../../hooks/useFlowerCharacter';
import { isTauri } from '../../hooks/useFlowerCharacter';
import { MasteryStars, hasMasteryScaling } from './FlowerRatings';

export function SkillsTab({ sheet }: { sheet: FlowerSheetState }) {
  const { character, isHost, removeSkill, openCompendiumModal, handleToggleSkill, handleCastSkill, setMasteryLevel } = sheet;
  return (
    <div className="flex flex-col gap-4">
      {isTauri() && (
        <Button variant="glass" onClick={() => openCompendiumModal('skill')} className="w-full justify-center text-rose-300 border-rose-500/30 hover:bg-rose-900/30">
          <Plus className="w-4 h-4 mr-2" /> Importer une Compétence
        </Button>
      )}
      
      {(!character.skills || character.skills.length === 0) && (
        <div className="text-center text-zinc-500 mt-4 text-sm">
          Aucune compétence pour le moment.
        </div>
      )}
      
      {character.skills?.map(skill => (
        <div key={skill.id} className="bg-black/30 p-3 rounded-md border border-white/5 flex flex-col gap-2 relative group">
          <button 
            onClick={() => removeSkill(skill.id)}
            className="absolute top-2 right-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Supprimer la compétence"
          >
            <Skull className="w-4 h-4" />
          </button>
          <div className="flex flex-col gap-1 pr-6">
            <div className="flex items-center justify-between">
              <div className="text-rose-300 font-bold flex items-center gap-2">
                {skill.name || 'Compétence Sans Nom'}
                {skill.skillType && (
                  <span className="text-[11px] opacity-70 bg-white/10 px-1.5 py-0.5 rounded-lg">
                    {skill.skillType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {(!skill.skillType || skill.skillType === 'active') && (
                  <button 
                    onClick={() => handleCastSkill(skill.id)}
                    className="p-1.5 rounded-lg transition-[color,background-color,border-color,opacity,transform] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 border border-emerald-500/30"
                    title="Lancer la compétence"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                )}
                {skill.skillType === 'toggle' && (
                  <button 
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`p-1.5 rounded-lg transition-[color,background-color,border-color,opacity,transform] ${skill.isActive ? 'bg-rose-600 text-white shadow-rose-500/50' : 'bg-black/50 text-zinc-500 hover:bg-white/10 border border-white/5'}`}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}
                {hasMasteryScaling(skill) && <MasteryStars id={skill.id} level={skill.level} type="skill" isHost={isHost} onSetLevel={setMasteryLevel} />}
              </div>
            </div>
            {skill.modifiers && skill.modifiers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {skill.modifiers.map((mod, i) => (
                  <span key={i} className={`text-[11px] px-1.5 py-0.5 rounded-lg font-bold ${skill.skillType === 'toggle' && !skill.isActive ? 'bg-zinc-800 text-zinc-500 line-through' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                    {mod.value} {mod.target} {mod.scaleStat ? `(Scale: ${mod.scaleStat})` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="bg-black/40 text-sm text-zinc-400 rounded-lg p-2 border border-transparent min-h-[40px] whitespace-pre-line">
            {skill.description || 'Aucune description.'}
          </div>
        </div>
      ))}
    </div>
  );
}
