use crate::search::chunker::chunk_message;
use crate::search::embedder::{build_embedder, Embedder};
use crate::search::index::{ChunkRow, SearchIndex};
use crate::search::types::{BackendConfig, IndexStatus, SearchFilters, SearchHit};
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
    db_path: PathBuf,
    models_dir: PathBuf,
    building: AtomicBool,
    indexed: AtomicUsize,
    total: AtomicUsize,
    enabled: AtomicBool,
    cancel: AtomicBool,
    index_scope: Mutex<Option<Vec<String>>>,
    last_error: Mutex<Option<String>>,
}

fn expected_dim(cfg: &BackendConfig) -> usize {
    if cfg.provider == "openai" { 1536 } else { 384 }
}

impl SearchService {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let db_path = app_data_dir.join("search-index.sqlite");
        let models_dir = app_data_dir.join("models");
        let config = load_config(&app_data_dir);
        let enabled = read_enabled(&app_data_dir);
        let dim = expected_dim(&config);
        let index = match SearchIndex::open(&db_path, dim) {
            Ok(idx) => idx,
            Err(_) => {
                let _ = std::fs::remove_file(&db_path);
                SearchIndex::open(&db_path, dim).map_err(|e| e.to_string())?
            }
        };
        Ok(Self {
            index: RwLock::new(Arc::new(index)),
            embedder: RwLock::new(None),
            config: Mutex::new(config),
            db_path,
            models_dir,
            building: AtomicBool::new(false),
            indexed: AtomicUsize::new(0),
            total: AtomicUsize::new(0),
            enabled: AtomicBool::new(enabled),
            cancel: AtomicBool::new(false),
            index_scope: Mutex::new(read_scope(&app_data_dir)),
            last_error: Mutex::new(None),
        })
    }

    fn ensure_embedder(&self) -> Result<Arc<dyn Embedder>, String> {
        if let Some(e) = self.embedder.read().unwrap().clone() {
            return Ok(e);
        }
        let cfg = self.config.lock().unwrap().clone();
        let key = read_key(&cfg);
        let e: Arc<dyn Embedder> =
            Arc::from(build_embedder(&cfg, key, self.models_dir.clone())?);
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
        IndexStatus {
            indexed: idx.distinct_session_count().unwrap_or(0),
            total: self
                .total
                .load(Ordering::Relaxed)
                .max(idx.distinct_session_count().unwrap_or(0)),
            building: self.building.load(Ordering::Relaxed),
            last_built,
            model: self.config.lock().unwrap().model.clone(),
            enabled: self.is_enabled(),
            model_present: self.model_present(),
            model_size_bytes: self.model_size_bytes(),
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
        if self.building.swap(true, Ordering::SeqCst) {
            return Ok(());
        }
        *self.last_error.lock().unwrap() = None;
        let result = self.build_inner();
        self.building.store(false, Ordering::SeqCst);
        self.cancel.store(false, Ordering::SeqCst);
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
        let scope = self.index_scope.lock().unwrap().clone();
        let mut files = Vec::new();
        for p in &projects {
            if let Some(sel) = &scope {
                if !sel.iter().any(|s| s == p) {
                    continue;
                }
            }
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

    /// Returns true if the local model directory exists and contains at least one file.
    // wired by commands in next task
    #[allow(dead_code)]
    pub fn model_present(&self) -> bool {
        if !self.models_dir.exists() {
            return false;
        }
        std::fs::read_dir(&self.models_dir)
            .map(|mut d| d.next().is_some())
            .unwrap_or(false)
    }

    /// Recursively sum file sizes under the models directory (returns 0 if absent).
    // wired by commands in next task
    #[allow(dead_code)]
    pub fn model_size_bytes(&self) -> u64 {
        dir_size(&self.models_dir)
    }

    /// Cancel any in-flight build, disable search, reset the embedder, and delete model files.
    pub fn delete_model(&self, app_data_dir: &Path) -> Result<(), String> {
        self.cancel_build();
        self.enabled.store(false, Ordering::Relaxed);
        write_enabled(app_data_dir, false);
        *self.embedder.write().unwrap() = None;
        let _ = std::fs::remove_dir_all(&self.models_dir);
        Ok(())
    }

    pub fn get_scope(&self) -> Option<Vec<String>> {
        self.index_scope.lock().unwrap().clone()
    }

    pub fn set_scope(
        &self,
        projects: Option<Vec<String>>,
        app_data_dir: &Path,
    ) -> Result<(), String> {
        write_scope(app_data_dir, &projects);
        *self.index_scope.lock().unwrap() = projects.clone();
        // Drop any indexed sessions now outside the scope.
        if let Some(scope) = &projects {
            self.index
                .read()
                .unwrap()
                .retain_projects(scope)
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn config(&self) -> BackendConfig {
        let mut cfg = self.config.lock().unwrap().clone();
        cfg.api_key = None;
        cfg.has_key = key_present(&cfg);
        cfg
    }

    /// Delete the stored OpenAI API key from the OS keychain. If the active
    /// provider was OpenAI, revert to the local backend so search stays usable.
    pub fn delete_api_key(&self, app_data_dir: &Path) -> Result<(), String> {
        // Delete the keychain entry for the OpenAI provider; ignore "no entry".
        if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, "openai") {
            match entry.delete_credential() {
                Ok(()) => {}
                Err(keyring::Error::NoEntry) => {}
                Err(e) => return Err(e.to_string()),
            }
        }
        let provider = self.config.lock().unwrap().provider.clone();
        if provider == "openai" {
            self.set_backend(
                BackendConfig {
                    provider: "local".into(),
                    model: "multilingual-e5-small".into(),
                    api_key: None,
                    has_key: false,
                },
                app_data_dir,
            )?;
        }
        Ok(())
    }

    pub fn set_backend(
        &self,
        mut cfg: BackendConfig,
        app_data_dir: &std::path::Path,
    ) -> Result<(), String> {
        let has_key = cfg.api_key.is_some();
        if let Some(key) = cfg.api_key.take() {
            write_key(&cfg, &key)?;
        }
        // When switching to OpenAI with a key present, auto-enable (no local download needed).
        if cfg.provider == "openai" && (has_key || read_key(&cfg).is_some()) {
            self.enabled.store(true, Ordering::Relaxed);
            write_enabled(app_data_dir, true);
        }
        save_config(app_data_dir, &cfg);
        let new_dim = expected_dim(&cfg);
        let old_dim = self.index.read().unwrap().dim();
        // NOTE: a backend switch does not pause an in-flight background build();
        // Task 12 re-triggers build() after switching, so the new index is fully
        // repopulated. Source of truth is ~/.claude, so no data can be lost here.
        if new_dim != old_dim {
            let _ = std::fs::remove_file(&self.db_path);
            let new_index =
                SearchIndex::open(&self.db_path, new_dim).map_err(|e| e.to_string())?;
            *self.index.write().unwrap() = Arc::new(new_index);
        }
        // Reset embedder to lazy — will be loaded on next query/build
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

fn read_scope(dir: &Path) -> Option<Vec<String>> {
    std::fs::read_to_string(dir.join("search-scope.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<Option<Vec<String>>>(&s).ok())
        .flatten()
}

fn write_scope(dir: &Path, scope: &Option<Vec<String>>) {
    if let Ok(s) = serde_json::to_string(scope) {
        let _ = std::fs::write(dir.join("search-scope.json"), s);
    }
}

fn dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let child = entry.path();
            if child.is_dir() {
                total += dir_size(&child);
            } else if let Ok(meta) = child.metadata() {
                total += meta.len();
            }
        }
    }
    total
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
            has_key: false,
        })
}

fn save_config(dir: &std::path::Path, cfg: &BackendConfig) {
    if let Ok(s) = serde_json::to_string_pretty(cfg) {
        let _ = std::fs::write(config_path(dir), s);
    }
}

/// Whether a non-local provider has an API key stored in the keychain.
fn key_present(cfg: &BackendConfig) -> bool {
    read_key(cfg).is_some()
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
