import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppWindow, ArrowLeft, BookOpen, ChevronRight, Dices, Ellipsis, LogOut, MessageSquare, Settings, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ModManager } from '../../core/services/ModManager';
import type { CompanionTab, RegisteredWindow } from '../../core/services/ModManager';
import { coreEventBus } from '../../core/services/EventBus';
import { useVisualViewportHeight } from '../../core/hooks/useVisualViewportHeight';
import { ModuleOverlays } from '../game/ModuleOverlays';

type TabId = 'sheet' | 'dice' | 'chat' | 'more';

interface CompanionShellProps {
  sessionName: string;
  username: string;
  /** Retour au lobby de la session */
  onBack: () => void;
  /** Quitter définitivement la session (retour au Hub) */
  onQuit: () => void;
}

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'sheet', label: 'Fiche', icon: Users },
  { id: 'dice', label: 'Dés', icon: Dices },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'more', label: 'Plus', icon: Ellipsis },
];

const EMPTY_MESSAGES: Record<TabId, string> = {
  sheet: 'Aucune fiche disponible pour ce système de jeu.',
  dice: 'Le lanceur de dés est désactivé.',
  chat: 'Le chat est désactivé.',
  more: '',
};

/** Icônes de repli pour les fenêtres enregistrées sans `icon` (onglet Plus) */
const FALLBACK_ICONS: Record<string, LucideIcon> = {
  'system-notes': BookOpen,
  'system-settings': Settings,
};

function windowIcon(w: RegisteredWindow): ReactNode {
  if (w.icon) return w.icon;
  const Icon = FALLBACK_ICONS[w.windowId] ?? AppWindow;
  return <Icon />;
}

function windowKey(w: RegisteredWindow): string {
  return `${w.modId}:${w.windowId}`;
}

/**
 * Coque du Mode Compagnon : un seul panneau à la fois (fiche, dés, chat, plus),
 * sans fenêtres flottantes ni canvas. Les contenus viennent des modules, via
 * `RegisteredWindow.companionTab`. Les panneaux déjà visités restent montés
 * (masqués) pour ne pas perdre l'état du chat ou d'une fiche en cours d'édition.
 */
export function CompanionShell({ sessionName, username, onBack, onQuit }: CompanionShellProps) {
  const [windows, setWindows] = useState<RegisteredWindow[]>(() => ModManager.getWindows());
  const [activeTab, setActiveTab] = useState<TabId>('sheet');
  const [visited, setVisited] = useState<TabId[]>(['sheet']);
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [moreKey, setMoreKey] = useState<string | null>(null);
  // Clavier virtuel : la coque suit la zone réellement visible et libère la barre d'onglets
  const { height: visibleHeight, keyboardOpen } = useVisualViewportHeight();

  // Les modules s'enregistrent après le montage : on suit les mises à jour
  useEffect(() => {
    const sync = () => setWindows([...ModManager.getWindows()]);
    coreEventBus.on('SYSTEM_UI_UPDATED', sync);
    sync();
    return () => coreEventBus.off('SYSTEM_UI_UPDATED', sync);
  }, []);

  const byTab = useMemo(() => {
    const group = (tab: CompanionTab) => windows.filter(w => w.companionTab === tab);
    return { sheet: group('sheet'), dice: group('dice'), chat: group('chat'), more: group('more') };
  }, [windows]);

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    setVisited(prev => (prev.includes(tab) ? prev : [...prev, tab]));
    if (tab === 'more') setMoreKey(null);
  };

  const sheets = byTab.sheet;
  const currentSheet = sheets.find(w => windowKey(w) === sheetKey) ?? sheets[0];
  const currentMore = byTab.more.find(w => windowKey(w) === moreKey);

  const renderPanel = (tab: TabId) => {
    if (tab === 'sheet') {
      if (!currentSheet) return <EmptyState text={EMPTY_MESSAGES.sheet} />;
      return (
        <div className="flex flex-col h-full">
          {sheets.length > 1 && (
            <div role="tablist" aria-label="Fiches" className="flex gap-2 overflow-x-auto p-2 shrink-0 border-b border-white/10">
              {sheets.map(w => {
                const selected = windowKey(w) === windowKey(currentSheet);
                return (
                  <button
                    key={windowKey(w)}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setSheetKey(windowKey(w))}
                    className={`shrink-0 min-h-[44px] px-4 rounded-md text-sm font-semibold whitespace-nowrap transition-colors ${
                      selected ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30' : 'text-slate-300 border border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {w.title}
                  </button>
                );
              })}
            </div>
          )}
          <div key={windowKey(currentSheet)} className="flex-1 min-h-0 overflow-y-auto">{currentSheet.component}</div>
        </div>
      );
    }

    if (tab === 'dice' || tab === 'chat') {
      const win = byTab[tab][0];
      if (!win) return <EmptyState text={EMPTY_MESSAGES[tab]} />;
      return <div className="h-full overflow-y-auto">{win.component}</div>;
    }

    // Onglet « Plus »
    if (currentMore) {
      return (
        <div className="flex flex-col h-full">
          <button
            onClick={() => setMoreKey(null)}
            className="shrink-0 flex items-center gap-2 min-h-[44px] px-4 text-sm font-semibold text-slate-300 hover:text-white border-b border-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">Plus</span>
          </button>
          <div className="flex-1 min-h-0 overflow-y-auto">{currentMore.component}</div>
        </div>
      );
    }
    return (
      <div className="p-4 flex flex-col gap-3">
        {byTab.more.map(w => (
          <button
            key={windowKey(w)}
            onClick={() => setMoreKey(windowKey(w))}
            className="flex items-center gap-3 min-h-[56px] px-4 rounded-lg bg-slate-950/80 border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
          >
            <span className="w-5 h-5 shrink-0 [&>svg]:w-full [&>svg]:h-full" aria-hidden="true">{windowIcon(w)}</span>
            <span className="flex-1 text-left truncate">{w.title}</span>
            <ChevronRight className="w-5 h-5 shrink-0 text-white/60" aria-hidden="true" />
          </button>
        ))}
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 min-h-[56px] px-4 rounded-lg bg-slate-950/80 border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">Retour au salon</span>
        </button>
        <button
          onClick={onQuit}
          className="flex items-center justify-center gap-2 min-h-[56px] px-4 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-300 font-semibold hover:bg-rose-600/30 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">Quitter la session</span>
        </button>
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col relative bg-[#050508] text-white pointer-events-auto"
      style={visibleHeight !== null ? { height: visibleHeight } : undefined}
    >
      <header className="shrink-0 flex items-center gap-1 pl-1 pr-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <button
          onClick={onBack}
          aria-label="Retour au salon"
          className="shrink-0 w-11 h-11 flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 min-w-0 truncate text-base font-bold tracking-tight">{sessionName}</h1>
        <span className="shrink-0 max-w-[40%] truncate text-sm font-medium text-rose-300">{username}</span>
      </header>

      <main className="flex-1 min-h-0 relative">
        {TABS.map(tab =>
          visited.includes(tab.id) ? (
            <section
              key={tab.id}
              id={`companion-panel-${tab.id}`}
              aria-labelledby={`companion-tab-${tab.id}`}
              hidden={activeTab !== tab.id}
              className="absolute inset-0 overflow-hidden"
            >
              {renderPanel(tab.id)}
            </section>
          ) : null
        )}
      </main>

      <nav
        aria-label="Navigation du mode compagnon"
        hidden={keyboardOpen}
        className="shrink-0 flex border-t border-white/10 bg-slate-950/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          return (
            <button
              key={id}
              id={`companion-tab-${id}`}
              aria-controls={`companion-panel-${id}`}
              aria-current={selected ? 'page' : undefined}
              onClick={() => selectTab(id)}
              className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 text-xs font-semibold border-t-2 transition-colors ${
                selected ? 'text-rose-400 border-rose-500' : 'text-white/60 border-transparent hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Overlays des modules (animations de dés…) — sans la navigation desktop (Taskbar) */}
      <ModuleOverlays exclude={['nav-wrapper']} />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center p-6 text-center text-slate-300 text-sm">{text}</div>
  );
}
