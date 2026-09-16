mod lan_server;

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
    .invoke_handler(tauri::generate_handler![get_local_ip])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
