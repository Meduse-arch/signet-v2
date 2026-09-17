import React from 'react';
import { Server, CheckCircle2, Copy, ClipboardPaste, Check } from 'lucide-react';

export type DraftMode = 'online' | 'host' | 'join';

interface NetworkConfigMenuProps {
  draftMode: DraftMode;
  setDraftMode: (mode: DraftMode) => void;
  localIp: string | null;
  isCopied: boolean;
  handleCopy: () => void;
  draftTargetIp: string;
  setDraftTargetIp: (ip: string) => void;
  handlePaste: () => void;
  handleSave: () => void;
}

export function NetworkConfigMenu({
  draftMode,
  setDraftMode,
  localIp,
  isCopied,
  handleCopy,
  draftTargetIp,
  setDraftTargetIp,
  handlePaste,
  handleSave
}: NetworkConfigMenuProps) {
  return (
    <div className="w-[calc(100vw-2rem)] sm:w-80 p-4 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 shadow-2xl relative flex flex-col gap-4">
      <div className="flex items-center justify-between text-emerald-400">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4" />
          <h4 className="text-sm font-bold uppercase tracking-wider">Configuration Réseau</h4>
        </div>
      </div>

      {/* Switch Mode (Online / Host / Join) */}
      <div className="flex bg-black/40 rounded-lg p-1 border border-zinc-800">
        <button 
          onClick={() => setDraftMode('online')}
          className={`flex-1 text-xs py-1.5 rounded-md font-bold transition-all ${draftMode === 'online' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          ONLINE
        </button>
        <button 
          onClick={() => setDraftMode('host')}
          className={`flex-1 text-xs py-1.5 rounded-md font-bold transition-all ${draftMode === 'host' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          HÉBERGER
        </button>
        <button 
          onClick={() => setDraftMode('join')}
          className={`flex-1 text-xs py-1.5 rounded-md font-bold transition-all ${draftMode === 'join' ? 'bg-rose-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          REJOINDRE
        </button>
      </div>
      
      {/* Contenu dynamique selon le mode */}
      {draftMode === 'host' && (
        <div className="animate-fade-in">
          <p className="text-xs text-zinc-400 mb-1">Votre IP Locale (donnez-la aux joueurs) :</p>
          <div className="flex items-center justify-between bg-black/50 rounded-lg p-2 border border-zinc-800">
            <code className="text-sm font-mono text-orange-300">{localIp || 'Recherche...'}</code>
            <button 
              onClick={handleCopy}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-orange-400"
              title="Copier l'IP"
            >
              {isCopied ? <Check className="w-4 h-4 text-orange-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {draftMode === 'join' && (
        <div className="animate-fade-in">
          <p className="text-xs text-zinc-400 mb-1">Entrez l'IP Locale de l'hôte :</p>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ex: 192.168.1.15"
              value={draftTargetIp}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9.]*$/.test(val)) {
                  setDraftTargetIp(val);
                }
              }}
              className="w-full bg-black/50 border border-zinc-700 rounded-lg pl-3 pr-10 py-2 text-sm text-rose-300 font-mono focus:outline-none focus:border-rose-500 transition-colors placeholder-zinc-600"
            />
            <button 
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-rose-400"
              title="Coller l'IP"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bouton de sauvegarde */}
      <button 
        onClick={handleSave}
        className="mt-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-lg border border-zinc-600 transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4" /> Sauvegarder
      </button>

    </div>
  );
}
