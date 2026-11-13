"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  PanelLeftOpen,
  Sparkles,
  Globe,
  Database,
  Bot,
  ShieldCheck,
  Loader2,
  TerminalSquare,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { starElevenApi } from "@/lib/api";
import { streamAgentChat } from "@/lib/sse-stream";
import { LLMProvider } from "@/types/saas";
import { AgentNodeType, ChatMessage, ChatThreadMeta } from "@/types/chat";
import { ThreadSidebar } from "@/components/chat/ThreadSidebar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";

function generateThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatTimeNow(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveLLMProvider(raw?: string): LLMProvider {
  const normalized = (raw || "groq").toLowerCase().trim();
  if (normalized === "gemini" || normalized === "google") return "google";
  if (normalized === "openai") return "openai";
  if (normalized === "anthropic") return "anthropic";
  if (normalized === "openrouter") return "openrouter";
  return "groq";
}

const STARTER_MISSIONS = [
  {
    title: "Live Web Market Intelligence",
    prompt:
      "Search the web for the latest AI SaaS agency automation trends in 2026 and summarize top 3 opportunities.",
    agentHint: "Research Agent • Tavily Search",
    icon: <Globe className="h-4 w-4 text-amber-400" />,
  },
  {
    title: "Tenant Workspace & CRM Audit",
    prompt:
      "Check my workspace summary, active agents count, and current tenant operational status.",
    agentHint: "CRM Agent • Supabase DB",
    icon: <Database className="h-4 w-4 text-[#A3E635]" />,
  },
  {
    title: "Enterprise Client Proposal",
    prompt:
      "Draft a structured B2B executive proposal for deploying an autonomous AI customer qualification pipeline.",
    agentHint: "General Copilot • Synthesis",
    icon: <Bot className="h-4 w-4 text-sky-400" />,
  },
  {
    title: "Multi-Agent Architecture Review",
    prompt:
      "Design a high-converting inbound lead qualification workflow using intent routing and human-in-the-loop approvals.",
    agentHint: "Auto Meta-Router",
    icon: <Sparkles className="h-4 w-4 text-purple-400" />,
  },
];

export default function ChatCommandCenterPage() {
  const workspaceCtx = useWorkspace() as any;

  // Resolve active tenant context safely from Module 03 WorkspaceContext
  const workspaceId: string =
    workspaceCtx?.activeWorkspace?.id ||
    workspaceCtx?.currentWorkspace?.id ||
    workspaceCtx?.workspaceId ||
    "00000000-0000-0000-0000-000000000001";
  const workspaceName: string =
    workspaceCtx?.activeWorkspace?.name ||
    workspaceCtx?.currentWorkspace?.name ||
    workspaceCtx?.workspaceName ||
    "StarEleven Workspace";
  const userId: string =
    workspaceCtx?.user?.id ||
    workspaceCtx?.userId ||
    "00000000-0000-0000-0000-000000000002";

  const rawProvider: string =
    workspaceCtx?.selectedModel?.provider ||
    workspaceCtx?.selectedProvider ||
    workspaceCtx?.provider ||
    "groq";
  const provider: LLMProvider = resolveLLMProvider(rawProvider);

  const modelName: string =
    workspaceCtx?.selectedModel?.modelName ||
    (typeof workspaceCtx?.selectedModel === "string"
      ? workspaceCtx.selectedModel
      : undefined) ||
    workspaceCtx?.modelName ||
    "llama-3.3-70b-versatile";

  const selectedHeaderAgent: string =
    workspaceCtx?.activeAgent || workspaceCtx?.selectedAgent || "meta_router";

  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [threads, setThreads] = useState<ChatThreadMeta[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const storageKey = `stareleven_threads_${workspaceId}`;

  // Scroll smoothly to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist thread metadata list per workspace
  const saveThreadsToStorage = useCallback(
    (updatedThreads: ChatThreadMeta[]) => {
      setThreads(updatedThreads);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(updatedThreads));
      }
    },
    [storageKey]
  );

  // Load persisted messages from Supabase LangGraph Checkpointer
  const loadThreadMessages = useCallback(
    async (targetThreadId: string) => {
      if (!workspaceId || !targetThreadId) return;
      setIsLoadingHistory(true);
      try {
        const history = await starElevenApi.getThreadHistory(
          workspaceId,
          targetThreadId
        );
        if (history?.messages && history.messages.length > 0) {
          const hydrated: ChatMessage[] = history.messages.map((m, idx) => ({
            id: `${targetThreadId}_hist_${idx}`,
            role: m.role,
            content: m.content,
            timestamp: "Persisted",
            routedAgent:
              m.role === "assistant"
                ? history.last_routed_agent || "general_agent"
                : undefined,
          }));
          setMessages(hydrated);
        } else {
          setMessages([]);
        }
      } catch {
        // Fresh thread with no checkpoint yet
        setMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [workspaceId]
  );

  // Initialize workspace threads when workspaceId changes
  useEffect(() => {
    if (typeof window === "undefined" || !workspaceId) return;

    const raw = localStorage.getItem(storageKey);
    let parsed: ChatThreadMeta[] = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = [];
      }
    }

    if (parsed.length > 0) {
      setThreads(parsed);
      const firstId = parsed[0].id;
      setActiveThreadId(firstId);
      loadThreadMessages(firstId);
    } else {
      const initialId = generateThreadId();
      const freshThread: ChatThreadMeta = {
        id: initialId,
        workspaceId,
        title: "New Agent Session",
        lastMessagePreview: "",
        messageCount: 0,
        updatedAt: new Date().toISOString(),
      };
      saveThreadsToStorage([freshThread]);
      setActiveThreadId(initialId);
      setMessages([]);
    }
  }, [workspaceId, storageKey, loadThreadMessages, saveThreadsToStorage]);

  const handleCreateNewThread = () => {
    if (isStreaming) handleStopStreaming();
    const newId = generateThreadId();
    const newThread: ChatThreadMeta = {
      id: newId,
      workspaceId,
      title: "New Agent Session",
      lastMessagePreview: "",
      messageCount: 0,
      updatedAt: new Date().toISOString(),
    };
    saveThreadsToStorage([newThread, ...threads]);
    setActiveThreadId(newId);
    setMessages([]);
  };

  const handleSelectThread = (threadId: string) => {
    if (threadId === activeThreadId) return;
    if (isStreaming) handleStopStreaming();
    setActiveThreadId(threadId);
    loadThreadMessages(threadId);
  };

  const handleDeleteThread = (threadId: string) => {
    const remaining = threads.filter((t) => t.id !== threadId);
    if (remaining.length === 0) {
      const replacementId = generateThreadId();
      const fresh: ChatThreadMeta = {
        id: replacementId,
        workspaceId,
        title: "New Agent Session",
        lastMessagePreview: "",
        messageCount: 0,
        updatedAt: new Date().toISOString(),
      };
      saveThreadsToStorage([fresh]);
      setActiveThreadId(replacementId);
      setMessages([]);
      return;
    }

    saveThreadsToStorage(remaining);
    if (threadId === activeThreadId) {
      setActiveThreadId(remaining[0].id);
      loadThreadMessages(remaining[0].id);
    }
  };

  const handleRenameThread = (threadId: string, newTitle: string) => {
    const updated = threads.map((t) =>
      t.id === threadId ? { ...t, title: newTitle } : t
    );
    saveThreadsToStorage(updated);
  };

  const handleTogglePinThread = (threadId: string) => {
    const updated = threads.map((t) =>
      t.id === threadId ? { ...t, pinned: !t.pinned } : t
    );
    saveThreadsToStorage(updated);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() || isStreaming) return;

    const currentThreadId = activeThreadId || generateThreadId();
    if (!activeThreadId) setActiveThreadId(currentThreadId);

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: promptText,
      timestamp: formatTimeNow(),
    };

    const assistantMsgId = `ai_${Date.now() + 1}`;
    const isAutoRouter =
      selectedHeaderAgent === "meta_router" ||
      selectedHeaderAgent === "auto_router" ||
      selectedHeaderAgent === "auto";
    const initialRoutedAgent: AgentNodeType = isAutoRouter
      ? "router"
      : selectedHeaderAgent;

    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: formatTimeNow(),
      routedAgent: initialRoutedAgent,
      provider,
      modelName,
      isStreaming: true,
    };

    const nextMessages = [...messages, userMsg, assistantPlaceholder];
    setMessages(nextMessages);
    setIsStreaming(true);

    const startTime = performance.now();
    let activeAgentName: AgentNodeType = initialRoutedAgent;
    let accumulatedReply = "";

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Update thread metadata immediately
    const autoTitle =
      promptText.length > 38 ? `${promptText.slice(0, 38)}...` : promptText;

    const updatedThreads = threads.map((t) =>
      t.id === currentThreadId
        ? {
            ...t,
            title:
              t.title === "New Agent Session" && t.messageCount === 0
                ? autoTitle
                : t.title,
            lastMessagePreview: promptText,
            messageCount: t.messageCount + 2,
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    saveThreadsToStorage(updatedThreads);

    await streamAgentChat(
      {
        message: promptText,
        thread_id: currentThreadId,
        workspace_id: workspaceId,
        user_id: userId,
        provider,
        model_name: modelName,
      },
      {
        signal: controller.signal,
        onAgentStatus: (agentName) => {
          activeAgentName = agentName;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, routedAgent: agentName } : m
            )
          );
        },
        onToken: (token) => {
          accumulatedReply += token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: accumulatedReply } : m
            )
          );
        },
        onComplete: () => {
          const elapsed = Math.round(performance.now() - startTime);
          setIsStreaming(false);
          abortControllerRef.current = null;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    routedAgent: activeAgentName,
                    latencyMs: elapsed,
                  }
                : m
            )
          );

          // Sync last routed agent & preview in sidebar
          setThreads((prevThreads) => {
            const synced = prevThreads.map((t) =>
              t.id === currentThreadId
                ? {
                    ...t,
                    lastRoutedAgent: activeAgentName,
                    lastMessagePreview:
                      accumulatedReply.slice(0, 65) || promptText,
                    updatedAt: new Date().toISOString(),
                  }
                : t
            );
            if (typeof window !== "undefined") {
              localStorage.setItem(storageKey, JSON.stringify(synced));
            }
            return synced;
          });
        },
        onError: (errMessage) => {
          setIsStreaming(false);
          abortControllerRef.current = null;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    isError: true,
                    content: `Execution interrupted: ${errMessage}`,
                  }
                : m
            )
          );
        },
      }
    );
  };

  const handleRegenerateLast = () => {
    if (isStreaming || messages.length < 2) return;
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMessage) return;

    // Remove trailing assistant response before re-running
    setMessages((prev) => prev.slice(0, -1));
    handleSendMessage(lastUserMessage.content);
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#09090B]">
      {/* Left Workspace Thread History Drawer */}
      <ThreadSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen((prev) => !prev)}
        onSelectThread={handleSelectThread}
        onNewThread={handleCreateNewThread}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        onTogglePinThread={handleTogglePinThread}
      />

      {/* Main Streaming Command Arena */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sub-Header Telemetry Strip */}
        <div className="flex items-center justify-between border-b border-[#27272A] bg-[#0D0D10]/80 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            {!isDrawerOpen && (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="rounded-lg border border-[#27272A] bg-[#18181B] p-1.5 text-zinc-300 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
                title="Open mission threads"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-[#84CC16]" />
              <span className="text-xs font-semibold text-zinc-200">
                AI Command Center
              </span>
              <span className="hidden rounded-md border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline">
                {activeThreadId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-2.5 py-0.5 text-[#A3E635]">
              <ShieldCheck className="h-3 w-3" />
              <span>RLS Isolated</span>
            </span>
          </div>
        </div>

        {/* Scrollable Message Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {isLoadingHistory ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#84CC16]" />
              <p className="mt-2 font-mono text-xs">
                Hydrating checkpoints from Supabase PostgreSQL...
              </p>
            </div>
          ) : messages.length === 0 ? (
            /* Command Center Empty State */
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635] shadow-[0_0_30px_rgba(132,204,22,0.2)]">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
                StarEleven Multi-Agent Command Center
              </h2>
              <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-zinc-400">
                Connected to{" "}
                <span className="font-semibold text-zinc-200">
                  {workspaceName}
                </span>
                . Your prompts are dynamically routed across Deep Research
                (Tavily), CRM Intelligence (Supabase), and Operations Copilots
                with persistent state memory.
              </p>

              {/* Quick-Launch Mission Cards */}
              <div className="mt-7 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
                {STARTER_MISSIONS.map((mission) => (
                  <button
                    key={mission.title}
                    type="button"
                    onClick={() => handleSendMessage(mission.prompt)}
                    className="group rounded-2xl border border-[#27272A] bg-[#18181B]/80 p-4 transition-all hover:border-[#84CC16]/50 hover:bg-[#18181B] hover:shadow-[0_0_24px_rgba(132,204,22,0.08)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg border border-[#27272A] bg-[#09090B] p-2">
                        {mission.icon}
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500 group-hover:text-[#A3E635]">
                        {mission.agentHint}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xs font-semibold text-white group-hover:text-[#A3E635]">
                      {mission.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">
                      {mission.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-6">
              {messages.map((msg, index) => {
                const isLastAssistant =
                  msg.role === "assistant" && index === messages.length - 1;
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isLastAssistant={isLastAssistant}
                    onRegenerate={handleRegenerateLast}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sticky Bottom Command Composer */}
        <ChatComposer
          onSend={handleSendMessage}
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
          workspaceName={workspaceName}
          provider={provider}
          modelName={modelName}
        />
      </div>
    </div>
  );
}