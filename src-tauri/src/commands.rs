use crate::search::{BackendConfig, IndexStatus, SearchFilters, SearchHit};
use crate::session_store;
use crate::session_types::{ProjectGroup, Session};
use crate::AppState;
use tauri::{Manager, State};

#[tauri::command]
pub async fn get_projects() -> Vec<ProjectGroup> {
    tokio::task::spawn_blocking(session_store::get_all_sessions)
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
    app.config()
        .version
        .clone()
        .unwrap_or_else(|| "unknown".to_string())
}

#[tauri::command]
pub fn get_native_theme(window: tauri::Window) -> String {
    match window.theme() {
        Ok(tauri::Theme::Dark) => "dark".to_string(),
        _ => "light".to_string(),
    }
}

#[tauri::command]
pub async fn export_session_markdown(
    session_id: String,
    project_encoded: String,
    dest_path: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let session = session_store::get_session(&session_id, &project_encoded)
            .ok_or_else(|| "Session not found".to_string())?;
        let markdown = crate::markdown_export::session_to_markdown(&session);
        std::fs::write(&dest_path, markdown)
            .map_err(|e| format!("Failed to write {dest_path}: {e}"))
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
pub async fn search_query(
    state: State<'_, AppState>,
    query: String,
    filters: Option<SearchFilters>,
    limit: Option<usize>,
) -> Result<Vec<SearchHit>, String> {
    let Some(svc) = state.search.clone() else {
        return Ok(Vec::new());
    };
    let filters = filters.unwrap_or_default();
    let limit = limit.unwrap_or(40);
    tokio::task::spawn_blocking(move || svc.query(&query, &filters, limit))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn search_index_status(state: State<'_, AppState>) -> IndexStatus {
    match &state.search {
        Some(s) => s.status(),
        None => IndexStatus {
            indexed: 0,
            total: 0,
            building: false,
            last_built: None,
            model: "unavailable".into(),
            enabled: false,
            model_present: false,
            model_size_bytes: 0,
            error: None,
        },
    }
}

#[tauri::command]
pub async fn search_reindex(state: State<'_, AppState>) -> Result<(), String> {
    let Some(svc) = state.search.clone() else {
        return Err("search unavailable".into());
    };
    tokio::task::spawn_blocking(move || svc.build())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn search_get_backend(state: State<'_, AppState>) -> BackendConfig {
    match &state.search {
        Some(s) => s.config(),
        None => BackendConfig {
            provider: "local".into(),
            model: "multilingual-e5-small".into(),
            api_key: None,
            has_key: false,
        },
    }
}

#[tauri::command]
pub async fn search_delete_api_key(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let Some(svc) = state.search.clone() else {
        return Err("search unavailable".into());
    };
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let svc_for_build = svc.clone();
    let res = tokio::task::spawn_blocking(move || svc.delete_api_key(&dir))
        .await
        .map_err(|e| e.to_string())?;
    // if we reverted to local, rebuild to repopulate the (wiped) index
    if res.is_ok() {
        std::thread::spawn(move || {
            let _ = svc_for_build.build();
        });
    }
    res
}

#[tauri::command]
pub async fn search_set_backend(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    config: BackendConfig,
) -> Result<(), String> {
    let Some(svc) = state.search.clone() else {
        return Err("search unavailable".into());
    };
    let svc_for_build = svc.clone();
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let res = tokio::task::spawn_blocking(move || svc.set_backend(config, &dir))
        .await
        .map_err(|e| e.to_string())?;
    if res.is_ok() {
        std::thread::spawn(move || {
            let _ = svc_for_build.build();
        });
    }
    res
}

#[tauri::command]
pub async fn search_enable(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let Some(svc) = state.search.clone() else {
        return Err("search unavailable".into());
    };
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    svc.enable(&dir);
    let svc_build = svc.clone();
    std::thread::spawn(move || {
        let _ = svc_build.build();
    });
    Ok(())
}

#[tauri::command]
pub fn search_cancel_build(state: State<'_, AppState>) -> Result<(), String> {
    let Some(svc) = &state.search else {
        return Err("search unavailable".into());
    };
    svc.cancel_build();
    Ok(())
}

#[tauri::command]
pub fn search_get_scope(state: State<'_, AppState>) -> Option<Vec<String>> {
    state.search.as_ref().and_then(|s| s.get_scope())
}

#[tauri::command]
pub async fn search_set_scope(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    projects: Option<Vec<String>>,
) -> Result<(), String> {
    let Some(svc) = state.search.clone() else {
        return Err("search unavailable".into());
    };
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let svc2 = svc.clone();
    tokio::task::spawn_blocking(move || svc.set_scope(projects, &dir))
        .await
        .map_err(|e| e.to_string())??;
    // re-index to fill in any newly in-scope sessions (hash-skip keeps existing)
    std::thread::spawn(move || {
        let _ = svc2.build();
    });
    Ok(())
}

#[tauri::command]
pub async fn search_delete_model(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let Some(svc) = state.search.clone() else {
        return Err("search unavailable".into());
    };
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    tokio::task::spawn_blocking(move || svc.delete_model(&dir))
        .await
        .map_err(|e| e.to_string())?
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
    }

    // Non-macOS platforms have no osascript equivalent here; consume the args
    // so they are not flagged as unused under `-D warnings`.
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (&title, &body);
    }

    Ok(())
}
