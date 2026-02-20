use crate::session_types::{Session, ProcessedMessage, SubagentSession, ToolUseBlock, ToolResultBlock, ThinkingBlock};
use chrono::{DateTime, Utc, TimeZone};
use std::collections::HashMap;

fn format_timestamp(timestamp: &str) -> String {
    if let Ok(dt) = DateTime::parse_from_rfc3339(timestamp) {
        dt.format("%l:%M %p").to_string().trim().to_string()
    } else {
        timestamp.to_string()
    }
}

fn format_full_date(timestamp: Option<i64>) -> String {
    match timestamp {
        Some(ms) => {
            if let Some(dt) = Utc.timestamp_millis_opt(ms).single() {
                dt.format("%B %e, %Y").to_string()
            } else {
                "Unknown date".to_string()
            }
        }
        None => "Unknown date".to_string(),
    }
}

fn format_duration(start: Option<i64>, end: Option<i64>) -> Option<String> {
    match (start, end) {
        (Some(s), Some(e)) => {
            let minutes = ((e - s) / 60000) as u64;
            let hours = minutes / 60;
            if hours > 0 {
                Some(format!("{}h {}m", hours, minutes % 60))
            } else {
                Some(format!("{}m", minutes))
            }
        }
        _ => None,
    }
}

fn format_tool_use(tool: &ToolUseBlock, result: Option<&ToolResultBlock>) -> String {
    let mut lines = Vec::new();
    lines.push("<details>".to_string());
    lines.push(format!("<summary><strong>Tool:</strong> {}</summary>", tool.name));
    lines.push(String::new());

    if tool.input != serde_json::Value::Object(Default::default()) {
        lines.push("**Input:**".to_string());
        lines.push("```json".to_string());
        lines.push(serde_json::to_string_pretty(&tool.input).unwrap_or_default());
        lines.push("```".to_string());
    }

    if let Some(result) = result {
        lines.push(String::new());
        lines.push(if result.is_error == Some(true) { "**Error:**" } else { "**Result:**" }.to_string());
        let content = if let Some(s) = result.content.as_str() {
            s.to_string()
        } else {
            serde_json::to_string(&result.content).unwrap_or_default()
        };
        let truncated = if content.len() > 2000 {
            format!("{}\n... (truncated)", &content[..2000])
        } else {
            content
        };
        lines.push("```".to_string());
        lines.push(truncated);
        lines.push("```".to_string());
    }

    lines.push("</details>".to_string());
    lines.push(String::new());
    lines.join("\n")
}

fn format_thinking(thinking: &ThinkingBlock) -> String {
    format!(
        "<details>\n<summary><em>Thinking...</em></summary>\n\n{}\n\n</details>\n",
        thinking.thinking
    )
}

fn format_subagent(subagent: &SubagentSession) -> String {
    let mut lines = Vec::new();
    lines.push("<details>".to_string());
    lines.push(format!("<summary><strong>Subagent</strong> ({} messages)</summary>", subagent.message_count));
    lines.push(String::new());

    for message in &subagent.messages {
        let ts = format_timestamp(&message.timestamp);
        let role = if message.role == "user" { "**User**" } else { "**Assistant**" };
        lines.push(format!("#### {} ({})", role, ts));
        lines.push(String::new());
        if !message.text_content.is_empty() {
            lines.push(message.text_content.clone());
            lines.push(String::new());
        }
        for tool in &message.tool_use_blocks {
            let result = message.tool_results.get(&tool.id);
            lines.push(format_tool_use(tool, result));
        }
    }

    lines.push("</details>".to_string());
    lines.push(String::new());
    lines.join("\n")
}

fn format_message(message: &ProcessedMessage, subagents: &HashMap<String, SubagentSession>) -> String {
    let mut lines = Vec::new();
    let ts = format_timestamp(&message.timestamp);
    let role = if message.role == "user" { "**User**" } else { "**Assistant**" };
    lines.push(format!("### {} ({})", role, ts));
    lines.push(String::new());

    for thinking in &message.thinking_blocks {
        lines.push(format_thinking(thinking));
    }

    if !message.text_content.is_empty() {
        lines.push(message.text_content.clone());
        lines.push(String::new());
    }

    for tool in &message.tool_use_blocks {
        let result = message.tool_results.get(&tool.id);
        if tool.name == "Task" {
            if let Some(agent_id) = &tool.agent_id {
                if let Some(subagent) = subagents.get(agent_id) {
                    lines.push(format_subagent(subagent));
                    continue;
                }
            }
        }
        lines.push(format_tool_use(tool, result));
    }

    lines.join("\n")
}

pub fn session_to_markdown(session: &Session) -> String {
    let mut lines = Vec::new();

    lines.push(format!("# Session: {}", session.project));
    lines.push(String::new());
    lines.push(format!("**Date:** {}", format_full_date(session.start_time)));

    if let Some(dur) = format_duration(session.start_time, session.end_time) {
        lines.push(format!("**Duration:** {}", dur));
    }

    lines.push(format!("**Messages:** {}", session.messages.len()));

    if let Some(branch) = &session.git_branch {
        lines.push(format!("**Branch:** {}", branch));
    }

    if !session.version.is_empty() {
        lines.push(format!("**Claude Code Version:** {}", session.version));
    }

    lines.push(format!("**Session ID:** {}", session.id));
    lines.push(String::new());
    lines.push("---".to_string());
    lines.push(String::new());
    lines.push("## Conversation".to_string());
    lines.push(String::new());

    for message in &session.messages {
        lines.push(format_message(message, &session.subagents));
    }

    lines.push("---".to_string());
    lines.push(String::new());

    let now = Utc::now().format("%B %e, %Y at %l:%M %p");
    lines.push(format!("*Exported from Sessionly on {}*", now));

    lines.join("\n")
}
