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
    let state: State<DbState> = app.state();
    *state.0.lock().unwrap() = None; // Pas de DB par défaut, on attend open_campaign_db
    println!("[Base de données] SQLite en attente de la sélection de campagne.");
    Ok(())
}

#[tauri::command]
pub fn open_campaign_db(app: tauri::AppHandle, state: State<'_, DbState>, room_id: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Impossible de trouver le dossier AppData".to_string())?;

    // On suit la règle demandée: local / <CODE> / bd
    let db_dir = app_data_dir.join("local").join(&room_id).join("bd");
    
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

    conn.execute(
        "CREATE TABLE IF NOT EXISTS players (
            username TEXT PRIMARY KEY
        )",
        [],
    ).map_err(|e| format!("Erreur table players: {}", e))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS module_data (
            module_id TEXT,
            key TEXT,
            data TEXT NOT NULL,
            PRIMARY KEY (module_id, key)
        )",
        [],
    ).map_err(|e| format!("Erreur table module_data: {}", e))?;

    // On stocke la connexion dans le State de Tauri
    let mut lock = state.inner().0.lock().unwrap();
    *lock = Some(conn);

    println!("[Base de données] SQLite ouvert pour la room {} dans : {:?}", room_id, db_path);
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

// ==============================================================================
// COMMANDES TAURI - JOUEURS (PLAYERS)
// ==============================================================================

#[tauri::command]
pub fn save_player(state: State<'_, DbState>, username: String) -> Result<(), String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute(
        "INSERT INTO players (username) VALUES (?1) ON CONFLICT(username) DO NOTHING",
        params![username],
    ).map_err(|e| format!("Erreur sauvegarde joueur: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_players(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    let mut stmt = conn.prepare("SELECT username FROM players")
        .map_err(|e| format!("Erreur préparation requête players: {}", e))?;
        
    let iter = stmt.query_map([], |row| {
        row.get::<_, String>(0)
    }).map_err(|e| format!("Erreur exécution requête players: {}", e))?;

    let mut players = Vec::new();
    for p in iter {
        if let Ok(player) = p {
            players.push(player);
        }
    }

    Ok(players)
}

// ==============================================================================
// COMMANDES TAURI - DONNÉES DE MODULES GÉNÉRIQUES (MODS / SYSTÈMES)
// ==============================================================================

#[tauri::command]
pub fn save_module_data(
    state: State<'_, DbState>,
    module_id: String,
    key: String,
    data: String,
) -> Result<(), String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute(
        "INSERT INTO module_data (module_id, key, data) 
         VALUES (?1, ?2, ?3)
         ON CONFLICT(module_id, key) DO UPDATE SET 
            data=excluded.data",
        params![module_id, key, data],
    ).map_err(|e| format!("Erreur sauvegarde module_data: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_module_data(state: State<'_, DbState>, module_id: String) -> Result<Vec<(String, String)>, String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    let mut stmt = conn.prepare("SELECT key, data FROM module_data WHERE module_id = ?1")
        .map_err(|e| format!("Erreur préparation requête module_data: {}", e))?;
        
    let iter = stmt.query_map(params![module_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    }).map_err(|e| format!("Erreur exécution requête module_data: {}", e))?;

    let mut results = Vec::new();
    for r in iter {
        if let Ok(entry) = r {
            results.push(entry);
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn delete_module_data(state: State<'_, DbState>, module_id: String, key: String) -> Result<(), String> {
    let lock = state.inner().0.lock().unwrap();
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute("DELETE FROM module_data WHERE module_id = ?1 AND key = ?2", params![module_id, key])
        .map_err(|e| format!("Erreur suppression module_data: {}", e))?;

    Ok(())
}

// ==============================================================================
// COMMANDES TAURI - LISTE DES CAMPAGNES
// ==============================================================================

#[tauri::command]
pub fn save_campaigns_list(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|_| "Error AppData".to_string())?;
    let db_dir = app_data_dir.join("local").join("signet-code").join("bd");
    
    if !db_dir.exists() {
        fs::create_dir_all(&db_dir).map_err(|e| format!("Erreur création dossier: {}", e))?;
    }
    
    let path = db_dir.join("campaigns_list.json");
    fs::write(&path, data).map_err(|e| format!("Erreur de sauvegarde: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn get_campaigns_list(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|_| "Error AppData".to_string())?;
    let path = app_data_dir.join("local").join("signet-code").join("bd").join("campaigns_list.json");
    
    if path.exists() {
        Ok(fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string()))
    } else {
        Ok("[]".to_string())
    }
}
