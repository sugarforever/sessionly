use crate::session_monitor::SessionMonitor;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

const HOOK_IDENTIFIER: &str = "localhost:19823/sessionly";
const HOOK_COMMAND: &str = "curl -s -X POST http://localhost:19823/sessionly -d @- || true";

/// Check if a hook entry (flat or nested format) contains the Sessionly identifier.
fn entry_contains_identifier(item: &serde_json::Value) -> bool {
    if let Some(obj) = item.as_object() {
        // Flat format: { "command": "curl ... localhost:19823/sessionly ..." }
        if let Some(cmd) = obj.get("command").and_then(|c| c.as_str()) {
            if cmd.contains(HOOK_IDENTIFIER) {
                return true;
            }
        }
        // Nested format: { "hooks": [{ "command": "curl ..." }], "matcher": "..." }
        if let Some(hooks_arr) = obj.get("hooks").and_then(|h| h.as_array()) {
            for hook in hooks_arr {
                if let Some(cmd) = hook.get("command").and_then(|c| c.as_str()) {
                    if cmd.contains(HOOK_IDENTIFIER) {
                        return true;
                    }
                }
            }
        }
    }
    false
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookStatus {
    #[serde(rename = "serverRunning")]
    pub server_running: bool,
    pub port: u16,
    #[serde(rename = "hooksInstalled")]
    pub hooks_installed: bool,
}

fn get_settings_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".claude")
        .join("settings.json")
}

pub fn get_status(server_running: bool) -> HookStatus {
    HookStatus {
        server_running,
        port: 19823,
        hooks_installed: is_hooks_installed(),
    }
}

pub fn is_hooks_installed() -> bool {
    let settings_path = get_settings_path();
    if !settings_path.exists() {
        return false;
    }
    match fs::read_to_string(&settings_path) {
        Ok(content) => content.contains(HOOK_IDENTIFIER),
        Err(_) => false,
    }
}

pub fn install_hooks() -> Result<(), Box<dyn std::error::Error>> {
    let settings_path = get_settings_path();

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut settings: serde_json::Value = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)?;
        serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
    } else {
        serde_json::json!({})
    };

    // Claude Code hook format: each event has an array of hook objects
    // Hook object: { "type": "command", "command": "...", "async": true, "timeout": 5 }
    // Stop has no matcher; all others get "matcher": "*"
    let hook_events = vec![
        ("PreToolUse", true),
        ("PostToolUse", true),
        ("PostToolUseFailure", true),
        ("Stop", false),
        ("Notification", true),
        ("SessionStart", false),
        ("SessionEnd", false),
        ("UserPromptSubmit", false),
    ];

    let hooks = settings
        .as_object_mut()
        .ok_or("Settings is not an object")?
        .entry("hooks")
        .or_insert(serde_json::json!({}));

    let hooks_obj = hooks
        .as_object_mut()
        .ok_or("hooks is not an object")?;

    for (event_name, has_matcher) in hook_events {
        let event_hooks = hooks_obj
            .entry(event_name)
            .or_insert(serde_json::json!([]));
        let arr = event_hooks.as_array_mut().ok_or("event hooks is not an array")?;

        // Check if Sessionly hook already exists (flat or nested format)
        let already_exists = arr.iter().any(entry_contains_identifier);

        if !already_exists {
            let mut entry = serde_json::json!({
                "type": "command",
                "command": HOOK_COMMAND,
                "async": true,
                "timeout": 5
            });
            if has_matcher {
                entry.as_object_mut().unwrap().insert("matcher".to_string(), serde_json::json!("*"));
            }
            arr.push(entry);
        }
    }

    let content = serde_json::to_string_pretty(&settings)?;
    fs::write(&settings_path, content)?;

    Ok(())
}

pub fn uninstall_hooks() -> Result<(), Box<dyn std::error::Error>> {
    let settings_path = get_settings_path();
    if !settings_path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&settings_path)?;
    let mut settings: serde_json::Value = serde_json::from_str(&content)?;

    if let Some(hooks) = settings.get_mut("hooks").and_then(|h| h.as_object_mut()) {
        for (_event, entries) in hooks.iter_mut() {
            if let Some(arr) = entries.as_array_mut() {
                arr.retain(|item| !entry_contains_identifier(item));
            }
        }

        hooks.retain(|_, v| {
            v.as_array().map(|a| !a.is_empty()).unwrap_or(true)
        });
    }

    if settings.get("hooks").and_then(|h| h.as_object()).map(|o| o.is_empty()).unwrap_or(false) {
        settings.as_object_mut().unwrap().remove("hooks");
    }

    let content = serde_json::to_string_pretty(&settings)?;
    fs::write(&settings_path, content)?;

    Ok(())
}

// --- Hook Server ---

pub struct HookServer {
    server_running: Arc<AtomicBool>,
}

impl HookServer {
    pub fn start(monitor: Arc<SessionMonitor>) -> Result<Self, String> {
        let server = tiny_http::Server::http("127.0.0.1:19823")
            .map_err(|e| format!("Failed to bind hook server: {}", e))?;

        let server_running = Arc::new(AtomicBool::new(true));
        let running = server_running.clone();

        std::thread::spawn(move || {
            while running.load(Ordering::Relaxed) {
                let mut request = match server.recv_timeout(std::time::Duration::from_secs(1)) {
                    Ok(Some(req)) => req,
                    Ok(None) => continue, // timeout
                    Err(_) => break,
                };

                if request.method() != &tiny_http::Method::Post
                    || request.url() != "/sessionly"
                {
                    let response = tiny_http::Response::from_string("Not Found")
                        .with_status_code(404);
                    let _ = request.respond(response);
                    continue;
                }

                let mut body = String::new();
                if request.as_reader().read_to_string(&mut body).is_err() {
                    let response = tiny_http::Response::from_string("Bad Request")
                        .with_status_code(400);
                    let _ = request.respond(response);
                    continue;
                }

                match serde_json::from_str::<crate::session_monitor::HookEventPayload>(&body) {
                    Ok(payload) => {
                        monitor.handle_hook_event(payload);
                        let response = tiny_http::Response::from_string("OK")
                            .with_status_code(200);
                        let _ = request.respond(response);
                    }
                    Err(_) => {
                        let response = tiny_http::Response::from_string("Bad Request")
                            .with_status_code(400);
                        let _ = request.respond(response);
                    }
                }
            }
        });

        Ok(Self { server_running })
    }

    pub fn is_running(&self) -> bool {
        self.server_running.load(Ordering::Relaxed)
    }
}

impl Drop for HookServer {
    fn drop(&mut self) {
        self.server_running.store(false, Ordering::Relaxed);
    }
}
