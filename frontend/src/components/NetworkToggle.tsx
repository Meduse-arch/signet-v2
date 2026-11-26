import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { NetworkConfigMenu } from './ui/NetworkConfigMenu';
import type { DraftMode } from './ui/NetworkConfigMenu';

interface NetworkToggleProps {
  onSignalUrlChange: (url: string) => void;
  isLanMode: boolean;
  onLanModeChange: (isLan: boolean) => void;
}

const ONLINE_URL = 'http://localhost:3000/api/signal'; // L'URL de ton serveur sur internet (ou dev-server)

/** Réglage réseau affiché en ligne (Paramètres) : état actuel + choix du mode + application. */
export function NetworkToggle({ onSignalUrlChange, isLanMode, onLanModeChange }: NetworkToggleProps) {
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // États de brouillon (Draft) : rien n'est appliqué avant « Appliquer »
  const [draftMode, setDraftMode] = useState<DraftMode>(isLanMode ? 'host' : 'online');
  const [draftTargetIp, setDraftTargetIp] = useState<string>('');

  // Différencie l'hébergement de la connexion en LAN
  const [activeLanMode, setActiveLanMode] = useState<'host' | 'join' | null>(isLanMode ? 'host' : null);
  const currentMode: DraftMode = !isLanMode ? 'online' : (activeLanMode ?? 'host');

  // Demande l'IP locale au backend Rust, uniquement quand on choisit d'héberger
  useEffect(() => {
    if (draftMode !== 'host' || localIp) return;
    invoke<string>('get_local_ip')
      .then(setLocalIp)
      .catch(err => console.error("Impossible de récupérer l'IP locale :", err));
  }, [draftMode, localIp]);

  const handleSave = () => {
    if (draftMode === 'online') {
      onLanModeChange(false);
      setActiveLanMode(null);
      onSignalUrlChange(ONLINE_URL);
      console.log('[Réseau] Mode Online activé.');
    } else if (draftMode === 'host') {
      onLanModeChange(true);
      setActiveLanMode('host');
      onSignalUrlChange(`http://${localIp ?? '127.0.0.1'}:3030/api/signal`);
      console.log(`[Réseau] LAN Host activé sur ${localIp ?? '127.0.0.1'}:3030`);
    } else if (draftMode === 'join') {
      if (!draftTargetIp.trim()) {
        alert('Veuillez entrer une IP valide pour rejoindre.');
        return;
      }
      onLanModeChange(true);
      setActiveLanMode('join');
      onSignalUrlChange(`http://${draftTargetIp.trim()}:3030/api/signal`);
      console.log(`[Réseau] LAN Join activé, connexion vers ${draftTargetIp.trim()}:3030`);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
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
      console.error('Erreur lors du collage', err);
    }
  };

  const statusLabel = currentMode === 'online' ? 'Connecté via Internet' : currentMode === 'host' ? 'Hôte sur le réseau local' : 'Client du réseau local';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm text-zinc-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>Actuellement : <span className="text-white font-medium">{statusLabel}</span></span>
      </div>
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
        currentMode={currentMode}
        isSaved={isSaved}
      />
    </div>
  );
}
