import type { ChatPayload, LLMProvider } from "@/types/saas";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface HealthCheckResponse {
  status: string;
  project: string;
  version: string;
}

export interface ChatResponse {
  response: string;
  thread_id: string;
  workspace_id: string;
  active_agent?: string;
  provider?: LLMProvider | string;
  model_name?: string;
}

export interface ThreadHistoryMessage {
  role: "user" | "assistant";
  content: string;
  agent?: string;
  timestamp?: string;
}

export interface ThreadHistoryResponse {
  workspace_id: string;
  thread_id: string;
  last_routed_agent?: string | null;
  messages: ThreadHistoryMessage[];
}

export interface DeleteThreadResponse {
  status: string;
  workspace_id: string;
  thread_id: string;
  composite_thread_id: string;
  deleted_counts: {
    checkpoints: number;
    checkpoint_blobs: number;
    checkpoint_writes: number;
  };
}

export interface WorkspaceSummary {
  id: string;
  workspace_id: string;
  name: string;
  workspace_name?: string;
  slug: string;
  role?: string;
  is_active?: boolean;
  plan_mode?: "managed" | "byok";
}

export interface SyncWorkspacePayload {
  supabase_user_id?: string;
  email: string;
  full_name?: string;
  workspace_name?: string;
  slug?: string;
}

export interface SyncWorkspaceResponse {
  status?: string;
  workspace_id: string;
  workspace_name: string;
  slug: string;
  user_id: string;
  email: string;
  full_name: string;
  role?: string;
  workspace?: WorkspaceSummary;
}

export interface CreateWorkspacePayload {
  name: string;
  slug: string;
  owner_email: string;
  admin_password?: string;
  admin_full_name?: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  slug?: string;
  plan_mode?: "managed" | "byok";
}

export interface AgentConfigPayload {
  workspace_id: string;
  agent_type: string;
  provider: LLMProvider;
  model_name: string;
  api_key?: string;
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

async function handleResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      typeof errorData.detail === "string"
        ? errorData.detail
        : `${fallbackMessage} (${response.status})`
    );
  }
  return response.json() as Promise<T>;
}

export const starElevenApi = {
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<HealthCheckResponse>(response, "Health check failed");
  },

  async checkHealth(): Promise<HealthCheckResponse> {
    return this.healthCheck();
  },

  async sendMessage(payload: ChatPayload): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<ChatResponse>(response, "Failed to send message");
  },

  async chat(payload: ChatPayload): Promise<ChatResponse> {
    return this.sendMessage(payload);
  },

  async getThreadHistory(
    workspaceId: string,
    threadId: string
  ): Promise<ThreadHistoryResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/threads/${encodeURIComponent(
        workspaceId
      )}/${encodeURIComponent(threadId)}/history`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return handleResponse<ThreadHistoryResponse>(
      response,
      "Failed to fetch thread history"
    );
  },

  async deleteThread(
    workspaceId: string,
    threadId: string
  ): Promise<DeleteThreadResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/threads/${encodeURIComponent(
        workspaceId
      )}/${encodeURIComponent(threadId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );
    return handleResponse<DeleteThreadResponse>(
      response,
      "Failed to delete thread"
    );
  },

  async listWorkspaces(): Promise<{ workspaces: WorkspaceSummary[] }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<{ workspaces: WorkspaceSummary[] }>(
      response,
      "Failed to list workspaces"
    );
  },

  async getMyWorkspaces(
    email: string
  ): Promise<{ workspaces: WorkspaceSummary[] }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/auth/my-workspaces?email=${encodeURIComponent(
        email
      )}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return handleResponse<{ workspaces: WorkspaceSummary[] }>(
      response,
      "Failed to load user workspaces"
    );
  },

  async syncWorkspace(
    payload: SyncWorkspacePayload
  ): Promise<SyncWorkspaceResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/sync-workspace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<SyncWorkspaceResponse>(
      response,
      "Failed to sync workspace"
    );
  },

  async syncUserWorkspace(
    payload: SyncWorkspacePayload
  ): Promise<SyncWorkspaceResponse> {
    return this.syncWorkspace(payload);
  },

  async createWorkspace(
    payload: CreateWorkspacePayload
  ): Promise<WorkspaceSummary> {
    const response = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<WorkspaceSummary>(
      response,
      "Failed to create workspace"
    );
  },

  async updateWorkspace(
    workspaceId: string,
    payload: UpdateWorkspacePayload
  ): Promise<WorkspaceSummary> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/workspaces/${encodeURIComponent(workspaceId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return handleResponse<WorkspaceSummary>(
      response,
      "Failed to update workspace"
    );
  },

  async createAgentConfig(
    payload: AgentConfigPayload
  ): Promise<AgentConfigResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<AgentConfigResponse>(
      response,
      "Failed to save agent configuration"
    );
  },
};