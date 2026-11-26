import { useNotes } from './notes/useNotes';
import { NoteEditor } from './notes/NoteEditor';
import { NoteExplorer } from './notes/NoteExplorer';
import { NewFolderModal, NewNoteModal, RenameModal, DeleteModal } from './notes/NoteModals';

export function NotesView() {
  const notes = useNotes();
  const {
    activeNote, showNewFolderModal, setShowNewFolderModal, newFolderName, setNewFolderName, handleCreateFolder,
    showNewNoteModal, setShowNewNoteModal, newNoteName, setNewNoteName, handleCreateNote,
    renamingItem, setRenamingItem, renameValue, setRenameValue, handleConfirmRename,
    itemToDelete, setItemToDelete, handleConfirmDelete,
  } = notes;

  return (
    <>
      {activeNote ? <NoteEditor notes={notes} /> : <NoteExplorer notes={notes} />}

      {showNewFolderModal && (
        <NewFolderModal
          name={newFolderName}
          setName={setNewFolderName}
          onSubmit={handleCreateFolder}
          onClose={() => setShowNewFolderModal(false)}
        />
      )}
      {showNewNoteModal && (
        <NewNoteModal
          name={newNoteName}
          setName={setNewNoteName}
          onSubmit={handleCreateNote}
          onClose={() => setShowNewNoteModal(false)}
        />
      )}
      {renamingItem && (
        <RenameModal
          item={renamingItem}
          value={renameValue}
          setValue={setRenameValue}
          onSubmit={handleConfirmRename}
          onClose={() => setRenamingItem(null)}
        />
      )}
      {itemToDelete && (
        <DeleteModal
          item={itemToDelete}
          onConfirm={handleConfirmDelete}
          onClose={() => setItemToDelete(null)}
        />
      )}
    </>
  );
}
