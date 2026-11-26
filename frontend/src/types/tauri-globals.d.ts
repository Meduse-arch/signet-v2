// Globaux injectés par Tauri v2 dans la webview (absents dans le client web).
// Utilisés uniquement pour détecter l'environnement desktop.
interface Window {
  __TAURI_INTERNALS__?: unknown;
}
