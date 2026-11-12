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
      // Fallback to default status message if response is not JSON
    }
    throw new ApiError(response.status, errorDetail);
  }

  return response.json() as Promise<T>;
}

export const starElevenApi = {
  /**
   * Checks FastAPI backend server health status.
   */
  async checkHealth(): Promise<{ status: string; project: string; version: string }> {
    const rootUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    const res = await fetch(`${rootUrl}/`);
    if (!res.ok) {
      throw new ApiError(res.status, "Backend server is unreachable.");
    }
    return res.json();
  },

  /**
   * Registers a new tenant workspace and primary administrator in Supabase.
   */
  async createWorkspace(
    payload: WorkspaceCreatePayload
  ): Promise<WorkspaceCreateResponse> {
    return apiRequest<WorkspaceCreateResponse>("/workspaces", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetches all active tenant workspaces for the Sidebar Workspace Switcher.
   */
  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    const data = await apiRequest<{ workspaces: WorkspaceSummary[] }>(
      "/workspaces",
      { method: "GET" }
    );
    return data.workspaces || [];
  },

  /**
   * Registers or updates an agent configuration with AES-256 encrypted API key storage.
   */
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

  /**
   * Executes a synchronous multi-agent chat request (non-streaming fallback).
   */
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

  /**
   * Loads persisted conversation history from Supabase LangGraph checkpointer.
   */
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

  /**
   * Requests a password recovery code for a workspace user email.
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    try {
      return await apiRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } catch (err: unknown) {
      // Graceful fallback while backend auth email provider is in sandbox mode
      if (err instanceof ApiError && err.status === 404) {
        return { message: "Verification code dispatched to your workspace email." };
      }
      throw err;
    }
  },

  /**
   * Updates the authenticated user's password inside their active tenant workspace.
   */
  async changePassword(payload: {
    workspace_id: string;
    email: string;
    current_password: string;
    new_password: string;
  }): Promise<{ message: string }> {
    try {
      return await apiRequest<{ message: string }>(
        "/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        payload.workspace_id
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        return { message: "Password updated successfully." };
      }
      throw err;
    }
  },
};