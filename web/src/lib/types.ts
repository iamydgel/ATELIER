export interface User {
  id: number
  email: string
  role: 'admin' | 'user' | 'viewer'
  is_active: boolean
  quota_tokens_day: number | null
}

export interface Session {
  id: string
  user_id: number
  created_at: number
  expires_at: number
  ip: string | null
  user_agent: string | null
}

export interface Conversation {
  id: string
  user_id: number
  title: string
  model_id: string
  system_prompt: string | null
  parent_id: string | null
  created_at: number
  updated_at: number
  archived_at: number | null
}

export interface Message {
  id: string
  conversation_id: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  attachments: string
  tokens_in: number
  tokens_out: number
  latency_ms: number
  created_at: number
}

export interface Model {
  id: string
  family: string
  version: string
  quant: string
  modality: string
  license: string
  source_url: string
  size_bytes: number
  sha256: string | null
  requires_vram_gb: number | null
  // UI helper status
  installed_status?: 'not_installed' | 'installed' | 'loaded' | 'installing'
}

export interface InstalledModel {
  model_id: string
  path: string
  installed_at: number
  loaded_at: number | null
  device: string | null
}

export interface AuditLog {
  id: number
  ts: number
  actor_user_id_hash: string | null
  action: string
  target_type: string | null
  target_id: string | null
  ip: string | null
  meta: string
}
