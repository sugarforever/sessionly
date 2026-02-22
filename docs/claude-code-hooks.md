# Claude Code Hooks Reference

A comprehensive reference for building features on top of Claude Code hooks.

## Session Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> SessionStart: claude starts

    state "Agentic Loop" as loop {
        UserPromptSubmit --> PreToolUse: Claude decides to use a tool
        UserPromptSubmit --> Stop: Claude responds without tools

        PreToolUse --> PermissionRequest: permission needed
        PreToolUse --> ToolExecution: allowed (or auto-approved)
        PreToolUse --> UserPromptSubmit: denied (Claude retries)

        PermissionRequest --> ToolExecution: user/hook allows
        PermissionRequest --> UserPromptSubmit: user/hook denies

        ToolExecution --> PostToolUse: tool succeeds
        ToolExecution --> PostToolUseFailure: tool fails

        PostToolUse --> PreToolUse: Claude uses another tool
        PostToolUse --> Stop: Claude is done

        PostToolUseFailure --> PreToolUse: Claude retries/adjusts
        PostToolUseFailure --> Stop: Claude gives up

        Stop --> UserPromptSubmit: hook blocks stop (continues)
        Stop --> WaitingForInput: allowed to stop
        WaitingForInput --> UserPromptSubmit: user types next prompt
    }

    SessionStart --> UserPromptSubmit: session ready

    WaitingForInput --> SessionEnd: user exits
    SessionStart --> SessionEnd: immediate exit
```

## Hook Event Flow

```mermaid
flowchart TD
    A[Hook Event Fires] --> B{Matcher defined?}
    B -->|No / wildcard| C[Run all hook handlers]
    B -->|Yes| D{Regex matches?}
    D -->|Yes| C
    D -->|No| E[Skip hook]

    C --> F{Hook type?}
    F -->|command| G[Execute shell command<br/>JSON input on stdin]
    F -->|prompt| H[Send prompt + input to LLM<br/>Single-turn evaluation]
    F -->|agent| I[Spawn subagent with tools<br/>Multi-turn verification]

    G --> J{Exit code?}
    J -->|0| K[Parse stdout as JSON<br/>Apply decisions]
    J -->|2| L[Blocking error<br/>stderr → Claude]
    J -->|other| M[Non-blocking error<br/>Continue]

    H --> N{LLM response}
    N -->|ok: true| O[Allow]
    N -->|ok: false| P[Block with reason]

    I --> N
```

## PreToolUse Decision Flow

```mermaid
flowchart TD
    A[PreToolUse fires] --> B[Hook receives tool_name + tool_input]
    B --> C{Hook decision?}

    C -->|exit 0, no JSON| D[Allow tool call]
    C -->|permissionDecision: allow| E[Bypass permission system<br/>Tool executes immediately]
    C -->|permissionDecision: deny| F[Block tool call<br/>Reason shown to Claude]
    C -->|permissionDecision: ask| G[Show permission dialog<br/>with optional updatedInput]
    C -->|exit 2| F
    C -->|updatedInput provided| H[Modify tool parameters<br/>before execution]

    H --> E
    H --> G
```

## Notification Event Flow (Sessionly Context)

```mermaid
flowchart TD
    A[Claude Code session activity] --> B[Claude Code hook fires]
    B --> C[Hook command sends HTTP POST<br/>to Sessionly on 127.0.0.1:19823]
    C --> D[Rust SessionMonitor receives payload]
    D --> E{hook_event_name?}

    E -->|PreToolUse / PostToolUse| F[State → Working]
    E -->|PostToolUseFailure| G[State → Error]
    E -->|Stop| H[State → Completed]
    E -->|Other events| I[Ignored / return]

    F --> J[Emit session-state-changed<br/>Tauri event to frontend]
    G --> J
    H --> J

    J --> K[useSessionMonitor updates<br/>per-project state]
    J --> L{useNotifications checks}

    L -->|state=completed & cooldown passed| M[Send OS notification<br/>Session Completed]
    L -->|state=error & cooldown passed| N[Send OS notification<br/>Tool Error]
    L -->|cooldown active or prefs off| O[Skip]
```

## All Hook Events Summary

```mermaid
flowchart LR
    subgraph Session["Session Lifecycle"]
        SS[SessionStart] --> AL
        AL[Agentic Loop] --> SE[SessionEnd]
    end

    subgraph AL["Agentic Loop Events"]
        direction TB
        UPS[UserPromptSubmit]
        PTU[PreToolUse]
        PR[PermissionRequest]
        PostTU[PostToolUse]
        PTUF[PostToolUseFailure]
        Stop[Stop]
    end

    subgraph Subagents["Subagent Events"]
        SAS[SubagentStart]
        SASt[SubagentStop]
    end

    subgraph Teams["Team Events"]
        TI[TeammateIdle]
        TC[TaskCompleted]
    end

    subgraph Other["Other Events"]
        N[Notification]
        CC[ConfigChange]
        PC[PreCompact]
        WC[WorktreeCreate]
        WR[WorktreeRemove]
    end
```

## Event Reference Table

| Event | Matcher | Can Block? | Hook Types | Key Use Case |
|-------|---------|------------|------------|-------------|
| `SessionStart` | `startup`, `resume`, `clear`, `compact` | No | command | Load context, set env vars |
| `UserPromptSubmit` | none | Yes | all | Validate/enrich prompts |
| `PreToolUse` | tool name regex | Yes | all | Block dangerous operations |
| `PermissionRequest` | tool name regex | Yes | all | Auto-approve/deny permissions |
| `PostToolUse` | tool name regex | No* | all | Lint, format, log after tool |
| `PostToolUseFailure` | tool name regex | No* | all | Error handling, alerts |
| `Notification` | notification type | No | command | Custom notification delivery |
| `SubagentStart` | agent type | No | command | Inject subagent context |
| `SubagentStop` | agent type | Yes | all | Verify subagent output |
| `Stop` | none | Yes | all | Enforce completion criteria |
| `TeammateIdle` | none | Yes | command | Quality gates for teams |
| `TaskCompleted` | none | Yes | command | Verify task completion |
| `ConfigChange` | config source | Yes | command | Audit/block config changes |
| `WorktreeCreate` | none | Yes | command | Custom VCS worktree |
| `WorktreeRemove` | none | No | command | Worktree cleanup |
| `PreCompact` | `manual`, `auto` | No | command | Pre-compaction actions |
| `SessionEnd` | exit reason | No | command | Cleanup, logging |

*PostToolUse/PostToolUseFailure: exit 2 shows stderr to Claude but tool already ran.

## Exit Code Semantics

```mermaid
flowchart TD
    E[Hook exits] --> E0{Exit code}
    E0 -->|0| S[Success<br/>Parse stdout JSON<br/>Apply decisions]
    E0 -->|2| B[Blocking error<br/>stderr → Claude/user<br/>Action prevented if blockable]
    E0 -->|other| N[Non-blocking error<br/>stderr in verbose mode<br/>Execution continues]
```

## Hook Configuration Format

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex>",        // optional, filters when hook fires
        "hooks": [
          {
            "type": "command",       // "command" | "prompt" | "agent"
            "command": "script.sh",  // for type: command
            "prompt": "...",         // for type: prompt/agent
            "async": false,          // run in background (command only)
            "timeout": 600,          // seconds
            "statusMessage": "...",  // custom spinner text
            "model": "...",          // for prompt/agent
            "once": false            // run once per session (skills only)
          }
        ]
      }
    ]
  }
}
```

## Common Input Fields (stdin JSON)

Every hook receives these fields:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse"
}
```

Plus event-specific fields (e.g. `tool_name`, `tool_input`, `prompt`, `reason`, etc.)

## Sessionly's Hook Installation

Sessionly installs a hook that sends all events to its local HTTP server:

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "curl -s -X POST -H 'Content-Type: application/json' -d @- http://127.0.0.1:19823/hook"
    }
  ],
  "matcher": "*"
}
```

The Rust `SessionMonitor` maps hook events to session states:
- `PreToolUse` / `PostToolUse` → **Working** (green)
- `PostToolUseFailure` → **Error** (red)
- `Stop` → **Completed** (amber) — triggers notification

---

Sources:
- [Hooks Reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Claude Code Hooks Mastery (GitHub)](https://github.com/disler/claude-code-hooks-mastery)
- [DataCamp: Claude Code Hooks Guide](https://www.datacamp.com/tutorial/claude-code-hooks)
