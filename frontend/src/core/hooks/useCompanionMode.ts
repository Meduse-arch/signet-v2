import { useCallback, useEffect, useState } from 'react';

/** Réglage manuel : 'auto' = détection tactile + écran étroit. */
export type CompanionPreference = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'signet_companion_mode';
const CHANGE_EVENT = 'signet-companion-change';
const MAX_COMPANION_WIDTH = 768;

function readPreference(): CompanionPreference {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'on' || raw === 'off' ? raw : 'auto';
}

/** `?compagnon=1` force le mode, `?compagnon=0` le coupe. Sinon `null`. */
function readUrlOverride(): boolean | null {
  const value = new URLSearchParams(window.location.search).get('compagnon');
  if (value === '1') return true;
  if (value === '0') return false;
  return null;
}

function isCompact(): boolean {
  return window.matchMedia('(pointer: coarse)').matches && window.innerWidth < MAX_COMPANION_WIDTH;
}

function resolve(): boolean {
  const override = readUrlOverride();
  if (override !== null) return override;
  const pref = readPreference();
  if (pref === 'on') return true;
  if (pref === 'off') return false;
  return isCompact();
}

/** Réglage manuel (SettingsView). Le changement se propage à tous les `useCompanionMode`. */
export function useCompanionPreference(): [CompanionPreference, (pref: CompanionPreference) => void] {
  const [pref, setPref] = useState<CompanionPreference>(readPreference);

  useEffect(() => {
    const sync = () => setPref(readPreference());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = useCallback((next: CompanionPreference) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [pref, update];
}

/**
 * Mode Compagnon (fiches + dés + chat) : actif si écran tactile étroit, si
 * `?compagnon=1`, ou si forcé dans les paramètres. Réagit aux redimensionnements.
 */
export function useCompanionMode(): boolean {
  const [active, setActive] = useState<boolean>(resolve);

  useEffect(() => {
    const sync = () => setActive(resolve());
    window.addEventListener('resize', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return active;
}
