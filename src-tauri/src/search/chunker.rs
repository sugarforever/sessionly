use crate::session_types::ProcessedMessage;
use crate::search::types::Chunk;

/// Split text into chunks of <= max_chars, preferring to break on a newline
/// near the limit. Offsets are char indices into `text`.
pub fn chunk_text(message_uuid: &str, role: &str, text: &str, max_chars: usize) -> Vec<Chunk> {
    let chars: Vec<char> = text.chars().collect();
    let mut chunks = Vec::new();
    let mut start = 0usize;
    while start < chars.len() {
        let hard_end = (start + max_chars).min(chars.len());
        let mut end = hard_end;
        if hard_end < chars.len() {
            if let Some(nl) = chars[start..hard_end].iter().rposition(|&c| c == '\n') {
                if nl > 0 {
                    end = start + nl + 1;
                }
            }
        }
        let slice: String = chars[start..end].iter().collect();
        if !slice.trim().is_empty() {
            chunks.push(Chunk {
                message_uuid: message_uuid.to_string(),
                role: role.to_string(),
                char_start: start,
                char_end: end,
                text: slice.trim().to_string(),
            });
        }
        start = end;
    }
    chunks
}

/// Convenience: extract + chunk a whole message.
pub fn chunk_message(msg: &ProcessedMessage, max_chars: usize) -> Vec<Chunk> {
    let mut all = Vec::new();
    let mut offset = 0usize;
    for seg in extract_indexable(msg) {
        let mut cs = chunk_text(&msg.uuid, &msg.role, &seg, max_chars);
        for c in &mut cs {
            c.char_start += offset;
            c.char_end += offset;
        }
        offset += seg.chars().count() + 1;
        all.extend(cs);
    }
    all
}

/// Standard scope: assistant/user text, thinking, and tool INPUTS
/// (command strings, file paths, queries) — never tool result bodies.
pub fn extract_indexable(msg: &ProcessedMessage) -> Vec<String> {
    let mut out = Vec::new();
    if !msg.text_content.trim().is_empty() {
        out.push(msg.text_content.clone());
    }
    for t in &msg.thinking_blocks {
        if !t.thinking.trim().is_empty() {
            out.push(t.thinking.clone());
        }
    }
    for tu in &msg.tool_use_blocks {
        let mut parts = vec![tu.name.clone()];
        for key in ["command", "file_path", "pattern", "query", "url", "description", "prompt"] {
            if let Some(v) = tu.input.get(key).and_then(|v| v.as_str()) {
                parts.push(v.to_string());
            }
        }
        if parts.len() > 1 {
            out.push(parts.join(" "));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session_types::{ProcessedMessage, ThinkingBlock, ToolUseBlock};
    use std::collections::HashMap;
    use serde_json::json;

    fn msg() -> ProcessedMessage {
        ProcessedMessage {
            uuid: "m1".into(),
            parent_uuid: None,
            timestamp: "2026-01-01T00:00:00Z".into(),
            role: "assistant".into(),
            text_content: "Fixing the redirect loop".into(),
            thinking_blocks: vec![ThinkingBlock {
                block_type: "thinking".into(),
                thinking: "the guard re-ran".into(),
                signature: None,
            }],
            tool_use_blocks: vec![ToolUseBlock {
                block_type: "tool_use".into(),
                id: "t1".into(),
                name: "Bash".into(),
                input: json!({ "command": "cargo clippy -- -D warnings" }),
                agent_id: None,
            }],
            tool_results: HashMap::new(),
            model: None,
        }
    }

    #[test]
    fn extracts_text_thinking_and_tool_inputs() {
        let segs = extract_indexable(&msg());
        let joined: Vec<&str> = segs.iter().map(|s| s.as_str()).collect();
        assert!(joined.iter().any(|s| s.contains("redirect loop")));
        assert!(joined.iter().any(|s| s.contains("guard re-ran")));
        assert!(joined.iter().any(|s| s.contains("cargo clippy")));
    }

    #[test]
    fn chunks_long_text_on_boundaries_with_offsets() {
        let line = "abcdefghij\n"; // 11 chars
        let text = line.repeat(300); // 3300 chars
        let chunks = chunk_text("m1", "assistant", &text, 1200);
        assert!(chunks.len() >= 3, "expected multiple chunks, got {}", chunks.len());
        assert_eq!(chunks[0].char_start, 0);
        for w in chunks.windows(2) {
            assert!(w[1].char_start >= w[0].char_end);
        }
        assert!(chunks.iter().all(|c| c.text.chars().count() <= 1200));
        assert_eq!(chunks[0].message_uuid, "m1");
    }

    #[test]
    fn short_text_is_one_chunk() {
        let chunks = chunk_text("m2", "user", "hello world", 1200);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text, "hello world");
    }
}
