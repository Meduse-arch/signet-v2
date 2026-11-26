# Charte Graphique - Signet VTT

Ce document définit les règles de design de l'application Signet VTT pour garantir une interface moderne, lisible, cohérente ("strict classique moderne"), et parfaitement responsive. Le projet utilise **Tailwind CSS**.

## 1. Palette de Couleurs

### Fond et Surfaces (Dark Mode Natif)
- **Fond principal de l'application** : `bg-[#050508]` (Noir très profond avec une micro-teinte bleutée).
- **Cartes, Formulaires et Panneaux** : Effet "Glassmorphism" (verre dépoli).
  - Fond : `bg-slate-950/80` ou `bg-black/40`.
  - Flou : `backdrop-blur-md` à `backdrop-blur-2xl`.
  - Bordures subtiles : `border border-white/10` ou `border-slate-800/80`.

**Tokens CSS** (définis dans `frontend/src/index.css`, `@theme`) :

| Usage | Valeur | Classe Tailwind |
|---|---|---|
| Fond de l'application | `#050508` | `bg-void` (= `bg-[#050508]`) |
| Barres de titre, panneaux opaques | `#090a10` | `bg-surface` |
| Cartes en relief | `#0c0d14` | `bg-surface-raised` |
| Bordure subtile | `rgb(255 255 255 / 0.08)` | `border-hairline` |

Les anciennes classes arbitraires (`bg-[#050508]`, `bg-[#090a10]`, `border-white/10`) restent valides ; migrer progressivement.

**Chiffres** : tout nombre affiché en colonne (PV, valeurs d'attributs, totaux de jets, heures) utilise l'utilitaire `num` (`font-variant-numeric: tabular-nums`).

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
- **Transitions** : `transition-all` est **interdit** (anime des propriétés de layout, coûteux et imprévisible). Utiliser des transitions ciblées sur les éléments interactifs : `transition-colors`, `transition-transform`, `transition-opacity`, ou une liste explicite (`transition-[transform,box-shadow]`). Ne jamais animer `left`/`top`/`width`/`height`. Respecter `prefers-reduced-motion` (géré globalement dans `index.css`).
- **Focus clavier** : un `:focus-visible` global (outline `rose-500`) est défini dans `index.css`. Ne pas le supprimer avec `outline-none` sans équivalent visible.
- **Survol des Cartes** : `hover:scale-[1.02]`.
- **Fond de page animé** : Les images d'arrière-plan doivent souvent avoir un mix-blend (ex: `mix-blend-luminosity`) ou être assombries par un dégradé (`bg-gradient-to-t from-black`) pour garantir la lisibilité absolue des textes par-dessus.

## 4. Fenêtres, barre des tâches et chat
- **Fenêtre (`DraggableWindow`)** : un seul en-tête (`bg-surface`, hauteur 40px, titre en `text-[13px] font-medium`, sentence case, pas de majuscules espacées). Boutons groupés à droite ; la fermeture passe en `text-rose-400` au survol. Fenêtre active : bordure `border-white/15` et titre blanc ; inactive : `border-hairline` et titre `text-zinc-400`.
- **Contenu de fiche** : aucun second bandeau (pas de « Retour », pas de badge de titre) ; l'identité du personnage ouvre directement le contenu. Ressources en lignes alignées (étiquette, barre fine, valeur `num`, −/+). Onglets en sentence case, trait `rose-600` sous l'onglet actif.
- **Barre des tâches** : rétractable (logo seul, déplié au survol). Élément actif : `text-rose-300` + trait `rose-600` de 2px dessous. Le sélecteur *Libre / Combat* est un contrôle segmenté, option active en surface `white/10` + trait `rose-600`.
- **Changement d'agencement** : animer par `transform` (ou un `transition-[transform,opacity]`), **pas** par `left`/`top` (règle §3) ; la maquette `ui-signet-v3.html` anime `left`/`top` par simplicité, ne pas la copier telle quelle.
- **Carte de jet (chat)** : fond `bg-white/[.025]`, bordure `border-hairline`, rayon 12px ; ligne meta (auteur · jet, heure), formule en `num` gris, total en `text-[28px]`, verdict en vert (réussite) ou `text-rose-400` (échec).
- **Carte de campagne** : 340×250, image ou grille tactique, dégradé noir bas (`rgba(5,5,8,.95)` → transparent) sous le titre en `font-bold`.
- **Top bar du Hub** : boutons fantômes discrets (`text-zinc-400`) ; *Quitter* passe en `text-rose-300` + `bg-rose-500/10` au survol.

## 5. Règle d'or : La Lisibilité Avant Tout
Rien ne doit entraver la lecture. Si une image est placée derrière du texte, elle doit être obligatoirement couverte par un overlay (ex: `bg-black/60` ou un dégradé). La charte est "stricte" : on ne dévie pas du Rouge Cramoisi (Rose) pour les accents, et le texte reste blanc/gris.
