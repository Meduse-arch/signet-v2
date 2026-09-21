use sha2::{Sha256, Digest};
use std::fs;
use std::io::Write;
use tauri::{AppHandle, Manager, State};
use crate::database::{DbState, insert_asset_record};

#[tauri::command]
pub fn upload_asset(app: AppHandle, state: State<'_, DbState>, data: Vec<u8>, extension: String) -> Result<String, String> {
    // 1. Calcul du hash SHA-256
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let result = hasher.finalize();
    let hash_hex = hex::encode(result);

    // 2. Construction du chemin du fichier
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Impossible de trouver le dossier AppData".to_string())?;

    let library_dir = app_data_dir.join("library");

    // Créer le dossier s'il n'existe pas
    if !library_dir.exists() {
        fs::create_dir_all(&library_dir)
            .map_err(|e| format!("Erreur lors de la création du dossier library: {}", e))?;
    }

    let file_name = format!("{}.{}", hash_hex, extension);
    let file_path = library_dir.join(&file_name);

    // 3. Sauvegarder si le fichier n'existe pas déjà (déduplication)
    if !file_path.exists() {
        let mut file = fs::File::create(&file_path)
            .map_err(|e| format!("Erreur création fichier: {}", e))?;
        file.write_all(&data)
            .map_err(|e| format!("Erreur écriture fichier: {}", e))?;
    }

    // 4. Enregistrer dans la base de données
    if let Ok(mut lock) = state.inner().0.lock() {
        if let Some(conn) = lock.as_ref() {
            // "Inconnu" comme nom par défaut, on pourra faire un endpoint rename_asset plus tard si besoin.
            let _ = insert_asset_record(conn, &hash_hex, &extension, "Inconnu");
        }
    }

    // Retourner seulement "hash.ext" pour que l'URL soit signet://library/hash.ext
    Ok(file_name)
}

#[tauri::command]
pub fn check_asset_exists(app: AppHandle, hash: String) -> Result<bool, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Impossible de trouver le dossier AppData".to_string())?;

    let library_dir = app_data_dir.join("library");
    
    // On cherche un fichier qui commence par ce hash (pour ignorer l'extension exacte lors de la vérification initiale)
    if let Ok(entries) = fs::read_dir(library_dir) {
        for entry in entries.flatten() {
            if let Some(file_name) = entry.file_name().to_str() {
                if file_name.starts_with(&hash) {
                    return Ok(true);
                }
            }
        }
    }
    
    Ok(false)
}

#[tauri::command]
pub fn read_asset(app: AppHandle, hash: String) -> Result<Vec<u8>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Impossible de trouver le dossier AppData".to_string())?;

    let library_dir = app_data_dir.join("library");
    
    // Trouver le fichier exact (avec son extension)
    if let Ok(entries) = fs::read_dir(library_dir) {
        for entry in entries.flatten() {
            if let Some(file_name) = entry.file_name().to_str() {
                if file_name.starts_with(&hash) {
                    return fs::read(entry.path())
                        .map_err(|e| format!("Erreur lors de la lecture du fichier: {}", e));
                }
            }
        }
    }
    
    Err("Fichier introuvable dans la bibliothèque locale".to_string())
}
