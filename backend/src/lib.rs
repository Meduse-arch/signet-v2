mod fs_util;
mod lan_server;
mod dice;
pub mod library;
pub mod database;
pub mod notes;

use tauri::Manager;
use tauri::http::Response;
use std::fs;
#[tauri::command]
fn get_local_ip() -> Result<String, String> {
    match local_ip_address::local_ip() {
        Ok(ip) => Ok(ip.to_string()),
        Err(e) => Err(format!("Erreur réseau: {}", e)),
    }
}

/// Bascule le plein écran natif, puis redonne le focus à la webview (WebView2).
/// Renvoie le nouvel état (true = plein écran).
#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<bool, String> {
    let next = !window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(next).map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(next)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .register_uri_scheme_protocol("signet", |app, request| {
        // Ex: signet://library/abc1234.png
        let uri = request.uri().to_string();
        
        // L'URL peut être "signet://library/..." ou "http://signet.localhost/library/..."
        if let Some(idx) = uri.find("/library/") {
            let file_name = uri[idx + 9..].to_string(); // 9 est la longueur de "/library/"
            
            if let Ok(app_data_dir) = app.app_handle().path().app_data_dir() {
                let file_path = app_data_dir.join("library").join(&file_name);
                
                if let Ok(data) = fs::read(&file_path) {
                    // Deviner le mime type basique (à améliorer plus tard)
                    let mime_type = if file_name.ends_with(".png") { "image/png" }
                                    else if file_name.ends_with(".jpg") || file_name.ends_with(".jpeg") { "image/jpeg" }
                                    else if file_name.ends_with(".webp") { "image/webp" }
                                    else { "application/octet-stream" };
                                    
                    return Response::builder()
                        .header("Access-Control-Allow-Origin", "*")
                        .header("Content-Type", mime_type)
                        .body(data)
                        .unwrap();
                }
            }
        }
        
        // Fichier non trouvé ou mauvaise URL
        Response::builder().status(404).body(vec![]).unwrap()
    })
    .manage(database::DbState(std::sync::Mutex::new(None)))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Initialisation de la BDD
      if let Err(e) = database::init_db(app.handle()) {
          eprintln!("Erreur critique lors de l'init de la DB: {}", e);
      }
      
      // Démarre le serveur LAN en tâche de fond (port 3030)
      tauri::async_runtime::spawn(async move {
          lan_server::start_lan_server().await;
      });

      Ok(())
    })
    .on_window_event(|window, event| {
        // Redonne le focus à la webview quand la fenêtre est activée ou redimensionnée
        // (évite la perte de focus Win32 du contrôle enfant WebView2, decorations: false).
        let refocus = match event {
            tauri::WindowEvent::Focused(true) => true,
            tauri::WindowEvent::Resized(_) => !window.is_minimized().unwrap_or(false),
            _ => false,
        };
        if refocus && window.label() == "main" {
            if let Some(webview_window) = window.app_handle().get_webview_window("main") {
                let _ = webview_window.set_focus();
            }
        }
    })
    .invoke_handler(tauri::generate_handler![
        get_local_ip,
        toggle_fullscreen,
        dice::dice::roll_dice,
        library::upload_asset,
        library::check_asset_exists,
        library::read_asset,
        database::save_character,
        database::get_characters,
        database::delete_character,
        database::save_token,
        database::get_tokens,
        database::delete_token,
        database::save_campaigns_list,
        database::get_campaigns_list,
        database::open_campaign_db,
        database::save_player,
        database::get_players,
        database::save_module_data,
        database::get_module_data,
        database::delete_module_data,
        notes::get_notes_tree,
        notes::read_note_content,
        notes::save_note_content,
        notes::create_note_folder,
        notes::delete_note_item,
        notes::rename_note_item
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
