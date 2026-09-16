import { useState, useEffect, useRef } from 'react';
import { Wifi, Server, CheckCircle2, Copy, ClipboardPaste, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface NetworkToggleProps {
  onSignalUrlChange: (url: string) => void;
  isLanMode: boolean;
  onLanModeChange: (isLan: boolean) => void;
}

const ONLINE_URL = 'http://localhost:3000/api/signal'; // L'URL de ton serveur sur internet (ou dev-server)

export function NetworkToggle({ onSignalUrlChange, isLanMode, onLanModeChange }: NetworkToggleProps) {
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // État d'ouverture du menu
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // États de brouillon (Draft) pour les modifications dans le menu
  const [draftMode, setDraftMode] = useState<'online' | 'host' | 'join'>(isLanMode ? 'host' : 'online');
  const [draftTargetIp, setDraftTargetIp] = useState<string>('');

  // Fermeture au clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
        // Si on ferme sans sauvegarder et qu'on était en train de configurer un LAN, on annule.
        // Optionnel: on réinitialise le draft sur la vraie valeur.
      }
    }
    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen]);

  // Demande l'IP locale au backend Rust
  const fetchLocalIp = async () => {
    try {
      // Si Tauri n'est pas dispo (ex: navigateur web classique), ça va fail, donc on catche
      const ip = await invoke<string>('get_local_ip');
      setLocalIp(ip);
      // Par défaut, si on active le LAN, on se configure pour héberger soi-même
      onSignalUrlChange(`http://${ip}:3030/api/signal`);
    } catch (err) {
      console.error("Impossible de récupérer l'IP locale :", err);
      // Fallback
      onSignalUrlChange(`http://127.0.0.1:3030/api/signal`);
    }
  };

  const handleOpenMenu = () => {
    setIsPanelOpen(true);
    setDraftMode(isLanMode ? 'host' : 'online'); // Initialiser avec l'état actuel
    if (!localIp) fetchLocalIp();
  };

  const handleSave = () => {
    if (draftMode === 'online') {
      onLanModeChange(false);
      onSignalUrlChange(ONLINE_URL);
      console.log("[Réseau] Mode Online activé.");
    } else if (draftMode === 'host') {
      onLanModeChange(true);
      if (localIp) {
        onSignalUrlChange(`http://${localIp}:3030/api/signal`);
        console.log(`[Réseau] LAN Host activé sur ${localIp}:3030`);
      }
    } else if (draftMode === 'join') {
      if (!draftTargetIp.trim()) {
        alert("Veuillez entrer une IP valide pour rejoindre.");
        return; // Ne ferme pas le menu
      }
      onLanModeChange(true);
      onSignalUrlChange(`http://${draftTargetIp.trim()}:3030/api/signal`);
      console.log(`[Réseau] LAN Join activé, connexion vers ${draftTargetIp.trim()}:3030`);
    }
    
    setIsPanelOpen(false); // Fermer après sauvegarde
  };

  const handleCopy = async () => {
    if (localIp) {
      await navigator.clipboard.writeText(localIp);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDraftTargetIp(text);
    } catch (err) {
      console.error("Erreur lors du collage", err);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Bouton Principal */}
      <button 
        onClick={handleOpenMenu}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 backdrop-blur-md ${
          isLanMode 
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
        }`}
      >
        {/* Le petit voyant lumineux */}
        <div className="relative flex h-2.5 w-2.5">
          {isLanMode && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLanMode ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
        </div>
        
        <span className="text-xs font-bold tracking-wider">
          {isLanMode ? 'LAN ACTIF' : 'ONLINE'}
        </span>
      </button>

      {/* Popover affiché conditionnellement avec React sans transition CSS complexe */}
      {isPanelOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
          <div className="w-80 p-4 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl relative flex flex-col gap-4">
            
            <div className="flex items-center justify-between text-emerald-400">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                <h4 className="text-sm font-bold uppercase tracking-wider">Configuration Réseau</h4>
              </div>
            </div>

            {/* Switch Mode (Online / Host / Join) */}
            <div className="flex bg-black/40 rounded-lg p-1 border border-slate-800">
              <button 
                onClick={() => setDraftMode('online')}
                className={`flex-1 text-xs py-1.5 rounded-md font-bold transition-all ${draftMode === 'online' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ONLINE
              </button>
              <button 
                onClick={() => setDraftMode('host')}
                className={`flex-1 text-xs py-1.5 rounded-md font-bold transition-all ${draftMode === 'host' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                HÉBERGER
              </button>
              <button 
                onClick={() => setDraftMode('join')}
                className={`flex-1 text-xs py-1.5 rounded-md font-bold transition-all ${draftMode === 'join' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                REJOINDRE
              </button>
            </div>
            
            {/* Contenu dynamique selon le mode */}
            {draftMode === 'host' && (
              <div className="animate-fade-in">
                <p className="text-xs text-slate-400 mb-1">Votre IP Locale (donnez-la aux joueurs) :</p>
                <div className="flex items-center justify-between bg-black/50 rounded-lg p-2 border border-slate-800">
                  <code className="text-sm font-mono text-emerald-300">{localIp || 'Recherche...'}</code>
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-emerald-400"
                    title="Copier l'IP"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {draftMode === 'join' && (
              <div className="animate-fade-in">
                <p className="text-xs text-slate-400 mb-1">Entrez l'IP Locale de l'hôte :</p>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ex: 192.168.1.15"
                    value={draftTargetIp}
                    onChange={(e) => setDraftTargetIp(e.target.value)}
                    className="w-full bg-black/50 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                  />
                  <button 
                    onClick={handlePaste}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-indigo-400"
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
              className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg border border-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Sauvegarder
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
