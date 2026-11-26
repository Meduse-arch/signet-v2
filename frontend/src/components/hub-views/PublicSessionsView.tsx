import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Users, Swords, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { t } from '../../core/locales/fr';
import { publicRoomsService } from '../../core/services/publicRoomsService';
import type { PublicRoomInfo } from '../../core/services/publicRoomsService';

interface PublicSessionsViewProps {
  signalUrl?: string;
  onJoinSession?: (roomId: string, system?: string) => void;
}

export function PublicSessionsView({ 
  signalUrl = 'http://localhost:3000/api/signal',
  onJoinSession 
}: PublicSessionsViewProps) {
  const [sessions, setSessions] = useState<PublicRoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const data = await publicRoomsService.fetchPublicRooms(signalUrl);
      setSessions(data);
    } catch (err: any) {
      console.warn('[PublicSessionsView] Erreur récupération sessions:', err);
      setError('Impossible de joindre le serveur de signalement.');
    } finally {
      setLoading(false);
    }
  }, [signalUrl]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 8000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  const filteredSessions = sessions.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.system.toLowerCase().includes(q) ||
      (s.tags && s.tags.toLowerCase().includes(q)) ||
      s.roomId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full h-full flex flex-col animate-fade-in px-4 lg:px-8 mt-4 max-w-6xl mx-auto">
      {/* Entête */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {t('modal_public_title')}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-md border border-hairline text-zinc-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Direct
            </span>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            {t('modal_public_desc')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              setLoading(true);
              loadSessions();
            }}
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* Barre de recherche si des sessions existent */}
      {sessions.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher par nom, système ou ambiance"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-raised border border-hairline rounded-lg px-4 h-11 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      )}

      {/* Zone de contenu */}
      <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
        {loading && sessions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-sm gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
            <span>Recherche des sessions publiques ouvertes…</span>
          </div>
        ) : error && sessions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-hairline rounded-2xl bg-surface/50">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">{error}</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Vérifiez que le serveur de signalement ({signalUrl}) est bien démarré.
            </p>
            <Button variant="ghost" size="sm" onClick={loadSessions} className="mt-4">
              Réessayer
            </Button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 border border-dashed border-hairline rounded-2xl bg-surface/50">
            <Sparkles className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-base font-bold text-white">
              {search ? 'Aucune session ne correspond à votre recherche' : 'Aucune session publique en direct'}
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
              {search
                ? 'Essayez avec un autre mot-clé (nom du jeu, tag...).'
                : "Les parties publiques hébergées par d'autres Maîtres du Jeu apparaîtront ici dès qu'ils lancent leur session avec l'option \"Session Publique\" activée."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSessions.map(s => {
              const isFull = s.maxPlayers !== null && s.players >= s.maxPlayers;
              const tagsList = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

              return (
                <div
                  key={s.roomId}
                  className="bg-surface/75 backdrop-blur-xl border border-hairline hover:border-white/20 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-bold text-lg truncate">
                          {s.name}
                        </h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-hairline text-zinc-500">
                          {s.roomId}
                        </span>
                      </div>

                      {s.desc && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {s.desc}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-zinc-300">
                        <span className="flex items-center gap-1.5 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md">
                          <Swords className="w-3.5 h-3.5" />
                          <span>{s.system}</span>
                        </span>

                        <span className="flex items-center gap-1.5 text-zinc-300 num" title="Joueurs connectés">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {s.maxPlayers ? `${s.players}/${s.maxPlayers} joueurs` : `${s.players} joueur${s.players > 1 ? 's' : ''}`}
                          </span>
                        </span>

                        {s.isRoomOpen && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Plateau ouvert
                          </span>
                        )}
                      </div>

                      {tagsList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          {tagsList.map(tag => (
                            <span
                              key={tag}
                              className="text-[11px] px-2 py-0.5 rounded-md border border-hairline text-zinc-500"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <Button
                        variant={isFull ? 'ghost' : 'glass'}
                        size="sm"
                        disabled={isFull}
                        onClick={() => {
                          if (!isFull && onJoinSession) {
                            onJoinSession(s.roomId, s.system);
                          }
                        }}
                      >
                        {isFull ? t('modal_public_full') : t('modal_public_join')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
