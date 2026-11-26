import { Button } from '../../../../components/ui/Button';

interface CompendiumEntry {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

interface CompendiumModalProps {
  type: 'skill' | 'item';
  entries: CompendiumEntry[];
  onClose: () => void;
  onImport: (entry: CompendiumEntry) => void;
}

export function CompendiumModal({ type, entries, onClose, onImport }: CompendiumModalProps) {
  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col p-4">
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
        <h3 className="font-bold text-white text-lg">
          {type === 'skill' ? 'Bibliothèque de Compétences' : 'Bibliothèque d\'Objets'}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => onClose()}>Fermer</Button>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {entries.length === 0 ? (
          <p className="text-zinc-500 text-center mt-10">Aucun élément dans le compendium.</p>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center justify-between group hover:bg-white/10 transition-colors">
              <div>
                <h4 className="font-bold text-zinc-200">{entry.name}</h4>
                <p className="text-xs text-zinc-400 line-clamp-1">{entry.description}</p>
              </div>
              <Button size="sm" onClick={() => onImport(entry)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                Importer
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
