import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { FormEvent } from 'react';
import { notesService } from '../../../core/services/notesService';
import type { NoteItem } from '../../../core/services/notesService';

/** État et actions de la vue Notes (arborescence, édition avec auto-sauvegarde, modales). */
export function useNotes() {
  const [items, setItems] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string | null>(null); // null = racine des notes
  const [search, setSearch] = useState('');

  // Mode Édition d'une note
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'split' | 'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modales
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');
  const [renamingItem, setRenamingItem] = useState<NoteItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [itemToDelete, setItemToDelete] = useState<NoteItem | null>(null);

  // Charger l'arborescence des notes
  const refreshTree = useCallback(async () => {
    try {
      const tree = await notesService.getTree();
      setItems(tree);
    } catch (err) {
      console.error('Erreur chargement arborescence notes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  // Ouvrir une note
  const handleOpenNote = async (note: NoteItem) => {
    try {
      const content = await notesService.readNote(note.path);
      setActiveNote(note);
      setNoteContent(content);
      setLastSaved(Date.now());
    } catch (err) {
      console.error('Erreur ouverture note', err);
    }
  };

  // Fermer la note active
  const handleCloseNote = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setActiveNote(null);
    setNoteContent('');
  };

  // Sauvegarder la note active
  const handleSaveNote = useCallback(async (contentToSave?: string) => {
    if (!activeNote) return;
    setIsSaving(true);
    try {
      const text = contentToSave !== undefined ? contentToSave : noteContent;
      await notesService.saveNote(activeNote.path, text);
      setLastSaved(Date.now());
      refreshTree();
    } catch (err) {
      console.error('Erreur sauvegarde note', err);
    } finally {
      setIsSaving(false);
    }
  }, [activeNote, noteContent, refreshTree]);

  // Sauvegarde automatique avec debounce
  const handleContentChange = (newText: string) => {
    setNoteContent(newText);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      handleSaveNote(newText);
    }, 800);
  };

  // Nettoyage timer au démontage
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Insertion d'éléments markdown
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = noteContent.substring(start, end);
    const replacement = `${prefix}${selected || 'texte'}${suffix}`;

    const updated = noteContent.substring(0, start) + replacement + noteContent.substring(end);
    handleContentChange(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 5));
    }, 10);
  };

  // Création de dossier
  const handleCreateFolder = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    const folderPath = currentPath ? `${currentPath}/${trimmed}` : trimmed;
    try {
      await notesService.createFolder(folderPath);
      setNewFolderName('');
      setShowNewFolderModal(false);
      refreshTree();
    } catch (err) {
      console.error('Erreur création dossier', err);
    }
  };

  // Création de note
  const handleCreateNote = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newNoteName.trim();
    if (!trimmed) return;

    const fileName = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`;
    const notePath = currentPath ? `${currentPath}/${fileName}` : fileName;

    try {
      await notesService.saveNote(notePath, `# ${trimmed}\n\nCommencez à écrire votre note ici...`);
      setNewNoteName('');
      setShowNewNoteModal(false);
      await refreshTree();

      // Ouvrir immédiatement la nouvelle note
      const newNoteItem: NoteItem = {
        id: notePath,
        name: trimmed,
        item_type: 'file',
        path: notePath,
        parent_path: currentPath,
        updated_at: Date.now()
      };
      handleOpenNote(newNoteItem);
    } catch (err) {
      console.error('Erreur création note', err);
    }
  };

  // Suppression
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await notesService.deleteItem(itemToDelete.path);
      setItemToDelete(null);
      if (activeNote?.path === itemToDelete.path) {
        handleCloseNote();
      }
      refreshTree();
    } catch (err) {
      console.error('Erreur suppression', err);
    }
  };

  // Renommage
  const handleConfirmRename = async (e: FormEvent) => {
    e.preventDefault();
    if (!renamingItem) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;

    const parentDir = renamingItem.parent_path ? `${renamingItem.parent_path}/` : '';
    const newNameWithExt = renamingItem.item_type === 'file'
      ? (trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`)
      : trimmed;
    const newPath = `${parentDir}${newNameWithExt}`;

    try {
      await notesService.renameItem(renamingItem.path, newPath);
      setRenamingItem(null);
      setRenameValue('');
      if (activeNote?.path === renamingItem.path) {
        setActiveNote(prev => prev ? { ...prev, path: newPath, name: trimmed } : null);
      }
      refreshTree();
    } catch (err) {
      console.error('Erreur renommage', err);
    }
  };
  // Fil d'Ariane (Breadcrumbs)
  const breadcrumbParts = currentPath ? currentPath.split('/') : [];

  // Éléments du dossier courant (ou résultats de recherche) : dossiers en premier, puis ordre alphabétique
  const sortedItems = useMemo(() => {
    const currentItems = items.filter(i => {
      if (search.trim()) {
        return i.name.toLowerCase().includes(search.toLowerCase());
      }
      return i.parent_path === currentPath;
    });
    return currentItems.sort((a, b) => {
      if (a.item_type !== b.item_type) {
        return a.item_type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [items, search, currentPath]);

  return {
    items,
    setItems,
    loading,
    setLoading,
    currentPath,
    setCurrentPath,
    search,
    setSearch,
    activeNote,
    setActiveNote,
    noteContent,
    setNoteContent,
    isSaving,
    setIsSaving,
    lastSaved,
    setLastSaved,
    previewMode,
    setPreviewMode,
    showNewFolderModal,
    setShowNewFolderModal,
    newFolderName,
    setNewFolderName,
    showNewNoteModal,
    setShowNewNoteModal,
    newNoteName,
    setNewNoteName,
    renamingItem,
    setRenamingItem,
    renameValue,
    setRenameValue,
    itemToDelete,
    setItemToDelete,
    textareaRef,
    autoSaveTimerRef,
    refreshTree,
    handleOpenNote,
    handleCloseNote,
    handleSaveNote,
    handleContentChange,
    insertMarkdown,
    handleCreateFolder,
    handleCreateNote,
    handleConfirmDelete,
    handleConfirmRename,
    breadcrumbParts,
    sortedItems,
  };
}

export type NotesState = ReturnType<typeof useNotes>;
