export type LLMProvider =
  | "groq"
  | "google"
  | "openai"
  | "anthropic"
  | "openrouter";

export type AgentType =
  | "auto_router"
  | "general_agent"
  | "research_agent"
  | "crm_agent";

export type PlanMode = "managed" | "byok";

export interface WorkspaceSummary {
  workspace_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface WorkspaceCreatePayload {
  workspace_name: string;
  slug: string;
  admin_email: string;
  admin_password: string;
  admin_full_name?: string;
}

export interface WorkspaceCreateResponse {
  workspace_id: string;
  workspace_name: string;
  slug: string;
  admin_user_id: string;
  admin_email: string;
}

export interface AgentConfigPayload {
  workspace_id: string;
  agent_type: string;
  provider: LLMProvider;
  model_name: string;
  api_key?: string | null;
  settings_json?: Record<string, unknown>;
}

export interface AgentConfigResponse {
  agent_config_id: string;
  workspace_id: string;
  agent_type: string;
  provider: string;
  model_name: string;
  has_custom_encrypted_key: boolean;
}

export interface ChatPayload {
  message: string;
  thread_id: string;
  workspace_id: string;
  user_id: string;
  provider: LLMProvider;
  model_name: string;
  encrypted_api_key?: string | null;
}

export interface ChatSyncResponse {
  thread_id: string;
  workspace_id: string;
  routed_agent: string;
  response: string;
}

export interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
  agent?: string;
  timestamp?: string;
}

export interface ThreadHistoryResponse {
  thread_id: string;
  workspace_id: string;
  last_routed_agent?: string | null;
  messages: ThreadMessage[];
}

export type SSEEventPacket =
  | { type: "status"; agent: string }
  | { type: "token"; content: string }
  | { type: "error"; detail: string }
  | { type: "done" };