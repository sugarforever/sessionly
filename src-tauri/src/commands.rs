use crate::session_store;
use crate::session_types::{ProjectGroup, Session};
use crate::AppState;
use std::sync::atomic::Ordering;
use tauri::State;

#[tauri::command]
pub async fn get_projects() -> Vec<ProjectGroup> {
    tokio::task::spawn_blocking(|| session_store::get_all_sessions())
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn get_session(session_id: String, project_encoded: String) -> Option<Session> {
    tokio::task::spawn_blocking(move || session_store::get_session(&session_id, &project_encoded))
        .await
        .unwrap_or(None)
}

#[tauri::command]
pub fn get_version(app: tauri::AppHandle) -> String {
    app.config().version.clone().unwrap_or_else(|| "unknown".to_string())
}

#[tauri::command]
pub fn get_native_theme(window: tauri::Window) -> String {
    match window.theme() {
        Ok(tauri::Theme::Dark) => "dark".to_string(),
        _ => "light".to_string(),
    }
}

#[tauri::command]
pub async fn export_session_markdown(session_id: String, project_encoded: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let session = session_store::get_session(&session_id, &project_encoded)
            .ok_or_else(|| "Session not found".to_string())?;
        Ok(crate::markdown_export::session_to_markdown(&session))
    })
    .await
    .map_err(|e| e.to_string())?
}

// Hooks commands
#[tauri::command]
pub fn hooks_get_status(state: State<'_, AppState>) -> crate::hooks::HookStatus {
    let running = state
        .hook_server
        .as_ref()
        .map(|s| s.is_running())
        .unwrap_or(false);
    crate::hooks::get_status(running)
}

#[tauri::command]
pub fn hooks_install() -> Result<(), String> {
    crate::hooks::install_hooks().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hooks_uninstall() -> Result<(), String> {
    crate::hooks::uninstall_hooks().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hooks_is_installed() -> bool {
    crate::hooks::is_hooks_installed()
}

// Notification commands
#[tauri::command]
pub fn get_notifications_enabled(state: State<'_, AppState>) -> bool {
    state
        .session_monitor
        .notifications_enabled
        .load(Ordering::Relaxed)
}

#[tauri::command]
pub fn set_notifications_enabled(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    enabled: bool,
) -> Result<(), String> {
    state
        .session_monitor
        .notifications_enabled
        .store(enabled, Ordering::Relaxed);

    let mut settings = crate::app_settings::load_settings(&app);
    settings.notifications_enabled = enabled;
    crate::app_settings::save_settings(&app, &settings)
}
