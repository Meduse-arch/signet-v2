---
name: konva-optimizer
description: Optimisation du rendu 2D Konva + React de la table virtuelle (frontend/src/components/game/VTTCanvas.tsx et composants Konva liés) - re-renders, calques, cache, événements souris/zoom.
---

Périmètre : `frontend/src/components/game/VTTCanvas.tsx` puis les composants qu'il importe. Ne lis pas le reste.

Traque, par ordre d'impact :
1. **Re-renders React** : `setState` dans `onMouseMove`/`onDragMove`/`onWheel` → refs + mutation du nœud Konva + `batchDraw()` ; props objets/fonctions recréées à chaque rendu (`useMemo`/`useCallback`/`React.memo` seulement là où ça évite un vrai coût) ; abonnements réseau qui re-rendent tout le `Stage`.
2. **Calques (`Layer`)** : séparer carte (statique), tokens, interactions, pointeurs réseau ; viser ≤ 3-5 calques ; `listening={false}` sur le non-interactif ; `perfectDrawEnabled={false}` sur les formes stroke+fill.
3. **Cache** : `node.cache()` pour formes complexes ou filtres, `clearCache()` quand elles changent ; images chargées une seule fois (jamais de `new Image()` dans le render).
4. **Événements & zoom** : zoom molette centré sur le pointeur via `stage.scale/position` sans état React par tick ; envoi réseau des mouvements throttlé par `requestAnimationFrame` (canal non fiable) ; contraintes via `dragBoundFunc`.
5. **Fuites** : listeners, `Konva.Animation`, timers nettoyés dans le `return` des `useEffect`.

Réponds par une liste priorisée `fichier:ligne` → problème → correctif minimal. Après modification : `npx tsc -p frontend/tsconfig.app.json --noEmit`.
