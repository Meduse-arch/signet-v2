import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/Button';
import {
  Plus, FolderPlus, FileText, Folder, ArrowLeft, Trash2, Edit3,
  Save, Check, Search, Eye, Edit2, Bold, Italic, List, ListOrdered,
  Heading1, Heading2, Quote, Code, X, ChevronRight, Clock, AlertCircle
} from 'lucide-react';
import { t } from '../../core/locales/fr';
import { notesService } from '../../core/services/notesService';
import type { NoteItem } from '../../core/services/notesService';

export function NotesView() {
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
  const handleCreateFolder = async (e: React.FormEvent) => {
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
  const handleCreateNote = async (e: React.FormEvent) => {
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
  const handleConfirmRename = async (e: React.FormEvent) => {
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

  // Filtrage des éléments du dossier courant
  const currentItems = items.filter(i => {
    if (search.trim()) {
      return i.name.toLowerCase().includes(search.toLowerCase());
    }
    return i.parent_path === currentPath;
  });

  // Tri : dossiers en premier, puis fichiers alphabétiquement
  const sortedItems = [...currentItems].sort((a, b) => {
    if (a.item_type !== b.item_type) {
      return a.item_type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  // Rendu de l'aperçu Markdown basique
  const renderMarkdownPreview = (text: string) => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-black/60 border border-white/10 rounded-lg p-3 my-2 font-mono text-xs text-rose-300 overflow-x-auto">
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={index} className="text-2xl font-black text-white mt-4 mb-2 pb-1.5 border-b border-white/10 tracking-tight">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={index} className="text-xl font-extrabold text-white mt-3 mb-1.5 tracking-tight">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-base font-bold text-rose-400 mt-2.5 mb-1">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={index} className="border-l-4 border-rose-500 bg-white/5 pl-3 py-1 my-1.5 italic text-slate-300 rounded-r text-sm">
            {line.slice(2)}
          </blockquote>
        );
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-5 list-disc text-sm text-slate-200 my-0.5">
            {line.slice(2)}
          </li>
        );
      } else if (/^\d+\.\s/.test(line)) {
        elements.push(
          <li key={index} className="ml-5 list-decimal text-sm text-slate-200 my-0.5">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      } else if (line.trim() === '---' || line.trim() === '***') {
        elements.push(<hr key={index} className="border-white/10 my-4" />);
      } else if (line.trim() === '') {
        elements.push(<div key={index} className="h-2" />);
      } else {
        elements.push(
          <p key={index} className="text-sm text-slate-300 leading-relaxed my-1">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  // Si une note est ouverte : Vue Éditeur
  if (activeNote) {
    return (
      <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-2 max-w-6xl mx-auto">
        {/* Entête Éditeur */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={handleCloseNote} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Retour aux notes
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                <h2 className="text-xl font-black text-white truncate drop-shadow-md">
                  {activeNote.name}
                </h2>
                <button
                  onClick={() => {
                    setRenamingItem(activeNote);
                    setRenameValue(activeNote.name);
                  }}
                  className="p-1 text-slate-500 hover:text-white rounded hover:bg-white/5 transition-colors"
                  title="Renommer la note"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-slate-600" />
                <span>
                  {isSaving ? 'Enregistrement dans AppData...' : lastSaved ? `Enregistré (${new Date(lastSaved).toLocaleTimeString()})` : 'Enregistré'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bascule Mode Aperçu / Édition */}
            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  previewMode === 'edit' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Écrire</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  previewMode === 'preview' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('split')}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                  previewMode === 'split' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Côte à côte</span>
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSaveNote()}
              leftIcon={isSaving ? <Check className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>

        {/* Barre d'outils Markdown */}
        {(previewMode === 'edit' || previewMode === 'split') && (
          <div className="flex items-center gap-1 p-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg mb-2 overflow-x-auto">
            <button
              onClick={() => insertMarkdown('# ')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold"
              title="Titre 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('## ')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold"
              title="Titre 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-white/10 mx-1" />
            <button
              onClick={() => insertMarkdown('**', '**')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold"
              title="Gras"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold"
              title="Italique"
            >
              <Italic className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-white/10 mx-1" />
            <button
              onClick={() => insertMarkdown('- ')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold"
              title="Liste à puces"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('1. ')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold"
              title="Liste numérotée"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('> ')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold"
              title="Citation"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertMarkdown('```\n', '\n```')}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded text-xs font-bold"
              title="Bloc de code"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Zone de travail (Split / Édition / Aperçu) */}
        <div className="flex-1 min-h-0 flex gap-4 overflow-hidden mb-6">
          {(previewMode === 'edit' || previewMode === 'split') && (
            <div className={`flex-1 flex flex-col min-h-0 ${previewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
              <textarea
                ref={textareaRef}
                value={noteContent}
                onChange={e => handleContentChange(e.target.value)}
                placeholder="Rédigez vos notes, secrets, listes de PNJ ou descriptions de scènes ici (supporte le Markdown)..."
                className="w-full flex-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 font-sans leading-relaxed resize-none custom-scrollbar"
              />
            </div>
          )}

          {(previewMode === 'preview' || previewMode === 'split') && (
            <div className={`flex-1 flex flex-col min-h-0 bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-xl p-6 overflow-y-auto custom-scrollbar ${previewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
              {noteContent.trim() ? (
                renderMarkdownPreview(noteContent)
              ) : (
                <div className="text-slate-600 italic text-sm text-center mt-12">
                  Aucun contenu à prévisualiser.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modale de renommage dans l'éditeur */}
        {renamingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#090a10] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Renommer la note</h3>
              <form onSubmit={handleConfirmRename} className="space-y-4">
                <input
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setRenamingItem(null)}>
                    Annuler
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Enregistrer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vue Explorateur de Dossiers & Notes
  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4 max-w-6xl mx-auto">
      {/* Entête principal */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div className="min-w-[200px] flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow-xl">
              {t('modal_notes_title')}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300">
              AppData
            </span>
          </div>
          <p className="text-zinc-400 font-medium text-xs mt-1 drop-shadow-md">
            Vos notes sont conservées en documents physiques dans le dossier de données de Signet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-start shrink-0">
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              setNewFolderName('');
              setShowNewFolderModal(true);
            }}
            leftIcon={<FolderPlus className="w-4 h-4 text-rose-400" />}
          >
            Nouveau Dossier
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setNewNoteName('');
              setShowNewNoteModal(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouvelle Note
          </Button>
        </div>
      </div>

      {/* Barre de navigation & Recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl mb-4">
        {/* Fil d'Ariane */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
          <button
            onClick={() => setCurrentPath(null)}
            className={`font-bold transition-colors hover:text-white px-2 py-1 rounded hover:bg-white/5 ${
              currentPath === null ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            Notes
          </button>
          {breadcrumbParts.map((part, index) => {
            const subPath = breadcrumbParts.slice(0, index + 1).join('/');
            const isLast = index === breadcrumbParts.length - 1;
            return (
              <React.Fragment key={subPath}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <button
                  onClick={() => setCurrentPath(subPath)}
                  className={`font-semibold transition-colors hover:text-white px-2 py-1 rounded hover:bg-white/5 truncate max-w-[150px] ${
                    isLast ? 'text-rose-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Recherche */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Grille des éléments */}
      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
            Chargement des documents...
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl bg-black/20">
            <FileText className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-400">
              {search ? 'Aucune note ne correspond à votre recherche' : 'Ce dossier est vide'}
            </p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              {search
                ? 'Essayez avec d\'autres mots-clés.'
                : 'Créez votre première note ou organisez vos dossiers avec les boutons ci-dessus.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {sortedItems.map(item => {
              const isFolder = item.item_type === 'folder';
              return (
                <div
                  key={item.path}
                  onClick={() => {
                    if (isFolder) {
                      setCurrentPath(item.path);
                    } else {
                      handleOpenNote(item);
                    }
                  }}
                  className="group relative flex flex-col items-center justify-center p-4 bg-[#090a10]/80 hover:bg-slate-900/80 backdrop-blur-sm rounded-xl cursor-pointer transition-all hover:scale-[1.02] border border-white/5 hover:border-rose-500/40 shadow-lg text-center"
                >
                  {/* Actions contextuelles au survol */}
                  <div
                    className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setRenamingItem(item);
                        setRenameValue(item.name);
                      }}
                      className="p-1 rounded bg-black/60 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Renommer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1 rounded bg-black/60 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Icône */}
                  <div className="mb-2">
                    {isFolder ? (
                      <Folder className="w-12 h-12 text-rose-500/80 group-hover:text-rose-400 drop-shadow-[0_0_12px_rgba(225,29,72,0.3)] transition-colors" />
                    ) : (
                      <FileText className="w-12 h-12 text-slate-400 group-hover:text-white drop-shadow-md transition-colors" />
                    )}
                  </div>

                  {/* Nom */}
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white tracking-wide break-words w-full line-clamp-2">
                    {item.name}
                  </span>

                  {/* Format date discrète */}
                  {item.updated_at && (
                    <span className="text-[10px] text-slate-600 mt-1">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale Nouveau Dossier */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#090a10] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-rose-500" />
                <span>Nouveau Dossier</span>
              </h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Nom du dossier :</label>
                <input
                  type="text"
                  placeholder="Ex: Campagne Hexe, PNJ, Lieux..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowNewFolderModal(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={!newFolderName.trim()}>
                  Créer le dossier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Nouvelle Note */}
      {showNewNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#090a10] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                <span>Nouvelle Note</span>
              </h3>
              <button onClick={() => setShowNewNoteModal(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Titre de la note :</label>
                <input
                  type="text"
                  placeholder="Ex: Résumé de session, Idée de donjon..."
                  value={newNoteName}
                  onChange={e => setNewNoteName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowNewNoteModal(false)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={!newNoteName.trim()}>
                  Créer et ouvrir
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de Renommage */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#090a10] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Renommer {renamingItem.item_type === 'folder' ? 'le dossier' : 'la note'}
            </h3>
            <form onSubmit={handleConfirmRename} className="space-y-4">
              <input
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setRenamingItem(null)}>
                  Annuler
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={!renameValue.trim()}>
                  Renommer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de Confirmation de Suppression */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#090a10] border border-rose-500/30 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_30px_rgba(225,29,72,0.2)]">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white">Confirmer la suppression</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Êtes-vous sûr de vouloir supprimer définitivement{' '}
                  <strong className="text-slate-200">« {itemToDelete.name} »</strong>
                  {itemToDelete.item_type === 'folder' ? ' et tout son contenu' : ''} ?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setItemToDelete(null)}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmDelete}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
