import { Globe, Server, LogIn, Copy, ClipboardPaste, Check } from 'lucide-react';

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
  /** Mode actuellement appliqué (sert à désactiver « Appliquer » quand rien ne change) */
  currentMode: DraftMode;
  isSaved: boolean;
}

const MODES: { id: DraftMode; title: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'online', title: 'Internet', desc: 'Serveur de signalement en ligne', icon: <Globe className="w-5 h-5 shrink-0" /> },
  { id: 'host', title: 'Héberger en local', desc: 'Les joueurs se connectent à votre IP', icon: <Server className="w-5 h-5 shrink-0" /> },
  { id: 'join', title: 'Rejoindre en local', desc: "Se connecter à l'IP d'un hôte", icon: <LogIn className="w-5 h-5 shrink-0" /> },
];

/** Panneau de configuration réseau, affiché en ligne dans les Paramètres. */
export function NetworkConfigMenu({
  draftMode, setDraftMode, localIp, isCopied, handleCopy, draftTargetIp, setDraftTargetIp, handlePaste, handleSave, currentMode, isSaved,
}: NetworkConfigMenuProps) {
  const unchanged = draftMode === currentMode && draftMode !== 'join';

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Mode de connexion" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODES.map(mode => {
          const selected = draftMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setDraftMode(mode.id)}
              className={`text-left rounded-xl border p-4 transition-colors ${
                selected ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/[.08] bg-black/20 hover:border-white/20 hover:bg-white/[.03]'
              }`}
            >
              <span className={`block mb-3 transition-colors ${selected ? 'text-rose-400' : 'text-zinc-500'}`}>{mode.icon}</span>
              <span className="block text-sm font-bold text-white">{mode.title}</span>
              <span className="block mt-0.5 text-xs text-zinc-500">{mode.desc}</span>
            </button>
          );
        })}
      </div>

      {draftMode === 'host' && (
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4">
          <p className="text-xs text-zinc-500 mb-2">Votre IP locale, à donner aux joueurs</p>
          <div className="flex items-center justify-between gap-3 h-11 pl-4 pr-1.5 rounded-lg bg-black/40 border border-white/10">
            <code className="text-sm font-mono text-white num">{localIp ?? 'Recherche…'}</code>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!localIp}
              title="Copier l'IP"
              aria-label="Copier l'IP"
              className="w-8 h-8 grid place-items-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-colors"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {draftMode === 'join' && (
        <div className="rounded-xl border border-white/[.08] bg-black/20 p-4">
          <label htmlFor="lan-target-ip" className="block text-xs text-zinc-500 mb-2">IP locale de l'hôte</label>
          <div className="relative">
            <input
              id="lan-target-ip"
              type="text"
              inputMode="decimal"
              placeholder="Ex. 192.168.1.15"
              value={draftTargetIp}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9.]*$/.test(val)) setDraftTargetIp(val);
              }}
              className="w-full h-11 pl-4 pr-12 rounded-lg bg-black/40 border border-white/10 text-sm text-white font-mono num placeholder:font-sans placeholder:text-zinc-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
            <button
              type="button"
              onClick={handlePaste}
              title="Coller l'IP"
              aria-label="Coller l'IP"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-4">
        {isSaved && <span className="flex items-center gap-1.5 text-sm text-emerald-400"><Check className="w-4 h-4" />Appliqué</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={unchanged}
          className="h-11 px-5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-40 disabled:hover:bg-rose-600 disabled:cursor-not-allowed"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}
