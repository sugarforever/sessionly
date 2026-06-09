use crate::search::chunker::chunk_message;
use crate::search::embedder::{build_embedder, Embedder};
use crate::search::index::{ChunkRow, SearchIndex};
use crate::search::types::{BackendConfig, IndexStatus, IndexTriggers, SearchFilters, SearchHit};
use crate::session_store;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, RwLock};

const KEYRING_SERVICE: &str = "app.sessionly.search";
const MAX_CHARS: usize = 1200;
const INDEX_CONCURRENCY: usize = 5;

pub struct SearchService {
    index: RwLock<Arc<SearchIndex>>,
    embedder: RwLock<Option<Arc<dyn Embedder>>>,
    config: Mutex<BackendConfig>,
    building: AtomicBool,
    indexed: AtomicUsize,
    total: AtomicUsize,
    enabled: AtomicBool,
    cancel: AtomicBool,
    rerun: AtomicBool,
    triggers: Mutex<IndexTriggers>,
    last_error: Mutex<Option<String>>,
}

// OpenAI text-embedding-3-small is the only backend; its vectors are 1536-dim.
const EMBED_DIM: usize = 1536;

impl SearchService {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let db_path = app_data_dir.join("search-index.sqlite");

        // The on-device local model was removed. Reclaim any previously
        // downloaded model files (can be hundreds of MB).
        let _ = std::fs::remove_dir_all(app_data_dir.join("models"));

        let mut config = load_config(&app_data_dir);
        let mut enabled = read_enabled(&app_data_dir);

        // Migrate any saved local-backend config to OpenAI. The old local index
        // held 384-dim vectors, so wipe it, and turn search off until the user
        // supplies an OpenAI key (local search used to work without one).
        if config.provider != "openai" {
            config.provider = "openai".into();
            config.model = "text-embedding-3-small".into();
            save_config(&app_data_dir, &config);
            let _ = std::fs::remove_file(&db_path);
            enabled = false;
            write_enabled(&app_data_dir, false);
        }

        let index = match SearchIndex::open(&db_path, EMBED_DIM) {
            Ok(idx) => idx,
            Err(_) => {
                let _ = std::fs::remove_file(&db_path);
                SearchIndex::open(&db_path, EMBED_DIM).map_err(|e| e.to_string())?
            }
        };
        Ok(Self {
            index: RwLock::new(Arc::new(index)),
            embedder: RwLock::new(None),
            config: Mutex::new(config),
            building: AtomicBool::new(false),
            indexed: AtomicUsize::new(0),
            total: AtomicUsize::new(0),
            enabled: AtomicBool::new(enabled),
            cancel: AtomicBool::new(false),
            rerun: AtomicBool::new(false),
            triggers: Mutex::new(read_triggers(&app_data_dir)),
            last_error: Mutex::new(None),
        })
    }

    fn ensure_embedder(&self) -> Result<Arc<dyn Embedder>, String> {
        if let Some(e) = self.embedder.read().unwrap().clone() {
            return Ok(e);
        }
        let cfg = self.config.lock().unwrap().clone();
        let key = read_key(&cfg);
        let e: Arc<dyn Embedder> = Arc::from(build_embedder(&cfg, key)?);
        *self.embedder.write().unwrap() = Some(e.clone());
        Ok(e)
    }

    pub fn status(&self) -> IndexStatus {
        let idx = self.index.read().unwrap();
        let last_built = idx
            .get_meta("last_built")
            .ok()
            .flatten()
            .and_then(|s| s.parse().ok());
        // One COUNT(DISTINCT) — it locks the same connection the index workers
        // write to, so don't run it twice on the polled status path.
        let indexed = idx.distinct_session_count().unwrap_or(0);
        IndexStatus {
            indexed,
            total: self.total.load(Ordering::Relaxed).max(indexed),
            building: self.building.load(Ordering::Relaxed),
            last_built,
            model: self.config.lock().unwrap().model.clone(),
            enabled: self.is_enabled(),
            error: self.last_error.lock().unwrap().clone(),
        }
    }

    pub fn query(
        &self,
        text: &str,
        filters: &SearchFilters,
        limit: usize,
    ) -> Result<Vec<SearchHit>, String> {
        if !self.enabled.load(Ordering::Relaxed) {
            return Ok(Vec::new());
        }
        let emb = self.ensure_embedder()?;
        let qv = emb.embed_query(text)?;
        self.index
            .read()
            .unwrap()
            .query(text, &qv, filters, limit)
            .map_err(|e| e.to_string())
    }

    pub fn build(&self) -> Result<(), String> {
        if !self.enabled.load(Ordering::Relaxed) {
            return Ok(());
        }
        // Record that a (re)build with the latest config is wanted.
        self.rerun.store(true, Ordering::SeqCst);
        // If a build is already running, ask it to cancel + restart, then let it
        // pick up the rerun. The latest config always wins.
        if self.building.swap(true, Ordering::SeqCst) {
            self.cancel.store(true, Ordering::SeqCst);
            return Ok(());
        }
        let last = loop {
            self.rerun.store(false, Ordering::SeqCst);
            self.cancel.store(false, Ordering::SeqCst);
            *self.last_error.lock().unwrap() = None;
            let result = self.build_inner();
            if let Err(e) = &result {
                *self.last_error.lock().unwrap() = Some(e.clone());
            }
            let now = chrono::Utc::now().timestamp();
            let _ = self
                .index
                .read()
                .unwrap()
                .set_meta("last_built", &now.to_string());

            // Release ownership, then re-check whether a rerun was requested during
            // this pass (avoids a lost-wakeup race).
            self.building.store(false, Ordering::SeqCst);
            if !self.rerun.load(Ordering::SeqCst) {
                break result;
            }
            if self.building.swap(true, Ordering::SeqCst) {
                // Another caller re-acquired the build; it will handle the rerun.
                break result;
            }
        };
        // NOTE: do not clear `cancel` here. Each loop iteration resets it before
        // build_inner, and clearing it on exit could erase a cancel that a new
        // build owner (re-acquired during a rerun handoff) is relying on.
        last
    }

    fn build_inner(&self) -> Result<(), String> {
        // Index every project. There is no index-time scope — the full session
        // corpus is always indexed; callers narrow results with a query-time
        // project filter instead.
        let projects = session_store::list_projects();
        let mut files = Vec::new();
        for p in &projects {
            for f in session_store::list_session_files(p) {
                files.push((p.clone(), f));
            }
        }
        // Recency-first: newest sessions become searchable soonest. Best-effort mtime sort.
        files.sort_by_key(|(_, f)| {
            std::cmp::Reverse(f.metadata().and_then(|m| m.modified()).ok())
        });

        self.total.store(files.len(), Ordering::Relaxed);
        self.indexed.store(0, Ordering::Relaxed);

        // Pre-load the embedder ONCE before fan-out so workers don't all trigger
        // the model download/load concurrently. Abort the build if it fails.
        self.ensure_embedder()?;

        let workers = INDEX_CONCURRENCY.min(
            std::thread::available_parallelism()
                .map(|n| n.get())
                .unwrap_or(1)
                .max(1),
        );

        let this = self;
        let next = AtomicUsize::new(0);
        let files_ref = &files;
        std::thread::scope(|scope| {
            for _ in 0..workers {
                let next = &next;
                scope.spawn(move || loop {
                    if this.cancel.load(Ordering::Relaxed) {
                        break;
                    }
                    let i = next.fetch_add(1, Ordering::Relaxed);
                    if i >= files_ref.len() {
                        break;
                    }
                    let (project_encoded, file) = &files_ref[i];
                    if let Some(session_id) = file.file_stem().and_then(|s| s.to_str()) {
                        if let Err(e) = this.index_one(project_encoded, session_id, file) {
                            *this.last_error.lock().unwrap() = Some(e);
                        }
                    }
                    this.indexed.fetch_add(1, Ordering::Relaxed);
                });
            }
        });

        Ok(())
    }

    pub fn index_one(
        &self,
        project_encoded: &str,
        session_id: &str,
        file: &std::path::Path,
    ) -> Result<(), String> {
        if !self.is_enabled() {
            return Ok(());
        }
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
        let embedder = self.ensure_embedder()?;

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

    /// Whether semantic search is enabled by the user.
    // wired by commands in next task
    #[allow(dead_code)]
    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::Relaxed)
    }

    /// Enable semantic search and persist the setting.
    pub fn enable(&self, app_data_dir: &Path) {
        self.enabled.store(true, Ordering::Relaxed);
        write_enabled(app_data_dir, true);
    }

    /// Signal any in-progress build to stop at the next session boundary.
    pub fn cancel_build(&self) {
        self.cancel.store(true, Ordering::Relaxed);
    }

    /// Current automatic-indexing trigger settings.
    pub fn triggers(&self) -> IndexTriggers {
        *self.triggers.lock().unwrap()
    }

    /// Persist new automatic-indexing trigger settings.
    pub fn set_triggers(&self, triggers: IndexTriggers, app_data_dir: &Path) {
        write_triggers(app_data_dir, &triggers);
        *self.triggers.lock().unwrap() = triggers;
    }

    pub fn config(&self) -> BackendConfig {
        let mut cfg = self.config.lock().unwrap().clone();
        cfg.api_key = None;
        cfg.has_key = key_present(&cfg);
        cfg
    }

    /// Delete the stored OpenAI API key from the OS keychain and turn search
    /// off (without a key there is no embedding backend).
    pub fn delete_api_key(&self, app_data_dir: &Path) -> Result<(), String> {
        // Delete the keychain entry for the OpenAI provider; ignore "no entry".
        if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, "openai") {
            match entry.delete_credential() {
                Ok(()) => {}
                Err(keyring::Error::NoEntry) => {}
                Err(e) => return Err(e.to_string()),
            }
        }
        self.cancel_build();
        self.enabled.store(false, Ordering::Relaxed);
        write_enabled(app_data_dir, false);
        *self.embedder.write().unwrap() = None;
        Ok(())
    }

    pub fn set_backend(
        &self,
        mut cfg: BackendConfig,
        app_data_dir: &std::path::Path,
    ) -> Result<(), String> {
        // OpenAI is the only backend; ignore any other provider value.
        cfg.provider = "openai".into();
        let has_key = cfg.api_key.is_some();
        if let Some(key) = cfg.api_key.take() {
            write_key(&cfg, &key)?;
        }
        // With a key present, auto-enable search (no download needed).
        if has_key || read_key(&cfg).is_some() {
            self.enabled.store(true, Ordering::Relaxed);
            write_enabled(app_data_dir, true);
        }
        save_config(app_data_dir, &cfg);
        // Reset embedder to lazy — will be loaded on next query/build.
        *self.embedder.write().unwrap() = None;
        *self.config.lock().unwrap() = cfg;
        Ok(())
    }
}

fn enabled_path(dir: &Path) -> PathBuf {
    dir.join("search-enabled")
}

fn read_enabled(dir: &Path) -> bool {
    std::fs::read_to_string(enabled_path(dir))
        .map(|s| s.trim() == "1")
        .unwrap_or(false)
}

fn write_enabled(dir: &Path, enabled: bool) {
    let _ = std::fs::write(enabled_path(dir), if enabled { "1" } else { "0" });
}

fn read_triggers(dir: &Path) -> IndexTriggers {
    std::fs::read_to_string(dir.join("search-triggers.json"))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_triggers(dir: &Path, triggers: &IndexTriggers) {
    if let Ok(s) = serde_json::to_string_pretty(triggers) {
        let _ = std::fs::write(dir.join("search-triggers.json"), s);
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
            provider: "openai".into(),
            model: "text-embedding-3-small".into(),
            api_key: None,
            has_key: false,
        })
}

fn save_config(dir: &std::path::Path, cfg: &BackendConfig) {
    if let Ok(s) = serde_json::to_string_pretty(cfg) {
        let _ = std::fs::write(config_path(dir), s);
    }
}

/// Whether the OpenAI API key is stored in the keychain.
fn key_present(cfg: &BackendConfig) -> bool {
    read_key(cfg).is_some()
}

fn read_key(cfg: &BackendConfig) -> Option<String> {
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
