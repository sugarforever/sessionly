pub mod chunker;
pub mod embedder;
pub mod index;
pub mod rrf;
pub mod service;
pub mod types;

pub use service::SearchService;
pub use types::{BackendConfig, IndexStatus, IndexTriggers, SearchFilters, SearchHit};
