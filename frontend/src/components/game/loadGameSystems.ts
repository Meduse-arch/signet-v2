import { ModManager } from '../../core/services/ModManager';

/**
 * Charge à la demande (import dynamique) le module du système de jeu et l'enregistre
 * auprès du ModManager. Partagé par GameBoard et PopoutSession.
 * Sans `systemId`, on charge les systèmes activés globalement.
 */
export async function loadGameSystems(systemId: string | null, isCancelled: () => boolean = () => false): Promise<void> {
  let wantFlower = false;
  let wantHexe = false;
  if (systemId === 'stars' || systemId === 'flower') {
    wantFlower = true;
  } else if (systemId === 'hexe') {
    wantHexe = true;
  } else {
    const enabledSystems = ModManager.getEnabledSystems();
    wantFlower = enabledSystems.some(sys => sys.id === 'stars' || sys.id === 'flower');
    wantHexe = enabledSystems.some(sys => sys.id === 'hexe');
  }
  if (wantFlower) {
    const { SystemFlowerModule } = await import('../../systems/flower');
    if (!isCancelled()) ModManager.registerMod(SystemFlowerModule);
  }
  if (wantHexe) {
    const { SystemHexeModule } = await import('../../systems/hexe');
    if (!isCancelled()) ModManager.registerMod(SystemHexeModule);
  }
}
