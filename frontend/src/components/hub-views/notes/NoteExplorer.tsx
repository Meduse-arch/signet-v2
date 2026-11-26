import React from 'react';
import { Button } from '../../ui/Button';
import { Plus, FolderPlus, FileText, Folder, Trash2, Edit3, Search, ChevronRight } from 'lucide-react';
import { t } from '../../../core/locales/fr';
import type { NotesState } from './useNotes';

export function NoteExplorer({ notes }: { notes: NotesState }) {
  const { loading, currentPath, setCurrentPath, search, setSearch, setShowNewFolderModal, setNewFolderName, setShowNewNoteModal, setNewNoteName, setRenamingItem, setRenameValue, setItemToDelete, handleOpenNote, breadcrumbParts, sortedItems } = notes;

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4 max-w-6xl mx-auto">
      {/* Entête principal */}
      <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
        <div className="min-w-[200px] flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {t('modal_notes_title')}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-md border border-hairline text-zinc-400">
              AppData
            </span>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
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
            leftIcon={<FolderPlus className="w-4 h-4" />}
          >
            Nouveau dossier
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
            Nouvelle note
          </Button>
        </div>
      </div>

      {/* Barre de navigation & Recherche */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface/80 backdrop-blur-xl border border-hairline rounded-xl mb-4">
        {/* Fil d'Ariane */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
          <button
            onClick={() => setCurrentPath(null)}
            className={`transition-colors hover:text-white px-2 py-1 rounded-md hover:bg-white/5 ${
              currentPath === null ? 'text-white' : 'text-zinc-500'
            }`}
          >
            Notes
          </button>
          {breadcrumbParts.map((part, index) => {
            const subPath = breadcrumbParts.slice(0, index + 1).join('/');
            const isLast = index === breadcrumbParts.length - 1;
            return (
              <React.Fragment key={subPath}>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <button
                  onClick={() => setCurrentPath(subPath)}
                  className={`transition-colors hover:text-white px-2 py-1 rounded-md hover:bg-white/5 truncate max-w-[150px] ${
                    isLast ? 'text-white' : 'text-zinc-500'
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
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une note"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-raised border border-hairline rounded-lg pl-8 pr-3 h-9 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Grille des éléments */}
      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
            Chargement des documents…
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-hairline rounded-2xl bg-surface/50">
            <FileText className="w-10 h-10 text-zinc-600 mb-2" />
            <p className="text-sm font-semibold text-zinc-400">
              {search ? 'Aucune note ne correspond à votre recherche' : 'Ce dossier est vide'}
            </p>
            <p className="text-xs text-zinc-600 mt-1 max-w-sm">
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
                  className="group relative flex flex-col items-center justify-center p-4 bg-surface/75 backdrop-blur-xl rounded-xl cursor-pointer transition-colors border border-hairline hover:border-white/20 text-center"
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
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="Renommer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Icône */}
                  <div className="mb-2">
                    {isFolder ? (
                      <Folder className="w-12 h-12 text-rose-500/80 group-hover:text-rose-400 transition-colors" />
                    ) : (
                      <FileText className="w-12 h-12 text-zinc-500 group-hover:text-white transition-colors" />
                    )}
                  </div>

                  {/* Nom */}
                  <span className="text-[13px] font-medium text-zinc-200 group-hover:text-white break-words w-full line-clamp-2">
                    {item.name}
                  </span>

                  {/* Format date discrète */}
                  {item.updated_at && (
                    <span className="num text-[11px] text-zinc-600 mt-1">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
