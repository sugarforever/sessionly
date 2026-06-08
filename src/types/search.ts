export interface SearchHit {
  sessionId: string
  projectEncoded: string
  project: string
  sessionTitle: string
  messageUuid: string
  role: string
  snippet: string
  score: number
}

export interface SearchFilters {
  projectEncoded?: string
  role?: string
  since?: number
  until?: number
}

export interface IndexStatus {
  indexed: number
  total: number
  building: boolean
  lastBuilt: number | null
  model: string
}

export interface BackendConfig {
  provider: 'local' | 'openai'
  model: string
  apiKey?: string
}
