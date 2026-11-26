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
    </div>
  );
}
