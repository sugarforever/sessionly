use crate::session_types::*;
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

/// Get the Claude directory path
pub fn get_claude_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".claude")
}

/// Get the projects directory path
pub fn get_projects_dir() -> PathBuf {
    get_claude_dir().join("projects")
}

/// Decode an encoded project path
/// e.g., "-Users-name-project" -> "/Users/name/project"
pub fn decode_project_path(encoded: &str) -> String {
    if !encoded.starts_with('-') {
        return encoded.to_string();
    }

    let simple_decode = encoded.replace('-', "/");
    if Path::new(&simple_decode).exists() {
        return simple_decode;
    }

    let segments: Vec<&str> = encoded[1..].split('-').collect();
    find_valid_path("/", &segments).unwrap_or(simple_decode)
}

fn find_valid_path(base: &str, segments: &[&str]) -> Option<String> {
    if segments.is_empty() {
        return if Path::new(base).exists() {
            Some(base.to_string())
        } else {
            None
        };
    }

    // Try adding next segment as a new directory
    let with_slash = Path::new(base).join(segments[0]);
    if with_slash.exists() {
        if let Some(result) = find_valid_path(with_slash.to_str()?, &segments[1..]) {
            return Some(result);
        }
    }

    // Try joining with hyphen
    if segments.len() >= 2 {
        let combined = format!("{}-{}", segments[0], segments[1]);
        let mut new_segments = vec![combined.as_str()];
        new_segments.extend_from_slice(&segments[2..]);
        if let Some(result) = find_valid_path(base, &new_segments) {
            return Some(result);
        }
    }

    // Last segment
    if segments.len() == 1 {
        let with_slash = Path::new(base).join(segments[0]);
        if with_slash.exists() {
            return Some(with_slash.to_str()?.to_string());
        }
    }

    None
}

/// Extract text content from message content (can be string or array of blocks)
fn extract_text_content(content: &serde_json::Value) -> String {
    if let Some(s) = content.as_str() {
        return s.to_string();
    }
    if let Some(arr) = content.as_array() {
        let texts: Vec<String> = arr
            .iter()
            .filter_map(|block| {
                if block.get("type")?.as_str()? == "text" {
                    block.get("text")?.as_str().map(String::from)
                } else {
                    None
                }
            })
            .collect();
        return texts.join("\n");
    }
    String::new()
}

/// Extract thinking blocks from content
fn extract_thinking_blocks(content: &serde_json::Value) -> Vec<ThinkingBlock> {
    let arr = match content.as_array() {
        Some(a) => a,
        None => return vec![],
    };
    arr.iter()
        .filter_map(|block| {
            if block.get("type")?.as_str()? == "thinking" {
                Some(ThinkingBlock {
                    block_type: "thinking".to_string(),
                    thinking: block.get("thinking")?.as_str()?.to_string(),
                    signature: block.get("signature").and_then(|s| s.as_str()).map(String::from),
                })
            } else {
                None
            }
        })
        .collect()
}

/// Extract tool use blocks from content
fn extract_tool_use_blocks(content: &serde_json::Value) -> Vec<ToolUseBlock> {
    let arr = match content.as_array() {
        Some(a) => a,
        None => return vec![],
    };
    arr.iter()
        .filter_map(|block| {
            if block.get("type")?.as_str()? == "tool_use" {
                Some(ToolUseBlock {
                    block_type: "tool_use".to_string(),
                    id: block.get("id")?.as_str()?.to_string(),
                    name: block.get("name")?.as_str()?.to_string(),
                    input: block.get("input").cloned().unwrap_or(serde_json::Value::Object(Default::default())),
                    agent_id: None,
                })
            } else {
                None
            }
        })
        .collect()
}

/// Extract tool results from content
fn extract_tool_results(content: &serde_json::Value) -> HashMap<String, ToolResultBlock> {
    let mut results = HashMap::new();
    if let Some(arr) = content.as_array() {
        for block in arr {
            if block.get("type").and_then(|t| t.as_str()) == Some("tool_result") {
                if let Some(tool_use_id) = block.get("tool_use_id").and_then(|t| t.as_str()) {
                    results.insert(
                        tool_use_id.to_string(),
                        ToolResultBlock {
                            block_type: "tool_result".to_string(),
                            tool_use_id: tool_use_id.to_string(),
                            content: block.get("content").cloned().unwrap_or(serde_json::Value::String(String::new())),
                            is_error: block.get("is_error").and_then(|e| e.as_bool()),
                        },
                    );
                }
            }
        }
    }
    results
}

/// Process a raw entry into a ProcessedMessage
fn process_message(entry: &RawEntry) -> Option<ProcessedMessage> {
    let msg = entry.message.as_ref()?;
    let content = &msg.content;

    let text_content = extract_text_content(content);
    let thinking_blocks = extract_thinking_blocks(content);
    let tool_use_blocks = extract_tool_use_blocks(content);
    let tool_results = extract_tool_results(content);

    Some(ProcessedMessage {
        uuid: entry.uuid.clone().unwrap_or_default(),
        parent_uuid: entry.parent_uuid.as_ref().and_then(|v| v.as_str()).map(String::from),
        timestamp: entry.timestamp.clone().unwrap_or_default(),
        role: msg.role.clone(),
        text_content,
        thinking_blocks,
        tool_use_blocks,
        tool_results,
        model: msg.model.clone(),
    })
}

/// List all projects in ~/.claude/projects/
pub fn list_projects() -> Vec<String> {
    let projects_dir = get_projects_dir();
    if !projects_dir.exists() {
        return vec![];
    }
    match fs::read_dir(&projects_dir) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect(),
        Err(_) => vec![],
    }
}

/// List session files for a project (excluding agent files)
pub fn list_session_files(project_encoded: &str) -> Vec<PathBuf> {
    let project_dir = get_projects_dir().join(project_encoded);
    if !project_dir.exists() {
        return vec![];
    }
    match fs::read_dir(&project_dir) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                name.ends_with(".jsonl") && !name.starts_with("agent-")
            })
            .map(|e| e.path())
            .collect(),
        Err(_) => vec![],
    }
}

/// Get a session summary by parsing a JSONL file
pub fn get_session_summary(file_path: &Path) -> Option<SessionSummary> {
    let file = fs::File::open(file_path).ok()?;
    let reader = BufReader::new(file);

    let session_id = file_path.file_stem()?.to_str()?.to_string();
    let mut project = String::new();
    let mut project_encoded = String::new();
    let mut first_message = String::new();
    let mut message_count = 0usize;
    let mut start_time: Option<i64> = None;
    let mut end_time: Option<i64> = None;
    let mut git_branch: Option<String> = None;
    let mut model: Option<String> = None;
    let mut metadata_extracted = false;

    // Extract project from path
    if let Some(parent) = file_path.parent() {
        if let Some(name) = parent.file_name() {
            project_encoded = name.to_string_lossy().to_string();
            project = decode_project_path(&project_encoded);
        }
    }

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let entry: RawEntry = match serde_json::from_str(trimmed) {
            Ok(e) => e,
            Err(_) => continue,
        };

        let entry_type = match &entry.entry_type {
            Some(t) => t.as_str(),
            None => continue,
        };

        if entry_type == "file-history-snapshot" || entry_type == "progress" {
            continue;
        }

        if entry_type == "user" || entry_type == "assistant" {
            message_count += 1;

            if !metadata_extracted {
                metadata_extracted = true;
                git_branch = entry.git_branch.clone();
            }

            // First user message as summary
            if first_message.is_empty() && entry_type == "user" {
                if let Some(msg) = &entry.message {
                    let text = extract_text_content(&msg.content);
                    first_message = text.chars().take(200).collect();
                }
            }

            // Track model
            if model.is_none() && entry_type == "assistant" {
                if let Some(msg) = &entry.message {
                    model = msg.model.clone();
                }
            }

            // Track timestamps
            if let Some(ts) = &entry.timestamp {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                    let ms = dt.timestamp_millis();
                    start_time = Some(start_time.map_or(ms, |s: i64| s.min(ms)));
                    end_time = Some(end_time.map_or(ms, |e: i64| e.max(ms)));
                } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(ts, "%Y-%m-%dT%H:%M:%S%.f") {
                    let ms = dt.and_utc().timestamp_millis();
                    start_time = Some(start_time.map_or(ms, |s: i64| s.min(ms)));
                    end_time = Some(end_time.map_or(ms, |e: i64| e.max(ms)));
                }
            }
        }
    }

    if message_count == 0 {
        return None;
    }

    Some(SessionSummary {
        id: session_id,
        project,
        project_encoded,
        first_message,
        message_count,
        start_time,
        end_time,
        git_branch,
        model,
        file_path: file_path.to_string_lossy().to_string(),
    })
}

/// Parse a full session file
pub fn parse_session_file(file_path: &Path) -> Option<(Session, HashMap<String, String>)> {
    let file = fs::File::open(file_path).ok()?;
    let reader = BufReader::new(file);

    let session_id = file_path.file_stem()?.to_str()?.to_string();
    let mut project = String::new();
    let mut project_encoded = String::new();
    let mut cwd = String::new();
    let mut version = String::new();
    let mut git_branch: Option<String> = None;
    let mut start_time: Option<i64> = None;
    let mut end_time: Option<i64> = None;
    let mut messages: Vec<ProcessedMessage> = Vec::new();
    let mut agent_links: HashMap<String, String> = HashMap::new();
    let mut pending_tool_results: HashMap<String, ToolResultBlock> = HashMap::new();
    let mut metadata_extracted = false;

    // Extract project from path
    if let Some(parent) = file_path.parent() {
        if let Some(name) = parent.file_name() {
            project_encoded = name.to_string_lossy().to_string();
            project = decode_project_path(&project_encoded);
        }
    }

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let entry: RawEntry = match serde_json::from_str(trimmed) {
            Ok(e) => e,
            Err(_) => continue,
        };

        let entry_type = match &entry.entry_type {
            Some(t) => t.clone(),
            None => continue,
        };

        if entry_type == "file-history-snapshot" {
            continue;
        }

        // Extract agent links from progress messages
        if entry_type == "progress" {
            if let (Some(data), Some(parent_id)) = (&entry.data, &entry.parent_tool_use_id) {
                if let Some(agent_id) = &data.agent_id {
                    agent_links.insert(agent_id.clone(), parent_id.clone());
                }
            }
            continue;
        }

        if entry_type == "user" || entry_type == "assistant" {
            if !metadata_extracted {
                metadata_extracted = true;
                cwd = entry.cwd.clone().unwrap_or_default();
                version = entry.version.clone().unwrap_or_default();
                git_branch = entry.git_branch.clone();
            }

            // Track timestamps
            if let Some(ts) = &entry.timestamp {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
                    let ms = dt.timestamp_millis();
                    start_time = Some(start_time.map_or(ms, |s: i64| s.min(ms)));
                    end_time = Some(end_time.map_or(ms, |e: i64| e.max(ms)));
                } else if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(ts, "%Y-%m-%dT%H:%M:%S%.f") {
                    let ms = dt.and_utc().timestamp_millis();
                    start_time = Some(start_time.map_or(ms, |s: i64| s.min(ms)));
                    end_time = Some(end_time.map_or(ms, |e: i64| e.max(ms)));
                }
            }

            if let Some(processed) = process_message(&entry) {
                // Store tool results from user messages
                if entry_type == "user" {
                    for (tool_id, result) in &processed.tool_results {
                        pending_tool_results.insert(tool_id.clone(), result.clone());
                    }
                }

                // Only add non-empty messages
                if !processed.text_content.trim().is_empty()
                    || !processed.tool_use_blocks.is_empty()
                    || !processed.thinking_blocks.is_empty()
                {
                    messages.push(processed);
                }
            }
        }
    }

    // Merge tool results into tool use messages
    for msg in &mut messages {
        for tool_use in &msg.tool_use_blocks {
            if let Some(result) = pending_tool_results.get(&tool_use.id) {
                msg.tool_results.insert(tool_use.id.clone(), result.clone());
            }
        }
    }

    if messages.is_empty() {
        return None;
    }

    Some((
        Session {
            id: session_id,
            project,
            project_encoded,
            git_branch,
            cwd,
            version,
            start_time,
            end_time,
            messages,
            file_path: file_path.to_string_lossy().to_string(),
            subagents: HashMap::new(),
        },
        agent_links,
    ))
}

/// Parse a subagent file
fn parse_subagent_file(file_path: &Path) -> Vec<ProcessedMessage> {
    let file = match fs::File::open(file_path) {
        Ok(f) => f,
        Err(_) => return vec![],
    };
    let reader = BufReader::new(file);
    let mut messages: Vec<ProcessedMessage> = Vec::new();
    let mut pending_tool_results: HashMap<String, ToolResultBlock> = HashMap::new();

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let entry: RawEntry = match serde_json::from_str(trimmed) {
            Ok(e) => e,
            Err(_) => continue,
        };
        let entry_type = match &entry.entry_type {
            Some(t) => t.as_str(),
            None => continue,
        };
        if entry_type == "file-history-snapshot" || entry_type == "progress" {
            continue;
        }
        if entry_type == "user" || entry_type == "assistant" {
            if let Some(processed) = process_message(&entry) {
                if entry_type == "user" {
                    for (tool_id, result) in &processed.tool_results {
                        pending_tool_results.insert(tool_id.clone(), result.clone());
                    }
                }
                if !processed.text_content.trim().is_empty()
                    || !processed.tool_use_blocks.is_empty()
                    || !processed.thinking_blocks.is_empty()
                {
                    messages.push(processed);
                }
            }
        }
    }

    for msg in &mut messages {
        for tool_use in &msg.tool_use_blocks {
            if let Some(result) = pending_tool_results.get(&tool_use.id) {
                msg.tool_results.insert(tool_use.id.clone(), result.clone());
            }
        }
    }

    messages
}

/// Find subagent files for a session
fn find_subagent_files(project_dir: &Path, session_id: &str) -> Vec<PathBuf> {
    let mut files = Vec::new();

    // New location: {project}/{sessionId}/subagents/
    let subagents_dir = project_dir.join(session_id).join("subagents");
    if subagents_dir.exists() {
        if let Ok(entries) = fs::read_dir(&subagents_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("agent-") && name.ends_with(".jsonl") {
                    files.push(entry.path());
                }
            }
        }
    }

    // Old location: {project}/agent-*.jsonl
    if let Ok(entries) = fs::read_dir(project_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("agent-") && name.ends_with(".jsonl") {
                files.push(entry.path());
            }
        }
    }

    files
}

/// Get all sessions grouped by project
pub fn get_all_sessions() -> Vec<ProjectGroup> {
    let projects = list_projects();
    let mut groups: Vec<ProjectGroup> = Vec::new();

    for project_encoded in projects {
        let session_files = list_session_files(&project_encoded);
        let mut sessions: Vec<SessionSummary> = Vec::new();

        for file_path in session_files {
            if let Some(summary) = get_session_summary(&file_path) {
                sessions.push(summary);
            }
        }

        if sessions.is_empty() {
            continue;
        }

        // Sort by start time (newest first)
        sessions.sort_by(|a, b| b.start_time.cmp(&a.start_time));

        groups.push(ProjectGroup {
            project: decode_project_path(&project_encoded),
            project_encoded,
            sessions,
        });
    }

    // Sort groups by most recent session
    groups.sort_by(|a, b| {
        let a_time = a.sessions.first().and_then(|s| s.start_time).unwrap_or(0);
        let b_time = b.sessions.first().and_then(|s| s.start_time).unwrap_or(0);
        b_time.cmp(&a_time)
    });

    groups
}

/// Get a single session by ID and project
pub fn get_session(session_id: &str, project_encoded: &str) -> Option<Session> {
    let project_dir = get_projects_dir().join(project_encoded);
    let file_path = project_dir.join(format!("{}.jsonl", session_id));

    let (mut session, agent_links) = parse_session_file(&file_path)?;

    // Find and load subagent files
    let subagent_files = find_subagent_files(&project_dir, session_id);

    for sub_path in subagent_files {
        let agent_id = sub_path
            .file_stem()
            .and_then(|s| s.to_str())
            .map(|s| s.strip_prefix("agent-").unwrap_or(s).to_string())
            .unwrap_or_default();

        if let Some(parent_tool_use_id) = agent_links.get(&agent_id) {
            let messages = parse_subagent_file(&sub_path);
            if !messages.is_empty() {
                let count = messages.len();
                session.subagents.insert(
                    agent_id.clone(),
                    SubagentSession {
                        agent_id: agent_id.clone(),
                        parent_tool_use_id: parent_tool_use_id.clone(),
                        messages,
                        message_count: count,
                    },
                );
            }
        }
    }

    // Annotate Task tool uses with agentId
    for msg in &mut session.messages {
        for tool_use in &mut msg.tool_use_blocks {
            if tool_use.name == "Task" {
                for (aid, sub) in &session.subagents {
                    if sub.parent_tool_use_id == tool_use.id {
                        tool_use.agent_id = Some(aid.clone());
                        break;
                    }
                }
            }
        }
    }

    Some(session)
}
