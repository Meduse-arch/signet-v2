import { Globe } from 'lucide-react';
import { t } from '../../core/locales/fr';

export function SettingsView() {
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
        </div>
      </div>
    </div>
  );
}
