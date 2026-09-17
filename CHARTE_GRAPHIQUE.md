# Charte Graphique - Signet VTT

Ce document définit les règles de design de l'application Signet VTT pour garantir une interface moderne, lisible, cohérente ("strict classique moderne"), et parfaitement responsive. Le projet utilise **Tailwind CSS**.

## 1. Palette de Couleurs

### Fond et Surfaces (Dark Mode Natif)
- **Fond principal de l'application** : `bg-[#050508]` (Noir très profond avec une micro-teinte bleutée).
- **Cartes, Formulaires et Panneaux** : Effet "Glassmorphism" (verre dépoli).
  - Fond : `bg-slate-950/80` ou `bg-black/40`.
  - Flou : `backdrop-blur-md` à `backdrop-blur-2xl`.
  - Bordures subtiles : `border border-white/10` ou `border-slate-800/80`.

### Couleur Primaire (Accents et Actions) : **Rose (Rouge Cramoisi)**
Le Rose (Rose/Crimson dans Tailwind) est la couleur directrice. L'utilisation de teintes proches (orange, violet) est proscrite pour éviter de se mélanger les pinceaux.
- **Boutons d'action principale** : `bg-rose-600` avec survol `hover:bg-rose-500`.
- **Boutons secondaires/fantômes** : `bg-rose-600/20` avec `border-rose-500/30`.
- **Textes mis en évidence (Rôles, codes, etc.)** : `text-rose-400` ou `text-rose-300`.
- **Ombres portées (Glow)** : `shadow-[0_0_20px_rgba(225,29,72,0.3)]` pour donner un aspect "néon" discret.

### Typographie et Textes
- **Titres (h1, h2)** : `text-white font-black` (souvent avec un `tracking-tight` pour un effet moderne et `drop-shadow-lg` sur les images).
- **Textes secondaires (descriptions, sous-titres)** : `text-slate-300` ou `text-slate-400` avec `font-medium`.
- **Labels de formulaires** : `text-sm font-semibold text-slate-300`.

## 2. Boutons et Composants Interactifs

### Structure des Boutons
Pour éviter que les mots ne "sortent" de leurs boutons sur les petits écrans ou lors de traductions plus longues, tous les boutons doivent respecter ces règles :
- Utiliser `whitespace-nowrap` pour empêcher le texte de passer à la ligne et de casser la hauteur du bouton.
- Ajouter la classe `shrink-0` sur les icônes (ex: Lucide React) pour éviter qu'elles ne s'écrasent si l'écran est trop petit.
- Utiliser `flex items-center justify-center gap-2`.
- Appliquer des paddings responsifs. Exemple : `px-4 sm:px-6 py-3`.

### Champs de Texte (Inputs)
- Fond transparent ou semi-transparent : `bg-slate-900/80` ou `bg-transparent`.
- Focus : `focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500`.
- Placeholder : `placeholder-slate-600` ou `placeholder-white/30`.

## 3. Effets et Animations
- **Transitions** : Toujours utiliser la classe `transition-all` ou `transition-colors` sur les éléments interactifs.
- **Survol des Cartes** : `hover:scale-[1.02]`.
- **Fond de page animé** : Les images d'arrière-plan doivent souvent avoir un mix-blend (ex: `mix-blend-luminosity`) ou être assombries par un dégradé (`bg-gradient-to-t from-black`) pour garantir la lisibilité absolue des textes par-dessus.

## 4. Règle d'or : La Lisibilité Avant Tout
Rien ne doit entraver la lecture. Si une image est placée derrière du texte, elle doit être obligatoirement couverte par un overlay (ex: `bg-black/60` ou un dégradé). La charte est "stricte" : on ne dévie pas du Rouge Cramoisi (Rose) pour les accents, et le texte reste blanc/gris.
