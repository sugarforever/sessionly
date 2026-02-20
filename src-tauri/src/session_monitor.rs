use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionState {
    Idle,
    Working,
    Completed,
    Error,
}

#[derive(Debug)]
struct TrackedSession {
    state: SessionState,
    last_update: Instant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStateInfo {
    pub session_id: String,
    pub state: SessionState,
    pub aggregate_state: SessionState,
}

#[derive(Debug, Deserialize)]
pub struct HookEventPayload {
    pub session_id: String,
    pub hook_event_name: String,
    pub tool_name: Option<String>,
    pub cwd: Option<String>,
}

pub struct SessionMonitor {
    sessions: Mutex<HashMap<String, TrackedSession>>,
    app_handle: AppHandle,
    pub notifications_enabled: AtomicBool,
}

impl SessionMonitor {
    pub fn new(app_handle: AppHandle, notifications_enabled: bool) -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            app_handle,
            notifications_enabled: AtomicBool::new(notifications_enabled),
        }
    }

    pub fn handle_hook_event(&self, payload: HookEventPayload) {
        let new_state = match payload.hook_event_name.as_str() {
            "PreToolUse" | "PostToolUse" => SessionState::Working,
            "PostToolUseFailure" => SessionState::Error,
            "Stop" | "Notification" => SessionState::Completed,
            _ => return,
        };

        let (prev_state, aggregate) = {
            let mut sessions = self.sessions.lock().unwrap();
            let prev_state = sessions
                .get(&payload.session_id)
                .map(|s| s.state)
                .unwrap_or(SessionState::Idle);

            sessions.insert(
                payload.session_id.clone(),
                TrackedSession {
                    state: new_state,
                    last_update: Instant::now(),
                },
            );

            let aggregate = self.compute_aggregate(&sessions);
            (prev_state, aggregate)
        }; // Lock dropped here before any I/O

        // Send notifications on transitions
        if self.notifications_enabled.load(Ordering::Relaxed) {
            match (prev_state, new_state) {
                (SessionState::Working, SessionState::Completed) => {
                    self.send_notification("Ready for Input", "Claude Code session completed.");
                }
                (_, SessionState::Error) if prev_state != SessionState::Error => {
                    self.send_notification("Error Occurred", "A tool error occurred in Claude Code.");
                }
                _ => {}
            }
        }

        let info = SessionStateInfo {
            session_id: payload.session_id,
            state: new_state,
            aggregate_state: aggregate,
        };
        let _ = self.app_handle.emit("session-state-changed", &info);
    }

    fn compute_aggregate(&self, sessions: &HashMap<String, TrackedSession>) -> SessionState {
        let mut has_error = false;
        let mut has_working = false;
        let mut has_completed = false;

        for s in sessions.values() {
            match s.state {
                SessionState::Error => has_error = true,
                SessionState::Working => has_working = true,
                SessionState::Completed => has_completed = true,
                SessionState::Idle => {}
            }
        }

        if has_error {
            SessionState::Error
        } else if has_working {
            SessionState::Working
        } else if has_completed {
            SessionState::Completed
        } else {
            SessionState::Idle
        }
    }

    fn send_notification(&self, title: &str, body: &str) {
        use tauri_plugin_notification::NotificationExt;
        let _ = self.app_handle.notification().builder()
            .title(title)
            .body(body)
            .show();
    }

    pub fn prune_stale(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.retain(|_, s| s.last_update.elapsed().as_secs() < 60);
    }
}
