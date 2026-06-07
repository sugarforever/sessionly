# Sessionly Search — Design Spec

- **Date:** 2026-06-08
- **Status:** Approved (pending spec review)
- **Issue:** #2 (没搜索功能吗? / "No search feature?")
- **Branch:** `feat/search`

## Summary

Add hybrid semantic + keyword search over Claude Code session history. The default
backend runs **fully on-device** (zero tokens, zero network, private); an optional
cloud backend (OpenAI) is available with the user's own API key. Search is invoked
through a **⌘K command palette** and a dedicated **Search page**, both backed by one
engine.

## Goals

- Find sessions/messages by **meaning** (semantic) *and* by **exact literal**
  (function names, error codes, commands, paths) — hybrid ranking.
- **Token-free by default**: local embedding model, no API calls, no network at query
  time.
- **Multilingual** (English + Chinese + ~100 langs) on both the semantic and keyword
  sides.
- Modern, keyboard-first UX — not an "old-school" search box.
- Stay true to the app's model: **source of truth remains `~/.claude`**; the index is a
  rebuildable cache.

## Non-goals

- LLM-generated answers / RAG Q&A. We borrow Karpathy's *"compile once, query fast"*
  **principle** (precompute a fast queryable layer), not his LLM-agent implementation.
- Indexing bulky tool **result** bodies (file reads, command stdout) — see Index Scope.
- Multiple cloud providers at launch (OpenAI only; trait keeps others easy later).

## Background

- **Karpathy's LLM-wiki principle:** stop re-reading raw sources per query; compile them
  once into a fast queryable layer, then query that. We implement that layer as a **local
  index**, not an LLM agent — which is what makes it token-free.
- **Data scale (reference machine):** 432 sessions, ~456 MB of JSONL. Too large for the
  WebView → indexing and search live in the **Rust backend**, which already reads
  `~/.claude`.

## Locked decisions

| Decision | Choice |
|---|---|
| Match type | **Hybrid** — semantic + keyword, blended |
| Default embedding | **multilingual-e5-small** (local, via `fastembed`), ~120 MB, downloaded **on first use** |
| Optional embedding | **OpenAI** `text-embedding-3-small` (user API key) |
| Index scope | **Standard** — user/assistant text, thinking blocks, tool **inputs** (commands, paths, queries). NOT tool result bodies |
| Storage | **SQLite** in app-data dir: FTS5 (keyword) + `sqlite-vec` (semantic). Rebuildable cache |
| Keyword tokenizer | FTS5 **`trigram`** (segments CJK / space-less languages) |
| Hybrid blend | **Reciprocal Rank Fusion (RRF)** |
| UX surface | **⌘K palette + Search page**, shared engine |
| Frontend deps | **None new** — portal overlay + custom keyboard nav on the existing Radix/shadcn stack (optional in-family `@radix-ui/react-dialog` upgrade) |
| API key storage | **OS keychain** via Rust `keyring` crate (never `localStorage`) |

## Architecture

### Backend (Rust, `src-tauri/src/`)

New module group `search/`:

- **`search/mod.rs`** — wires the submodules; exposes the query/index API used by commands.
- **`search/embedder.rs`** — `Embedder` trait with two impls:
  - `LocalEmbedder` — `fastembed` → `multilingual-e5-small` (ONNX, on-device). Model
    downloaded on first use; download/progress surfaced as index "preparing" state.
  - `OpenAiEmbedder` — `text-embedding-3-small` via `reqwest`; key read from OS keychain.
  - Trait methods: `embed_documents(&[String]) -> Vec<Vec<f32>>`, `embed_query(&str) -> Vec<f32>`, `id() -> &str` (model id), `dim() -> usize`.
- **`search/indexer.rs`** — parses sessions (reusing `session_store`), chunks Standard-scope
  content, embeds, and upserts into the index. Runs in a background task; subscribes to the
  existing `session_monitor` for incremental updates.
- **`search/index.rs`** — SQLite open/migrate, upsert, FTS5 + vector queries, RRF merge,
  status/metadata.

### Data model (SQLite, app-data dir)

One DB file, e.g. `<app_data>/search-index.sqlite`:

- **`chunks`** — `id, session_id, project_encoded, message_uuid, role, char_start, char_end,
  text, content_hash`.
- **`chunks_fts`** — FTS5 virtual table over `text` using the **`trigram`** tokenizer
  (BM25 ranking, CJK-capable).
- **`vec_chunks`** — `sqlite-vec` virtual table holding the chunk embedding; dimension fixed
  to the active model's `dim()`.
- **`meta`** — `key/value`: active embedder id + dim, schema version, per-session
  `content_hash`, last-built timestamp, indexed/total counts.

**Chunking:** split each indexed message into chunks of ≤ ~512 tokens (e5-small's window)
on sentence/line boundaries. Short chunks → precise "jump to the matching line" snippets.
Chunk rows carry `message_uuid` + char offsets for navigation.

**Index scope (Standard):** index `ProcessedMessage.text_content`, `thinking_blocks[].thinking`,
and tool **inputs** from `tool_use_blocks[].input` (command strings, file paths, search
queries). Do **not** index `tool_results` bodies.

### Hybrid retrieval

For a query: embed it, take vector top-K (cosine via `sqlite-vec`) and FTS5/BM25 top-K, then
combine with **Reciprocal Rank Fusion**: `score(d) = Σ 1/(k + rank_i(d))` over the two lists
(`k≈60`). RRF needs no score normalization and is robust across the two very different
scoring scales. Return blended top-N as snippet hits with session/project/message refs.

### Indexing lifecycle

- **First build:** background task on launch (or first search). The embedding pass dominates;
  UI shows `indexed N / total` and results improve as it fills. Local model download happens
  here on first use ("preparing search…").
- **Incremental:** `session_monitor` file events → re-index only changed/new sessions; skip
  unchanged via stored per-session `content_hash`. Deleted files → drop their chunks.
- **Backend switch / model change:** different model ⇒ different `dim` ⇒ wipe `vec_chunks`
  and re-embed (FTS5 keyword side is reusable). Active model tracked in `meta`; user warned
  before rebuild.

## Frontend (`src/`)

### ⌘K command palette

- Global `Cmd/Ctrl+K` listener opens a portal overlay (focus input on open; `esc` /
  click-outside close). **No new dependency** — overlay via `createPortal`, optional in-family
  `@radix-ui/react-dialog` upgrade if focus-trap robustness warrants it during implementation.
- Debounced query (~150 ms) → `api.searchQuery`. Flat result rows: `project · session title`
  + highlighted snippet, blended-rank ordered.
- Keyboard: `↑↓` move active row (scroll-into-view), `↵` open, `esc` close.
- States: empty (recent searches), `indexing… N/432`, no-results.

### Search page (new nav item)

- Registered in `config/navigation.tsx`. Query box + filters: **project**, **time range**,
  **role**. Result **cards**: title, project, branch, date, highlighted snippet(s). Infinite
  scroll; total hit count.

### Shared

- One `api.search*` surface; palette and page share a result-list + snippet renderer.
- **Snippets:** keyword hits highlight matched terms within the chunk; pure-semantic hits show
  the matched passage as-is.
- **Jump-to-message:** `SessionView` gains per-message anchors keyed by `uuid`; opening a
  result navigates to the session, scrolls to the message, briefly highlights it. (Only change
  to existing components.)

### Settings → Search section

- **Backend selector:** "Local — multilingual-e5-small (private, free)" *(default)* vs
  "Cloud — OpenAI" + model + API-key field.
- **Index status:** `indexed N / total`, last built, **Rebuild index** button.
- Switching backend warns then triggers a vector rebuild.

## API surface (`src/types/api.ts` ↔ `commands.rs`)

| api.ts method | command | returns |
|---|---|---|
| `searchQuery(query, filters?, limit?)` | `search_query` | `SearchHit[]` (snippet, session/project/message refs, scores) |
| `searchIndexStatus()` | `search_index_status` | `{ indexed, total, building, lastBuilt, model }` |
| `searchReindex()` | `search_reindex` | `void` (kicks off background rebuild) |
| `searchSetBackend(cfg)` | `search_set_backend` | `void` (persists provider/model; stores key in keychain) |

All registered in `lib.rs` `generate_handler!`. Args camelCase ↔ snake_case per existing
convention.

## Security

- **API keys** stored only in the OS keychain via `keyring` (Keychain / Credential Manager /
  libsecret). Frontend sends the key once to `search_set_backend`; the embedder reads it from
  the keychain. Keys never persist in the WebView / `localStorage`. (Deliberate exception to
  CLAUDE.md's "settings live in localStorage" — secrets excluded.)
- Cloud backend sends session text to OpenAI **only when explicitly enabled** by the user; the
  default local backend sends nothing off-device.

## Dependencies & footprint

- **Rust:** `fastembed` (local ONNX embeddings — pulls ONNX Runtime, ~tens of MB native lib;
  the main footprint cost), `rusqlite` + `sqlite-vec` (SQLite must be built with **FTS5**),
  `keyring`, `reqwest` (OpenAI backend).
- **Frontend:** none new (see Locked decisions).
- **Capabilities:** none new — backend reads `~/.claude` and writes the index to app-data dir
  directly (Rust FS isn't gated by Tauri capabilities).

## Testing

- JS has no runner (unchanged). Add **Rust unit tests** (`cargo test`) for the two pieces most
  worth locking down: the **chunker** (boundaries, scope filtering, offsets) and the **RRF
  merge** (ordering, ties, single-list fallbacks).

## Impact on existing code / docs

- `session_monitor` gains a subscriber for incremental indexing.
- `SessionView` gains message anchors + highlight-on-navigate.
- `config/navigation.tsx`, `types/api.ts`, `lib.rs`, `commands.rs`, Settings page updated.
- **CLAUDE.md**: document the search index as a rebuildable cache in the app-data dir
  (clarifying the "no internal database" statement — sessions still have a single source of
  truth in `~/.claude`; the index stores no authoritative data).

## Future / out of scope now

- Additional cloud providers (Voyage, Cohere) — trait already supports it.
- Heavier local models (nomic-v2-moe, bge-m3) as opt-in quality upgrades.
- Optional semantic re-ranking pass.
- Bundling the local model into the installer (vs. download-on-first-use).
