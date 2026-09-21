use rusqlite::{params, Connection, Result as SqlResult};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use serde::{Deserialize, Serialize};

// Wrapper pour partager la connexion SQLite de façon "thread-safe"
pub struct DbState(pub Mutex<Option<Connection>>);

#[derive(Serialize, Deserialize, Debug)]
pub struct CharacterRecord {
    pub id: String,
    pub name: String,
    pub owner_id: Option<String>,
    pub data: String, // JSON complet de la fiche
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TokenRecord {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub scale_x: f64,
    pub scale_y: f64,
    pub rotation: f64,
    pub data: String, // JSON contenant name, color, owner, avatarUrl
}

// ==============================================================================
// INITIALISATION
// ==============================================================================

pub fn init_db(app: &AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Impossible de trouver le dossier AppData".to_string())?;

    // On suit la règle du "campagne/signet-codexxe/bd"
    let db_dir = app_data_dir.join("campaigns").join("signet-codexxe").join("bd");
    
    if !db_dir.exists() {
        fs::create_dir_all(&db_dir)
            .map_err(|e| format!("Erreur création dossier BD: {}", e))?;
    }

    let db_path = db_dir.join("data.sqlite");
    
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Erreur ouverture BD: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            owner_id TEXT,
            data TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Erreur table characters: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS tokens (
            id TEXT PRIMARY KEY,
            x REAL NOT NULL,
            y REAL NOT NULL,
            scale_x REAL NOT NULL,
            scale_y REAL NOT NULL,
            rotation REAL NOT NULL,
            data TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Erreur table tokens: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS assets (
            hash TEXT PRIMARY KEY,
            name TEXT,
            extension TEXT,
            file_type TEXT
        )",
        [],
    ).map_err(|e| format!("Erreur table assets: {}", e))?;

    // On stocke la connexion dans le State de Tauri
    let state: State<DbState> = app.state();
    *state.0.lock().unwrap() = Some(conn);

    println!("[Base de données] SQLite initialisé dans : {:?}", db_path);
    Ok(())
}

// ==============================================================================
// COMMANDES TAURI - PERSONNAGES
// ==============================================================================

#[tauri::command]
pub fn save_character(
    state: State<'_, DbState>,
    id: String,
    name: String,
    owner_id: Option<String>,
    data: String,
) -> Result<(), String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute(
        "INSERT INTO characters (id, name, owner_id, data) 
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, 
            owner_id=excluded.owner_id, 
            data=excluded.data",
        params![id, name, owner_id, data],
    ).map_err(|e| format!("Erreur sauvegarde personnage: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_characters(state: State<'_, DbState>) -> Result<Vec<CharacterRecord>, String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    let mut stmt = conn.prepare("SELECT id, name, owner_id, data FROM characters")
        .map_err(|e| format!("Erreur préparation requête: {}", e))?;
        
    let char_iter = stmt.query_map([], |row| {
        Ok(CharacterRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            owner_id: row.get(2)?,
            data: row.get(3)?,
        })
    }).map_err(|e| format!("Erreur exécution requête: {}", e))?;

    let mut characters = Vec::new();
    for character in char_iter {
        if let Ok(c) = character {
            characters.push(c);
        }
    }

    Ok(characters)
}

#[tauri::command]
pub fn delete_character(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute("DELETE FROM characters WHERE id = ?1", params![id])
        .map_err(|e| format!("Erreur suppression personnage: {}", e))?;

    Ok(())
}

// ==============================================================================
// COMMANDES TAURI - TOKENS
// ==============================================================================

#[tauri::command]
pub fn save_token(
    state: State<'_, DbState>,
    id: String,
    x: f64,
    y: f64,
    scale_x: f64,
    scale_y: f64,
    rotation: f64,
    data: String,
) -> Result<(), String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute(
        "INSERT INTO tokens (id, x, y, scale_x, scale_y, rotation, data) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET 
            x=excluded.x, 
            y=excluded.y,
            scale_x=excluded.scale_x,
            scale_y=excluded.scale_y,
            rotation=excluded.rotation,
            data=excluded.data",
        params![id, x, y, scale_x, scale_y, rotation, data],
    ).map_err(|e| format!("Erreur sauvegarde token: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_tokens(state: State<'_, DbState>) -> Result<Vec<TokenRecord>, String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    let mut stmt = conn.prepare("SELECT id, x, y, scale_x, scale_y, rotation, data FROM tokens")
        .map_err(|e| format!("Erreur préparation requête tokens: {}", e))?;
        
    let iter = stmt.query_map([], |row| {
        Ok(TokenRecord {
            id: row.get(0)?,
            x: row.get(1)?,
            y: row.get(2)?,
            scale_x: row.get(3)?,
            scale_y: row.get(4)?,
            rotation: row.get(5)?,
            data: row.get(6)?,
        })
    }).map_err(|e| format!("Erreur exécution requête tokens: {}", e))?;

    let mut tokens = Vec::new();
    for t in iter {
        if let Ok(token) = t {
            tokens.push(token);
        }
    }

    Ok(tokens)
}

#[tauri::command]
pub fn delete_token(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute("DELETE FROM tokens WHERE id = ?1", params![id])
        .map_err(|e| format!("Erreur suppression token: {}", e))?;

    Ok(())
}

// ==============================================================================
// COMMANDES TAURI - ASSETS
// ==============================================================================

pub fn insert_asset_record(conn: &Connection, hash: &str, extension: &str, name: &str) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO assets (hash, name, extension, file_type) 
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(hash) DO NOTHING",
        params![hash, name, extension, "image"],
    )?;
    Ok(())
}
