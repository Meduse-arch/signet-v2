mod lan_server;
mod dice;
mod library;

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
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Démarre le serveur LAN en tâche de fond (port 3030)
      tauri::async_runtime::spawn(async move {
          lan_server::start_lan_server().await;
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_local_ip, 
        dice::dice::roll_dice,
        library::upload_asset,
        library::check_asset_exists,
        library::read_asset
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
