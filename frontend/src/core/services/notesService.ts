import { invoke } from '@tauri-apps/api/core';

export interface NoteItem {
  id: string;
  name: string;
  item_type: 'file' | 'folder';
  path: string;
  parent_path: string | null;
  updated_at?: number;
}

const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const WEB_STORAGE_TREE_KEY = 'signet_notes_tree_fallback';
const WEB_STORAGE_CONTENT_PREFIX = 'signet_note_content_';

function getWebTree(): NoteItem[] {
  try {
    const raw = localStorage.getItem(WEB_STORAGE_TREE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveWebTree(tree: NoteItem[]) {
  try {
    localStorage.setItem(WEB_STORAGE_TREE_KEY, JSON.stringify(tree));
  } catch (e) {
    console.error('Erreur sauvegarde localStorage notes tree', e);
  }
}

export const notesService = {
  async getTree(): Promise<NoteItem[]> {
    if (isTauri()) {
      try {
        return await invoke<NoteItem[]>('get_notes_tree');
      } catch (err) {
        console.error('[notesService] Erreur get_notes_tree Tauri', err);
        throw err;
      }
    }

    // Fallback Web / Dev
    return getWebTree();
  },

  async readNote(path: string): Promise<string> {
    if (isTauri()) {
      try {
        return await invoke<string>('read_note_content', { path });
      } catch (err) {
        console.error('[notesService] Erreur read_note_content Tauri', err);
        throw err;
      }
    }

    // Fallback Web
    return localStorage.getItem(WEB_STORAGE_CONTENT_PREFIX + path) || '';
  },

  async saveNote(path: string, content: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('save_note_content', { path, content });
        return;
      } catch (err) {
        console.error('[notesService] Erreur save_note_content Tauri', err);
        throw err;
      }
    }

    // Fallback Web
    localStorage.setItem(WEB_STORAGE_CONTENT_PREFIX + path, content);
    const tree = getWebTree();
    const existing = tree.find(i => i.path === path);
    if (!existing) {
      const parts = path.split('/');
      const fileName = parts[parts.length - 1];
      const displayName = fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName;
      const parentParts = parts.slice(0, -1);
      const parent_path = parentParts.length > 0 ? parentParts.join('/') : null;
      tree.push({
        id: path,
        name: displayName,
        item_type: 'file',
        path,
        parent_path,
        updated_at: Date.now()
      });
      saveWebTree(tree);
    } else {
      existing.updated_at = Date.now();
      saveWebTree(tree);
    }
  },

  async createFolder(path: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('create_note_folder', { path });
        return;
      } catch (err) {
        console.error('[notesService] Erreur create_note_folder Tauri', err);
        throw err;
      }
    }

    // Fallback Web
    const tree = getWebTree();
    if (!tree.some(i => i.path === path)) {
      const parts = path.split('/');
      const name = parts[parts.length - 1];
      const parentParts = parts.slice(0, -1);
      const parent_path = parentParts.length > 0 ? parentParts.join('/') : null;
      tree.push({
        id: path,
        name,
        item_type: 'folder',
        path,
        parent_path,
        updated_at: Date.now()
      });
      saveWebTree(tree);
    }
  },

  async deleteItem(path: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('delete_note_item', { path });
        return;
      } catch (err) {
        console.error('[notesService] Erreur delete_note_item Tauri', err);
        throw err;
      }
    }

    // Fallback Web
    let tree = getWebTree();
    tree = tree.filter(i => i.path !== path && !i.path.startsWith(path + '/'));
    localStorage.removeItem(WEB_STORAGE_CONTENT_PREFIX + path);
    saveWebTree(tree);
  },

  async renameItem(oldPath: string, newPath: string): Promise<void> {
    if (isTauri()) {
      try {
        await invoke('rename_note_item', { oldPath, newPath });
        return;
      } catch (err) {
        console.error('[notesService] Erreur rename_note_item Tauri', err);
        throw err;
      }
    }

    // Fallback Web
    const tree = getWebTree();
    for (const item of tree) {
      if (item.path === oldPath) {
        item.path = newPath;
        item.id = newPath;
        const parts = newPath.split('/');
        const fileName = parts[parts.length - 1];
        item.name = item.item_type === 'file' && fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName;
        const parentParts = parts.slice(0, -1);
        item.parent_path = parentParts.length > 0 ? parentParts.join('/') : null;
      } else if (item.path.startsWith(oldPath + '/')) {
        const subRel = item.path.slice(oldPath.length);
        item.path = newPath + subRel;
        item.id = item.path;
        const parts = item.path.split('/');
        const parentParts = parts.slice(0, -1);
        item.parent_path = parentParts.length > 0 ? parentParts.join('/') : null;
      }
    }
    const content = localStorage.getItem(WEB_STORAGE_CONTENT_PREFIX + oldPath);
    if (content !== null) {
      localStorage.setItem(WEB_STORAGE_CONTENT_PREFIX + newPath, content);
      localStorage.removeItem(WEB_STORAGE_CONTENT_PREFIX + oldPath);
    }
    saveWebTree(tree);
  }
};
