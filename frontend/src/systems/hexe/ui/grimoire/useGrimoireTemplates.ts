import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import type { HexeSkill } from '../../types';
import {
  getSkillsCatalog, addSkillToCatalog, updateSkillInCatalog,
  removeSkillFromCatalog, subscribeSkills
} from '../../hexeSkillStore';
import { parseDiceFormula, formatDiceFormula } from '../../hexeDiceEngine';
import { EMPTY_FORM } from './grimoireForm';
import type { FormState } from './grimoireForm';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export type GrimoireFilter = 'all' | 'passive' | 'toggle' | 'active';

/** État et actions du Grimoire Hexe (catalogue de compétences, filtres, formulaire, synchro des fiches). */
export function useGrimoireTemplates(api: SignetAPI) {
  const [skills, setSkills] = useState<HexeSkill[]>(() => getSkillsCatalog());
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<GrimoireFilter>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  useEffect(() => {
    const unsub = subscribeSkills(() => {
      setSkills(getSkillsCatalog());
    });
    return unsub;
  }, []);

  // Synchronisation avec les personnages existants
  const syncCharactersWithSkill = async (updatedSkill: HexeSkill) => {
    if (!isTauri()) return;
    try {
      const records: any[] = await invoke('get_characters');
      for (const rec of records) {
        let char = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data;
        if (!char || !Array.isArray(char.skills)) continue;

        let charChanged = false;
        char.skills = char.skills.map((s: HexeSkill) => {
          if (s.id === updatedSkill.id || s.name.toLowerCase() === updatedSkill.name.toLowerCase()) {
            charChanged = true;
            return {
              ...s,
              name: updatedSkill.name,
              description: updatedSkill.description,
              imageUrl: updatedSkill.imageUrl,
              activationType: updatedSkill.activationType,
              effects: [...updatedSkill.effects],
              dice: updatedSkill.dice,
              skillLevel: updatedSkill.skillLevel,
              duration: updatedSkill.duration,
              conditions: updatedSkill.conditions,
              costs: updatedSkill.costs,
              custom: updatedSkill.custom
            };
          }
          return s;
        });

        if (charChanged) {
          await invoke('save_character', {
            id: char.id,
            name: char.name,
            ownerId: (char as any).owner_id || null,
            data: JSON.stringify(char)
          });

          const syncMsg = {
            type: 'MOD_EVENT',
            _sourceMod: 'system-hexe',
            modEventType: 'SYNC_CHARACTER',
            payload: char
          };

          if (api) {
            api.emit('NETWORK_OUTGOING', syncMsg);
            api.emit('NETWORK_INCOMING', syncMsg);
          }
        }
      }
    } catch (err) {
      console.error('[HexeGrimoire] Erreur synchronisation des personnages:', err);
    }
  };

  const handleStartCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsCreating(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsCreating(false);
    setEditingId(null);
  }, []);

  const handleStartEdit = useCallback((skill: HexeSkill) => {
    setForm({
      name: skill.name,
      description: skill.description || '',
      imageUrl: skill.imageUrl,
      activationType: skill.activationType,
      skillLevel: skill.skillLevel ?? '',
      costs: skill.costs || {},
      duration: skill.duration || '',
      conditionText: skill.conditions?.join(', ') || '',
      diceFormula: skill.dice ? formatDiceFormula(skill.dice) : '',
      effects: [...skill.effects]
    });
    setEditingId(skill.id);
    setIsCreating(true);
  }, []);

  const handleDuplicate = useCallback((skill: HexeSkill) => {
    const clone = addSkillToCatalog({
      ...skill,
      name: `${skill.name} (Copie)`,
      custom: true
    });
    setExpandedCards(prev => new Set(prev).add(clone.id));
  }, []);

  const handleDelete = useCallback((id: string, name: string) => {
    if (window.confirm(`Supprimer définitivement la compétence "${name}" du Grimoire ?`)) {
      removeSkillFromCatalog(id);
    }
  }, []);

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const parsedDice = form.diceFormula.trim() ? parseDiceFormula(form.diceFormula.trim()) : undefined;
    const conditions = form.conditionText.trim()
      ? form.conditionText.split(',').map(c => c.trim()).filter(Boolean)
      : undefined;

    const costsCleaned = Object.fromEntries(
      Object.entries(form.costs).filter(([, v]) => typeof v === 'number' && v > 0)
    );

    const skillPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl,
      activationType: form.activationType,
      skillLevel: form.skillLevel !== '' ? Number(form.skillLevel) : undefined,
      costs: Object.keys(costsCleaned).length > 0 ? costsCleaned : undefined,
      duration: form.duration.trim() || undefined,
      conditions,
      dice: parsedDice || undefined,
      effects: form.effects,
      custom: true
    };

    if (editingId) {
      const updated: HexeSkill = {
        ...skillPayload,
        id: editingId
      };
      updateSkillInCatalog(editingId, updated);
      syncCharactersWithSkill(updated);
    } else {
      addSkillToCatalog(skillPayload);
    }

    setIsCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const toggleExpand = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filtered = useMemo(() => skills.filter(item => {
    if (activeFilter !== 'all' && item.activationType !== activeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const inName = item.name.toLowerCase().includes(q);
      const inDesc = item.description?.toLowerCase().includes(q);
      const inEffects = item.effects.some(e =>
        e.type === 'custom' ? e.description.toLowerCase().includes(q) : false
      );
      return inName || inDesc || inEffects;
    }
    return true;
  }), [skills, activeFilter, search]);

  const counts = useMemo(() => ({
    all: skills.length,
    passive: skills.filter(s => s.activationType === 'passive').length,
    toggle: skills.filter(s => s.activationType === 'toggle').length,
    active: skills.filter(s => s.activationType === 'active').length,
  }), [skills]);

  return {
    skills, filtered, counts, search, setSearch, activeFilter, setActiveFilter,
    isCreating, editingId, form, setForm, expandedCards, toggleExpand,
    handleStartCreate, handleCancel, handleStartEdit, handleDuplicate, handleDelete, handleSaveForm,
  };
}
