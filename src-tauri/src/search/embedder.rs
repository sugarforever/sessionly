use crate::search::types::BackendConfig;

pub trait Embedder: Send + Sync {
    #[allow(dead_code)]
    fn id(&self) -> String;
    #[allow(dead_code)]
    fn dim(&self) -> usize;
    fn embed_documents(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, String>;
    fn embed_query(&self, text: &str) -> Result<Vec<f32>, String>;
}

pub struct OpenAiEmbedder {
    api_key: String,
    model: String,
    client: reqwest::blocking::Client,
    #[allow(dead_code)]
    dim: usize,
}

impl OpenAiEmbedder {
    pub fn new(api_key: String, model: String) -> Result<Self, String> {
        // Build the HTTP client once and reuse it across batches so TLS setup
        // and the connection pool are not rebuilt on every request.
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(60))
            .build()
            .map_err(|e| e.to_string())?;
        // text-embedding-3-small = 1536 dims
        Ok(Self { api_key, model, client, dim: 1536 })
    }

    fn call(&self, inputs: Vec<String>) -> Result<Vec<Vec<f32>>, String> {
        let resp = self
            .client
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
        let mut out = Vec::with_capacity(texts.len());
        for batch in texts.chunks(128) {
            out.extend(self.call(batch.to_vec())?);
        }
        Ok(out)
    }
    fn embed_query(&self, text: &str) -> Result<Vec<f32>, String> {
        // Don't fall back to an empty vector — a 0-dim query would be handed to
        // the vec MATCH and fail obscurely. Surface the real problem instead.
        self.call(vec![text.to_string()])?
            .pop()
            .ok_or_else(|| "openai returned no embedding for query".to_string())
    }
}

pub fn build_embedder(
    cfg: &BackendConfig,
    api_key: Option<String>,
) -> Result<Box<dyn Embedder>, String> {
    // OpenAI is the only embedding backend. The local on-device model was
    // removed; any other provider value is treated as an unconfigured backend.
    let key = api_key.ok_or_else(|| "OpenAI API key not set".to_string())?;
    Ok(Box::new(OpenAiEmbedder::new(key, cfg.model.clone())?))
}
