/** Dernière mise à jour affichée dans le bandeau du Hub. À modifier à chaque release (la version relance l'affichage du bandeau). */
export const HUB_UPDATE = {
  version: '0.1.0',
  title: 'Nouveautés de la mise à jour',
  notes: [
    'Fenêtres détachées : relais local, sans passer par le réseau',
    'Barre de titre native restaurée',
    'Systèmes de jeu chargés à la demande',
  ],
} as const;

export const HUB_UPDATE_SEEN_KEY = 'signet_update_seen';
