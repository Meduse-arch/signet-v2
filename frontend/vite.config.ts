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
  build: {
    rolldownOptions: {
      output: {
        // Vendors stables dans des chunks séparés (meilleur cache, parse parallèle).
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/, priority: 40 },
            { name: 'vendor-konva', test: /node_modules[\/](konva|react-konva|react-reconciler)[\/]/, priority: 30 },
            { name: 'vendor-supabase', test: /node_modules[\/]@supabase[\/]/, priority: 20 },
            { name: 'vendor-net', test: /node_modules[\/](simple-peer|zod|buffer|readable-stream|safe-buffer|events|process|util|stream-browserify|vite-plugin-node-polyfills)[\/]/, priority: 10 },
          ],
        },
      },
    },
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
