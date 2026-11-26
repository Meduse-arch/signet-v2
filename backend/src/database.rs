use rusqlite::{params, Connection, Result as SqlResult};
use std::fs;
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use serde::{Deserialize, Serialize};
use crate::fs_util::atomic_write;

// Wrapper pour partager la connexion SQLite de façon "thread-safe"
pub struct DbState(pub Mutex<Option<Connection>>);

/// Verrouille la connexion SQLite. Un mutex empoisonné (panic dans un autre thread)
/// devient une erreur renvoyée au front plutôt qu'un panic en cascade.
fn lock_state(db: &DbState) -> Result<MutexGuard<'_, Option<Connection>>, String> {
    db.0.lock()
        .map_err(|_| "Base de données indisponible (verrou corrompu), redémarrez l'application".to_string())
}

/// Version courante du schéma, stockée dans `PRAGMA user_version`.
const SCHEMA_VERSION: i32 = 1;

/// Délai d'attente (ms) si la base est verrouillée par un autre accès.
const BUSY_TIMEOUT_MS: u64 = 5_000;

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
    pub map_id: String,
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
    *lock_state(state.inner())? = None; // Pas de DB par défaut, on attend open_campaign_db
    println!("[Base de données] SQLite en attente de la sélection de campagne.");
    Ok(())
}

/// Accepte uniquement `signet-XXXXXX` (préfixe insensible à la casse, 6 caractères
/// alphanumériques ASCII) : empêche tout composant de chemin (`..`, `/`, `\`).
fn validate_room_id(room_id: &str) -> Result<(), String> {
    const PREFIX: &[u8] = b"signet-";
    let bytes = room_id.as_bytes();
    let valid = bytes.len() == PREFIX.len() + 6
        && bytes[..PREFIX.len()].eq_ignore_ascii_case(PREFIX)
        && bytes[PREFIX.len()..].iter().all(|b| b.is_ascii_alphanumeric());
    if valid {
        Ok(())
    } else {
        Err("Identifiant de salon invalide (format attendu : signet-XXXXXX)".to_string())
    }
}

/// Applique les migrations de schéma manquantes, de façon atomique.
/// Version 0 = base neuve ou antérieure au versionnement : les `CREATE TABLE IF NOT EXISTS`
/// sont idempotents, les données existantes sont conservées.
fn migrate(conn: &Connection) -> Result<(), String> {
    let version: i32 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| format!("Erreur lecture version du schéma: {}", e))?;

    if version > SCHEMA_VERSION {
        return Err(format!(
            "Cette campagne a été créée avec une version plus récente de Signet (schéma {}).",
            version
        ));
    }

    if version < 1 {
        conn.execute_batch(
            "BEGIN;
             CREATE TABLE IF NOT EXISTS characters (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL,
                 owner_id TEXT,
                 data TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS tokens (
                 id TEXT PRIMARY KEY,
                 map_id TEXT NOT NULL,
                 x REAL NOT NULL,
                 y REAL NOT NULL,
                 scale_x REAL NOT NULL,
                 scale_y REAL NOT NULL,
                 rotation REAL NOT NULL,
                 data TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS assets (
                 hash TEXT PRIMARY KEY,
                 name TEXT,
                 extension TEXT,
                 file_type TEXT
             );
             CREATE TABLE IF NOT EXISTS players (
                 username TEXT PRIMARY KEY
             );
             CREATE TABLE IF NOT EXISTS module_data (
                 module_id TEXT,
                 key TEXT,
                 data TEXT NOT NULL,
                 PRIMARY KEY (module_id, key)
             );
             PRAGMA user_version = 1;
             COMMIT;",
        )
        .map_err(|e| format!("Erreur migration du schéma v1: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_campaign_db(app: tauri::AppHandle, state: State<'_, DbState>, room_id: String) -> Result<(), String> {
    validate_room_id(&room_id)?;

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

    conn.busy_timeout(Duration::from_millis(BUSY_TIMEOUT_MS))
        .map_err(|e| format!("Erreur busy_timeout: {}", e))?;
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| format!("Erreur activation WAL: {}", e))?;

    migrate(&conn)?;

    // On stocke la connexion dans le State de Tauri (la précédente est fermée au remplacement)
    let mut lock = lock_state(state.inner())?;
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
    let lock = lock_state(state.inner())?;
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
    let lock = lock_state(state.inner())?;
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
    let lock = lock_state(state.inner())?;
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
    map_id: String,
    x: f64,
    y: f64,
    scale_x: f64,
    scale_y: f64,
    rotation: f64,
    data: String,
) -> Result<(), String> {
    let lock = lock_state(state.inner())?;
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute(
        "INSERT INTO tokens (id, map_id, x, y, scale_x, scale_y, rotation, data) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET 
            map_id=excluded.map_id,
            x=excluded.x, 
            y=excluded.y,
            scale_x=excluded.scale_x,
            scale_y=excluded.scale_y,
            rotation=excluded.rotation,
            data=excluded.data",
        params![id, map_id, x, y, scale_x, scale_y, rotation, data],
    ).map_err(|e| format!("Erreur sauvegarde token: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_tokens(state: State<'_, DbState>, map_id: String) -> Result<Vec<TokenRecord>, String> {
    let lock = lock_state(state.inner())?;
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    let mut stmt = conn.prepare("SELECT id, map_id, x, y, scale_x, scale_y, rotation, data FROM tokens WHERE map_id = ?1")
        .map_err(|e| format!("Erreur préparation requête tokens: {}", e))?;
        
    let iter = stmt.query_map(params![map_id], |row| {
        Ok(TokenRecord {
            id: row.get(0)?,
            map_id: row.get(1)?,
            x: row.get(2)?,
            y: row.get(3)?,
            scale_x: row.get(4)?,
            scale_y: row.get(5)?,
            rotation: row.get(6)?,
            data: row.get(7)?,
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
    let lock = lock_state(state.inner())?;
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
    let lock = lock_state(state.inner())?;
    let conn = lock.as_ref().ok_or("BD non initialisée")?;

    conn.execute(
        "INSERT INTO players (username) VALUES (?1) ON CONFLICT(username) DO NOTHING",
        params![username],
    ).map_err(|e| format!("Erreur sauvegarde joueur: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_players(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let lock = lock_state(state.inner())?;
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
    let lock = lock_state(state.inner())?;
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
    let lock = lock_state(state.inner())?;
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
    let lock = lock_state(state.inner())?;
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
    atomic_write(&path, data.as_bytes())?;
    
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
