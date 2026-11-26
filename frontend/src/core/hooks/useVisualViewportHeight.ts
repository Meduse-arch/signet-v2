import { useEffect, useState } from 'react';

/** Écart minimal (px) entre fenêtre et viewport visuel pour considérer le clavier virtuel ouvert */
const KEYBOARD_THRESHOLD = 120;

/**
 * Hauteur du viewport visuel (zone réellement visible, clavier virtuel exclu).
 * `height` vaut `null` tant que le clavier est fermé : le layout CSS normal s'applique.
 */
export function useVisualViewportHeight(): { height: number | null; keyboardOpen: boolean } {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const open = window.innerHeight - vv.height > KEYBOARD_THRESHOLD;
      setHeight(open ? vv.height : null);
      // iOS fait défiler la page pour montrer le champ : on garde la coque calée en haut
      if (open && window.scrollY !== 0) window.scrollTo(0, 0);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  return { height, keyboardOpen: height !== null };
}
