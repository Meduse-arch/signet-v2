import { useState, useEffect, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SignetAPI } from '../../../../core/services/SignetAPI';
import type { HexeEquipmentSlot, HexeCharacter } from '../../types';
import {
  getTemplates, addTemplate, removeTemplate, updateTemplate, subscribeTemplates
} from '../../hexeEquipmentStore';
import type { HexeEquipmentTemplate } from '../../hexeEquipmentStore';
import { parseDiceFormula, formatDiceFormula } from '../../hexeDiceEngine';
import { getEquipmentSkills } from '../../hexeSkillStore';
import { EMPTY_FORM } from '../../constants';
import type { EquipmentFormState } from '../../constants';

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/** État et actions de l'Arsenal Hexe (templates, filtres, formulaire, synchro des fiches). */
export function useArsenalTemplates(api?: SignetAPI) {
  const [templates, setTemplates] = useState<HexeEquipmentTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [filterSlot, setFilterSlot] = useState<HexeEquipmentSlot | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<EquipmentFormState>(EMPTY_FORM);
  const [showSkillImportModal, setShowSkillImportModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTemplates(getTemplates());
    const unsubscribe = subscribeTemplates(() => {
      setTemplates(getTemplates());
    });
    return unsubscribe;
  }, []);

  const handleStartCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsCreating(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsCreating(false);
    setEditingId(null);
  }, []);

  const handleStartEdit = useCallback((template: HexeEquipmentTemplate) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      slot: template.slot,
      weight: template.weight !== undefined ? template.weight : '',
      imageUrl: template.imageUrl,
      statBonuses: { ...(template.statBonuses || {}) },
      properties: [...(template.properties || [])],
      abilities: [...(template.abilities || [])],
      abilityIds: [...(template.abilityIds || [])],
      description: template.description || '',
      rank: template.rank || 'C',
      nature: template.nature || 'classic',
      diceFormula: template.dice ? formatDiceFormula(template.dice) : ''
    });
    setIsCreating(true);
  }, []);

  const handleDuplicate = useCallback((template: HexeEquipmentTemplate) => {
    addTemplate({
      name: `${template.name} (Copie)`,
      slot: template.slot,
      weight: template.weight,
      imageUrl: template.imageUrl,
      statBonuses: { ...(template.statBonuses || {}) },
      properties: [...(template.properties || [])],
      abilities: (template.abilities || []).map(a => ({ ...a, id: `ab-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
      abilityIds: [...(template.abilityIds || [])],
      description: template.description || '',
      rank: template.rank,
      nature: template.nature,
      symbol: template.symbol ? { ...template.symbol } : undefined,
      dice: template.dice ? { ...template.dice, terms: template.dice.terms.map(t => ({ ...t })) } : undefined,
      effects: template.effects ? [...template.effects] : undefined
    });
  }, []);

  const handleDelete = useCallback((id: string, name: string) => {
    if (confirm(`Supprimer définitivement "${name}" de l'Arsenal ?`)) {
      removeTemplate(id);
      setEditingId(prev => {
        if (prev === id) setIsCreating(false);
        return prev === id ? null : prev;
      });
    }
  }, []);

  const syncCharactersWithTemplate = async (templateId: string, updatedTemplate: HexeEquipmentTemplate) => {
    if (!isTauri()) return;
    try {
      const records = (await invoke('get_characters')) as any[];
      for (const record of records) {
        if (!record.data) continue;
        let char: HexeCharacter;
        try {
          char = JSON.parse(record.data);
        } catch {
          continue;
        }

        let charChanged = false;
        if (Array.isArray(char.equipment)) {
          char.equipment = char.equipment.map(equip => {
            // Correspondance par templateId ou par nom si pas encore associé
            if (equip.templateId === templateId || (!equip.templateId && equip.name.toLowerCase() === updatedTemplate.name.toLowerCase())) {
              charChanged = true;
              return {
                ...equip,
                templateId,
                name: updatedTemplate.name,
                slot: updatedTemplate.slot,
                weight: updatedTemplate.weight,
                imageUrl: updatedTemplate.imageUrl,
                rank: updatedTemplate.rank,
                nature: updatedTemplate.nature,
                symbol: updatedTemplate.symbol,
                dice: updatedTemplate.dice,
                effects: updatedTemplate.effects,
                statBonuses: { ...(updatedTemplate.statBonuses || {}) },
                properties: [...(updatedTemplate.properties || [])],
                abilities: [...(updatedTemplate.abilities || [])],
                abilityIds: [...(updatedTemplate.abilityIds || [])],
                resourceModifiers: updatedTemplate.resourceModifiers ? [...updatedTemplate.resourceModifiers] : undefined,
                description: updatedTemplate.description,
                // Préserve l'équipement porté et la quantité du personnage
                isEquipped: equip.isEquipped,
                quantity: equip.quantity,
              };
            }
            return equip;
          });
        }

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
      console.error('[HexeArsenal] Erreur lors de la synchronisation des personnages:', err);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const parsedDice = form.diceFormula?.trim() ? parseDiceFormula(form.diceFormula.trim()) : undefined;
    const rank = form.rank || 'C';
    const nature = form.nature || 'classic';
    const symbol = {
      orientation: nature === 'classic' ? ('upright' as const) : ('inverted' as const),
      filled: nature === 'possessed',
      hasCircle: rank === 'S'
    };
    const cleanWeight = form.weight !== '' && form.weight !== undefined ? Number(form.weight) : undefined;

    if (editingId) {
      const updatedTemplate: HexeEquipmentTemplate = {
        id: editingId,
        name: form.name.trim(),
        slot: form.slot,
        weight: cleanWeight,
        imageUrl: form.imageUrl,
        rank,
        nature,
        symbol,
        dice: parsedDice || undefined,
        statBonuses: form.statBonuses,
        properties: form.properties,
        abilities: form.abilities,
        abilityIds: form.abilityIds,
        description: form.description.trim()
      };
      updateTemplate(editingId, updatedTemplate);
      syncCharactersWithTemplate(editingId, updatedTemplate);
    } else {
      addTemplate({
        name: form.name.trim(),
        slot: form.slot,
        weight: cleanWeight,
        imageUrl: form.imageUrl,
        rank,
        nature,
        symbol,
        dice: parsedDice || undefined,
        statBonuses: form.statBonuses,
        properties: form.properties,
        abilities: form.abilities,
        abilityIds: form.abilityIds,
        description: form.description.trim()
      });
    }

    setIsCreating(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleImportSkillIds = (skillIds: string[]) => {
    setForm(prev => ({
      ...prev,
      abilityIds: Array.from(new Set([...(prev.abilityIds || []), ...skillIds]))
    }));
  };

  const formLinkedSkills = useMemo(() => {
    return getEquipmentSkills(form);
  }, [form.abilityIds, form.abilities]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filtered = useMemo(() => templates.filter(t => {
    if (filterSlot !== 'all' && t.slot !== filterSlot) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = t.name.toLowerCase().includes(q);
    const matchDesc = (t.description || '').toLowerCase().includes(q);
    const matchProps = (t.properties || []).some(p => p.toLowerCase().includes(q));
    const itemSkills = getEquipmentSkills(t);
    const matchAb = itemSkills.some(a => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
    return matchName || matchDesc || matchProps || matchAb;
  }), [templates, filterSlot, search]);

  return {
    templates, filtered, search, setSearch, filterSlot, setFilterSlot,
    editingId, isCreating, form, setForm, expandedCards, toggleExpand,
    showSkillImportModal, setShowSkillImportModal,
    handleStartCreate, handleCancel, handleStartEdit, handleDuplicate, handleDelete,
    handleSaveForm, handleImportSkillIds, formLinkedSkills,
  };
}
