use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};

pub trait Embedder: Send + Sync {
    fn id(&self) -> String;
    fn dim(&self) -> usize;
    fn embed_documents(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, String>;
    fn embed_query(&self, text: &str) -> Result<Vec<f32>, String>;
}

pub struct LocalEmbedder {
    model: TextEmbedding,
}

impl LocalEmbedder {
    pub fn new() -> Result<Self, String> {
        let model = TextEmbedding::try_new(
            InitOptions::new(EmbeddingModel::MultilingualE5Small).with_show_download_progress(true),
        )
        .map_err(|e| format!("load embedding model: {e}"))?;
        Ok(Self { model })
    }
}

impl Embedder for LocalEmbedder {
    fn id(&self) -> String {
        "multilingual-e5-small".into()
    }
    fn dim(&self) -> usize {
        384
    }

    fn embed_documents(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, String> {
        // e5 prefix rule: documents are "passage: ..."
        let prefixed: Vec<String> = texts.iter().map(|t| format!("passage: {t}")).collect();
        self.model.embed(prefixed, None).map_err(|e| e.to_string())
    }

    fn embed_query(&self, text: &str) -> Result<Vec<f32>, String> {
        let prefixed = vec![format!("query: {text}")];
        let mut v = self.model.embed(prefixed, None).map_err(|e| e.to_string())?;
        Ok(v.pop().unwrap_or_default())
    }
}
