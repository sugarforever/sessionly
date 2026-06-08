use crate::search::chunker::chunk_message;
use crate::search::embedder::{build_embedder, Embedder};
use crate::search::index::{ChunkRow, SearchIndex};
use crate::search::types::{BackendConfig, IndexStatus, SearchFilters, SearchHit};
use crate::session_store;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, RwLock};

const KEYRING_SERVICE: &str = "app.sessionly.search";
const MAX_CHARS: usize = 1200;

pub struct SearchService {
    index: RwLock<Arc<SearchIndex>>,
    embedder: RwLock<Arc<dyn Embedder>>,
    config: Mutex<BackendConfig>,
    db_path: PathBuf,
    building: AtomicBool,
    indexed: AtomicUsize,
    total: AtomicUsize,
}

impl SearchService {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let db_path = app_data_dir.join("search-index.sqlite");
        let config = load_config(&app_data_dir);
        let api_key = read_key(&config);
        let embedder = build_embedder(&config, api_key)?;
        let index = SearchIndex::open(&db_path, embedder.dim()).map_err(|e| e.to_string())?;
        Ok(Self {
            index: RwLock::new(Arc::new(index)),
            embedder: RwLock::new(Arc::from(embedder)),
            config: Mutex::new(config),
            db_path,
            building: AtomicBool::new(false),
            indexed: AtomicUsize::new(0),
            total: AtomicUsize::new(0),
        })
    }

    pub fn status(&self) -> IndexStatus {
        let idx = self.index.read().unwrap();
        let last_built = idx
            .get_meta("last_built")
            .ok()
            .flatten()
            .and_then(|s| s.parse().ok());
        IndexStatus {
            indexed: idx.distinct_session_count().unwrap_or(0),
            total: self
                .total
                .load(Ordering::Relaxed)
                .max(idx.distinct_session_count().unwrap_or(0)),
            building: self.building.load(Ordering::Relaxed),
            last_built,
            model: self.embedder.read().unwrap().id(),
        }
    }

    pub fn query(
        &self,
        text: &str,
        filters: &SearchFilters,
        limit: usize,
    ) -> Result<Vec<SearchHit>, String> {
        let qv = self.embedder.read().unwrap().embed_query(text)?;
        self.index
            .read()
            .unwrap()
            .query(text, &qv, filters, limit)
            .map_err(|e| e.to_string())
    }

    pub fn build(&self) -> Result<(), String> {
        if self.building.swap(true, Ordering::SeqCst) {
            return Ok(());
        }
        let result = self.build_inner();
        self.building.store(false, Ordering::SeqCst);
        let now = chrono::Utc::now().timestamp();
        let _ = self
            .index
            .read()
            .unwrap()
            .set_meta("last_built", &now.to_string());
        result
    }

    fn build_inner(&self) -> Result<(), String> {
        let projects = session_store::list_projects();
        let mut files = Vec::new();
        for p in &projects {
            for f in session_store::list_session_files(p) {
                files.push((p.clone(), f));
            }
        }
        self.total.store(files.len(), Ordering::Relaxed);
        self.indexed.store(0, Ordering::Relaxed);
        for (project_encoded, file) in files {
            if let Some(session_id) = file.file_stem().and_then(|s| s.to_str()) {
                let _ = self.index_one(&project_encoded, session_id, &file);
            }
            self.indexed.fetch_add(1, Ordering::Relaxed);
        }
        Ok(())
    }

    pub fn index_one(
        &self,
        project_encoded: &str,
        session_id: &str,
        file: &std::path::Path,
    ) -> Result<(), String> {
        let Some((session, _)) = session_store::parse_session_file(file) else {
            return Ok(());
        };
        let hash = hash_session(&session);
        let idx = self.index.read().unwrap();
        if idx
            .session_hash(session_id)
            .ok()
            .flatten()
            .as_deref()
            == Some(hash.as_str())
        {
            return Ok(());
        }
        let title = session
            .messages
            .first()
            .map(|m| truncate(&m.text_content, 80))
            .unwrap_or_default();
        let embedder = self.embedder.read().unwrap();

        let mut texts = Vec::new();
        let mut metas = Vec::new();
        for msg in &session.messages {
            for c in chunk_message(msg, MAX_CHARS) {
                texts.push(c.text.clone());
                metas.push((c.message_uuid, c.role));
            }
        }
        let embeddings = if texts.is_empty() {
            vec![]
        } else {
            embedder.embed_documents(&texts)?
        };

        if embeddings.len() != texts.len() {
            return Err(format!(
                "embedder returned {} embeddings for {} chunks",
                embeddings.len(),
                texts.len()
            ));
        }

        let rows: Vec<ChunkRow> = texts
            .into_iter()
            .zip(metas)
            .zip(embeddings)
            .map(|((text, (uuid, role)), emb)| ChunkRow {
                session_id: session_id.to_string(),
                project_encoded: project_encoded.to_string(),
                project: session.project.clone(),
                session_title: title.clone(),
                message_uuid: uuid,
                role,
                start_time: session.start_time,
                text,
                embedding: emb,
            })
            .collect();

        idx.replace_session(session_id, &rows)
            .map_err(|e| e.to_string())?;
        idx.set_session_hash(session_id, &hash)
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn config(&self) -> BackendConfig {
        self.config.lock().unwrap().clone()
    }

    pub fn set_backend(
        &self,
        mut cfg: BackendConfig,
        app_data_dir: &std::path::Path,
    ) -> Result<(), String> {
        if let Some(key) = cfg.api_key.take() {
            write_key(&cfg, &key)?;
        }
        save_config(app_data_dir, &cfg);
        let api_key = read_key(&cfg);
        let new_embedder = build_embedder(&cfg, api_key)?;
        let new_dim = new_embedder.dim();
        let old_dim = self.embedder.read().unwrap().dim();
        // NOTE: a backend switch does not pause an in-flight background build();
        // Task 12 re-triggers build() after switching, so the new index is fully
        // repopulated. Source of truth is ~/.claude, so no data can be lost here.
        if new_dim != old_dim {
            let _ = std::fs::remove_file(&self.db_path);
            let new_index =
                SearchIndex::open(&self.db_path, new_dim).map_err(|e| e.to_string())?;
            *self.index.write().unwrap() = Arc::new(new_index);
        }
        *self.embedder.write().unwrap() = Arc::from(new_embedder);
        *self.config.lock().unwrap() = cfg;
        Ok(())
    }
}

fn truncate(s: &str, n: usize) -> String {
    let t: String = s.chars().take(n).collect();
    t.replace('\n', " ").trim().to_string()
}

fn hash_session(session: &crate::session_types::Session) -> String {
    let mut h = Sha256::new();
    h.update(session.messages.len().to_le_bytes());
    if let Some(t) = session.end_time {
        h.update(t.to_le_bytes());
    }
    for m in &session.messages {
        h.update(m.uuid.as_bytes());
    }
    format!("{:x}", h.finalize())
}

fn config_path(dir: &std::path::Path) -> PathBuf {
    dir.join("search-config.json")
}

fn load_config(dir: &std::path::Path) -> BackendConfig {
    std::fs::read_to_string(config_path(dir))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(BackendConfig {
            provider: "local".into(),
            model: "multilingual-e5-small".into(),
            api_key: None,
        })
}

fn save_config(dir: &std::path::Path, cfg: &BackendConfig) {
    if let Ok(s) = serde_json::to_string_pretty(cfg) {
        let _ = std::fs::write(config_path(dir), s);
    }
}

fn read_key(cfg: &BackendConfig) -> Option<String> {
    if cfg.provider == "local" {
        return None;
    }
    keyring::Entry::new(KEYRING_SERVICE, &cfg.provider)
        .ok()?
        .get_password()
        .ok()
}

fn write_key(cfg: &BackendConfig, key: &str) -> Result<(), String> {
    keyring::Entry::new(KEYRING_SERVICE, &cfg.provider)
        .map_err(|e| e.to_string())?
        .set_password(key)
        .map_err(|e| e.to_string())
}
