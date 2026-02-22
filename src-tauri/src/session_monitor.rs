use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    cwd: Option<String>,
    last_update: Instant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStateInfo {
    pub session_id: String,
    pub prev_state: SessionState,
    pub state: SessionState,
    pub aggregate_state: SessionState,
    pub project: Option<String>,
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
}

impl SessionMonitor {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
            app_handle,
        }
    }

    pub fn handle_hook_event(&self, payload: HookEventPayload) {
        let new_state = match payload.hook_event_name.as_str() {
            "PreToolUse" | "PostToolUse" => SessionState::Working,
            "PostToolUseFailure" => SessionState::Error,
            "Stop" | "Notification" => SessionState::Completed,
            _ => return,
        };

        let (prev_state, aggregate, cwd) = {
            let mut sessions = self.sessions.lock().unwrap();
            let prev_state = sessions
                .get(&payload.session_id)
                .map(|s| s.state)
                .unwrap_or(SessionState::Idle);

            // Update cwd only if the payload provides one
            let cwd = payload
                .cwd
                .or_else(|| sessions.get(&payload.session_id).and_then(|s| s.cwd.clone()));

            sessions.insert(
                payload.session_id.clone(),
                TrackedSession {
                    state: new_state,
                    cwd: cwd.clone(),
                    last_update: Instant::now(),
                },
            );

            let aggregate = self.compute_aggregate(&sessions);
            (prev_state, aggregate, cwd)
        }; // Lock dropped here before any I/O

        // Extract last path component as project name
        let project = cwd.as_deref().and_then(|p| {
            std::path::Path::new(p)
                .file_name()
                .and_then(|n| n.to_str())
                .map(String::from)
        });

        let info = SessionStateInfo {
            session_id: payload.session_id,
            prev_state,
            state: new_state,
            aggregate_state: aggregate,
            project,
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

    pub fn prune_stale(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.retain(|_, s| s.last_update.elapsed().as_secs() < 60);
    }
}
