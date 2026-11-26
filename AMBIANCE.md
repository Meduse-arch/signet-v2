# Vision et Ambiance (Vibe & Lore) - Signet VTT

Ce document définit l'atmosphère, l'ambiance et l'esthétique générale de l'application Signet VTT. Il sert de guide pour toutes les futures décisions de design, d'interface utilisateur (UI) et d'expérience utilisateur (UX).

## 1. Thème Central : Dark Fantasy & Vampirisme

L'application doit dégager une aura sombre, mystérieuse et élégante, fortement inspirée par la Dark Fantasy et le mythe vampirique. 

- **Mots-clés** : Sombre, sanglant, élégant, gothique moderne, occulte.
- **Le ressenti** : L'utilisateur ne doit pas avoir l'impression d'ouvrir un simple outil web, mais plutôt de franchir les portes d'un manoir ou de lancer un jeu vidéo premium (AAA). 

## 2. Le style "Strict, Classique, Moderne"

Bien que le thème soit fantastique, l'interface doit rester extrêmement professionnelle et épurée.

- **Strict et Poli** : Pas de fioritures inutiles, pas d'éléments d'interface surchargés. Les lignes sont droites, les bordures sont subtiles, l'agencement est carré.
- **Cinématique et Immersif (Le style "Netflix")** : L'interface emprunte les codes des grandes plateformes de streaming (comme Netflix) ou des launchers de jeux AAA. De grands fonds d'écran immersifs (backgrounds de paysages ou donjons), des sections "Héro" imposantes, et des carrousels horizontaux pour la navigation. Ces images sont toujours assombries (dégradés noirs, blend modes) pour faire ressortir le texte sans gêner la lisibilité.
- **Minimalisme** : L'interface se fond dans le décor. On utilise des effets de verre dépoli (Glassmorphism) pour les panneaux et les cartes, laissant transparaître le monde en arrière-plan avec une couche fantasy/vampirique.

## 3. Charte des Couleurs (Rappel)

- **Le Vide (Fond)** : Noir absolu ou Noir abyssal (`#050508`). Représente la nuit, le donjon, l'inconnu.
- **Le Sang (Accent)** : Rouge Cramoisi (Rose dans Tailwind). C'est la couleur de l'action, de l'interaction et de la mise en valeur. Elle rappelle le vampirisme et le danger.
- **La Lumière (Texte)** : Blanc pur pour les titres, gris acier/argenté pour les textes secondaires.

## 4. Comportement de l'Interface

- **Application de Bureau (Desktop-first)** : Signet VTT est pensé comme un véritable logiciel (via Tauri). L'interface doit se comporter comme tel : barre de titre personnalisée intégrée au design, absence de barres de défilement disgracieuses (scrollbars cachées mais fonctionnelles), et transitions fluides.
- **Écran d'Accueil (Le Hub)** : Il doit ressembler au menu principal d'un grand RPG. Une grande phrase d'accroche ("L'aventure vous attend"), des appels à l'action clairs, et un carrousel de campagnes qui donne envie de replonger dans l'histoire. Détail en §5.

## 5. Le Hub en détail (référence : `ui-signet-v3.html`)

- **Pleine hauteur, centre dégagé** : le Hub occupe toute la fenêtre. Le héro (titre, code, bouton) est en haut à gauche, « Reprendre une campagne » est ancré en bas, et le centre reste **ouvert** pour laisser respirer le fond château (ou une future animation d'ambiance). Seul un bandeau d'astuce discret, masquable d'un clic, peut y figurer.
- **Colonne droite repliable** : les entrées *Carnet de notes*, *Sessions publiques* et *Mods et systèmes* forment une colonne pleine hauteur de cartes en verre dépoli. Chaque carte montre un **aperçu en direct** (dernière note, tables publiques ouvertes, état des systèmes). La colonne peut se replier pour laisser tout le fond visible.
- **Top bar épurée** : profil (nom + rôle), **Paramètres** (⚙) et **Quitter** (discret, rouge cramoisi au survol). Le choix Internet / Réseau local n'a pas sa place ici : il vit dans les Paramètres.
- **Aperçu intelligent des campagnes** : chaque carte affiche l'image personnalisée de la campagne si elle en a une ; sinon, par défaut, une **grille tactique** (quadrillage, contours de salles, pions colorés). Un dégradé sombre en bas porte toujours le titre, le système (*Hexe* / *Flower*), le rôle et le code.

## 6. L'écran de jeu en détail

- **Fenêtres à en-tête unique** : une fenêtre (`DraggableWindow`) n'a qu'**un seul** bandeau, celui de la fenêtre (icône, titre, plein écran, détacher, replier, fermer). Le contenu ne répète jamais ce bandeau : pas de « Retour » ni de badge de titre dans les fiches. La fenêtre active se distingue de l'inactive par sa bordure et son titre.
- **Barre des tâches rétractable** : réduite au logo, elle se déplie au survol du bas de l'écran (icônes épinglées, tooltips, trait cramoisi sous l'élément actif). Elle contient le sélecteur d'agencement **Libre / Combat** : *Combat* range la fiche à gauche et le lanceur de dés en bas au centre, le chat restant ancré à droite ; *Libre* remet les fenêtres en flottant.
- **Chat** : un jet de dés s'affiche en **carte lisible** (qui, quoi, formule avec détail du tirage, total en grand, réussite ou échec face au seuil), jamais en ligne de texte brute.
- **Sortie** : la pastille d'état de la table (nom, code, joueurs en ligne) porte le bouton *Quitter la table* qui ramène au Hub.
