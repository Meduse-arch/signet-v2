// Fichier de traduction (Français)
// Contient tout le vocabulaire classique de l'application pour faciliter la réutilisation
// et préparer le terrain pour l'internationalisation (i18n) future.

export const fr = {
  // --- Global ---
  app_name: "Signet",
  loading: "Chargement...",
  error_occurred: "Une erreur est survenue.",
  
  // --- Auth.tsx ---
  auth_welcome: "Bienvenue",
  auth_welcome_sub: "Connectez-vous à votre compte",
  auth_create_account: "Créer un compte",
  auth_create_account_sub: "Inscrivez-vous pour rejoindre la plateforme",
  auth_username_label: "Pseudo",
  auth_username_placeholder: "Votre pseudo",
  auth_identifier_label: "Email ou Pseudo",
  auth_identifier_placeholder: "mail@exemple.com ou Pseudo",
  auth_email_label: "Adresse Email",
  auth_email_placeholder: "mail@exemple.com",
  auth_password_label: "Mot de passe",
  auth_password_placeholder: "••••••••",
  auth_btn_login: "Se connecter",
  auth_btn_register: "S'inscrire",
  auth_no_account: "Vous n'avez pas de compte ?",
  auth_has_account: "Vous avez déjà un compte ?",
  auth_register_success: "Inscription réussie ! Vous pouvez maintenant vous connecter.",
  auth_err_pseudo_taken: "Ce pseudo est déjà utilisé. Veuillez en choisir un autre.",
  auth_err_pseudo_not_found: "Pseudo introuvable ou erreur de connexion.",

  // --- Hub.tsx ---
  hub_connected_as: "Connecté en tant que",
  hub_logout: "Déconnexion",
  hub_join_title: "Rejoindre une partie",
  hub_join_desc: "Entrez le code fourni pour intégrer la session.",
  hub_join_placeholder: "Ex: XK9L2A",
  hub_btn_join: "Rejoindre",
  hub_create_title: "Héberger une partie",
  hub_create_desc: "Créez une nouvelle session et invitez des joueurs.",
  hub_btn_create: "Nouvelle Session",

  // --- App.tsx ---
  app_loading: "Chargement de l'application...",
  app_room_label: "Salle :",
  app_leave_room: "Quitter la session",

  // --- Modals (Hub) ---
  modal_notes_title: "Carnet de Notes",
  modal_notes_desc: "Prenez des notes rapides, elles seront conservées pour vos prochaines parties.",
  modal_notes_placeholder: "Commencez à écrire ici...",
  modal_notes_save: "Sauvegarder",

  modal_public_title: "Sessions Publiques",
  modal_public_desc: "Rejoignez une aventure ouverte et rencontrez de nouveaux joueurs.",
  modal_public_join: "Rejoindre",
  modal_public_full: "Complet",

  modal_mods_title: "Mods & Extensions",
  modal_mods_desc: "Personnalisez votre VTT avec des modules créés par la communauté.",
  modal_mods_active: "Actif",
  modal_mods_activate: "Activer",

  modal_settings_title: "Paramètres",
  modal_settings_language: "Langue",
  modal_settings_lang_fr: "Français",
};

// Fonction utilitaire temporaire (pourra être remplacée par react-i18next plus tard)
export function t(key: keyof typeof fr): string {
  return fr[key] || key;
}
