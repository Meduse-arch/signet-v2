import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { NetworkConfigMenu } from './ui/NetworkConfigMenu';
import type { DraftMode } from './ui/NetworkConfigMenu';

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
  const [draftMode, setDraftMode] = useState<DraftMode>(isLanMode ? 'host' : 'online');
  const [draftTargetIp, setDraftTargetIp] = useState<string>('');
  
  // État local pour différencier l'hébergement de la connexion
  const [activeLanMode, setActiveLanMode] = useState<'host' | 'join' | null>(isLanMode ? 'host' : null);

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
      setActiveLanMode(null);
      onSignalUrlChange(ONLINE_URL);
      console.log("[Réseau] Mode Online activé.");
    } else if (draftMode === 'host') {
      onLanModeChange(true);
      setActiveLanMode('host');
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
      setActiveLanMode('join');
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
          !isLanMode 
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            : activeLanMode === 'host'
              ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
              : 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.2)]'
        }`}
      >
        {/* Le petit voyant lumineux */}
        <div className="relative flex h-2.5 w-2.5">
          {isLanMode && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeLanMode === 'host' ? 'bg-orange-400' : 'bg-rose-400'}`}></span>}
          {!isLanMode && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400"></span>}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${!isLanMode ? 'bg-emerald-500' : activeLanMode === 'host' ? 'bg-orange-500' : 'bg-rose-500'}`}></span>
        </div>
        
        <span className="text-xs font-bold tracking-wider">
          {!isLanMode ? 'ONLINE' : activeLanMode === 'host' ? 'HÔTE' : 'LAN'}
        </span>
      </button>

      {/* Popover affiché conditionnellement avec React sans transition CSS complexe */}
      {isPanelOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
          <NetworkConfigMenu 
            draftMode={draftMode}
            setDraftMode={setDraftMode}
            localIp={localIp}
            isCopied={isCopied}
            handleCopy={handleCopy}
            draftTargetIp={draftTargetIp}
            setDraftTargetIp={setDraftTargetIp}
            handlePaste={handlePaste}
            handleSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
