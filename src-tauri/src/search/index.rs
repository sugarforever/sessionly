use crate::search::rrf::rrf_merge;
use crate::search::types::{SearchFilters, SearchHit};
use rusqlite::{Connection, OptionalExtension};
use std::path::Path;
use std::sync::Mutex;

pub struct ChunkRow {
    pub session_id: String,
    pub project_encoded: String,
    pub project: String,
    pub session_title: String,
    pub message_uuid: String,
    pub role: String,
    pub start_time: Option<i64>,
    pub text: String,
    pub embedding: Vec<f32>,
}

fn vec_bytes(v: &[f32]) -> Vec<u8> {
    // little-endian f32 bytes, as sqlite-vec expects
    let mut out = Vec::with_capacity(v.len() * 4);
    for f in v {
        out.extend_from_slice(&f.to_le_bytes());
    }
    out
}

/// Delete a session's rows from chunks + the FTS and vector shadow tables.
/// Operates on a caller-supplied connection/transaction so the caller controls
/// atomicity (the FTS 'delete' command must read each row's text before the
/// `chunks` row is removed, so order matters).
fn delete_session_rows(conn: &rusqlite::Connection, session_id: &str) -> rusqlite::Result<()> {
    let ids: Vec<i64> = {
        let mut stmt = conn.prepare("SELECT id FROM chunks WHERE session_id = ?1")?;
        let ids = stmt
            .query_map([session_id], |r| r.get::<_, i64>(0))?
            .filter_map(Result::ok)
            .collect();
        ids
    };
    for id in &ids {
        conn.execute(
            "INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', ?1, (SELECT text FROM chunks WHERE id = ?1))",
            [id],
        )?;
        conn.execute("DELETE FROM vec_chunks WHERE chunk_id = ?1", [id])?;
    }
    conn.execute("DELETE FROM chunks WHERE session_id = ?1", [session_id])?;
    conn.execute("DELETE FROM session_hash WHERE session_id = ?1", [session_id])?;
    Ok(())
}

pub struct SearchIndex {
    conn: Mutex<Connection>,
    #[allow(dead_code)] // reserved for dimension-change detection
    dim: usize,
}

/// Register the sqlite-vec extension so all subsequently opened connections
/// get the `vec0` virtual-table module.  Safe to call multiple times —
/// SQLite deduplicates identical function pointers.
fn register_vec_extension() {
    unsafe {
        rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute::<
            *const (),
            unsafe extern "C" fn(
                *mut rusqlite::ffi::sqlite3,
                *mut *mut std::os::raw::c_char,
                *const rusqlite::ffi::sqlite3_api_routines,
            ) -> std::os::raw::c_int,
        >(sqlite_vec::sqlite3_vec_init as *const ())));
    }
}

fn migrate(conn: &Connection, dim: usize) -> rusqlite::Result<()> {
    conn.execute_batch(&format!(
        "
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY,
            session_id TEXT NOT NULL,
            project_encoded TEXT NOT NULL,
            project TEXT NOT NULL,
            session_title TEXT NOT NULL,
            message_uuid TEXT NOT NULL,
            role TEXT NOT NULL,
            start_time INTEGER,
            text TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_chunks_session ON chunks(session_id);
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
            text, content='chunks', content_rowid='id', tokenize='trigram'
        );
        CREATE TABLE IF NOT EXISTS session_hash (
            session_id TEXT PRIMARY KEY,
            hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
            chunk_id INTEGER PRIMARY KEY, embedding float[{dim}]
        );
        "
    ))?;
    Ok(())
}

impl SearchIndex {
    pub fn open(db_path: &Path, dim: usize) -> rusqlite::Result<Self> {
        // Must register before opening so the auto-extension fires on `open`.
        register_vec_extension();
        let conn = Connection::open(db_path)?;
        migrate(&conn, dim)?;
        Ok(Self {
            conn: Mutex::new(conn),
            dim,
        })
    }

    #[cfg(test)]
    pub fn open_in_memory(dim: usize) -> rusqlite::Result<Self> {
        // Must register before opening so the auto-extension fires on `open_in_memory`.
        register_vec_extension();
        let conn = Connection::open_in_memory()?;
        migrate(&conn, dim)?;
        Ok(Self {
            conn: Mutex::new(conn),
            dim,
        })
    }

    #[allow(dead_code)] // reserved for backend-switch flows
    pub fn dim(&self) -> usize {
        self.dim
    }

    pub fn session_hash(&self, session_id: &str) -> rusqlite::Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT hash FROM session_hash WHERE session_id = ?1",
            [session_id],
            |r| r.get::<_, String>(0),
        )
        .optional()
    }

    pub fn set_session_hash(&self, session_id: &str, hash: &str) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO session_hash(session_id, hash) VALUES(?1, ?2)
             ON CONFLICT(session_id) DO UPDATE SET hash = excluded.hash",
            [session_id, hash],
        )?;
        Ok(())
    }

    #[cfg(test)]
    pub fn delete_session(&self, session_id: &str) -> rusqlite::Result<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        delete_session_rows(&tx, session_id)?;
        tx.commit()
    }

    pub fn replace_session(&self, session_id: &str, rows: &[ChunkRow]) -> rusqlite::Result<()> {
        // Delete + re-insert in a single transaction so a concurrent reader
        // (other index workers, the live hook path) never observes the session
        // half-deleted, and a failure mid-way can't leave the chunks/FTS/vec
        // tables inconsistent.
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        delete_session_rows(&tx, session_id)?;
        for row in rows {
            tx.execute(
                "INSERT INTO chunks(session_id, project_encoded, project, session_title, message_uuid, role, start_time, text)
                 VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
                rusqlite::params![row.session_id, row.project_encoded, row.project, row.session_title, row.message_uuid, row.role, row.start_time, row.text],
            )?;
            let id = tx.last_insert_rowid();
            tx.execute("INSERT INTO chunks_fts(rowid, text) VALUES(?1, ?2)", rusqlite::params![id, row.text])?;
            tx.execute("INSERT INTO vec_chunks(chunk_id, embedding) VALUES(?1, ?2)", rusqlite::params![id, vec_bytes(&row.embedding)])?;
        }
        tx.commit()?;
        Ok(())
    }

    #[allow(dead_code)] // reserved for backend-switch flows
    pub fn chunk_count(&self) -> rusqlite::Result<usize> {
        let conn = self.conn.lock().unwrap();
        let n: i64 = conn.query_row("SELECT COUNT(*) FROM chunks", [], |r| r.get(0))?;
        Ok(n as usize)
    }

    pub fn distinct_session_count(&self) -> rusqlite::Result<usize> {
        let conn = self.conn.lock().unwrap();
        let n: i64 = conn.query_row("SELECT COUNT(DISTINCT session_id) FROM chunks", [], |r| r.get(0))?;
        Ok(n as usize)
    }

    pub fn set_meta(&self, key: &str, value: &str) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO meta(key, value) VALUES(?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [key, value],
        )?;
        Ok(())
    }

    pub fn get_meta(&self, key: &str) -> rusqlite::Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT value FROM meta WHERE key = ?1", [key], |r| r.get::<_, String>(0)).optional()
    }

    /// Wipe everything (used when the embedding model/dimension changes).
    #[allow(dead_code)] // reserved for backend-switch flows
    pub fn clear_all(&self) -> rusqlite::Result<()> {
        let conn = self.conn.lock().unwrap();
        // Delete content rows first, then rebuild the FTS index from the now-empty
        // content table. The 'delete-all' command is not available in all SQLite
        // builds; 'rebuild' is universal and safe to call on an empty source table.
        conn.execute_batch(
            "DELETE FROM chunks; INSERT INTO chunks_fts(chunks_fts) VALUES('rebuild');
             DELETE FROM vec_chunks; DELETE FROM session_hash;",
        )?;
        Ok(())
    }

    pub fn query(
        &self,
        query_text: &str,
        query_vec: &[f32],
        filters: &SearchFilters,
        limit: usize,
    ) -> rusqlite::Result<Vec<SearchHit>> {
        let conn = self.conn.lock().unwrap();
        let k = 50usize;

        let mut kw_ids: Vec<String> = Vec::new();
        if !query_text.trim().is_empty() {
            let mut stmt = conn.prepare(
                "SELECT c.id FROM chunks_fts f JOIN chunks c ON c.id = f.rowid
                 WHERE chunks_fts MATCH ?1 ORDER BY bm25(chunks_fts) LIMIT ?2",
            )?;
            let fts_query = format!("\"{}\"", query_text.replace('"', " "));
            kw_ids = stmt
                .query_map(rusqlite::params![fts_query, k as i64], |r| r.get::<_, i64>(0))?
                .filter_map(Result::ok)
                .map(|id| id.to_string())
                .collect();
        }

        let mut stmt = conn.prepare(
            "SELECT chunk_id FROM vec_chunks WHERE embedding MATCH ?1 AND k = ?2 ORDER BY distance",
        )?;
        let vec_ids: Vec<String> = stmt
            .query_map(rusqlite::params![vec_bytes(query_vec), k as i64], |r| r.get::<_, i64>(0))?
            .filter_map(Result::ok)
            .map(|id| id.to_string())
            .collect();

        let fused = rrf_merge(&[kw_ids, vec_ids], 60.0);

        let mut hits = Vec::new();
        for (id_str, score) in fused.into_iter() {
            let id: i64 = id_str.parse().unwrap_or(-1);
            let row = conn
                .query_row(
                    "SELECT session_id, project_encoded, project, session_title, message_uuid, role, text, start_time
                     FROM chunks WHERE id = ?1",
                    [id],
                    |r| Ok((
                        r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?,
                        r.get::<_, String>(3)?, r.get::<_, String>(4)?, r.get::<_, String>(5)?,
                        r.get::<_, String>(6)?, r.get::<_, Option<i64>>(7)?,
                    )),
                )
                .optional()?;
            let Some((session_id, project_encoded, project, session_title, message_uuid, role, text, start_time)) = row else { continue };

            if let Some(p) = &filters.project_encoded { if &project_encoded != p { continue } }
            if let Some(rl) = &filters.role { if &role != rl { continue } }
            if let Some(since) = filters.since { if start_time.is_none_or(|t| t < since) { continue } }
            if let Some(until) = filters.until { if start_time.is_none_or(|t| t > until) { continue } }

            hits.push(SearchHit {
                session_id, project_encoded, project, session_title, message_uuid, role,
                snippet: make_snippet(&text, query_text),
                score,
            });
            if hits.len() >= limit { break }
        }
        Ok(hits)
    }
}

/// Window the text around the first query-term hit; fall back to a prefix.
fn make_snippet(text: &str, query: &str) -> String {
    const W: usize = 160;
    let lower = text.to_lowercase();
    let term = query.split_whitespace().next().unwrap_or("").to_lowercase();
    let pos = if term.is_empty() { None } else { lower.find(&term) };
    let chars: Vec<char> = text.chars().collect();
    let center = pos.map(|byte| lower[..byte].chars().count()).unwrap_or(0);
    let start = center.saturating_sub(W / 2);
    let end = (start + W).min(chars.len());
    let mut s: String = chars[start..end].iter().collect();
    if start > 0 { s = format!("…{s}") }
    if end < chars.len() { s = format!("{s}…") }
    s.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opens_migrates_and_tracks_hashes() {
        let idx = SearchIndex::open_in_memory(384).unwrap();
        assert_eq!(idx.session_hash("s1").unwrap(), None);
        idx.set_session_hash("s1", "deadbeef").unwrap();
        assert_eq!(
            idx.session_hash("s1").unwrap(),
            Some("deadbeef".to_string())
        );
    }

    #[test]
    fn upserts_and_replaces_session_chunks() {
        let idx = SearchIndex::open_in_memory(3).unwrap();
        let rows = vec![ChunkRow {
            session_id: "s1".into(), project_encoded: "p".into(), project: "proj".into(),
            session_title: "t".into(), message_uuid: "m1".into(), role: "user".into(),
            start_time: Some(1), text: "redirect loop".into(), embedding: vec![0.1, 0.2, 0.3],
        }];
        idx.replace_session("s1", &rows).unwrap();
        assert_eq!(idx.chunk_count().unwrap(), 1);
        // replacing again should not duplicate
        idx.replace_session("s1", &rows).unwrap();
        assert_eq!(idx.chunk_count().unwrap(), 1);
        idx.delete_session("s1").unwrap();
        assert_eq!(idx.chunk_count().unwrap(), 0);
    }

    #[test]
    fn make_snippet_handles_multibyte_lowercase_without_panic() {
        // 'İ' (U+0130) lowercases to 2 bytes longer; a naive text[..byte] slice would panic.
        let text = "İé redirect here";
        let s = make_snippet(text, "redirect");
        assert!(s.to_lowercase().contains("redirect"));
    }

    #[test]
    fn clear_all_empties_the_index() {
        let idx = SearchIndex::open_in_memory(3).unwrap();
        let rows = vec![ChunkRow {
            session_id: "s1".into(), project_encoded: "p".into(), project: "proj".into(),
            session_title: "t".into(), message_uuid: "m1".into(), role: "user".into(),
            start_time: Some(1), text: "hello redirect".into(), embedding: vec![0.1,0.2,0.3],
        }];
        idx.replace_session("s1", &rows).unwrap();
        idx.set_meta("model", "e5").unwrap();
        assert_eq!(idx.get_meta("model").unwrap(), Some("e5".to_string()));
        idx.clear_all().unwrap();
        assert_eq!(idx.chunk_count().unwrap(), 0);
        assert_eq!(idx.distinct_session_count().unwrap(), 0);
        // a query after clear should not error and should be empty
        let hits = idx.query("redirect", &[0.1_f32,0.2,0.3], &Default::default(), 10).unwrap();
        assert!(hits.is_empty());
    }

    #[test]
    fn hybrid_query_returns_keyword_hit() {
        let idx = SearchIndex::open_in_memory(3).unwrap();
        let rows = vec![
            ChunkRow { session_id: "s1".into(), project_encoded: "p".into(), project: "proj".into(),
                session_title: "login".into(), message_uuid: "m1".into(), role: "user".into(),
                start_time: Some(1), text: "the redirect loop in auth".into(), embedding: vec![1.0,0.0,0.0] },
            ChunkRow { session_id: "s2".into(), project_encoded: "p".into(), project: "proj".into(),
                session_title: "misc".into(), message_uuid: "m2".into(), role: "user".into(),
                start_time: Some(1), text: "unrelated content here".into(), embedding: vec![0.0,1.0,0.0] },
        ];
        idx.replace_session("s1", &rows[0..1]).unwrap();
        idx.replace_session("s2", &rows[1..2]).unwrap();
        let hits = idx.query("redirect", &[0.9_f32,0.1,0.0], &Default::default(), 10).unwrap();
        assert!(!hits.is_empty());
        assert_eq!(hits[0].session_id, "s1");
        assert!(hits[0].snippet.to_lowercase().contains("redirect"));
    }
}
