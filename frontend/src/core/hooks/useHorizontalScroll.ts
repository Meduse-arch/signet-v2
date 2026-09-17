import { useRef, useEffect } from 'react';

export function useHorizontalScroll<T extends HTMLElement>() {
  const elRef = useRef<T>(null);

  useEffect(() => {
    const el = elRef.current;
    if (el) {
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return;
        
        // On évite que le défilement horizontal remonte à la page entière
        // (si la zone est scrollable)
        const isScrollable = el.scrollWidth > el.clientWidth;
        if (!isScrollable) return;

        // Si on défile verticalement, on transforme ça en défilement horizontal
        // On annule le comportement par défaut (défilement vertical de la page)
        e.preventDefault();
        
        el.scrollTo({
          left: el.scrollLeft + e.deltaY * 1.5,
          behavior: 'auto'
        });
      };
      
      // passive: false est requis pour utiliser e.preventDefault()
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }
  }, []);

  return elRef;
}
