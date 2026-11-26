import type { SignetAPI } from '../../../../core/services/SignetAPI';
import type { HexeSheetState } from '../../hooks/useHexeCharacterSheet';
import { Shield, Swords, BookOpen, Trash2, ChevronDown, ChevronUp, Zap, Edit3, Play, ToggleLeft, ToggleRight, Flame } from 'lucide-react';
import { formatDiceFormula } from '../../hexeDiceEngine';
import { HexeItemImage, HexeItemDetailBanner } from '../HexeImagePicker';
import { STAT_SHORT } from '../../constants';
import { GrimoirePickerPanel } from './GrimoirePickerPanel';

export function SkillsTab({ sheet, api }: { sheet: HexeSheetState; api: SignetAPI }) {
  const { char, availableSkills, expandedSkills, setExpandedSkills, toggleExpandSkill, showGrimoirePicker, setShowGrimoirePicker, grimoireSearch, setGrimoireSearch, grimoireFilterType, setGrimoireFilterType, catalogSkills, handleAddSkill, handleToggleSkill, handleTriggerSkill, setEditingSkill, handleDeleteSkill } = sheet;
  return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between pb-1 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Compétences
            </span>
            <span className="text-[10px] font-bold bg-white/10 text-slate-300 rounded-full px-2 py-0.2 leading-none">
              {availableSkills.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {availableSkills.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allExpanded = availableSkills.every(s => expandedSkills.has(s.skill.id));
                  if (allExpanded) {
                    setExpandedSkills(new Set());
                  } else {
                    setExpandedSkills(new Set(availableSkills.map(s => s.skill.id)));
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap"
                title={availableSkills.every(s => expandedSkills.has(s.skill.id)) ? 'Tout replier' : 'Tout déplier'}
              >
                {availableSkills.every(s => expandedSkills.has(s.skill.id)) ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Tout replier</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Tout déplier</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setShowGrimoirePicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{showGrimoirePicker ? 'Fermer Grimoire' : '+ Grimoire'}</span>
            </button>
          </div>
        </div>

        {/* Sélecteur Grimoire (Piocher des compétences comme l'Arsenal) */}
        {showGrimoirePicker && (
          <GrimoirePickerPanel
            skills={catalogSkills}
            search={grimoireSearch}
            setSearch={setGrimoireSearch}
            filterType={grimoireFilterType}
            setFilterType={setGrimoireFilterType}
            learnedSkillIds={(char.skills || []).map(s => s.id)}
            onSelect={handleAddSkill}
            onOpenGrimoireWindow={() => api?.emit('SYSTEM_ACTION_TRIGGERED', 'hexe-grimoire')}
            onClose={() => setShowGrimoirePicker(false)}
            api={api}
          />
        )}

        {availableSkills.length === 0 && !showGrimoirePicker ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 bg-[#07080d]/60 border border-dashed border-white/10 rounded-2xl p-6">
            <BookOpen className="w-10 h-10 text-rose-500/40 mb-1" />
            <p className="font-bold text-sm text-slate-300 text-center">
              Aucune compétence acquise ou disponible
            </p>
            <p className="text-xs text-slate-500 text-center max-w-sm">
              Cliquez sur "+ Grimoire" pour piocher une compétence, ou équipez un objet en conférant.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cartes de Compétences au style visuel de l'inventaire */}
            {(['active', 'toggle', 'passive'] as const).map(groupType => {
              const groupEntries = availableSkills.filter(item => item.skill.activationType === groupType);
              if (groupEntries.length === 0) return null;

              const groupLabel = groupType === 'active' ? 'Capacités Actives & Sorts' : groupType === 'toggle' ? 'Auras & Toggles' : 'Dons & Passifs';
              const groupIcon = groupType === 'active' ? <Flame className="w-4 h-4 text-rose-400" /> : groupType === 'toggle' ? <Zap className="w-4 h-4 text-amber-400" /> : <Shield className="w-4 h-4 text-emerald-400" />;

              return (
                <div key={groupType} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    {groupIcon}
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{groupLabel}</span>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">({groupEntries.length})</span>
                  </div>

                  <div className="space-y-2">
                    {groupEntries.map(({ skill, sources, isLearned }) => {
                      const isToggle = skill.activationType === 'toggle';
                      const isActiveToggle = isToggle && (char.activeToggles || []).includes(skill.id);
                      const isPassive = skill.activationType === 'passive';
                      const isActive = skill.activationType === 'active';
                      const isExpanded = expandedSkills.has(skill.id);
                      const hasDetails = !!skill.description || (skill.effects && skill.effects.length > 0) || !!skill.duration || (skill.conditions && skill.conditions.length > 0) || !!skill.imageUrl;

                      return (
                        <div
                          key={skill.id}
                          className={`bg-[#090a10] border rounded-xl overflow-hidden transition-all ${
                            isActiveToggle
                              ? 'border-rose-500/80 shadow-[0_0_15px_rgba(225,29,72,0.25)] bg-rose-950/20'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="p-3 flex flex-col gap-2">
                            {/* Ligne 1 : En-tête de la carte */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <HexeItemImage
                                  src={skill.imageUrl}
                                  alt={skill.name}
                                  fallbackType={skill.activationType}
                                  className="w-8 h-8 rounded-lg shrink-0"
                                  api={api}
                                />

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs font-bold text-white truncate">{skill.name}</h4>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border ${
                                      isPassive
                                        ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                                        : isToggle
                                        ? isActiveToggle
                                          ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                                          : 'bg-amber-950/60 border-amber-800/40 text-amber-300'
                                        : 'bg-rose-950/60 border-rose-800/40 text-rose-300'
                                    }`}>
                                      {isPassive ? 'Passif' : isToggle ? (isActiveToggle ? 'Toggle (Actif)' : 'Toggle (Inactif)') : 'Actif'}
                                    </span>

                                    {/* Distinction capacités apprises vs accordées par un objet */}
                                    {isLearned && (
                                      <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-white/5 border border-white/10 text-slate-300">
                                        Appris
                                      </span>
                                    )}
                                    {sources.filter(s => s !== 'Appris').map(sourceName => (
                                      <span
                                        key={sourceName}
                                        className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-rose-950/70 border border-rose-800/50 text-rose-300 flex items-center gap-1 shadow-sm"
                                        title={`Accordé par l'équipement porté : ${sourceName}`}
                                      >
                                        <Swords className="w-2.5 h-2.5 text-rose-400" />
                                        <span>{sourceName}</span>
                                      </span>
                                    ))}

                                    {skill.skillLevel && (
                                      <span className="text-[9px] font-bold bg-white/5 border border-white/10 text-slate-400 rounded px-1.5 py-0.5">
                                        Niv. {skill.skillLevel}
                                      </span>
                                    )}
                                  </div>

                                  {/* Coûts et dés */}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {skill.costs?.mp && (
                                      <span className="text-[9px] font-bold text-blue-300 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.2 rounded">
                                        {skill.costs.mp} MP
                                      </span>
                                    )}
                                    {skill.costs?.stm && (
                                      <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                                        {skill.costs.stm} STM
                                      </span>
                                    )}
                                    {skill.costs?.hp && (
                                      <span className="text-[9px] font-bold text-rose-300 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.2 rounded">
                                        {skill.costs.hp} HP
                                      </span>
                                    )}
                                    {skill.costs?.chance && (
                                      <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded">
                                        {skill.costs.chance} Chance
                                      </span>
                                    )}
                                    {skill.dice && (
                                      <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                                        🎲 {formatDiceFormula(skill.dice)}
                                      </span>
                                    )}
                                    {skill.duration && (
                                      <span className="text-[9px] text-slate-400 bg-white/5 border border-white/10 rounded px-1.5 py-0.2">
                                        ⏱ {skill.duration}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Actions & Bouton Plié/Déplié */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isToggle && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSkill(skill.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                      isActiveToggle
                                        ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:bg-white/10'
                                    }`}
                                  >
                                    {isActiveToggle ? <ToggleRight className="w-4 h-4 text-white" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                                    <span>{isActiveToggle ? 'Actif' : 'Inactif'}</span>
                                  </button>
                                )}

                                {isActive && (
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerSkill(skill)}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow-[0_0_10px_rgba(225,29,72,0.3)] transition-all whitespace-nowrap"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Lancer</span>
                                  </button>
                                )}

                                {isPassive && (
                                  <span className="text-[10px] font-semibold text-emerald-400/90 italic px-2 py-0.5">
                                    Permanent
                                  </span>
                                )}

                                {/* Bouton modifier la compétence */}
                                <button
                                  type="button"
                                  onClick={() => setEditingSkill(skill)}
                                  className="p-1 rounded text-slate-500 hover:text-white transition-colors"
                                  title="Modifier cette compétence sur la fiche"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {isLearned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSkill(skill.id)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                                    title="Oublier cette compétence apprise"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span
                                    className="p-1 text-slate-500"
                                    title={`Accordé par : ${sources.join(', ')}. Déséquipez l'objet pour retirer.`}
                                  >
                                    <Shield className="w-3.5 h-3.5 text-rose-400/60" />
                                  </span>
                                )}

                                {/* Bouton plié/déplié (Chevron) */}
                                {hasDetails && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandSkill(skill.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                                    title={isExpanded ? 'Replier les détails' : 'Déplier les détails'}
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Détails dépliés : Description, Conditions & Effets */}
                          {isExpanded && hasDetails && (
                            <div className="px-3 pb-3 pt-2 border-t border-white/5 bg-black/40 space-y-2">
                              {skill.imageUrl ? (
                                <HexeItemDetailBanner
                                  src={skill.imageUrl}
                                  alt={skill.name}
                                  fallbackType={skill.activationType}
                                  className="w-full h-32 sm:h-40 rounded-xl mb-2"
                                  api={api}
                                />
                              ) : null}

                              {skill.description && (
                                <p className="text-[11px] text-slate-300 italic border-l-2 border-rose-500/60 pl-2">
                                  {skill.description}
                                </p>
                              )}

                              {skill.conditions && skill.conditions.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {skill.conditions.map((cond, i) => (
                                    <span key={i} className="text-[9px] font-medium bg-white/5 border border-white/10 text-amber-300/90 rounded-full px-2 py-0.5">
                                      Condition : {cond}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {skill.effects?.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap pt-0.5">
                                  {skill.effects.map((eff, i) => (
                                    <span
                                      key={i}
                                      className="text-[9px] font-semibold text-slate-200 bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
                                    >
                                      {eff.type === 'statLevel' && `${STAT_SHORT[eff.stat]} ${eff.value > 0 ? `+${eff.value}` : eff.value} niv.`}
                                      {eff.type === 'rollModifier' && `Jet ${eff.value > 0 ? `+${eff.value}` : eff.value} ${eff.condition ? `(${eff.condition})` : ''}`}
                                      {eff.type === 'resourceChange' && `${eff.operation} ${eff.resource.toUpperCase()} ${eff.value ? `(${eff.value})` : ''} ${eff.dice ? `(${formatDiceFormula(eff.dice)})` : ''}`}
                                      {eff.type === 'carryCapacity' && `Port ${eff.value > 0 ? `+${eff.value}` : eff.value}${eff.modifierType === 'percent' ? '%' : 'kg'}`}
                                      {eff.type === 'custom' && eff.description}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
