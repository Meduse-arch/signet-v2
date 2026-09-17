# Philosophie de Code & Architecture du Projet (Signet VTT)

Ce document répertorie les règles d'or et l'architecture décidées lors de nos brainstormings. 
Il sert de guide de référence pour garantir que le projet reste propre, modulable et ultra-optimisé.

## 1. La philosophie du "Code Chill" 🧊
Le but est d'avoir une base de code où il est toujours agréable et facile de travailler (sans prise de tête).
- **Fichiers de petite taille :** Dès qu'un composant React devient trop gros ou mélange plusieurs responsabilités (UI + Réseau + Logique métier), on le découpe en petits fichiers spécialisés.
- **Factorisation absolue :** Pas de code en doublon. Si une UI ou un hook est utilisé à deux endroits, on crée un fichier partagé (ex: `Carousel.tsx`, `useHorizontalScroll.ts`).
- **Isolation de la logique :** L'interface React ne doit faire qu'afficher les données. Les appels complexes (comme Supabase) doivent être extraits dans des Services (ex: `AuthService.ts`).

## 2. Le Cœur (Core) vs Les Systèmes (Modules) 🧩
C'est la règle d'or pour éviter d'avoir un code lourd et des conflits de règles :
- **Le Core (Le VTT de base) :** Il est "bête". Il ne connaît **aucune** règle de jeu de rôle. Il sait juste afficher une carte, lancer des dés (physiques ou virtuels), envoyer des messages dans un chat, et connecter les joueurs en réseau. C'est le moteur pur.
- **Les Systèmes (Les Modules) :** Toute logique de jeu (Donjons & Dragons, L'Appel de Cthulhu, Chroniques Oubliées) est un **Module séparé**. 
  - Quand on lance une partie de D&D, le VTT ne charge **que** le module D&D. Le code des autres jeux n'est même pas importé.
  - Cela garantit qu'il n'y ait aucun conflit entre les règles, que l'application reste extrêmement légère, et que n'importe quel moddeur puisse créer son propre "Système" en se branchant simplement sur le Core sans risquer de casser le reste de l'application.

## 3. Penser "Mods" en premier 🛠️
Le projet doit pouvoir accueillir des Mods créés par la communauté. 
- Rien ne doit être codé "en dur" si cela peut être rendu dynamique.
- Le cœur de l'application devra exposer des événements (Event Bus) pour que les Mods puissent écouter le réseau (ex: lancers de dés, arrivées de joueurs) sans modifier le code source natif de l'application.

## 3. Stratégie Réseau : L'optimisation intelligente 🌐
Dans un VTT (Virtual Tabletop) P2P, le réseau est le nerf de la guerre. La règle est de **"choisir la méthode la plus optimisée selon l'action"**.

- **Les actions critiques (Dés, Chat, Commandes) :** 
  - Utilisation du P2P WebRTC classique en mode "Fiable et Ordonné" (TCP-like).
  - Assure que les messages arrivent dans l'ordre, sans perte.
- **Les données temps-réel (Pointeurs de souris, déplacement de tokens) :**
  - Utilisation du P2P WebRTC en mode "Non-Fiable" (UDP-like).
  - Priorité absolue à la vitesse (ping minimal) ; si un paquet se perd, le suivant corrigera.
- **Le transfert de fichiers lourds (Cartes, Musiques, PDF) :**
  - Utilisation du principe **Torrent (ex: WebTorrent)**.
  - Le Maître du Jeu n'envoie pas le fichier complet de 10 Mo à ses 5 joueurs (ce qui ferait 50 Mo d'upload). Il commence à envoyer des petits "morceaux" (chunks).
  - Dès qu'un joueur reçoit un morceau, il se met à le partager (seeder) avec les autres joueurs. L'upload est ainsi réparti sur tout le groupe, soulageant le réseau de l'hôte.

---
*Document évolutif : à mettre à jour à chaque nouvelle grande décision architecturale.*
