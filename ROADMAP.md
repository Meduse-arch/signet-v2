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

Voici l'état actuel et futur des trois grands piliers du projet : le Serveur, le Core (cœur du VTT) et les Modules.

### 🌐 A. Le Serveur (Signalement WebRTC)
**Rôle :** Il ne fait QUE mettre en relation les joueurs. Une fois connectés, les données transitent en Pair-à-Pair (P2P) entre eux pour des performances optimales.
- [x] **API de Signalement (Déjà fait) :** Gérer les offres et réponses (`/api/signal`) pour permettre la négociation P2P.
- [x] **Gestion des "Rooms" (Déjà fait) :** Les joueurs peuvent se rejoindre via un identifiant de salle (`roomId`).
- [ ] **Nettoyage automatique :** Fermer et nettoyer les salles inactives (partiellement en place).
- [ ] **STUN/TURN :** Configuration des serveurs de relais pour les joueurs ayant des pare-feux stricts (pour garantir 100% de connexion).

### 🎲 B. Le Cœur (Core VTT) - *Frontend React*
**Rôle :** L'interface commune à tous, le moteur 2D, le chat, et la gestion du réseau P2P.
- **Réseau P2P :**
  - [ ] Établir la connexion via `simple-peer`.
  - [ ] Synchroniser l'état global du jeu (Zustand ou Redux) entre tous les clients en temps réel.
- **Canvas / Rendu 2D :**
  - [ ] Moteur de rendu performant (PixiJS, Konva ou Canvas natif).
  - [ ] Gestion des calques (Background, Tokens, Grille, UI).
  - [ ] Déplacement fluide des Tokens avec Snap-to-Grid (alignement sur la grille).
- **Interface Utilisateur (UI) :**
  - [ ] Système de fenêtres flottantes (Chat, Fiches de perso, Outils).
  - [ ] Lancer de dés virtuel 3D ou 2D (Dice Roller).
  - [ ] Gestion des permissions (Ce que le MJ voit vs ce que le Joueur voit).

### 🧩 C. Les Modules (Systèmes de Jeu)
**Rôle :** La logique spécifique à un jeu de rôle précis (ex: Donjons & Dragons 5e, L'Appel de Cthulhu).
- [ ] **Architecture Modulaire :** Le Core VTT doit pouvoir charger un fichier JSON/JS définissant les règles.
- [ ] **Feuilles de Personnages Dynamiques :** Interface générée selon le système de jeu.
- [ ] **Automatisation :** Résolution des jets d'attaque vs la classe d'armure de la cible.
- [ ] **Compendium (Encyclopédie) :** Base de données des sorts, objets, monstres.

---

## 3. Plan d'Action Agile (Sprints)

Nous allons fonctionner par "Sprints" (cycles de développement itératifs) pour avoir toujours une version fonctionnelle.

### 🎯 Sprint 1 : La Fondation (Minimum Viable Product - MVP)
*Objectif : Deux joueurs peuvent se connecter et bouger un pion sur une grille.*
1. Finaliser la connexion P2P (WebRTC avec `simple-peer`) dans React.
2. Synchroniser de la donnée simple (ex: un simple message de Chat).
3. Afficher un Canvas basique avec une grille.
4. Ajouter un pion (Token) et synchroniser sa position (X, Y) chez tout le monde.

### 🎯 Sprint 2 : Le Plateau et l'Immersion
*Objectif : Avoir les outils de base d'un vrai VTT.*
1. Ajouter/Changer l'image de fond (Background Map).
2. Outils de dessin basiques (dessiner à la souris sur la carte).
3. Système de lancer de dés dans le chat (`/r 1d20`).
4. Gérer plusieurs pages/scènes.

### 🎯 Sprint 3 : L'UI, l'Esthétisme et le Modding
*Objectif : Rendre le VTT Premium et prêt pour intégrer des règles.*
1. Refonte visuelle Premium (Animations, Glassmorphism, UI moderne et dynamique).
2. Mettre en place l'architecture "Système" (permettre de créer une fiche de personnage pour un JDR précis).
3. Brouillard de guerre (Fog of War) basique.

---
*Document vivant - À mettre à jour à chaque fin de Sprint.*
