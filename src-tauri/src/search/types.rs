use serde::{Deserialize, Serialize};

/// One indexable/searchable unit of text from a message.
#[derive(Debug, Clone, PartialEq)]
pub struct Chunk {
    pub message_uuid: String,
    pub role: String,
    pub char_start: usize,
    pub char_end: usize,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub session_id: String,
    pub project_encoded: String,
    pub project: String,
    pub session_title: String,
    pub message_uuid: String,
    pub role: String,
    pub snippet: String,
    pub score: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilters {
    pub project_encoded: Option<String>,
    pub role: Option<String>,
    pub since: Option<i64>,
    pub until: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStatus {
    pub indexed: usize,
    pub total: usize,
    pub building: bool,
    pub last_built: Option<i64>,
    pub model: String,
    pub enabled: bool,
    pub error: Option<String>,
}

/// User-controlled timings for automatic (re)indexing. Each automatic trigger
/// can re-embed sessions, which costs API tokens on cloud backends — so users
/// can turn any of them off to control billing. Disabling them all means the
/// index only updates on an explicit "Rebuild index".
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexTriggers {
    /// Index pending sessions when the app launches.
    pub on_startup: bool,
    /// Index a session as soon as it finishes (hook-driven, live).
    pub on_completion: bool,
    /// Refresh the index when the Search page is opened.
    pub on_search_open: bool,
}

impl Default for IndexTriggers {
    fn default() -> Self {
        Self {
            on_startup: true,
            on_completion: true,
            on_search_open: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendConfig {
    pub provider: String, // "local" | "openai"
    pub model: String,
    #[serde(default, skip_serializing)]
    pub api_key: Option<String>, // inbound only; never serialized back out
    #[serde(default)]
    pub has_key: bool, // computed in config(); serialized to the frontend, recomputed (never trusted) on load
}
