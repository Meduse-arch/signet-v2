import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon, Upload, Trash2, AlertCircle,
  Swords, Shield, Sparkles, FlaskConical, Package, Zap, Flame, RefreshCw
} from 'lucide-react';
import type { HexeEquipmentSlot, HexeActivationType } from '../types';

/**
 * Résout une URL d'image Hexe qu'il s'agisse d'un hash Tauri, d'une Data URL base64 ou d'une URL HTTP.
 */
export function resolveHexeImageUrl(img?: string, api?: any): string | undefined {
  if (!img) return undefined;
  if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
    return img;
  }
  if (api?.library?.getAssetUrl) {
    try {
      return api.library.getAssetUrl(img);
    } catch {
      return img;
    }
  }
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return `http://signet.localhost/library/${img}`;
  }
  return img;
}

/**
 * Traite et persiste une image (Tauri native asset upload avec fallback en Data URL optimisée).
 */
export async function uploadHexeImage(file: File, api?: any): Promise<string> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Format non supporté. Veuillez sélectionner une image JPG, PNG, WebP, GIF ou SVG.');
  }

  const MAX_SIZE_MB = 5;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`L'image dépasse la limite de ${MAX_SIZE_MB} Mo.`);
  }

  // 1. Upload via le protocole / store natif de Signet si présent
  if (api?.library?.uploadAsset) {
    try {
      const hash = await api.library.uploadAsset(file);
      if (hash) return hash;
    } catch (e) {
      console.warn('[Hexe] Échec uploadAsset natif, repli en Data URL:', e);
    }
  }

  // 2. Mode Web ou repli : conversion en Data URL avec compression Canvas si nécessaire
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (file.type === 'image/svg+xml' || file.size < 200 * 1024) {
        return resolve(dataUrl);
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/webp', 0.85);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Composant d'affichage d'illustration Hexe (avec gestion des erreurs et icône par défaut).
 */
export interface HexeItemImageProps {
  src?: string;
  alt?: string;
  fallbackSlot?: HexeEquipmentSlot;
  fallbackType?: HexeActivationType;
  className?: string;
  api?: any;
}

export function HexeItemImage({
  src,
  alt = 'Illustration',
  fallbackSlot,
  fallbackType,
  className = 'w-10 h-10 rounded-lg',
  api
}: HexeItemImageProps) {
  const [loadError, setLoadError] = useState(false);
  const resolved = src ? resolveHexeImageUrl(src, api) : undefined;

  // Rendu de l'icône par défaut selon le slot d'équipement ou le type de compétence
  const renderFallbackIcon = () => {
    if (fallbackSlot === 'weapon') {
      return <Swords className="w-1/2 h-1/2 text-rose-400/80" />;
    }
    if (fallbackSlot === 'armor') {
      return <Shield className="w-1/2 h-1/2 text-amber-400/80" />;
    }
    if (fallbackSlot === 'accessory') {
      return <Sparkles className="w-1/2 h-1/2 text-cyan-400/80" />;
    }
    if (fallbackSlot === 'consumable') {
      return <FlaskConical className="w-1/2 h-1/2 text-emerald-400/80" />;
    }
    if (fallbackSlot === 'other') {
      return <Package className="w-1/2 h-1/2 text-sky-400/80" />;
    }

    if (fallbackType === 'passive') {
      return <Shield className="w-1/2 h-1/2 text-emerald-400/80" />;
    }
    if (fallbackType === 'toggle') {
      return <Zap className="w-1/2 h-1/2 text-amber-400/80" />;
    }
    if (fallbackType === 'active') {
      return <Flame className="w-1/2 h-1/2 text-rose-400/80" />;
    }

    return <Package className="w-1/2 h-1/2 text-slate-500" />;
  };

  if (!resolved || loadError) {
    return (
      <div className={`bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${className}`}>
        {renderFallbackIcon()}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black/60 border border-white/10 shrink-0 shadow-sm ${className}`}>
      <img
        src={resolved}
        alt={alt}
        onError={() => setLoadError(true)}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

/**
 * Grande bannière pour la vue dépliée détaillée d'un objet ou d'un sort.
 */
export function HexeItemDetailBanner({
  src,
  alt = 'Illustration',
  fallbackSlot,
  fallbackType,
  className = 'w-full h-44 rounded-xl',
  api
}: HexeItemImageProps) {
  const [loadError, setLoadError] = useState(false);
  const resolved = src ? resolveHexeImageUrl(src, api) : undefined;

  const renderFallback = () => {
    let Icon = Package;
    let iconColor = 'text-slate-400';
    let gradient = 'from-black/80 via-slate-950/40 to-black/90';
    let label = 'Équipement';

    if (fallbackSlot === 'weapon') {
      Icon = Swords;
      iconColor = 'text-rose-400';
      gradient = 'from-black/90 via-rose-950/25 to-black/95';
      label = 'Arme';
    } else if (fallbackSlot === 'armor') {
      Icon = Shield;
      iconColor = 'text-amber-400';
      gradient = 'from-black/90 via-amber-950/25 to-black/95';
      label = 'Armure';
    } else if (fallbackSlot === 'accessory') {
      Icon = Sparkles;
      iconColor = 'text-cyan-400';
      gradient = 'from-black/90 via-cyan-950/25 to-black/95';
      label = 'Accessoire';
    } else if (fallbackSlot === 'consumable') {
      Icon = FlaskConical;
      iconColor = 'text-emerald-400';
      gradient = 'from-black/90 via-emerald-950/25 to-black/95';
      label = 'Consommable';
    } else if (fallbackType === 'passive') {
      Icon = Shield;
      iconColor = 'text-emerald-400';
      gradient = 'from-black/90 via-emerald-950/25 to-black/95';
      label = 'Don Passif';
    } else if (fallbackType === 'toggle') {
      Icon = Zap;
      iconColor = 'text-amber-400';
      gradient = 'from-black/90 via-amber-950/25 to-black/95';
      label = 'Aura Toggle';
    } else if (fallbackType === 'active') {
      Icon = Flame;
      iconColor = 'text-rose-400';
      gradient = 'from-black/90 via-rose-950/30 to-black/95';
      label = 'Capacité Active';
    }

    return (
      <div className={`relative w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center border border-white/10 overflow-hidden shadow-inner group p-4`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.12),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
        <span className="relative z-10 text-[11px] font-bold tracking-wider uppercase text-slate-300 mt-2">
          {label}
        </span>
        <span className="relative z-10 text-[9px] text-slate-500 mt-0.5">
          Illustration par défaut
        </span>
      </div>
    );
  };

  if (!resolved || loadError) {
    return (
      <div className={`overflow-hidden shrink-0 ${className}`}>
        {renderFallback()}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black/80 border border-white/15 shrink-0 shadow-lg ${className}`}>
      <img
        src={resolved}
        alt={alt}
        onError={() => setLoadError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

/**
 * Sélecteur d'image pour les formulaires Hexe (objets et compétences).
 */
export interface HexeImagePickerProps {
  value?: string;
  imageUrl?: string;
  onChange: (value?: string) => void;
  api?: any;
  label?: string;
  fallbackSlot?: HexeEquipmentSlot;
  fallbackType?: HexeActivationType;
}

export function HexeImagePicker({
  value,
  imageUrl,
  onChange,
  api,
  label = 'Illustration / Visuel',
  fallbackSlot,
  fallbackType
}: HexeImagePickerProps) {
  const effectiveValue = value ?? imageUrl;
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolved = effectiveValue ? resolveHexeImageUrl(effectiveValue, api) : undefined;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setLoading(true);
    try {
      const stored = await uploadHexeImage(file, api);
      onChange(stored);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'import de l'image.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setErrorMsg(null);
    onChange(undefined);
  };

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-300 font-bold flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
          <span>{label}</span>
          <span className="text-[9px] text-slate-500 font-normal">(opt.)</span>
        </label>
        {effectiveValue && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Supprimer</span>
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 bg-[#050508] border border-white/10 rounded-xl p-2.5">
        {/* Aperçu de l'image */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-white/15 bg-black/60 shrink-0 flex items-center justify-center shadow-inner group">
          {resolved ? (
            <>
              <img
                src={resolved}
                alt="Aperçu"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 transition-opacity"
                title="Remplacer l'image"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Remplacer</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-1 p-1 text-center">
              {fallbackSlot === 'weapon' ? (
                <Swords className="w-5 h-5 text-rose-400/60" />
              ) : fallbackSlot === 'armor' ? (
                <Shield className="w-5 h-5 text-amber-400/60" />
              ) : fallbackSlot === 'accessory' ? (
                <Sparkles className="w-5 h-5 text-cyan-400/60" />
              ) : fallbackSlot === 'consumable' ? (
                <FlaskConical className="w-5 h-5 text-emerald-400/60" />
              ) : fallbackType === 'passive' ? (
                <Shield className="w-5 h-5 text-emerald-400/60" />
              ) : fallbackType === 'toggle' ? (
                <Zap className="w-5 h-5 text-amber-400/60" />
              ) : fallbackType === 'active' ? (
                <Flame className="w-5 h-5 text-rose-400/60" />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-500" />
              )}
              <span className="text-[8px] text-slate-500 leading-tight">Défaut</span>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Contrôles et message */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-1.5">
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-slate-200 truncate">
              {value ? 'Visuel personnalisé sélectionné' : 'Aucun visuel défini'}
            </p>
            <p className="text-[10px] text-slate-400">
              Formats acceptés : JPG, PNG, WebP, GIF, SVG (max 5 Mo).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-bold bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-lg text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3 h-3 text-rose-400" />
              <span>{value ? "Changer d'image" : 'Importer depuis l’appareil'}</span>
            </button>
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-400 transition-colors"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-rose-400 text-[10px] bg-rose-950/40 border border-rose-800/40 rounded-lg p-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
