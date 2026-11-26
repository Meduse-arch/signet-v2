---
name: dacs-security-audit
description: Audit de sécurité orienté DACS et SaaS du projet Signet (validation Rust, crypto et schémas réseau WebRTC, serveur signaling, permissions Tauri, Auth Supabase).
disable-model-invocation: true
argument-hint: "[zone optionnelle : rust | network | signaling | tauri | auth]"
allowed-tools: Read, Grep, Glob
---

Audit en lecture seule. Si `$ARGUMENTS` précise une zone, limite-toi à elle. Ne lis que les fichiers listés et leurs appels directs.

| Zone | Fichiers | Points de contrôle |
|---|---|---|
| rust | `backend/src/*.rs` | entrées IPC validées (taille, format `signet-XXXXXX`, chemins → pas de path traversal), SQL paramétré, RNG des dés cryptographiquement sûr, pas de panic exploitable |
| network | `frontend/src/core/network/crypto.ts`, `webrtc-client.ts`, `schemas.ts` | algo/mode (ex. AES-GCM, IV jamais réutilisé), dérivation de clé, clés jamais loguées ; tout message entrant validé par zod avant usage ; un pair ne peut pas usurper le rôle MJ ; limites de taille des messages/chunks |
| signaling | `signaling/api/*.ts`, `signaling/dev-server.js` | auth des requêtes, rate-limit, validation du body, CORS, rooms non énumérables, données éphémères, aucun secret dans le code |
| tauri | `backend/capabilities/*.json`, `backend/tauri.conf.json` | moindre privilège, CSP définie, `identifier` de prod (≠ `com.tauri.dev`), création de fenêtres/webviews restreinte |
| auth | `frontend/src/core/supabase.ts`, `frontend/src/core/services/AuthService.ts` | seule la clé `anon` côté client, RLS attendue côté Supabase, gestion session/refresh, aucun token dans URL/logs |

Sortie : tableau `Sévérité (Critique/Haute/Moyenne/Basse) | fichier:ligne | vulnérabilité | impact SaaS | correctif`, trié par sévérité, chaque point relié à une notion DACS (OWASP, triade CIA, défense en profondeur). Si un point n'est pas vérifiable, le dire plutôt que supposer.
