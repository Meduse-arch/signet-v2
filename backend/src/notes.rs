use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NoteItem {
    pub id: String,
    pub name: String,
    pub item_type: String,
    pub path: String,
    pub parent_path: Option<String>,
    pub updated_at: Option<u64>,
}

fn get_notes_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| "Impossible de trouver le dossier AppData".to_string())?;

    let notes_dir = app_data_dir.join("notes");
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir)
            .map_err(|e| format!("Erreur création dossier notes: {}", e))?;
    }
    Ok(notes_dir)
}

fn sanitize_path(base: &Path, rel: &str) -> Result<PathBuf, String> {
    let clean_rel = rel.trim().trim_start_matches(['/', '\\']);
    let target = base.join(clean_rel);
    if !target.starts_with(base) {
        return Err("Accès interdit hors du dossier des notes".to_string());
    }
    Ok(target)
}

fn scan_dir_recursive(root: &Path, current_dir: &Path, results: &mut Vec<NoteItem>) -> std::io::Result<()> {
    if let Ok(entries) = fs::read_dir(current_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            if file_name.starts_with('.') {
                continue;
            }

            let rel_path = path.strip_prefix(root).unwrap_or(&path).to_string_lossy().replace('\\', "/");
            let parent_path = path.parent()
                .and_then(|p| p.strip_prefix(root).ok())
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .filter(|s| !s.is_empty());

            let updated_at = entry.metadata().ok().and_then(|m| {
                m.modified().ok().and_then(|t| t.duration_since(UNIX_EPOCH).ok().map(|d| d.as_millis() as u64))
            });

            if path.is_dir() {
                results.push(NoteItem {
                    id: rel_path.clone(),
                    name: file_name,
                    item_type: "folder".to_string(),
                    path: rel_path,
                    parent_path,
                    updated_at,
                });
                scan_dir_recursive(root, &path, results)?;
            } else if path.is_file() {
                let display_name = if file_name.ends_with(".md") {
                    file_name[..file_name.len() - 3].to_string()
                } else if file_name.ends_with(".txt") {
                    file_name[..file_name.len() - 4].to_string()
                } else {
                    file_name.clone()
                };

                results.push(NoteItem {
                    id: rel_path.clone(),
                    name: display_name,
                    item_type: "file".to_string(),
                    path: rel_path,
                    parent_path,
                    updated_at,
                });
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_notes_tree(app: AppHandle) -> Result<Vec<NoteItem>, String> {
    let notes_dir = get_notes_dir(&app)?;
    let mut results = Vec::new();
    scan_dir_recursive(&notes_dir, &notes_dir, &mut results)
        .map_err(|e| format!("Erreur parcours dossier notes: {}", e))?;
    Ok(results)
}

#[tauri::command]
pub fn read_note_content(app: AppHandle, path: String) -> Result<String, String> {
    let notes_dir = get_notes_dir(&app)?;
    let target = sanitize_path(&notes_dir, &path)?;
    if !target.exists() || !target.is_file() {
        return Err("Fichier de note introuvable".to_string());
    }
    fs::read_to_string(&target).map_err(|e| format!("Erreur lecture note: {}", e))
}

#[tauri::command]
pub fn save_note_content(app: AppHandle, path: String, content: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&app)?;
    let target = sanitize_path(&notes_dir, &path)?;
    if let Some(parent) = target.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Erreur création dossier parent: {}", e))?;
        }
    }
    fs::write(&target, content).map_err(|e| format!("Erreur sauvegarde note: {}", e))
}

#[tauri::command]
pub fn create_note_folder(app: AppHandle, path: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&app)?;
    let target = sanitize_path(&notes_dir, &path)?;
    if !target.exists() {
        fs::create_dir_all(&target).map_err(|e| format!("Erreur création dossier: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_note_item(app: AppHandle, path: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&app)?;
    let target = sanitize_path(&notes_dir, &path)?;
    if target.is_dir() {
        fs::remove_dir_all(&target).map_err(|e| format!("Erreur suppression dossier: {}", e))?;
    } else if target.is_file() {
        fs::remove_file(&target).map_err(|e| format!("Erreur suppression fichier: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn rename_note_item(app: AppHandle, old_path: String, new_path: String) -> Result<(), String> {
    let notes_dir = get_notes_dir(&app)?;
    let old_target = sanitize_path(&notes_dir, &old_path)?;
    let new_target = sanitize_path(&notes_dir, &new_path)?;

    if !old_target.exists() {
        return Err("Élément source introuvable".to_string());
    }
    if new_target.exists() {
        return Err("Un fichier ou dossier portant ce nom existe déjà".to_string());
    }
    if let Some(parent) = new_target.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Erreur création dossier parent: {}", e))?;
        }
    }
    fs::rename(&old_target, &new_target).map_err(|e| format!("Erreur renommage: {}", e))
}
