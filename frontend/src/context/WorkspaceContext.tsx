"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  plan_mode?: "managed" | "byok" | string;
  role?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export type AgentType =
  | "meta_router"
  | "research_agent"
  | "crm_agent"
  | "general_chat";

export interface ModelOption {
  id: string;
  label: string;
  provider: "groq" | "gemini" | "openai" | "anthropic" | "openrouter";
  modelName: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "groq-llama-70b",
    label: "Llama 3.3 70B (Fast)",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    modelName: "gemini-2.5-flash",
  },
  {
    id: "openai-gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "openai",
    modelName: "gpt-4o-mini",
  },
  {
    id: "anthropic-claude-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "anthropic",
    modelName: "claude-3-5-sonnet-20241022",
  },
  {
    id: "openrouter-auto",
    label: "OpenRouter Auto",
    provider: "openrouter",
    modelName: "openrouter/auto",
  },
];

interface WorkspaceContextValue {
  user: UserProfile | null;
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  setActiveWorkspace: (workspace: WorkspaceItem) => void;
  createWorkspace: (name: string, slug: string) => Promise<boolean>;
  refreshWorkspaces: () => Promise<void>;
  activeAgent: AgentType;
  setActiveAgent: (agent: AgentType) => void;
  selectedModel: ModelOption;
  setSelectedModel: (model: ModelOption) => void;
  isLoading: boolean;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  signOut: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

const STORAGE_WORKSPACE_KEY = "stareleven_active_workspace_id";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function normalizeWorkspace(raw: Record<string, any>, fallbackIndex = 0): WorkspaceItem {
  const resolvedId =
    raw?.id ||
    raw?.workspace_id ||
    raw?.slug ||
    `workspace-${fallbackIndex}`;

  return {
    id: String(resolvedId),
    name: raw?.name || raw?.workspace_name || "Default Workspace",
    slug: raw?.slug || raw?.workspace_slug || "default-workspace",
    plan_mode: raw?.plan_mode || "managed",
    role: raw?.role || "admin",
  };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] =
    useState<WorkspaceItem | null>(null);
  const [activeAgent, setActiveAgent] = useState<AgentType>("meta_router");
  const [selectedModel, setSelectedModel] = useState<ModelOption>(
    AVAILABLE_MODELS[0]
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);

  const setActiveWorkspace = useCallback((workspace: WorkspaceItem) => {
    setActiveWorkspaceState(workspace);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_WORKSPACE_KEY, workspace.id);
    }
  }, []);

  const fetchUserWorkspaces = useCallback(
    async (authUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, any>;
    }) => {
      const email = authUser.email || "";
      const fullName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        email.split("@")[0] ||
        "Operator";
      const avatarUrl = authUser.user_metadata?.avatar_url;

      setUser({
        id: authUser.id,
        email,
        fullName,
        avatarUrl,
      });

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/auth/my-workspaces?email=${encodeURIComponent(
            email
          )}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        let list: WorkspaceItem[] = [];

        if (res.ok) {
          const data = await res.json();
          const rawList = Array.isArray(data) ? data : data.workspaces || [];
          list = rawList.map((item: Record<string, any>, idx: number) =>
            normalizeWorkspace(item, idx)
          );
        }

        if (list.length === 0 && email) {
          const syncRes = await fetch(
            `${API_BASE_URL}/api/v1/auth/sync-workspace`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                supabase_user_id: authUser.id,
                email,
                full_name: fullName,
              }),
            }
          );

          if (syncRes.ok) {
            const syncData = await syncRes.json();
            const rawSynced = syncData.workspace || syncData;
            if (rawSynced?.id || rawSynced?.workspace_id) {
              list = [normalizeWorkspace(rawSynced, 0)];
            }
          }
        }

        setWorkspaces(list);

        if (list.length > 0) {
          const savedId =
            typeof window !== "undefined"
              ? localStorage.getItem(STORAGE_WORKSPACE_KEY)
              : null;
          const matched = list.find((w) => w.id === savedId) || list[0];
          setActiveWorkspace(matched);
        }
      } catch (err) {
        console.error("Failed to load user workspaces:", err);
      }
    },
    [setActiveWorkspace]
  );

  const refreshWorkspaces = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      await fetchUserWorkspaces(currentUser);
    }
  }, [supabase, fetchUserWorkspaces]);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      setIsLoading(true);
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        if (isMounted) {
          router.replace("/login");
        }
        return;
      }

      if (isMounted) {
        await fetchUserWorkspaces(currentUser);
        setIsLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_WORKSPACE_KEY);
        }
        router.replace("/login");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, fetchUserWorkspaces]);

  const createWorkspace = useCallback(
    async (name: string, slug: string): Promise<boolean> => {
      if (!user) return false;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            owner_email: user.email,
            supabase_user_id: user.id,
          }),
        });

        if (!res.ok) return false;
        const created = await res.json();
        await refreshWorkspaces();
        if (created?.id || created?.workspace_id) {
          setActiveWorkspace(normalizeWorkspace(created));
        }
        return true;
      } catch (err) {
        console.error("Error creating workspace:", err);
        return false;
      }
    },
    [user, refreshWorkspaces, setActiveWorkspace]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_WORKSPACE_KEY);
    }
    router.replace("/login");
  }, [supabase, router]);

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        createWorkspace,
        refreshWorkspaces,
        activeAgent,
        setActiveAgent,
        selectedModel,
        setSelectedModel,
        isLoading,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        signOut,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}