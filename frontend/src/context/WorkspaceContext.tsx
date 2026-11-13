"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { LLMProvider } from "@/types/saas";

export interface WorkspaceItem {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  role?: string;
  is_active?: boolean;
  plan_mode?: "managed" | "byok";
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

interface WorkspaceContextType {
  workspaces: WorkspaceItem[];
  activeWorkspace: WorkspaceItem | null;
  setActiveWorkspace: (ws: WorkspaceItem) => void;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
  userEmail: string | null;
  userId: string | null;
  isLoadingWorkspaces: boolean;
  selectedAgent: string;
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
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined
);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] =
    useState<WorkspaceItem | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(true);

  const [selectedAgent, setSelectedAgentState] = useState<string>("auto");
  const [selectedModel, setSelectedModelState] =
    useState<LLMModelOption>(DEFAULT_MODEL);
  const [customModels, setCustomModels] = useState<LLMModelOption[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

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
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setIsLoadingWorkspaces(false);
        return;
      }

      const email = user.email.toLowerCase();
      setUserEmail(email);
      setUserId(user.id);

      // Ensure primary workspace is synced
      await fetch(`${API_BASE_URL}/api/v1/auth/sync-workspace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabase_user_id: user.id,
          email,
          full_name: user.user_metadata?.full_name || email.split("@")[0],
        }),
      });

      const res = await fetch(
        `${API_BASE_URL}/api/v1/auth/my-workspaces?email=${encodeURIComponent(
          email
        )}`
      );

      if (res.ok) {
        const data = await res.json();
        const rawList: WorkspaceItem[] = Array.isArray(data.workspaces)
          ? data.workspaces
          : [];

        // Deduplicate by workspace id
        const uniqueMap = new Map<string, WorkspaceItem>();
        for (const item of rawList) {
          const key = item.id || item.workspace_id;
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, {
              ...item,
              id: key,
              workspace_id: key,
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

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const availableModels = [...customModels, ...FRESH_PRESET_MODELS];

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        switchWorkspace,
        refreshWorkspaces,
        userEmail,
        userId,
        isLoadingWorkspaces,
        selectedAgent,
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