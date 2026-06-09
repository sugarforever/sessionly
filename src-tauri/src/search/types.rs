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
    pub model_present: bool,
    pub model_size_bytes: u64,
    pub error: Option<String>,
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
