import {
  AgentConfigPayload,
  AgentConfigResponse,
  ChatPayload,
  ChatSyncResponse,
  ThreadHistoryResponse,
  WorkspaceCreatePayload,
  WorkspaceCreateResponse,
  WorkspaceSummary,
} from "@/types/saas";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export interface SyncedWorkspaceResponse {
  workspace_id: string;
  workspace_name: string;
  slug: string;
  user_id: string;
  email: string;
  full_name: string;
  is_new_workspace: boolean;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  workspaceId?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (workspaceId) {
    headers["X-Workspace-ID"] = workspaceId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.detail) {
        errorDetail =
          typeof errData.detail === "string"
            ? errData.detail
            : JSON.stringify(errData.detail);
      }
    } catch {
      // Fallback to default status message
    }
    throw new ApiError(response.status, errorDetail);
  }

  return response.json() as Promise<T>;
}

export const starElevenApi = {
  async checkHealth(): Promise<{ status: string; project: string; version: string }> {
    const rootUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    const res = await fetch(`${rootUrl}/`);
    if (!res.ok) {
      throw new ApiError(res.status, "Backend server is unreachable.");
    }
    return res.json();
  },

  async createWorkspace(
    payload: WorkspaceCreatePayload
  ): Promise<WorkspaceCreateResponse> {
    return apiRequest<WorkspaceCreateResponse>("/workspaces", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Syncs a verified Supabase Auth user (Email OTP or Google OAuth) with PostgreSQL.
   */
  async syncUserWorkspace(payload: {
    email: string;
    full_name?: string;
    workspace_name?: string;
    slug?: string;
    supabase_user_id?: string;
  }): Promise<SyncedWorkspaceResponse> {
    return apiRequest<SyncedWorkspaceResponse>("/auth/sync-workspace", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches ONLY workspaces belonging to the authenticated user's email.
   */
  async getUserWorkspaces(email: string): Promise<WorkspaceSummary[]> {
    const data = await apiRequest<{ workspaces: WorkspaceSummary[] }>(
      `/auth/my-workspaces?email=${encodeURIComponent(email)}`,
      { method: "GET" }
    );
    return data.workspaces || [];
  },

  async registerAgentConfig(
    payload: AgentConfigPayload
  ): Promise<AgentConfigResponse> {
    return apiRequest<AgentConfigResponse>(
      "/agents",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      payload.workspace_id
    );
  },

  async sendChatMessage(payload: ChatPayload): Promise<ChatSyncResponse> {
    return apiRequest<ChatSyncResponse>(
      "/chat",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      payload.workspace_id
    );
  },

  async getThreadHistory(
    workspaceId: string,
    threadId: string
  ): Promise<ThreadHistoryResponse> {
    return apiRequest<ThreadHistoryResponse>(
      `/threads/${encodeURIComponent(workspaceId)}/${encodeURIComponent(threadId)}/history`,
      { method: "GET" },
      workspaceId
    );
  },
};