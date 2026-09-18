import { useState } from 'react';
import { Button } from '../ui/Button';
import { Plus, FolderPlus, FileText, Folder, ArrowLeft } from 'lucide-react';
import { t } from '../../core/locales/fr';

export function NotesView() {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  const [items, setItems] = useState([
    { id: 1, type: 'folder', name: 'Campagne D&D', parentId: null },
    { id: 2, type: 'folder', name: 'Règles maison', parentId: null },
    { id: 3, type: 'file', name: 'Idées de quêtes', parentId: null },
    { id: 4, type: 'file', name: 'PNJ Tavernier', parentId: null },
    
    // Contenu de "Campagne D&D" (id: 1)
    { id: 5, type: 'file', name: 'Résumé Session 1', parentId: 1 },
    { id: 6, type: 'file', name: 'Quête Principale', parentId: 1 },
    { id: 7, type: 'folder', name: 'Cartes', parentId: 1 },
    
    // Contenu de "Cartes" (id: 7)
    { id: 8, type: 'file', name: 'Région Nord', parentId: 7 },
  ]);

  const currentFolder = currentFolderId ? items.find(i => i.id === currentFolderId) : null;
  const currentItems = items.filter(i => i.parentId === currentFolderId);

  // Grouper les éléments courants par lettre alphabétique
  const groupedItems = currentItems.reduce((acc, item) => {
    const letter = item.name.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const sortedLetters = Object.keys(groupedItems).sort();

  const handleItemClick = (item: any) => {
    if (item.type === 'folder') {
      setCurrentFolderId(item.id);
    } else {
      alert("Ouvrir la note : " + item.name); // Bientôt: ouvrir la vraie note
    }
  };

  const handleBack = () => {
    if (currentFolderId) {
      const folder = items.find(i => i.id === currentFolderId);
      setCurrentFolderId(folder?.parentId || null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4">
      <div className="flex flex-wrap justify-between items-start mb-10 gap-4">
        <div className="min-w-[200px] flex-1">
          {currentFolderId && currentFolder ? (
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeft className="w-5 h-5" />}>
                Retour
              </Button>
              <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow-xl truncate">{currentFolder.name}</h2>
            </div>
          ) : (
            <>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-xl">{t('modal_notes_title')}</h2>
              <p className="text-zinc-300 font-medium text-sm drop-shadow-md break-words">{t('modal_notes_desc')}</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-start shrink-0">
          <Button variant="glass" size="sm" leftIcon={<FolderPlus className="w-4 h-4" />}>
            Nouveau Dossier
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Nouvelle Note
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 pb-12">
        
        {sortedLetters.length === 0 && (
          <div className="text-center text-zinc-500 mt-12 font-medium">Ce dossier est vide.</div>
        )}

        {sortedLetters.map(letter => (
          <div key={letter} className="mb-8 animate-fade-in">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl font-black text-rose-500/30 drop-shadow-lg">{letter}</span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-rose-500/30 to-transparent"></div>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
              {groupedItems[letter].map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-sm hover:bg-white/10 rounded-lg cursor-pointer transition-all hover:scale-105 border border-white/5 hover:border-white/20 group shadow-xl"
                >
                  {item.type === 'folder' ? (
                    <Folder className="w-10 h-10 text-rose-400/80 group-hover:text-rose-400 mb-2 drop-shadow-lg transition-colors" />
                  ) : (
                    <FileText className="w-10 h-10 text-zinc-300/80 group-hover:text-white mb-2 drop-shadow-lg transition-colors" />
                  )}
                  <span className="text-white text-xs text-center font-bold tracking-wide leading-tight break-words w-full">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
