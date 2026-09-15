import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
//
// simple-peer est un module Node.js qui importe des builtins (events, util,
// buffer, process, stream, crypto…). Le plugin `vite-plugin-node-polyfills`
// injecte les polyfills navigateur automatiquement, de façon fiable et sans
// configuration manuelle d'alias.
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/src-tauri/**']
    }
  },
  plugins: [
    tailwindcss(),
    react(),
    nodePolyfills({
      // On active uniquement les polyfills nécessaires à simple-peer
      include: ['buffer', 'events', 'process', 'stream', 'util', 'crypto'],
      globals: {
        global: true,
        Buffer: true,
        process: true,
      },
    }),
  ],
})
