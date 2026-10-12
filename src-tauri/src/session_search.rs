//! Full-text search across Claude Code session files.
//!
//! Sessions are scanned on demand directly from `~/.claude/projects/` —
//! there is no index and no internal database. Each search streams the
//! JSONL files line by line, so memory stays flat even for large histories.

use crate::session_store;
use crate::session_types::{RawEntry, SearchResult, SearchSnippet};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

/// Maximum number of sessions returned per search.
const MAX_RESULTS: usize = 100;
/// Maximum snippets kept per session.
const MAX_SNIPPETS_PER_SESSION: usize = 5;
/// Excerpt context around a match, in characters.
const EXCERPT_BEFORE: usize = 60;
const EXCERPT_AFTER: usize = 120;
/// Cap per searchable text chunk so huge tool outputs don't dominate.
const CHUNK_CHAR_CAP: usize = 4000;

/// One searchable text chunk extracted from a message entry.
struct Chunk {
    role: String,
    timestamp: String,
    text: String,
}

/// Split a raw JSONL entry into searchable text chunks:
/// plain message text, thinking blocks, and tool use / tool results.
fn chunks_for_entry(entry: &RawEntry) -> Vec<Chunk> {
    let is_message = matches!(&entry.entry_type, Some(t) if t == "user" || t == "assistant");
    if !is_message {
        return Vec::new();
    }
    let msg = match &entry.message {
        Some(m) => m,
        None => return Vec::new(),
    };

    let role = msg.role.clone();
    let timestamp = entry.timestamp.clone().unwrap_or_default();
    let mut chunks = Vec::new();

    let text = session_store::extract_text_content(&msg.content);
    if !text.trim().is_empty() {
        chunks.push(Chunk {
            role: role.clone(),
            timestamp: timestamp.clone(),
            text,
        });
    }

    if let Some(arr) = msg.content.as_array() {
        let mut thinking = String::new();
        let mut tools = String::new();
        for block in arr {
            let block_type = block.get("type").and_then(|t| t.as_str()).unwrap_or("");
            match block_type {
                "thinking" => {
                    if let Some(t) = block.get("thinking").and_then(|t| t.as_str()) {
                        if !thinking.is_empty() {
                            thinking.push('\n');
                        }
                        thinking.push_str(t);
                    }
                }
                "tool_use" => {
                    if !tools.is_empty() {
                        tools.push('\n');
                    }
                    tools.push_str("tool ");
                    tools.push_str(block.get("name").and_then(|n| n.as_str()).unwrap_or("?"));
                    if let Some(input) = block.get("input") {
                        let rendered = serde_json::to_string(input).unwrap_or_default();
                        tools.push(' ');
                        tools.extend(rendered.chars().take(CHUNK_CHAR_CAP));
                    }
                }
                "tool_result" => {
                    if !tools.is_empty() {
                        tools.push('\n');
                    }
                    tools.push_str("result ");
                    let rendered = match block.get("content") {
                        Some(serde_json::Value::String(s)) => s.clone(),
                        Some(other) => serde_json::to_string(other).unwrap_or_default(),
                        None => String::new(),
                    };
                    tools.extend(rendered.chars().take(CHUNK_CHAR_CAP));
                }
                _ => {}
            }
        }
        if !thinking.trim().is_empty() {
            chunks.push(Chunk {
                role: role.clone(),
                timestamp: timestamp.clone(),
                text: thinking,
            });
        }
        if !tools.trim().is_empty() {
            chunks.push(Chunk {
                role,
                timestamp,
                text: tools,
            });
        }
    }

    chunks
}

/// Build an excerpt around the first case-insensitive match of `query_lower`
/// inside `text`. Returns `None` when there is no match.
fn make_excerpt(text: &str, query_lower: &str) -> Option<String> {
    let lower = text.to_lowercase();
    let byte_pos = lower.find(query_lower)?;

    // Map the match position back to the original text. Lowercasing can change
    // byte length for exotic scripts, so clamp defensively — the excerpt is
    // display-only.
    let lower_char_idx = lower[..byte_pos].chars().count();
    let orig_chars: Vec<char> = text.chars().collect();
    let total = orig_chars.len();
    if total == 0 {
        return None;
    }
    let idx = lower_char_idx.min(total - 1);
    let query_chars = query_lower.chars().count().max(1);
    let start = idx.saturating_sub(EXCERPT_BEFORE);
    let end = (idx + query_chars + EXCERPT_AFTER).min(total);

    let raw: String = orig_chars[start..end].iter().collect();
    let collapsed = raw.split_whitespace().collect::<Vec<_>>().join(" ");

    let mut excerpt = String::new();
    if start > 0 {
        excerpt.push('…');
    }
    excerpt.push_str(&collapsed);
    if end < total {
        excerpt.push('…');
    }
    Some(excerpt)
}

/// Search one JSONL file, returning up to `MAX_SNIPPETS_PER_SESSION` snippets.
fn search_file(path: &Path, query_lower: &str) -> Vec<SearchSnippet> {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };
    let reader = BufReader::new(file);
    let mut snippets = Vec::new();

    for line in reader.lines() {
        if snippets.len() >= MAX_SNIPPETS_PER_SESSION {
            break;
        }
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
        for chunk in chunks_for_entry(&entry) {
            if let Some(excerpt) = make_excerpt(&chunk.text, query_lower) {
                snippets.push(SearchSnippet {
                    role: chunk.role,
                    timestamp: chunk.timestamp,
                    excerpt,
                });
                if snippets.len() >= MAX_SNIPPETS_PER_SESSION {
                    break;
                }
            }
        }
    }

    snippets
}

/// Merge snippets into `results`, creating the session entry on first hit.
fn merge_result(
    results: &mut Vec<SearchResult>,
    project_encoded: &str,
    session_id: &str,
    main_file: PathBuf,
    snippets: Vec<SearchSnippet>,
) {
    if let Some(existing) = results
        .iter_mut()
        .find(|r| r.project_encoded == project_encoded && r.id == session_id)
    {
        let room = MAX_SNIPPETS_PER_SESSION.saturating_sub(existing.snippets.len());
        existing.snippets.extend(snippets.into_iter().take(room));
        existing.matched_message_count = existing.snippets.len();
        return;
    }
    let summary = match session_store::get_session_summary(&main_file) {
        Some(s) => s,
        None => return,
    };
    results.push(SearchResult {
        id: summary.id,
        project: summary.project,
        project_encoded: summary.project_encoded,
        first_message: summary.first_message,
        message_count: summary.message_count,
        matched_message_count: snippets.len(),
        start_time: summary.start_time,
        end_time: summary.end_time,
        snippets,
    });
}

/// Search all sessions for `query` (case-insensitive).
///
/// Scans the raw JSONL files on demand: message text, thinking blocks,
/// tool names/inputs and tool results. Subagent files
/// (`{sessionId}/subagents/agent-*.jsonl`) are searched too and attributed
/// to their parent session.
pub fn search_sessions(query: &str) -> Vec<SearchResult> {
    let query_lower = query.trim().to_lowercase();
    if query_lower.is_empty() {
        return Vec::new();
    }

    let mut results: Vec<SearchResult> = Vec::new();

    'projects: for project_encoded in session_store::list_projects() {
        let project_dir = session_store::get_projects_dir().join(&project_encoded);
        let entries = match fs::read_dir(&project_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // Subagent conversations live in {sessionId}/subagents/
            if path.is_dir() {
                let session_id = entry.file_name().to_str().unwrap_or_default().to_string();
                let subagents_dir = path.join("subagents");
                if session_id.is_empty() || !subagents_dir.is_dir() {
                    continue;
                }
                let subs = match fs::read_dir(&subagents_dir) {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                for sub in subs.flatten() {
                    let sub_name = sub.file_name().to_string_lossy().to_string();
                    if !(sub_name.starts_with("agent-") && sub_name.ends_with(".jsonl")) {
                        continue;
                    }
                    let snippets = search_file(&sub.path(), &query_lower);
                    if snippets.is_empty() {
                        continue;
                    }
                    let main_file = project_dir.join(format!("{session_id}.jsonl"));
                    merge_result(&mut results, &project_encoded, &session_id, main_file, snippets);
                    if results.len() >= MAX_RESULTS {
                        break 'projects;
                    }
                }
                continue;
            }

            if name.starts_with("agent-") || !name.ends_with(".jsonl") {
                continue;
            }
            let session_id = name.trim_end_matches(".jsonl").to_string();
            let snippets = search_file(&path, &query_lower);
            if snippets.is_empty() {
                continue;
            }
            merge_result(&mut results, &project_encoded, &session_id, path, snippets);
            if results.len() >= MAX_RESULTS {
                break 'projects;
            }
        }
    }

    // Most recently active sessions first
    results.sort_by(|a, b| b.end_time.cmp(&a.end_time));
    results
}
