# Feuille de route (Roadmap) - Projet Signet VTT

Ce document centralise la vision produit, les profils des utilisateurs cibles (Personas) et la planification Agile des fonctionnalités pour notre Virtual Tabletop (VTT).

---

## 1. Personas (Utilisateurs cibles)

La méthode des Personas nous permet de garder en tête *pour qui* nous développons chaque fonctionnalité.

### 🧙‍♂️ Le Maître du Jeu (MJ) - "Alex, 32 ans"
- **Profil :** Prépare beaucoup ses parties, aime l'immersion (musiques, belles cartes). Joue en ligne depuis des années.
- **Besoins :** 
  - Une interface intuitive pour gérer les scènes et les cartes.
  - Le contrôle total sur ce que les joueurs peuvent voir (Brouillard de guerre / Fog of War).
  - Gérer rapidement les combats et la vie des monstres sans chercher dans 10 menus.
- **Frustration actuelle :** Les VTT classiques sont souvent trop lourds, lents à charger ou trop compliqués à héberger (problèmes de routeurs/ports).

### 🧝‍♀️ La Joueuse - "Sarah, 25 ans"
- **Profil :** Joue pour le roleplay et l'histoire. N'est pas très à l'aise avec l'informatique complexe.
- **Besoins :**
  - Un accès instantané à la partie : cliquer sur un lien et jouer, pas d'installation compliquée.
  - Une feuille de personnage claire et automatisée (cliquer sur "Épée longue" lance les dés automatiquement).
  - Voir la carte et déplacer son pion facilement (Drag & Drop fluide).

### 🛠️ Le Créateur / Moddeur - "Léo, 28 ans"
- **Profil :** Développeur amateur, aime bidouiller les règles ou créer ses propres systèmes de jeu.
- **Besoins :**
  - Un VTT pensé de manière modulaire : pouvoir créer son propre "Système de jeu" facilement.
  - Une API claire pour étendre les fonctionnalités de base.

---

## 2. Découpage des Fonctionnalités (Backlog)

Voici l'état actuel des trois grands piliers du projet : le Serveur, le Core (cœur du VTT) et les Modules.

### 🌐 A. Le Réseau & Serveur (P2P Avancé)
**Rôle :** Connecter les joueurs et optimiser les transferts.
- [x] **API de Signalement (LAN/Web) :** Négociation WebRTC fonctionnelle.
- [x] **Topologie en Étoile :** L'Hôte relaie l'information (anti-triche).
- [ ] **DataChannels Optimisés :** Modes TCP (Fiable) pour le chat/dés, et UDP (Non-Fiable) pour les pointeurs/tokens.
- [ ] **Transfert Intelligent (Mesh/Torrent) :** Script `TransferOptimizer` pour basculer dynamiquement en mode Torrent selon le nombre de joueurs (Prévu Sprint 6).

### 🎲 B. Le Cœur (Core VTT) - *Frontend React*
**Rôle :** L'interface commune à tous, le moteur 2D, le chat, et la gestion des sessions.
- [x] **UI Premium & Modulaire :** Le Hub, l'Auth et l'interface de base sont terminés (Glassmorphism, animations).
- [x] **Architecture "Chill" :** Code factorisé en services et petits composants.
- **Plateau de Jeu (Canvas) :**
  - [x] Moteur de rendu performant (PixiJS, Konva ou Canvas natif).
  - [x] Gestion des calques (Background, Tokens, Grille, UI).
  - [x] Déplacement fluide des Tokens.
- **Interface de Table (In-Game) :**
  - [x] Chat textuel persistant.
  - [x] Lancer de dés virtuel.

### 🧩 C. Les Modules (Systèmes Indépendants)
**Rôle :** Permettre l'extension infinie du VTT. C'est ici que réside la véritable règle d'or de l'application : **Le "Core" du VTT est un moteur vide qui ne connaît aucune règle. Chaque jeu (D&D, Cthulhu...) est un module indépendant.** Cela évite que les règles entrent en conflit et garde l'application hyper légère, car seul le module auquel on joue est chargé en mémoire.
- [x] **Le "Core" Universel :** Une API (`SignetAPI`) qui donne accès à des fonctions génériques (lancer un dé virtuel, écrire un message) sans aucune logique de règles.
- [x] **Le Gestionnaire de Modules (`ModManager`) :** Le cerveau qui s'assure de ne charger **QUE** le code du système sélectionné au lancement de la partie.
- [x] **L'Event Bus (Système Nerveux) :** Système permettant au module d'écouter les actions réseau (P2P) sans avoir à toucher au code source du VTT.
- [x] **Système de "Sandbox" :** Garantir qu'un Module ne puisse pas entrer en conflit avec les composants de base ou faire planter l'application globale.
- [x] **Feuilles de Personnages Dynamiques :** Interface entièrement générée à la volée par le code du Module.

---

## 3. Plan d'Action Agile (Sprints Actualisés)

Nous avons inversé les sprints initiaux pour poser de solides bases visuelles et architecturales (UI/UX) avant de faire le moteur de jeu. Voici la nouvelle feuille de route :

### ✅ Sprint 0 : La Fondation Premium (Terminé)
*Objectif : Une application magnifique, modulaire et prête pour le réseau.*
1. [x] Interface d'authentification (Supabase).
2. [x] Hub de création de session (Carousel, création, paramètres).
3. [x] Architecture modulaire (Services, composants éclatés, philosophie "Chill Code").
4. [x] Écran de session avec bascule LAN/WebRTC.

### 🎯 Sprint 1 : Le Moteur de Mods (Event Bus)
*Objectif : Rendre le cœur de l'application extensible avant d'ajouter les mécaniques de jeu.*
1. [x] Créer le `ModManager` et le système d'Événements (Event Bus).
2. [ ] Séparer les flux réseau (UDP vs TCP). *(Repoussé à plus tard pour se concentrer sur l'Event Bus)*
3. [x] Connecter le chat textuel via l'Event Bus (comme si le chat était le premier Mod).

### ✅ Sprint 1.5 : L'Interface Modulaire (UI/Dock) (Terminé)
*Objectif : Créer un environnement de bureau ergonomique pour accueillir de multiples modules sans polluer l'écran.*
1. [x] Ajouter une barre d'outils dynamique (Dock Latéral).
2. [x] Permettre aux modules d'enregistrer des "Apps" avec Icône et Nom.
3. [x] Gérer l'ouverture/fermeture des fenêtres de modules sans perdre leur état (messages, etc).
4. [x] Système de Pop-out multi-fenêtres natif (Tauri WebviewWindow).

### 🎯 Sprint 2 : Le Plateau de Jeu (VTT Canvas) & Interactions
*Objectif : Les joueurs interagissent visuellement sur une carte de manière fluide.*
1. [x] Ajouter le Zoom (Molette) et le Pan (Drag de caméra) sur le Canvas.
2. [x] Rendu performant de la Grille avec prise en charge du Magnétisme (Snap to grid).
3. [x] Drag & Drop fluide des Pions (Tokens) et synchronisation réseau en temps réel.
4. [x] Gestion des calques (Background Map, Grille, Tokens).

### ✅ Sprint 3 : L'Artillerie Lourde (Bibliothèque & CAS) (Partiellement Terminé)
*Objectif : Soulager le Maître du Jeu pour la gestion des assets.*
1. [x] Créer le système de stockage local avec hachage SHA-256 (Content-Addressable Storage en Rust).
2. [x] Interface de glisser-déposer intégrée à la Toolbar pour gérer les Maps.
3. [x] Protocole personnalisé (`signet://`) pour servir les images locales via Tauri.
4. [x] Transfert binaire de base (Client-Serveur P2P) pour l'affichage initial de la carte.

### ✅ Sprint 4 : Le Premier Système de Jeu (Système "Flower")
*Objectif : Créer le tout premier vrai "Module" de règles complet pour valider l'architecture du VTT.*
1. [x] Fiche de personnage dynamique (Affichage et édition des caractéristiques/skills).
2. [x] Règles du système de dés spécifiques à "Flower" (Calcul des succès/échecs).
3. [x] Mécaniques de jeu (Compétences, jauges, inventaire).
4. [x] Lien entre le pion sur la carte et sa fiche de personnage.

### 🛡️ Sprint 5 : Droits MJ, Sécurité & Charte Responsive
*Objectif : Affiner la gestion des droits, sécuriser la partie et s'assurer que l'application est parfaite sur tous les écrans selon la charte graphique.*
1. [ ] **Découplage Hébergement/Rôle :** Séparer le statut d'"Hôte Réseau" (qui a la base de données sur son PC) des "Droits MJ". Un hôte peut inviter un autre joueur à agir en tant que MJ.
2. [ ] **Sécurité des Permissions :** Vérifications strictes (anti-triche) pour s'assurer que seul le MJ ou les joueurs autorisés puissent déplacer certains jetons ou révéler la carte.
3. [ ] **Responsive Design :** Revue complète de l'interface pour garantir une ergonomie irréprochable sur tablettes et mobiles.
4. [ ] **Audit Charte Graphique :** Vérification de l'alignement de tous les modules et fenêtres avec le document `CHARTE_GRAPHIQUE.md` (homogénéité visuelle).

### 🌐 Sprint 6 : Optimisation Réseau & Architecture Mesh
*Objectif : Transformer le réseau 1-à-1 en une vraie toile d'araignée capable d'encaisser 8 joueurs.*
1. [ ] Topologie Mesh : Chaque joueur se connecte directement à tous les autres.
2. [ ] `TransferOptimizer` : Analyse le contexte pour choisir la meilleure stratégie (Broadcast vs Torrent).
3. [ ] Transfert Torrent : Découpage et partage des chunks de fichiers P2P (pour éviter que l'hôte n'upload 8 fois la carte).

---
*Document vivant - À mettre à jour à chaque fin de Sprint.*
