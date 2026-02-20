mod app_settings;
mod commands;
mod hooks;
mod markdown_export;
mod session_monitor;
mod session_store;
mod session_types;

use session_monitor::SessionMonitor;
use std::sync::Arc;
use tauri::Manager;

pub struct AppState {
    pub session_monitor: Arc<SessionMonitor>, // Arc needed: shared with HookServer + pruning task
    pub hook_server: Option<hooks::HookServer>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();

            // Load settings
            let settings = app_settings::load_settings(&handle);

            // Create session monitor
            let monitor = Arc::new(SessionMonitor::new(
                handle.clone(),
                settings.notifications_enabled,
            ));

            // Start hook server
            let hook_server = match hooks::HookServer::start(monitor.clone()) {
                Ok(server) => {
                    println!("Hook server started on 127.0.0.1:19823");
                    Some(server)
                }
                Err(e) => {
                    eprintln!("Failed to start hook server: {}", e);
                    None
                }
            };

            // Auto-install hooks if not installed
            if !hooks::is_hooks_installed() {
                if let Err(e) = hooks::install_hooks() {
                    eprintln!("Failed to auto-install hooks: {}", e);
                }
            }

            // Start stale session pruning
            let monitor_prune = monitor.clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(30));
                    monitor_prune.prune_stale();
                }
            });

            app.manage(AppState {
                session_monitor: monitor,
                hook_server,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_projects,
            commands::get_session,
            commands::get_version,
            commands::get_native_theme,
            commands::export_session_markdown,
            commands::hooks_get_status,
            commands::hooks_install,
            commands::hooks_uninstall,
            commands::hooks_is_installed,
            commands::get_notifications_enabled,
            commands::set_notifications_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
