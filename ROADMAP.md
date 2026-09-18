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
- [ ] **Transfert Torrent (Nouveau) :** Utilisation de WebTorrent pour le partage de fichiers lourds (cartes, musiques) entre joueurs.
- [ ] **DataChannels Optimisés :** Modes TCP (Fiable) pour le chat/dés, et UDP (Non-Fiable) pour les pointeurs/tokens.

### 🎲 B. Le Cœur (Core VTT) - *Frontend React*
**Rôle :** L'interface commune à tous, le moteur 2D, le chat, et la gestion des sessions.
- [x] **UI Premium & Modulaire :** Le Hub, l'Auth et l'interface de base sont terminés (Glassmorphism, animations).
- [x] **Architecture "Chill" :** Code factorisé en services et petits composants.
- **Plateau de Jeu (Canvas) :**
  - [ ] Moteur de rendu performant (PixiJS, Konva ou Canvas natif).
  - [ ] Gestion des calques (Background, Tokens, Grille, UI).
  - [ ] Déplacement fluide des Tokens.
- **Interface de Table (In-Game) :**
  - [ ] Chat textuel persistant.
  - [ ] Lancer de dés virtuel.

### 🧩 C. Les Modules (Systèmes Indépendants)
**Rôle :** Permettre l'extension infinie du VTT. C'est ici que réside la véritable règle d'or de l'application : **Le "Core" du VTT est un moteur vide qui ne connaît aucune règle. Chaque jeu (D&D, Cthulhu...) est un module indépendant.** Cela évite que les règles entrent en conflit et garde l'application hyper légère, car seul le module auquel on joue est chargé en mémoire.
- [ ] **Le "Core" Universel :** Une API (`SignetAPI`) qui donne accès à des fonctions génériques (lancer un dé virtuel, écrire un message) sans aucune logique de règles.
- [ ] **Le Gestionnaire de Modules (`ModManager`) :** Le cerveau qui s'assure de ne charger **QUE** le code du système sélectionné au lancement de la partie.
- [ ] **L'Event Bus (Système Nerveux) :** Système permettant au module d'écouter les actions réseau (P2P) sans avoir à toucher au code source du VTT.
- [ ] **Système de "Sandbox" :** Garantir qu'un Module ne puisse pas entrer en conflit avec les composants de base ou faire planter l'application globale.
- [ ] **Feuilles de Personnages Dynamiques :** Interface entièrement générée à la volée par le code du Module.

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

### 🎯 Sprint 2 : Le Plateau de Jeu (VTT Canvas)
*Objectif : Les joueurs interagissent visuellement sur une carte.*
1. Implémenter un Canvas performant.
2. Ajouter le système de Grille et l'Image de fond (Map).
3. Intégrer les Pions (Tokens) synchronisés en temps réel en mode "UDP" (Non-Fiable/Rapide).

### 🎯 Sprint 3 : L'Artillerie Lourde (Torrent & Fichiers)
*Objectif : Soulager le Maître du Jeu.*
1. Intégrer WebTorrent ou un système de Chunking P2P avancé.
2. Permettre au MJ de glisser-déposer des images haute résolution qui se partagent entre joueurs.

---
*Document vivant - À mettre à jour à chaque fin de Sprint.*
