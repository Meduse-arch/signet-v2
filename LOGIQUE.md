# Logique de Travail de l'Assistant (Signet VTT)

Ce document décrit l'architecture du projet et la méthodologie de travail que je (l'IA) m'efforce de suivre pour développer **Signet VTT** avec toi.

## 1. Philosophie d'Architecture
Signet VTT est conçu pour être une application hybride ultra-performante, reposant sur 3 piliers :
- **Frontend (React/Vite)** : Gère uniquement l'interface utilisateur, les menus, et le rendu visuel. Il doit rester léger.
- **Backend (Rust/Tauri)** : L'application native du Maître du Jeu. C'est ici qu'on fera le travail lourd : accès aux fichiers locaux (images lourdes, musiques), base de données locale (SQLite pour l'état de la campagne), et calculs gourmands (lignes de vue).
- **Réseau P2P & Signaling** : Supabase n'est utilisé **que** pour l'authentification. Les sessions de jeu sont générées localement (format `signet-xxxxxx`) et la communication en jeu passe par WebRTC (Peer-to-Peer) pour avoir zéro latence, en utilisant un petit serveur de signaling (Node.js) juste pour connecter les joueurs au MJ au lancement.

## 2. Méthodologie de Travail (IA)
Pour garder un code sain et éviter de tout casser :
1. **Séparation Stricte :** Je ne mélange jamais la logique de l'interface (React) et la logique métier lourde (Rust). Si un calcul ou un stockage concerne le cœur de la partie, je te proposerai de le mettre en Rust.
2. **Plans d'implémentation :** Pour toute nouvelle grosse fonctionnalité (ex: SQLite), je t'écrirai toujours un "Plan" avant de coder pour que tu valides l'architecture.
3. **Nettoyage Continu :** Je supprime le code mort ou les composants inutilisés pour éviter d'alourdir le projet.
4. **Optimisation VTT :** Un Virtual Tabletop doit être fluide à 60 FPS. Je privilégie toujours l'accès fichier local (via Rust) plutôt que le chargement d'URLs distantes.

## 3. Lexique du Projet
- **Session Key / Room ID** : L'identifiant d'une partie. Toujours formaté en `signet-XXXXXX` (où X sont des caractères alphanumériques).
- **MJ (Maître du Jeu)** : Héberge la partie (souvent via l'app Bureau Tauri).
- **Joueur** : Se connecte à la session du MJ.
