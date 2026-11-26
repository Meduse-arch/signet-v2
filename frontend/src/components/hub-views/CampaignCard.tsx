export interface CampaignCardData {
  id: string;
  name: string;
  date?: string;
  hue?: string;
  system?: string;
  isHost?: boolean;
  /** Image personnalisée de la campagne (si absente : plateau tactique par défaut) */
  imageUrl?: string;
}

interface CampaignCardProps {
  camp: CampaignCardData;
  onOpen: () => void;
}

/** Plateau tactique : quadrillage, salles, pions. Positions dérivées de l'id pour rester stables. */
function TacticalBoard({ id, hue }: { id: string; hue: number }) {
  const seed = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const at = (n: number, span: number, base: number) => base + ((seed * (n + 3)) % span);
  const pawns = [0, 1, 2, 3].map(n => ({
    left: at(n, 60, 12) + n * 4,
    top: at(n + 5, 34, 14) + n * 6,
    shift: n * 70,
  }));
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: `hsl(${hue} 14% 9%)`,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.09) 1px,transparent 1px)',
        backgroundSize: '34px 34px',
      }}
      aria-hidden="true"
    >
      <div
        className="absolute rounded-[4px] border"
        style={{ left: '8%', top: '12%', width: '46%', height: '38%', borderColor: `hsl(${hue} 25% 40%)`, background: `hsl(${hue} 18% 15%)` }}
      />
      <div
        className="absolute rounded-[4px] border"
        style={{ left: '50%', top: '30%', width: '34%', height: '34%', borderColor: `hsl(${hue} 25% 40%)`, background: `hsl(${hue} 18% 15%)` }}
      />
      {pawns.map((p, i) => (
        <span
          key={i}
          className="absolute w-5 h-5 rounded-full ring-2 ring-[#0a0b11]"
          style={{ left: `${p.left}%`, top: `${p.top}%`, background: `hsl(${(hue + p.shift) % 360} 65% 62%)` }}
        />
      ))}
    </div>
  );
}

export function CampaignCard({ camp, onOpen }: CampaignCardProps) {
  const isHost = camp.isHost !== false;
  const hue = Number.parseInt(camp.hue ?? '', 10);
  const safeHue = Number.isNaN(hue) ? 350 : hue;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-[340px] h-[250px] shrink-0 rounded-xl overflow-hidden text-left border border-white/10 hover:border-white/30 transition-colors"
    >
      {camp.imageUrl ? (
        <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url("${camp.imageUrl}")` }} />
      ) : (
        <TacticalBoard id={camp.id} hue={safeHue} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/95 via-[#050508]/70 to-transparent" />

      <span
        className={`absolute top-3 right-3 text-xs font-semibold rounded-md px-2 py-0.5 border bg-black/30 ${
          isHost ? 'text-rose-200 border-rose-400/40' : 'text-zinc-300 border-white/20'
        }`}
      >
        {isHost ? 'MJ' : 'Joueur'}
      </span>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="text-lg font-bold text-white leading-snug drop-shadow-md truncate">{camp.name}</h3>
        <p className="mt-0.5 text-sm text-zinc-400 truncate">
          {camp.system ? `${camp.system} · ` : ''}Dernière session : {camp.date ?? '—'}
        </p>
        <p className="mt-2 font-mono text-xs text-zinc-500">{camp.id}</p>
      </div>
    </button>
  );
}
