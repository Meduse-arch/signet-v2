import { Globe, Smartphone } from 'lucide-react';
import { t } from '../../core/locales/fr';
import { useCompanionPreference, type CompanionPreference } from '../../core/hooks/useCompanionMode';

const COMPANION_OPTIONS: { value: CompanionPreference; label: string }[] = [
  { value: 'auto', label: 'Automatique' },
  { value: 'on', label: 'Toujours activé' },
  { value: 'off', label: 'Désactivé' },
];

export function SettingsView() {
  const [companionPref, setCompanionPref] = useCompanionPreference();

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-white mb-2 drop-shadow-xl">{t('modal_settings_title')}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="max-w-2xl">
          {/* Paramètre de Langue demandé par l'utilisateur */}
          <div className="bg-white/5 border border-zinc-800 rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-rose-400" />
              <h3 className="text-xl text-white font-bold">{t('modal_settings_language')}</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex-1 flex items-center gap-4 p-4 bg-black/40 border-2 border-rose-500/50 rounded-md cursor-pointer transition-colors hover:bg-rose-500/5 shadow-[0_0_15px_rgba(225,29,72,0.1)]">
                <input type="radio" name="lang" value="fr" defaultChecked className="accent-rose-500 w-5 h-5" />
                <span className="text-white font-bold text-lg">{t('modal_settings_lang_fr')} 🇫🇷</span>
              </label>
              <label className="flex-1 flex items-center gap-4 p-4 bg-black/20 border-2 border-white/5 rounded-md cursor-not-allowed opacity-50">
                <input type="radio" name="lang" value="en" disabled className="accent-zinc-500 w-5 h-5" />
                <span className="text-white font-bold text-lg">English 🇬🇧 (Bientôt)</span>
              </label>
            </div>
          </div>

          {/* Mode Compagnon mobile (fiches + dés + chat) */}
          <div className="bg-white/5 border border-zinc-800 rounded-lg p-8 mt-6">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-6 h-6 text-rose-400" aria-hidden="true" />
              <h3 className="text-xl text-white font-bold">Mode Compagnon</h3>
            </div>
            <p className="text-sm text-zinc-300 mb-6">
              Interface simplifiée (fiche, dés, chat) sans la table de jeu. Automatique sur écran tactile étroit.
            </p>
            <div role="radiogroup" aria-label="Mode Compagnon" className="flex flex-col sm:flex-row gap-3">
              {COMPANION_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex-1 flex items-center gap-3 p-4 min-h-[44px] rounded-md border-2 cursor-pointer transition-colors ${
                    companionPref === opt.value ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/5 bg-black/20 hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="companion-mode"
                    value={opt.value}
                    checked={companionPref === opt.value}
                    onChange={() => setCompanionPref(opt.value)}
                    className="accent-rose-500 w-5 h-5"
                  />
                  <span className="text-white font-bold">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
