import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getCurrentWindow } from '@tauri-apps/api/window'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Affiche la fenêtre une fois que React a monté l'app pour éviter le flash blanc de chargement
try {
  getCurrentWindow().show();
} catch (e) {
  // Ignoré dans le navigateur
}
