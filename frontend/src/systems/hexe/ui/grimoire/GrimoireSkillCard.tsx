import { memo } from 'react';
import { Zap, Shield, Flame, Trash2, Edit3, Copy, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import type { HexeSkill, HexeActivationType } from '../../types';
import { STAT_LABELS } from '../../types';
import { STAT_SHORT } from '../../constants';
import { formatDiceFormula } from '../../hexeDiceEngine';
import { HexeItemImage, HexeItemDetailBanner } from '../HexeImagePicker';

function getActivationBadge(type: HexeActivationType) {
  switch (type) {
    case 'passive':
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded-lg px-1.5 py-0.5">
          <Shield className="w-3 h-3 text-emerald-400" />
          Passif
        </span>
      );
    case 'toggle':
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 rounded-lg px-1.5 py-0.5">
          <Zap className="w-3 h-3 text-amber-400" />
          Toggle
        </span>
      );
    case 'active':
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-1.5 py-0.5">
          <Flame className="w-3 h-3 text-rose-400" />
          Actif
        </span>
      );
  }
}

interface GrimoireSkillCardProps {
  skill: HexeSkill;
  expanded: boolean;
  api: SignetAPI;
  onToggleExpand: (id: string) => void;
  onEdit: (skill: HexeSkill) => void;
  onDuplicate: (skill: HexeSkill) => void;
  onDelete: (id: string, name: string) => void;
}

export const GrimoireSkillCard = memo(function GrimoireSkillCard({
  skill, expanded: isExpanded, api, onToggleExpand, onEdit, onDuplicate, onDelete
}: GrimoireSkillCardProps) {
  const hasDetails = !!skill.description || (skill.conditions && skill.conditions.length > 0) || skill.effects.length > 0;

  return (
    <div
      key={skill.id}
      className="bg-surface border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-[color,background-color,border-color,opacity,transform] group "
    >
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <HexeItemImage
            src={skill.imageUrl}
            alt={skill.name}
            fallbackType={skill.activationType}
            className="w-9 h-9 rounded-lg shrink-0"
            api={api}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white truncate">{skill.name}</h4>
              {getActivationBadge(skill.activationType)}
              {skill.skillLevel && (
                <span className="text-[11px] font-bold bg-white/5 border border-white/10 text-zinc-400 rounded-lg px-1.5 py-0.5 leading-none">
                  Niv. {skill.skillLevel}
                </span>
              )}
              {skill.dice && (
                <span className="text-[11px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded-lg leading-none">
                  {formatDiceFormula(skill.dice)}
                </span>
              )}
            </div>

            {/* Résumé des coûts et effets */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {skill.costs && (
                <>
                  {skill.costs.mp && (
                    <span className="text-[11px] font-bold text-blue-300 bg-blue-950/60 border border-blue-800/40 rounded-lg px-1.5 py-0.2">
                      {skill.costs.mp} MP
                    </span>
                  )}
                  {skill.costs.stm && (
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 rounded-lg px-1.5 py-0.2">
                      {skill.costs.stm} STM
                    </span>
                  )}
                  {skill.costs.hp && (
                    <span className="text-[11px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-1.5 py-0.2">
                      {skill.costs.hp} HP
                    </span>
                  )}
                </>
              )}

              {skill.effects.slice(0, 2).map((eff, i) => (
                <span
                  key={i}
                  className="text-[11px] text-zinc-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.2 truncate max-w-[140px]"
                >
                  {eff.type === 'statLevel' && `${STAT_SHORT[eff.stat]} +${eff.value} niv.`}
                  {eff.type === 'rollModifier' && `Jet +${eff.value}`}
                  {eff.type === 'resourceChange' && `${eff.operation} ${eff.resource.toUpperCase()}`}
                  {eff.type === 'carryCapacity' && `Port ${eff.value > 0 ? `+${eff.value}` : eff.value}${eff.modifierType === 'percent' ? '%' : 'kg'}`}
                  {eff.type === 'custom' && eff.description}
                </span>
              ))}
              {skill.effects.length > 2 && (
                <span className="text-[11px] text-zinc-500">
                  +{skill.effects.length - 2}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {hasDetails && (
            <button
              onClick={() => onToggleExpand(skill.id)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Voir les détails"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => onEdit(skill)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors"
            title="Modifier"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDuplicate(skill)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-amber-400 transition-colors"
            title="Dupliquer"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(skill.id, skill.name)}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone de détails dépliée */}
      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 bg-black/30 space-y-2">
          {skill.imageUrl ? (
            <HexeItemDetailBanner
              src={skill.imageUrl}
              alt={skill.name}
              fallbackType={skill.activationType}
              className="w-full h-40 sm:h-48 rounded-xl mb-2"
              api={api}
            />
          ) : null}

          {skill.description && (
            <p className="text-xs text-zinc-300 ">{skill.description}</p>
          )}

          {skill.duration && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Durée : <strong className="text-zinc-200">{skill.duration}</strong></span>
            </div>
          )}

          {skill.conditions && skill.conditions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-zinc-500 font-bold">
                Conditions :
              </span>
              {skill.conditions.map((c, i) => (
                <span
                  key={i}
                  className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-800/40 rounded-full px-2 py-0.5"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {skill.effects.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-zinc-500 font-bold block">
                Effets détaillés ({skill.effects.length}) :
              </span>
              {skill.effects.map((eff, i) => (
                <div
                  key={i}
                  className="bg-surface-raised/80 border-l-2 border-rose-500 border border-white/10 rounded-lg p-2 text-xs"
                >
                  {eff.type === 'statLevel' && (
                    <div className="text-emerald-300 font-bold">
                      Stat {STAT_LABELS[eff.stat]} : {eff.value > 0 ? `+${eff.value}` : eff.value} niveau(x)
                    </div>
                  )}
                  {eff.type === 'rollModifier' && (
                    <div className="text-cyan-300 font-bold">
                      Modificateur au jet : {eff.value > 0 ? `+${eff.value}` : eff.value} direct {eff.condition ? `(${eff.condition})` : ''}
                    </div>
                  )}
                  {eff.type === 'resourceChange' && (
                    <div className="text-rose-300 font-bold">
                      Ressource {eff.resource.toUpperCase()} ({eff.target === 'maximum' ? 'Maximum' : 'Actuelle'}) : {eff.operation} {eff.value ? `${eff.value}` : ''} {eff.dice ? formatDiceFormula(eff.dice) : ''}
                    </div>
                  )}
                  {eff.type === 'carryCapacity' && (
                    <div className="text-amber-300 font-bold">
                      Capacité de port : {eff.value > 0 ? `+${eff.value}` : eff.value} {eff.modifierType === 'percent' ? '%' : 'kg'}
                    </div>
                  )}
                  {eff.type === 'custom' && (
                    <div className="text-zinc-200">
                      {eff.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
