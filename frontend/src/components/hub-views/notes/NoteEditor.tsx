import { Button } from '../../ui/Button';
import { FileText, ArrowLeft, Edit3, Save, Check, Eye, Edit2, Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Code, Clock } from 'lucide-react';
import { renderMarkdownPreview } from './markdownPreview';
import type { NotesState } from './useNotes';

export function NoteEditor({ notes }: { notes: NotesState }) {
  const { activeNote, noteContent, isSaving, lastSaved, previewMode, setPreviewMode, setRenamingItem, setRenameValue, textareaRef, handleCloseNote, handleSaveNote, handleContentChange, insertMarkdown } = notes;

  if (!activeNote) return null;

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-2 max-w-6xl mx-auto">
      {/* Entête Éditeur */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-hairline mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={handleCloseNote} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Retour aux notes
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400 shrink-0" />
              <h2 className="text-xl font-bold text-white truncate">
                {activeNote.name}
              </h2>
              <button
                onClick={() => {
                  setRenamingItem(activeNote);
                  setRenameValue(activeNote.name);
                }}
                className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/5 transition-colors"
                title="Renommer la note"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3 text-zinc-600" />
              <span>
                {isSaving ? 'Enregistrement…' : lastSaved ? `Enregistré (${new Date(lastSaved).toLocaleTimeString()})` : 'Enregistré'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Bascule Mode Aperçu / Édition */}
          <div className="flex items-center bg-black/40 border border-hairline rounded-[10px] p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode('edit')}
              className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs transition-colors ${
                previewMode === 'edit' ? 'bg-white/[.09] text-white shadow-[inset_0_-2px_0_#e11d48]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Écrire</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('preview')}
              className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs transition-colors ${
                previewMode === 'preview' ? 'bg-white/[.09] text-white shadow-[inset_0_-2px_0_#e11d48]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Aperçu</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('split')}
              className={`hidden md:flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs transition-colors ${
                previewMode === 'split' ? 'bg-white/[.09] text-white shadow-[inset_0_-2px_0_#e11d48]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>Côte à côte</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSaveNote()}
            leftIcon={isSaving ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          >
            {isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Barre d'outils Markdown */}
      {(previewMode === 'edit' || previewMode === 'split') && (
        <div className="flex items-center gap-1 p-1.5 bg-surface/80 backdrop-blur-xl border border-hairline rounded-xl mb-2 overflow-x-auto">
          <button
            onClick={() => insertMarkdown('# ')}
            className="w-8 h-8 grid place-items-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Titre 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown('## ')}
            className="w-8 h-8 grid place-items-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Titre 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <button
            onClick={() => insertMarkdown('**', '**')}
            className="w-8 h-8 grid place-items-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Gras"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown('*', '*')}
            className="w-8 h-8 grid place-items-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Italique"
          >
            <Italic className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <button
            onClick={() => insertMarkdown('- ')}
            className="w-8 h-8 grid place-items-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Liste à puces"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown('1. ')}
            className="w-8 h-8 grid place-items-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Liste numérotée"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown('> ')}
            className="w-8 h-8 grid place-items-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Citation"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown('```\n', '\n```')}
            className="w-8 h-8 grid place-items-center text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
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
              placeholder="Rédigez vos notes, secrets, listes de PNJ ou descriptions de scènes (Markdown accepté)"
              className="w-full flex-1 bg-surface/80 backdrop-blur-xl border border-hairline rounded-2xl p-5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-500 font-sans leading-relaxed resize-none custom-scrollbar transition-colors"
            />
          </div>
        )}

        {(previewMode === 'preview' || previewMode === 'split') && (
          <div className={`flex-1 flex flex-col min-h-0 bg-surface/80 backdrop-blur-xl border border-hairline rounded-2xl p-6 overflow-y-auto custom-scrollbar ${previewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            {noteContent.trim() ? (
              renderMarkdownPreview(noteContent)
            ) : (
              <div className="text-zinc-600 italic text-sm text-center mt-12">
                Aucun contenu à prévisualiser.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
