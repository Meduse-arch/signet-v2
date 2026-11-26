import { Globe, Smartphone, Wifi } from 'lucide-react';
import { t } from '../../core/locales/fr';
import { useCompanionPreference, type CompanionPreference } from '../../core/hooks/useCompanionMode';
import { NetworkToggle } from '../NetworkToggle';

const COMPANION_OPTIONS: { value: CompanionPreference; label: string }[] = [
  { value: 'auto', label: 'Automatique' },
  { value: 'on', label: 'Toujours activé' },
  { value: 'off', label: 'Désactivé' },
];

interface SettingsViewProps {
  /** Réseau : fournis par le Hub uniquement (absents quand les Paramètres s'ouvrent en jeu) */
  isLanMode?: boolean;
  onLanModeChange?: (isLan: boolean) => void;
  onSignalUrlChange?: (url: string) => void;
}

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-[#090a10]/75 backdrop-blur-xl border border-white/[.08] p-6">
      <div className="flex items-start gap-4 mb-5">
        <span className="mt-0.5 text-rose-400">{icon}</span>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {desc && <p className="mt-0.5 text-sm text-zinc-500">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SettingsView({ isLanMode, onLanModeChange, onSignalUrlChange }: SettingsViewProps = {}) {
  const [companionPref, setCompanionPref] = useCompanionPreference();
  const showNetwork = isLanMode !== undefined && onLanModeChange !== undefined && onSignalUrlChange !== undefined;

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4">
      <h2 className="text-4xl font-black text-white mb-8 drop-shadow-xl">{t('modal_settings_title')}</h2>

      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        <div className="max-w-3xl flex flex-col gap-5">

          {showNetwork && (
            <Section icon={<Wifi className="w-5 h-5" aria-hidden="true" />} title="Réseau" desc="Comment vous vous connectez aux tables">
              <NetworkToggle isLanMode={isLanMode} onLanModeChange={onLanModeChange} onSignalUrlChange={onSignalUrlChange} />
            </Section>
          )}

          <Section icon={<Globe className="w-5 h-5" aria-hidden="true" />} title={t('modal_settings_language')}>
            <div role="radiogroup" aria-label={t('modal_settings_language')} className="flex flex-wrap gap-3">
              <button
                type="button"
                role="radio"
                aria-checked="true"
                className="h-11 px-5 rounded-lg border border-rose-500/50 bg-rose-500/5 text-sm font-bold text-white"
              >
                {t('modal_settings_lang_fr')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked="false"
                disabled
                className="h-11 px-5 rounded-lg border border-white/[.06] bg-black/20 text-sm text-zinc-500 cursor-not-allowed"
              >
                English <span className="text-zinc-600">· bientôt</span>
              </button>
            </div>
          </Section>

          <Section
            icon={<Smartphone className="w-5 h-5" aria-hidden="true" />}
            title="Mode Compagnon"
            desc="Interface simplifiée (fiche, dés, chat) sans la table de jeu. Automatique sur écran tactile étroit."
          >
            <div role="radiogroup" aria-label="Mode Compagnon" className="flex flex-wrap gap-3">
              {COMPANION_OPTIONS.map(opt => {
                const selected = companionPref === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setCompanionPref(opt.value)}
                    className={`h-11 px-5 rounded-lg border text-sm whitespace-nowrap transition-colors ${
                      selected ? 'border-rose-500/50 bg-rose-500/5 text-white font-bold' : 'border-white/[.08] bg-black/20 text-zinc-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
