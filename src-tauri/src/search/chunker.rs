use crate::session_types::ProcessedMessage;

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
}
