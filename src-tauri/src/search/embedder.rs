use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};

pub trait Embedder: Send + Sync {
    #[allow(dead_code)]
    fn id(&self) -> String;
    #[allow(dead_code)]
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

use crate::search::types::BackendConfig;

pub struct OpenAiEmbedder {
    api_key: String,
    model: String,
    #[allow(dead_code)]
    dim: usize,
}

impl OpenAiEmbedder {
    pub fn new(api_key: String, model: String) -> Self {
        // text-embedding-3-small = 1536 dims
        Self { api_key, model, dim: 1536 }
    }

    fn call(&self, inputs: Vec<String>) -> Result<Vec<Vec<f32>>, String> {
        let client = reqwest::blocking::Client::new();
        let resp = client
            .post("https://api.openai.com/v1/embeddings")
            .bearer_auth(&self.api_key)
            .json(&serde_json::json!({ "model": self.model, "input": inputs }))
            .send()
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("openai embeddings error: {}", resp.status()));
        }
        let body: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
        let data = body["data"].as_array().ok_or_else(|| "missing data".to_string())?;
        let mut out = Vec::with_capacity(data.len());
        for item in data {
            let v: Vec<f32> = item["embedding"]
                .as_array()
                .ok_or_else(|| "missing embedding".to_string())?
                .iter()
                .map(|x| x.as_f64().unwrap_or(0.0) as f32)
                .collect();
            out.push(v);
        }
        Ok(out)
    }
}

impl Embedder for OpenAiEmbedder {
    fn id(&self) -> String {
        self.model.clone()
    }
    fn dim(&self) -> usize {
        self.dim
    }
    fn embed_documents(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, String> {
        if texts.is_empty() {
            return Ok(vec![]);
        }
        self.call(texts.to_vec())
    }
    fn embed_query(&self, text: &str) -> Result<Vec<f32>, String> {
        Ok(self.call(vec![text.to_string()])?.pop().unwrap_or_default())
    }
}

pub fn build_embedder(cfg: &BackendConfig, api_key: Option<String>) -> Result<Box<dyn Embedder>, String> {
    match cfg.provider.as_str() {
        "openai" => {
            let key = api_key.ok_or_else(|| "OpenAI API key not set".to_string())?;
            Ok(Box::new(OpenAiEmbedder::new(key, cfg.model.clone())))
        }
        _ => Ok(Box::new(LocalEmbedder::new()?)),
    }
}
