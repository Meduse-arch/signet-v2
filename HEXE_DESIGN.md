# Hexe — Document de conception : Compétences, effets et objets

## 1. Objectif

Créer un système flexible permettant aux joueurs et aux MJ de définir des compétences et des objets sans devoir modifier le code à chaque création.

Le système doit prendre en charge :
- Les compétences passives, activables/désactivables (toggle) et actives.
- Les effets mécaniques et descriptifs.
- Les bonus de niveaux de stats et les bonus numériques directs.
- Les jets avec des dés personnalisés, comme `2d4`, `1d20`, `3d8` ou plusieurs dés différents.
- Les objets consommables et leurs effets.
- Les modifications des stats et des ressources, y compris leurs maximums.
- Les contenus officiels et personnalisés par le MJ.

Principe central : **une compétence ou un objet peut avoir plusieurs effets, de types différents.**

## 2. Modes d'activation des compétences

### Passif
L'effet est appliqué automatiquement lorsque ses conditions sont remplies.

Exemples :
- Vision nocturne.
- Résistance au poison.
- Bonus permanent de DEX.
- Augmentation permanente du maximum de HP.

### Toggle
Le joueur active ou désactive la compétence. Ses effets ne s'appliquent que lorsqu'elle est active.

Exemples :
- Aura de renforcement.
- Armure magique.
- Mode furtif.
- Augmentation temporaire de STR consommant du MP par tour.

Le système doit pouvoir gérer un coût d'activation et, si nécessaire, un coût d'entretien.

### Actif
Le joueur déclenche la compétence pour produire un effet ponctuel ou temporaire.

Exemples :
- Boule de feu.
- Frappe puissante.
- Soin.
- Téléportation.
- Lancer un jet personnalisé.

Une compétence active peut avoir un coût, une cible, une durée, un jet de dés ou plusieurs effets.

## 3. Structure d'une compétence

Chaque compétence contient les champs suivants :

- `id` : identifiant unique.
- `name` : nom.
- `description` : texte explicatif.
- `activationType` : `passive`, `toggle` ou `active`.
- `effects` : liste des effets.
- `conditions` : conditions éventuelles d'utilisation.
- `costs` : coûts en ressources.
- `duration` : durée éventuelle.
- `custom` : indique si le contenu est personnalisé.
- `skillLevel` : niveau facultatif de la compétence.

Le niveau de compétence est indépendant des niveaux de stats. Une compétence peut ne pas avoir de niveau du tout.

## 4. Types d'effets

### 4.1 Modifier le niveau d'une stat

Permet d'augmenter ou de diminuer le niveau effectif d'une stat.

Stats concernées :
- STR
- DEX
- AGI
- TEC
- VIT
- LUC

Exemple : `STR +2 niveaux`.

Le niveau effectif détermine le dé associé selon la table des stats de Hexe.

Les bonus provenant des compétences, de l'équipement et des effets actifs doivent être calculés séparément, puis combinés selon les règles du jeu.

### 4.2 Modifier directement un jet

Permet d'ajouter ou de retirer une valeur au résultat d'un jet sans changer le niveau de stat ni le dé utilisé.

Exemples :
- `+2 au résultat d'un jet d'attaque`.
- `-3 au résultat d'un jet de perception`.
- `+4 uniquement lors d'un jet de magie`.

Ces bonus sont distincts des niveaux de stat. Ils ne doivent pas être confondus dans le calcul du dé.

### 4.3 Modifier une ressource

Les ressources de Hexe sont :
- HP : points de vie.
- MP : points de mana.
- STM : endurance.
- Chance : réserve de points de Chance.

Un effet peut modifier :
- La valeur actuelle.
- Le maximum.
- La récupération.
- La consommation.
- Éventuellement la manière dont la ressource fonctionne.

Exemples :
- Récupérer 8 HP.
- Dépenser 3 MP.
- Augmenter le maximum de MP de 5.
- Augmenter la récupération de STM.
- Ajouter 2 points au maximum de Chance.

Il faut distinguer une récupération ponctuelle d'une augmentation de maximum.

### 4.4 Effet spécial ou descriptif

Un effet peut être purement descriptif ou géré manuellement par le MJ.

Exemples :
- Voir dans l'obscurité.
- Traverser une zone sans laisser de traces.
- Communiquer avec une créature particulière.
- Obtenir une permission narrative spéciale.

L'application ne doit pas prétendre automatiser un effet qu'elle ne sait pas interpréter.

## 5. Dés personnalisés

Les compétences et les objets peuvent définir leur propre formule de dés, indépendante du dé normalement associé à une stat.

Exemples :
- `1d4`
- `2d4`
- `1d20`
- `3d8`
- `2d6 + 1d8`
- `2d4 + 3`

La formule doit être stockée sous une forme structurée, et non comme du texte libre uniquement.

Une formule de dés doit pouvoir définir :
- Le nombre de dés.
- Le type de dé (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`, etc.).
- Plusieurs groupes de dés.
- Un éventuel bonus numérique fixe.
- Une description de l'utilisation du jet.

Exemples d'utilisation :
- Une compétence inflige `2d4` dégâts.
- Un objet restaure `2d6` HP.
- Une capacité lance `1d20` pour déterminer un effet.
- Une compétence lance `2d4 + 1d8` pour un résultat spécial.

L'application doit afficher la formule, les résultats individuels des dés et le total.

Exemple d'affichage :

**Soin mineur — 2d4**

- Dé 1 : 3
- Dé 2 : 4
- Total : 7 HP restaurés

La formule de dés doit être validée avant utilisation pour éviter les expressions invalides ou les valeurs excessives.

## 6. Objets consommables

Les consommables sont des objets d'inventaire pouvant être utilisés un nombre limité de fois.

Chaque consommable contient :
- `id`
- `name`
- `description`
- `quantity`
- `effects`
- `uses` ou règles d'utilisation éventuelles
- `custom`
- Éventuellement des conditions d'utilisation.

Lorsqu'un consommable est utilisé :
1. L'application vérifie qu'il en reste au moins un.
2. Elle applique ses effets.
3. Elle retire une unité de l'inventaire si l'utilisation est validée.
4. Elle affiche le résultat et les changements effectués.

Si l'utilisation échoue, le comportement doit être défini par les règles de l'objet : la consommation n'est pas automatiquement annulée ou appliquée dans tous les cas.

### Exemples de consommables

**Potion de soin**
- Effet : restaure `2d4` HP.
- Consommation : 1 potion par utilisation.

**Potion de mana**
- Effet : restaure `2d6` MP.
- La valeur actuelle ne peut pas dépasser le maximum de MP.

**Élixir d'endurance**
- Effet : restaure `1d8` STM.
- La valeur actuelle ne peut pas dépasser le maximum de STM.

**Faveur de Fortune**
- Effet possible : restaure des points de Chance ou augmente temporairement le maximum de Chance.
- La durée et le montant sont définis par l'objet.

## 7. Bonus de stats et de maximums de ressources

Les objets, compétences et effets peuvent modifier les niveaux de stats ou les ressources.

### Bonus de stats

Exemples :
- Un anneau donne `LUC +1 niveau`.
- Une capacité donne `AGI +2 niveaux` pendant sa durée.
- Une armure donne `VIT +2 niveaux`.

Les niveaux effectifs sont recalculés à partir des stats de base et des bonus applicables.

### Bonus aux maximums de ressources

Exemples :
- Une amulette augmente le maximum de HP de 10.
- Une potion spéciale augmente le maximum de MP de 5 pendant une heure.
- Une relique augmente le maximum de STM de 3 tant qu'elle est équipée.
- Un objet rare augmente le maximum de Chance de 2.

Ces effets doivent pouvoir être :
- Permanents.
- Temporaires.
- Liés à un objet équipé.
- Liés à une compétence active.

### Valeur actuelle et maximum

La valeur actuelle d'une ressource ne doit normalement pas dépasser son maximum.

Lorsqu'un maximum change, il faut définir une règle cohérente :
- Une hausse du maximum n'ajoute pas automatiquement des points actuels, sauf si l'effet le précise.
- Une baisse du maximum ne doit pas provoquer une perte de points actuelle non définie par les règles.
- Les effets temporaires doivent être recalculés à la fin de leur durée.

La politique exacte sera fixée dans les règles générales de ressources.

## 8. Armes, rangs et symbolique des pentacles

Les armes possèdent un rang mécanique et un symbole qui représente la nature de la volonté qui les guide. Le rang et la nature de l'arme sont deux informations distinctes : une arme d'Ego n'est pas automatiquement de rang S, et une arme classique peut être extrêmement puissante.

### 8.1 Rangs d'armes

La progression proposée reprend le nombre de branches du pentacle :

- Rang F : 1 branche.
- Rang D : 2 branches.
- Rang C : 3 branches.
- Rang B : 4 branches.
- Rang A : 5 branches.
- Rang S : pentacle entouré d'un cercle.

Cette correspondance est une convention de conception proposée et pourra être ajustée. Le cercle représente un seuil symbolique au-delà des cinq branches.

Le rang sert à classer l'arme et à indiquer son niveau de rareté ou de puissance selon les règles du monde. **Le rang ne donne pas automatiquement de bonus de stats** : les bonus, propriétés et capacités de l'arme sont configurés explicitement.

### 8.2 Orientation et nature de la volonté

L'orientation du pentacle représente ce qui domine dans la relation entre l'esprit et le désir :

- **Pentacle droit, pointe vers le haut — arme classique :** l'esprit du porteur domine ses désirs et dirige l'arme. L'arme reste un outil soumis à sa volonté, même si elle possède une histoire, un pouvoir ou une personnalité.
- **Pentacle inversé, pointe vers le bas — arme d'Ego :** le désir surpasse l'esprit du porteur. L'arme possède sa propre volonté et poursuit ses propres désirs. Elle peut coopérer avec son utilisateur, mais aussi résister, négocier ou agir selon ses propres objectifs.
- **Pentacle inversé plein — arme possédée :** une volonté étrangère habite ou contrôle l'arme. Il peut s'agir, par exemple, d'un démon, d'un esprit ou d'une autre entité. Cette volonté ne provient pas nécessairement de l'arme elle-même.

La distinction essentielle est l'origine de la volonté :
- Pour une arme classique, la volonté directrice est celle du porteur.
- Pour une arme d'Ego, la volonté appartient à l'arme elle-même.
- Pour une arme possédée, la volonté appartient à une entité étrangère qui réside dans l'arme.

Ces symboles sont une convention visuelle et narrative du système Hexe. Leur apparence exacte pourra être précisée dans les ressources graphiques du projet.

### 8.3 Le cercle et les variantes de rang S

Le cercle autour du pentacle indique le rang S. Il peut être associé à différentes natures d'armes :

- **Pentacle droit avec cercle :** arme classique de rang S.
- **Pentacle inversé avec cercle :** arme d'Ego de rang S.
- **Pentacle inversé plein avec cercle :** arme possédée de rang S.

Le cercle ne détermine pas à lui seul si une arme est classique, d'Ego ou possédée : l'orientation et le remplissage apportent cette distinction.

Une arme d'Ego et une arme possédée ne sont pas la même catégorie. Une arme d'Ego peut avoir sa propre volonté sans être habitée par une entité extérieure. Une arme possédée contient une présence distincte, susceptible d'influencer ou de contrôler l'arme et éventuellement son porteur.

### 8.4 Capacités et équipement

Les armes peuvent référencer une ou plusieurs compétences du catalogue commun de Hexe plutôt que de dupliquer leur définition. Une capacité peut être partagée par plusieurs armes ou être unique à une arme particulière.

Lorsqu'une arme est équipée, ses capacités deviennent disponibles selon les règles définies par la compétence. Lorsqu'elle est déséquipée, les capacités accordées uniquement par cette arme ne sont plus disponibles. Les compétences apprises indépendamment de l'équipement restent acquises.

Pour les capacités passives, toggles et effets temporaires provenant d'une arme, l'application doit conserver leur source. Si l'arme est déséquipée, les effets dépendant exclusivement de cette arme doivent être désactivés ou retirés correctement.

Les armes peuvent également définir :
- Des bonus explicites de niveaux de stats.
- Des propriétés particulières.
- Des capacités référencées par identifiant.
- Une catégorie de volonté : classique, Ego ou possédée.
- Un rang et un symbole associés.

La nature et le symbole d'une arme ne déterminent pas automatiquement ses bonus ou ses effets mécaniques. Ceux-ci doivent être configurés séparément.

### 8.5 Modèle de données indicatif pour une arme

```ts
type HexeWeaponRank = "F" | "D" | "C" | "B" | "A" | "S";
type HexeWeaponNature = "classic" | "ego" | "possessed";
type HexePentacleOrientation = "upright" | "inverted";

type HexeWeaponSymbol = {
  orientation: HexePentacleOrientation;
  filled: boolean;
  hasCircle: boolean;
};

type HexeWeapon = {
  id: string;
  name: string;
  rank: HexeWeaponRank;
  nature: HexeWeaponNature;
  symbol: HexeWeaponSymbol;
  statBonuses?: Partial<Record<HexeStatKey, number>>;
  abilityIds?: string[];
  properties?: string[];
  description?: string;
};
```

Ce modèle est indicatif et doit être adapté aux types déjà présents dans le projet. Les champs `nature` et `symbol` sont séparés pour éviter de déduire toute la logique de l'arme à partir de son apparence uniquement. Une validation peut toutefois vérifier que les combinaisons usuelles restent cohérentes :
- `classic` : pentacle droit et non rempli.
- `ego` : pentacle inversé et non rempli.
- `possessed` : pentacle inversé et rempli.
- `hasCircle: true` pour une arme de rang S, si cette convention est conservée.

Les règles pourront autoriser des exceptions narratives sans modifier le principe général.

## 9. Durée des effets

Les effets peuvent être :

- Permanents.
- Jusqu'à désactivation.
- Jusqu'à la fin d'un combat.
- Pendant un nombre de tours.
- Pendant une durée définie.
- Jusqu'à ce qu'une condition soit remplie.
- Instantanés.

Une compétence active peut par exemple restaurer immédiatement des HP, tandis qu'une autre donne `STR +2 niveaux` pendant trois tours.

Pour les effets temporaires, l'application doit enregistrer la source, la durée restante et les changements actifs, afin d'éviter qu'un bonus soit appliqué plusieurs fois par erreur.

## 10. Modèle de données recommandé

Les types ci-dessous sont indicatifs et devront être adaptés aux types existants du projet.

```ts
type HexeActivationType =
  | "passive"
  | "toggle"
  | "active";

type HexeResourceKey =
  | "hp"
  | "mp"
  | "stm"
  | "chance";

type HexeEffect =
  | {
      type: "statLevel";
      stat: HexeStatKey;
      value: number;
    }
  | {
      type: "rollModifier";
      value: number;
      condition?: string;
    }
  | {
      type: "resourceChange";
      resource: HexeResourceKey;
      target: "current" | "maximum";
      operation: "add" | "set" | "restore" | "spend";
      value?: number;
      dice?: HexeDiceFormula;
    }
  | {
      type: "custom";
      description: string;
    };

type HexeDiceTerm = {
  count: number;
  sides: number;
};

type HexeDiceFormula = {
  terms: HexeDiceTerm[];
  flatModifier?: number;
};

type HexeSkill = {
  id: string;
  name: string;
  description?: string;
  activationType: HexeActivationType;
  effects: HexeEffect[];
  dice?: HexeDiceFormula;
  skillLevel?: number;
  duration?: string;
  conditions?: string[];
  custom?: boolean;
};

type HexeConsumable = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  effects: HexeEffect[];
  custom?: boolean;
};
```

Le modèle est volontairement extensible. Les effets doivent être validés et exécutés par un gestionnaire commun plutôt que par du code spécifique à chaque compétence.

## 11. Interface prévue

### Fiche de personnage
- Liste des compétences possédées.
- Bouton d'activation pour les toggles.
- Bouton d'utilisation pour les compétences actives.
- Indicateur des effets passifs.
- Affichage des niveaux de compétence si applicables.
- Affichage des coûts et des durées.

### Inventaire
- Objets équipés.
- Objets non équipés.
- Consommables avec quantité.
- Bouton « Utiliser » pour les consommables.
- Affichage des effets et du résultat de leur utilisation.

### Gestionnaire du MJ
- Création et modification des compétences.
- Configuration des effets et des formules de dés.
- Définition des durées, conditions et coûts.
- Distinction entre contenu officiel et contenu personnalisé.

## 12. Ordre de développement

1. Définir les types de données.
2. Créer un moteur de jets de dés personnalisés.
3. Implémenter les effets de stats, de jets et de ressources.
4. Ajouter les trois modes : passif, toggle et actif.
5. Ajouter les consommables à l'inventaire.
6. Ajouter les durées et les effets temporaires.
7. Créer l'interface de gestion du MJ.
8. Ajouter les tests pour vérifier que les bonus ne se cumulent pas accidentellement et que les ressources restent cohérentes.

## 13. Principes à retenir

- Les compétences n'ont pas toutes besoin d'un niveau.
- Une compétence peut avoir plusieurs effets.
- Les bonus de niveau de stat sont distincts des bonus directs aux jets.
- Les formules de dés personnalisées peuvent utiliser plusieurs dés différents.
- Les consommables peuvent restaurer des ressources, modifier des stats ou changer des maximums.
- Les effets temporaires doivent être suivis et retirés correctement.
- Les effets descriptifs restent possibles sans automatisation.
- Le MJ peut créer ses propres contenus sans modifier les définitions officielles.
