use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Raw JSONL types (as stored in .jsonl files)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMessageContent {
    pub role: String,
    pub content: serde_json::Value, // Can be string or array of ContentBlock
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RawEntry {
    #[serde(rename = "type")]
    pub entry_type: Option<String>,
    pub uuid: Option<String>,
    #[serde(rename = "parentUuid")]
    pub parent_uuid: Option<serde_json::Value>,
    pub timestamp: Option<String>,
    pub cwd: Option<String>,
    pub version: Option<String>,
    #[serde(rename = "gitBranch")]
    pub git_branch: Option<String>,
    pub message: Option<RawMessageContent>,
    // Progress message fields
    pub data: Option<ProgressData>,
    #[serde(rename = "parentToolUseID")]
    pub parent_tool_use_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ProgressData {
    #[serde(rename = "agentId")]
    pub agent_id: Option<String>,
}

// ============================================================================
// Processed types for frontend
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThinkingBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub thinking: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolUseBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub id: String,
    pub name: String,
    pub input: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "agentId")]
    pub agent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResultBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub tool_use_id: String,
    pub content: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_error: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedMessage {
    pub uuid: String,
    #[serde(rename = "parentUuid")]
    pub parent_uuid: Option<String>,
    pub timestamp: String,
    pub role: String,
    #[serde(rename = "textContent")]
    pub text_content: String,
    #[serde(rename = "thinkingBlocks")]
    pub thinking_blocks: Vec<ThinkingBlock>,
    #[serde(rename = "toolUseBlocks")]
    pub tool_use_blocks: Vec<ToolUseBlock>,
    #[serde(rename = "toolResults")]
    pub tool_results: HashMap<String, ToolResultBlock>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubagentSession {
    #[serde(rename = "agentId")]
    pub agent_id: String,
    #[serde(rename = "parentToolUseId")]
    pub parent_tool_use_id: String,
    pub messages: Vec<ProcessedMessage>,
    #[serde(rename = "messageCount")]
    pub message_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub id: String,
    pub project: String,
    #[serde(rename = "projectEncoded")]
    pub project_encoded: String,
    #[serde(rename = "firstMessage")]
    pub first_message: String,
    #[serde(rename = "messageCount")]
    pub message_count: usize,
    #[serde(rename = "startTime")]
    pub start_time: Option<i64>,
    #[serde(rename = "endTime")]
    pub end_time: Option<i64>,
    #[serde(rename = "gitBranch")]
    pub git_branch: Option<String>,
    pub model: Option<String>,
    #[serde(rename = "filePath")]
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub project: String,
    #[serde(rename = "projectEncoded")]
    pub project_encoded: String,
    #[serde(rename = "gitBranch")]
    pub git_branch: Option<String>,
    pub cwd: String,
    pub version: String,
    #[serde(rename = "startTime")]
    pub start_time: Option<i64>,
    #[serde(rename = "endTime")]
    pub end_time: Option<i64>,
    pub messages: Vec<ProcessedMessage>,
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub subagents: HashMap<String, SubagentSession>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectGroup {
    pub project: String,
    #[serde(rename = "projectEncoded")]
    pub project_encoded: String,
    pub sessions: Vec<SessionSummary>,
}
