use std::collections::HashMap;

/// Reciprocal Rank Fusion. Each list is ids in rank order (best first).
/// Returns ids sorted by fused score desc. `k` ~ 60.
pub fn rrf_merge(lists: &[Vec<String>], k: f64) -> Vec<(String, f64)> {
    let mut scores: HashMap<String, f64> = HashMap::new();
    for list in lists {
        for (rank, id) in list.iter().enumerate() {
            *scores.entry(id.clone()).or_insert(0.0) += 1.0 / (k + (rank as f64) + 1.0);
        }
    }
    let mut out: Vec<(String, f64)> = scores.into_iter().collect();
    out.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fuses_two_ranked_lists() {
        let keyword = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        let semantic = vec!["b".to_string(), "d".to_string(), "a".to_string()];
        let merged = rrf_merge(&[keyword, semantic], 60.0);
        let ids: Vec<&str> = merged.iter().map(|(id, _)| id.as_str()).collect();
        // b: rank 1 in keyword + rank 0 in semantic → highest fused score
        // a: rank 0 in keyword + rank 2 in semantic → second highest
        assert_eq!(ids[0], "b");
        assert_eq!(ids[1], "a");
        assert!(ids.contains(&"c") && ids.contains(&"d"));
    }

    #[test]
    fn single_list_preserves_order() {
        let merged = rrf_merge(&[vec!["x".into(), "y".into()]], 60.0);
        let ids: Vec<&str> = merged.iter().map(|(id, _)| id.as_str()).collect();
        assert_eq!(ids, vec!["x", "y"]);
    }
}
