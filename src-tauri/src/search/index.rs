use rusqlite::{Connection, OptionalExtension};
use std::path::Path;
use std::sync::Mutex;

pub struct SearchIndex {
    conn: Mutex<Connection>,
    dim: usize,
}

/// Register the sqlite-vec extension so all subsequently opened connections
/// get the `vec0` virtual-table module.  Safe to call multiple times —
/// SQLite deduplicates identical function pointers.
fn register_vec_extension() {
    unsafe {
        rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
            sqlite_vec::sqlite3_vec_init as *const (),
        )));
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
}
