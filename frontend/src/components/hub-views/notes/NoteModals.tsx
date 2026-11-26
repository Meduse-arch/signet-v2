import { Button } from '../../ui/Button';
import { FolderPlus, FileText, X, AlertCircle } from 'lucide-react';
import type { NoteItem } from '../../../core/services/notesService';

interface NameModalProps {
  name: string;
  setName: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function NewFolderModal({ name, setName, onSubmit, onClose }: NameModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#090a10] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-rose-500" />
            <span>Nouveau Dossier</span>
          </h3>
          <button onClick={() => onClose()} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Nom du dossier :</label>
            <input
              type="text"
              placeholder="Ex: Campagne Hexe, PNJ, Lieux..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => onClose()}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={!name.trim()}>
              Créer le dossier
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewNoteModal({ name, setName, onSubmit, onClose }: NameModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#090a10] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-500" />
            <span>Nouvelle Note</span>
          </h3>
          <button onClick={() => onClose()} className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Titre de la note :</label>
            <input
              type="text"
              placeholder="Ex: Résumé de session, Idée de donjon..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => onClose()}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={!name.trim()}>
              Créer et ouvrir
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RenameModalProps {
  item: NoteItem;
  value: string;
  setValue: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function RenameModal({ item, value, setValue, onSubmit, onClose }: RenameModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#090a10] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <h3 className="text-base font-bold text-white">
          Renommer {item.item_type === 'folder' ? 'le dossier' : 'la note'}
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => onClose()}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={!value.trim()}>
              Renommer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteModalProps {
  item: NoteItem;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteModal({ item, onConfirm, onClose }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#090a10] border border-rose-500/30 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-[0_0_30px_rgba(225,29,72,0.2)]">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-white">Confirmer la suppression</h3>
            <p className="text-xs text-slate-400 mt-1">
              Êtes-vous sûr de vouloir supprimer définitivement{' '}
              <strong className="text-slate-200">« {item.name} »</strong>
              {item.item_type === 'folder' ? ' et tout son contenu' : ''} ?
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => onClose()}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
