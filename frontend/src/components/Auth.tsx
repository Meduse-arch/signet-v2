import { useState } from 'react';
import { AuthService } from '../core/services/AuthService';
import { Mail, User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { t } from '../core/locales/fr';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export function Auth({ onLogin }: { onLogin: () => void }) {
  const [identifier, setIdentifier] = useState(''); // Email ou Pseudo
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await AuthService.login(identifier, password);
        onLogin();
      } else {
        await AuthService.register(identifier, username, password);
        alert(t('auth_register_success'));
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || t('error_occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#050508] to-[#050508]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1100px] flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-hairline bg-surface/80 backdrop-blur-2xl min-h-[500px] lg:min-h-[650px]">
        
        <div className="hidden lg:flex flex-col justify-between w-full lg:w-1/2 p-8 lg:p-14 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-zinc-900/40 to-transparent z-10 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent z-10"></div>
          <img src="/fantasy_vtt_bg.jpg" alt="Fantasy Landscape" className="absolute inset-0 w-full h-full object-cover z-0 grayscale" />
          
          <div className="relative z-20 mt-auto bg-surface/60 backdrop-blur-xl p-6 rounded-xl border border-hairline">
            <div className="flex items-center gap-4 mb-3">
              <img src="/logo.svg" alt="Signet VTT" className="w-16 h-16" />
              <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
                {t('app_name')}
              </h1>
            </div>
            <p className="text-sm text-zinc-300 font-medium leading-relaxed max-w-md">
              Rejoignez vos amis, lancez les dés et vivez des histoires épiques sur notre Virtual Tabletop nouvelle génération.
            </p>
          </div>
        </div>

        <div className="w-full lg:w-1/2 p-8 sm:p-10 lg:p-14 flex flex-col justify-center bg-surface relative z-20">
          
          {/* Logo visible uniquement sur mobile */}
          <div className="flex lg:hidden flex-col items-center justify-center gap-3 mb-10">
            <img src="/logo.svg" alt="Signet VTT" className="w-16 h-16" />
            <span className="text-3xl font-black text-white tracking-tight">{t('app_name')}</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
              {isLogin ? t('auth_welcome') : t('auth_create_account')}
            </h2>
            <p className="text-zinc-400 text-sm font-medium">
              {isLogin ? t('auth_welcome_sub') : t('auth_create_account_sub')}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-rose-950/30 border border-rose-500/30 text-rose-300 p-4 rounded-lg mb-8 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="animate-fade-in">
                <Input
                  label={t('auth_username_label')}
                  icon={<User className="h-5 w-5" />}
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth_username_placeholder')}
                />
              </div>
            )}

            <Input
              label={isLogin ? t('auth_identifier_label') : t('auth_email_label')}
              icon={<Mail className="h-5 w-5" />}
              type={isLogin ? "text" : "email"}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={isLogin ? t('auth_identifier_placeholder') : t('auth_email_placeholder')}
            />

            <Input
              label={t('auth_password_label')}
              icon={<Lock className="h-5 w-5" />}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth_password_placeholder')}
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="mt-8 w-full"
              rightIcon={<ArrowRight className="w-5 h-5 text-rose-200 group-hover:translate-x-1 group-hover:text-white transition-[color,background-color,border-color,opacity,transform]" />}
            >
              {isLogin ? t('auth_btn_login') : t('auth_btn_register')}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-zinc-400">
            {isLogin ? t('auth_no_account') : t('auth_has_account')}
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsLogin(!isLogin);
                setError(null);
                setIdentifier('');
                setPassword('');
              }}
              className="text-white hover:text-rose-400 transition-colors font-bold underline decoration-zinc-700 hover:decoration-rose-400 underline-offset-4 ml-1"
            >
              {isLogin ? t('auth_btn_register') : t('auth_btn_login')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
