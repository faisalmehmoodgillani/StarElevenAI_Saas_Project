"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { LLMProvider } from "@/types/saas";

export interface DashboardUser {
  id: string;
  email?: string;
  fullName: string;
  avatarUrl?: string;
  user_metadata?: Record<string, unknown>;
}

export interface WorkspaceItem {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  role?: string;
  is_active?: boolean;
  plan_mode?: "managed" | "byok";
  managed_approved?: boolean;
  managed_request_status?: "none" | "pending" | "approved" | "rejected";
  industry?: string;
  industry_config?: Record<string, unknown>;
}

export interface LLMModelOption {
  id: string;
  label: string;
  provider: LLMProvider;
  modelName: string;
  badge: string;
  description: string;
  isCustom?: boolean;
}

export const FRESH_PRESET_MODELS: LLMModelOption[] = [
  {
    id: "groq-gpt-oss-20b",
    label: "GPT-OSS 20B (Recommended)",
    provider: "groq",
    modelName: "openai/gpt-oss-20b",
    badge: "Fast • Free Tier",
    description: "Best default for everyday chat, agents & quick responses",
  },
  {
    id: "groq-gpt-oss-120b",
    label: "GPT-OSS 120B (Pro Reasoning)",
    provider: "groq",
    modelName: "openai/gpt-oss-120b",
    badge: "Deep Logic",
    description: "Heavy reasoning, complex workflows & detailed analysis",
  },
  {
    id: "groq-qwen3-32b",
    label: "Qwen 3 32B",
    provider: "groq",
    modelName: "qwen/qwen3-32b",
    badge: "Balanced",
    description: "Strong multilingual & structured business tasks",
  },
  {
    id: "groq-kimi-k2",
    label: "Kimi K2 Instruct",
    provider: "groq",
    modelName: "moonshotai/kimi-k2-instruct",
    badge: "Long Context",
    description: "Great for research synthesis & long summaries",
  },
  {
    id: "google-gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    modelName: "gemini-2.5-flash",
    badge: "Google Fast",
    description: "Ultra-fast Google model with strong tool calling",
  },
  {
    id: "google-gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    modelName: "gemini-2.5-pro",
    badge: "Google Pro",
    description: "Deep analytical & multi-step enterprise workflows",
  },
  {
    id: "openai-gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "openai",
    modelName: "gpt-4o-mini",
    badge: "OpenAI",
    description: "Lightweight & dependable OpenAI assistant",
  },
  {
    id: "anthropic-claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    provider: "anthropic",
    modelName: "claude-sonnet-4-5",
    badge: "Anthropic",
    description: "High-precision writing, coding & strategy",
  },
  {
    id: "openrouter-gpt-oss-20b",
    label: "OpenRouter (GPT-OSS 20B Free)",
    provider: "openrouter",
    modelName: "openai/gpt-oss-20b:free",
    badge: "OpenRouter",
    description: "Unified multi-model gateway routing",
  },
];

const DEFAULT_MODEL = FRESH_PRESET_MODELS[0];
const STORAGE_ACTIVE_WS_KEY = "stareleven_active_workspace_id";
const STORAGE_SELECTED_MODEL_KEY = "stareleven_selected_model_v2";
const STORAGE_CUSTOM_MODELS_KEY = "stareleven_custom_models_v1";
const STORAGE_SELECTED_AGENT_KEY = "stareleven_selected_agent_v1";

export interface WorkspaceContextType {
  // Multi-Tenant Workspace State
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  currentWorkspace: WorkspaceItem | null;
  setActiveWorkspace: (ws: WorkspaceItem) => void;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: {
    (name: string, slug?: string): Promise<WorkspaceItem | null>;
    (payload: { name: string; slug?: string }): Promise<WorkspaceItem | null>;
  };

  // Auth & Loading State
  user: DashboardUser | null;
  userEmail: string | null;
  userId: string | null;
  isLoading: boolean;
  isLoadingWorkspaces: boolean;
  signOut: () => Promise<void>;

  // Active Agent & Hybrid Model State
  selectedAgent: string;
  activeAgent: string;
  setSelectedAgent: (agentId: string) => void;
  selectedModel: LLMModelOption;
  setSelectedModel: (model: LLMModelOption) => void;
  customModels: LLMModelOption[];
  availableModels: LLMModelOption[];
  saveCustomModel: (
    provider: LLMProvider,
    modelName: string,
    customLabel?: string
  ) => LLMModelOption;
  removeCustomModel: (modelId: string) => void;

  // Sidebar & Mobile Drawer State
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function slugifyWorkspace(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `workspace-${Date.now()}`
  );
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] =
    useState<WorkspaceItem | null>(null);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(true);

  const [selectedAgent, setSelectedAgentState] = useState<string>("auto");
  const [selectedModel, setSelectedModelState] =
    useState<LLMModelOption>(DEFAULT_MODEL);
  const [customModels, setCustomModels] = useState<LLMModelOption[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);

  // Hydrate saved model & agent preferences on client mount
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem(STORAGE_CUSTOM_MODELS_KEY);
      if (savedCustom) {
        const parsedCustom = JSON.parse(savedCustom) as LLMModelOption[];
        if (Array.isArray(parsedCustom)) {
          setCustomModels(parsedCustom);
        }
      }

      const savedModel = localStorage.getItem(STORAGE_SELECTED_MODEL_KEY);
      if (savedModel) {
        const parsedModel = JSON.parse(savedModel) as LLMModelOption;
        if (parsedModel?.provider && parsedModel?.modelName) {
          setSelectedModelState(parsedModel);
        }
      }

      const savedAgent = localStorage.getItem(STORAGE_SELECTED_AGENT_KEY);
      if (savedAgent) {
        setSelectedAgentState(savedAgent);
      }
    } catch {
      // Fallback to default model silently
    }
  }, []);

  const setActiveWorkspace = useCallback((ws: WorkspaceItem) => {
    setActiveWorkspaceState(ws);
    try {
      localStorage.setItem(STORAGE_ACTIVE_WS_KEY, ws.id || ws.workspace_id);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const found = workspaces.find(
        (w) => w.id === workspaceId || w.workspace_id === workspaceId
      );
      if (found) {
        setActiveWorkspace(found);
      }
    },
    [workspaces, setActiveWorkspace]
  );

  const setSelectedAgent = useCallback((agentId: string) => {
    setSelectedAgentState(agentId);
    try {
      localStorage.setItem(STORAGE_SELECTED_AGENT_KEY, agentId);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setSelectedModel = useCallback((model: LLMModelOption) => {
    setSelectedModelState(model);
    try {
      localStorage.setItem(STORAGE_SELECTED_MODEL_KEY, JSON.stringify(model));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveCustomModel = useCallback(
    (
      provider: LLMProvider,
      modelName: string,
      customLabel?: string
    ): LLMModelOption => {
      const trimmedModel = modelName.trim();
      const friendlyName =
        customLabel && customLabel.trim()
          ? customLabel.trim()
          : trimmedModel.split("/").pop() || trimmedModel;

      const newEntry: LLMModelOption = {
        id: `custom-${provider}-${trimmedModel.toLowerCase()}`,
        label: friendlyName,
        provider,
        modelName: trimmedModel,
        badge: "Custom",
        description: `Custom ${provider.toUpperCase()} model (${trimmedModel})`,
        isCustom: true,
      };

      setCustomModels((prev) => {
        const filtered = prev.filter((item) => item.id !== newEntry.id);
        const updated = [newEntry, ...filtered];
        try {
          localStorage.setItem(
            STORAGE_CUSTOM_MODELS_KEY,
            JSON.stringify(updated)
          );
        } catch {
          // Ignore storage errors
        }
        return updated;
      });

      setSelectedModel(newEntry);
      return newEntry;
    },
    [setSelectedModel]
  );

  const removeCustomModel = useCallback(
    (modelId: string) => {
      setCustomModels((prev) => {
        const updated = prev.filter((m) => m.id !== modelId);
        try {
          localStorage.setItem(
            STORAGE_CUSTOM_MODELS_KEY,
            JSON.stringify(updated)
          );
        } catch {
          // Ignore storage errors
        }
        return updated;
      });

      if (selectedModel.id === modelId) {
        setSelectedModel(DEFAULT_MODEL);
      }
    },
    [selectedModel.id, setSelectedModel]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    setIsLoadingWorkspaces(true);
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser?.email) {
        setUser(null);
        setIsLoadingWorkspaces(false);
        return;
      }

      const email = authUser.email.toLowerCase();
      const resolvedFullName =
        (typeof authUser.user_metadata?.full_name === "string" &&
          authUser.user_metadata.full_name.trim()) ||
        (typeof authUser.user_metadata?.name === "string" &&
          authUser.user_metadata.name.trim()) ||
        email.split("@")[0];

      setUser({
        id: authUser.id,
        email: authUser.email,
        fullName: resolvedFullName,
        avatarUrl:
          typeof authUser.user_metadata?.avatar_url === "string"
            ? authUser.user_metadata.avatar_url
            : undefined,
        user_metadata: authUser.user_metadata,
      });
      setUserEmail(email);
      setUserId(authUser.id);

      await fetch(`${API_BASE_URL}/api/v1/auth/sync-workspace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabase_user_id: authUser.id,
          email,
          full_name: resolvedFullName,
        }),
      });

      const [myWsRes, allWsRes] = await Promise.all([
        fetch(
          `${API_BASE_URL}/api/v1/auth/my-workspaces?email=${encodeURIComponent(
            email
          )}`
        ),
        fetch(`${API_BASE_URL}/api/v1/workspaces`).catch(() => null),
      ]);

      const planMetaById = new Map<string, Partial<WorkspaceItem>>();
      if (allWsRes && allWsRes.ok) {
        const allWsData = await allWsRes.json().catch(() => ({}));
        const allList: WorkspaceItem[] = Array.isArray(allWsData.workspaces)
          ? allWsData.workspaces
          : [];
        for (const ws of allList) {
          const key = ws.id || ws.workspace_id;
          if (key) {
            planMetaById.set(key, {
              name: ws.name,
              slug: ws.slug,
              plan_mode: ws.plan_mode,
              managed_approved: Boolean(ws.managed_approved),
              managed_request_status: ws.managed_request_status || "none",
              industry: ws.industry,
              industry_config: ws.industry_config,
            });
          }
        }
      }

      if (myWsRes.ok) {
        const data = await myWsRes.json();
        const rawList: WorkspaceItem[] = Array.isArray(data.workspaces)
          ? data.workspaces
          : [];

        const uniqueMap = new Map<string, WorkspaceItem>();
        for (const item of rawList) {
          const key = item.id || item.workspace_id;
          if (key && !uniqueMap.has(key)) {
            const liveMeta = planMetaById.get(key) || {};
            const resolvedApproved = Boolean(
              liveMeta.managed_approved ?? item.managed_approved
            );
            const resolvedPlanMode =
              liveMeta.plan_mode ||
              item.plan_mode ||
              (resolvedApproved ? "managed" : "byok");
            const resolvedReqStatus =
              liveMeta.managed_request_status ||
              item.managed_request_status ||
              (resolvedApproved ? "approved" : "none");

            uniqueMap.set(key, {
              ...item,
              ...liveMeta,
              id: key,
              workspace_id: key,
              plan_mode: resolvedPlanMode,
              managed_approved: resolvedApproved,
              managed_request_status: resolvedReqStatus,
            });
          }
        }

        const normalizedList = Array.from(uniqueMap.values());
        setWorkspaces(normalizedList);

        if (normalizedList.length > 0) {
          const savedWsId =
            typeof window !== "undefined"
              ? localStorage.getItem(STORAGE_ACTIVE_WS_KEY)
              : null;

          const matched = normalizedList.find(
            (w) => w.id === savedWsId || w.workspace_id === savedWsId
          );
          setActiveWorkspaceState(matched || normalizedList[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user workspaces:", err);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, []);

  const createWorkspace = useCallback(
    async (
      nameOrPayload: string | { name: string; slug?: string },
      optionalSlug?: string
    ): Promise<WorkspaceItem | null> => {
      const rawName =
        typeof nameOrPayload === "string"
          ? nameOrPayload
          : nameOrPayload?.name;
      const rawSlug =
        typeof nameOrPayload === "string"
          ? optionalSlug
          : nameOrPayload?.slug;

      if (!rawName || !rawName.trim()) {
        throw new Error("Workspace name is required.");
      }

      const cleanName = rawName.trim();
      const cleanSlug =
        rawSlug && rawSlug.trim()
          ? slugifyWorkspace(rawSlug)
          : slugifyWorkspace(cleanName);

      const ownerEmail = userEmail || user?.email?.toLowerCase();
      if (!ownerEmail) {
        throw new Error("Authenticated user email not found.");
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          slug: cleanSlug,
          owner_email: ownerEmail,
          admin_full_name: user?.fullName || ownerEmail.split("@")[0],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to create workspace.");
      }

      const created = await response.json();
      const newId = created.id || created.workspace_id;
      const newItem: WorkspaceItem = {
        id: newId,
        workspace_id: newId,
        name: created.name || created.workspace_name || cleanName,
        slug: created.slug || cleanSlug,
        role: "owner",
        is_active: true,
        plan_mode: created.plan_mode || "byok",
        managed_approved: Boolean(created.managed_approved),
        managed_request_status: created.managed_request_status || "none",
      };

      setWorkspaces((prev) => {
        const filtered = prev.filter(
          (w) => w.id !== newId && w.workspace_id !== newId
        );
        return [...filtered, newItem];
      });
      setActiveWorkspace(newItem);

      return newItem;
    },
    [userEmail, user, setActiveWorkspace]
  );

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
      setUserEmail(null);
      setUserId(null);
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      try {
        localStorage.removeItem(STORAGE_ACTIVE_WS_KEY);
      } catch {
        // Ignore storage errors
      }
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const availableModels = [...customModels, ...FRESH_PRESET_MODELS];

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        currentWorkspace: activeWorkspace,
        setActiveWorkspace,
        switchWorkspace,
        refreshWorkspaces,
        createWorkspace,
        user,
        userEmail,
        userId,
        isLoading: isLoadingWorkspaces,
        isLoadingWorkspaces,
        signOut,
        selectedAgent,
        activeAgent: selectedAgent,
        setSelectedAgent,
        selectedModel,
        setSelectedModel,
        customModels,
        availableModels,
        saveCustomModel,
        removeCustomModel,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}