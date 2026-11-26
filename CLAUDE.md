# Signet VTT — CLAUDE.md

VTT P2P (Tauri desktop pour le MJ + client web), futur SaaS par abonnement.
Architecture détaillée : `ARCHITECTURE.md` (Core vs Systèmes, réseau, dés, Bibliothèque CAS, rôles).
UI : `CHARTE_GRAPHIQUE.md`. Lire ces fichiers **uniquement** si la tâche les concerne.

## Arborescence (monorepo npm workspaces)
- `backend/` — Tauri v2 / Rust. Entrée `src/lib.rs` (commandes IPC), `database.rs` (SQLite), `lan_server.rs` (axum), `dice.rs` (RNG), `library.rs` (CAS SHA-256), `notes.rs` (notes MJ sur disque). Permissions : `capabilities/default.json`.
- `frontend/` — React + Vite + Konva. `src/components/game/VTTCanvas.tsx` (table), `src/core/network/` (`webrtc-client.ts`, `crypto.ts`, `schemas.ts`), `src/core/modules/` (briques du Core), `src/core/services/` (Auth, EventBus, ModManager, SignetAPI), `src/systems/` (règles de jeu : `flower/`, `hexe/`).
- `signaling/` — serveur de signaling WebRTC (Vercel, `api/signal.ts` + `api/public-rooms.ts` salons publics ; dev : `dev-server.js`).
- Lancer : `npm run dev` (racine → `tauri dev`).

## Versions détectées
Tauri 2.11 (CLI 2.11, `@tauri-apps/api` 2.11) · Rust edition 2021, MSRV 1.77.2 · axum 0.7 · tokio 1.37 · rusqlite 0.31 (bundled) ·
React 19.2 · TypeScript 7.0 · Vite 8.3 · Tailwind 4.3 · Konva 10.6 / react-konva 19.3 · simple-peer 9.11 (WebRTC) · zod 4.6 · supabase-js 2.116 (auth uniquement).

## Vérifications
- Rust : `cargo check --manifest-path backend/Cargo.toml`
- TS : `npx tsc -p frontend/tsconfig.app.json --noEmit` (le `tsconfig.json` du front ne contient que des `references`)

## Règles strictes
1. **TypeScript strict** : pas de `any` ni de cast `as` non justifié ; tout message réseau est validé par `zod` (`schemas.ts`) avant usage. ⚠️ `"strict": true` est absent de `tsconfig.app.json` : dette à traiter, ne pas l'aggraver.
2. **Erreurs Rust** : jamais de `unwrap()`/`expect()` atteignable depuis une commande Tauri. Les commandes renvoient `Result<T, E>` ; pour le nouveau code, un enum d'erreur `thiserror` qui implémente `Serialize` (le front reçoit un message exploitable). L'existant renvoie `Result<_, String>` : migrer progressivement. `thiserror` n'est pas encore dans `Cargo.toml`.
3. **Moindre privilège** : n'ajouter une permission dans `backend/capabilities/` que si une commande en a besoin, la plus précise possible ; justifier chaque ajout.
4. **Architecture modulaire** : le Core (`core/`) ne connaît aucune règle de jeu ; toute règle va dans `systems/<jeu>/`. Core ↔ systèmes/mods via `EventBus` / `SignetAPI`, jamais d'import direct d'un système depuis le Core. RNG des dés côté Rust uniquement.
5. **Perf Konva (60 FPS)** : pas d'état React mis à jour à chaque `mousemove`/drag (refs + `layer.batchDraw()`), calques statique/dynamique séparés, `listening={false}` sur le décor, `cache()` pour les formes complexes.
6. Petits fichiers, pas de doublon, pas de sur-ingénierie. Modification risquée → expliquer + plan B et demander avant (cf. `.agents/GEMINI.md`).

## Lexique
Room ID `signet-XXXXXX` · MJ = hôte (Tauri) · Co-MJ = rôle `role_level >= 10`.
