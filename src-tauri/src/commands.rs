use crate::session_store;
use crate::session_types::{ProjectGroup, Session};
use crate::AppState;
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

#[tauri::command]
pub fn send_native_notification(title: String, body: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let escaped_body = body.replace('\\', "\\\\").replace('"', "\\\"");
        let escaped_title = title.replace('\\', "\\\\").replace('"', "\\\"");
        std::process::Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "display notification \"{}\" with title \"{}\"",
                escaped_body, escaped_title
            ))
            .output()
            .map_err(|e| format!("osascript failed: {}", e))?;
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        notify_rust::Notification::new()
            .summary(&title)
            .body(&body)
            .show()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
