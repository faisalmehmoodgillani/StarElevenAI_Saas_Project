"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  ChevronDown,
  Check,
  Sparkles,
  Cpu,
  Plus,
  Trash2,
  SlidersHorizontal,
  ShieldCheck,
  Menu,
} from "lucide-react";
import {
  useWorkspace,
  FRESH_PRESET_MODELS,
  type LLMModelOption,
} from "@/context/WorkspaceContext";
import type { LLMProvider } from "@/types/saas";

interface HeaderProps {
  onMenuClick?: () => void;
}

const AGENT_OPTIONS = [
  {
    id: "auto",
    name: "Auto Router (Smart)",
    description: "Automatically picks Research, CRM, or General specialist",
    badge: "Recommended",
  },
  {
    id: "general_agent",
    name: "General Assistant",
    description: "Fast direct answers, drafting & brainstorming",
    badge: "Core",
  },
  {
    id: "research_agent",
    name: "Web Research Agent",
    description: "Live internet search & market intelligence",
    badge: "Live Web",
  },
  {
    id: "crm_agent",
    name: "CRM & Workspace Agent",
    description: "Queries client leads, workspace data & active agents",
    badge: "Database",
  },
];

const PROVIDER_TABS: { id: "all" | LLMProvider; label: string }[] = [
  { id: "all", label: "All" },
  { id: "groq", label: "Groq" },
  { id: "google", label: "Gemini" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Claude" },
  { id: "openrouter", label: "OpenRouter" },
];

const PROVIDER_PLACEHOLDERS: Record<LLMProvider, string> = {
  groq: "e.g. openai/gpt-oss-20b or qwen/qwen3-32b",
  google: "e.g. gemini-2.5-flash or gemini-2.5-pro",
  openai: "e.g. gpt-4o-mini or gpt-4.1",
  anthropic: "e.g. claude-sonnet-4-5",
  openrouter: "e.g. openai/gpt-oss-20b:free",
};

export function Header({ onMenuClick }: HeaderProps) {
  const {
    activeWorkspace,
    selectedAgent,
    setSelectedAgent,
    selectedModel,
    setSelectedModel,
    customModels,
    saveCustomModel,
    removeCustomModel,
  } = useWorkspace();

  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [providerFilter, setProviderFilter] = useState<"all" | LLMProvider>(
    "all"
  );
  const [showCustomForm, setShowCustomForm] = useState(false);

  const [customProvider, setCustomProvider] = useState<LLMProvider>("groq");
  const [customModelId, setCustomModelId] = useState("");
  const [customNickname, setCustomNickname] = useState("");
  const [customError, setCustomError] = useState("");

  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        agentDropdownRef.current &&
        !agentDropdownRef.current.contains(event.target as Node)
      ) {
        setAgentMenuOpen(false);
      }
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      ) {
        setModelMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentAgent =
    AGENT_OPTIONS.find((a) => a.id === selectedAgent) || AGENT_OPTIONS[0];

  const allModels: LLMModelOption[] = [...customModels, ...FRESH_PRESET_MODELS];
  const filteredModels =
    providerFilter === "all"
      ? allModels
      : allModels.filter((m) => m.provider === providerFilter);

  const handleSaveCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customModelId.trim()) {
      setCustomError("Please enter a valid model ID.");
      return;
    }
    setCustomError("");
    saveCustomModel(customProvider, customModelId, customNickname);
    setCustomModelId("");
    setCustomNickname("");
    setShowCustomForm(false);
    setModelMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-800/90 bg-[#09090B]/90 px-4 backdrop-blur-md md:px-6">
      {/* Left: Mobile Menu Trigger + Active Workspace Breadcrumb */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-flex h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_8px_#84cc16]" />
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Tenant
          </span>
          <span className="text-zinc-700">/</span>
          <span className="max-w-[180px] truncate text-sm font-semibold text-zinc-200">
            {activeWorkspace?.name || "Loading Workspace..."}
          </span>
        </div>
      </div>

      {/* Right: Agent Selector + Hybrid AI Model Selector */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* 1. Active Agent Selector */}
        <div className="relative" ref={agentDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setAgentMenuOpen((prev) => !prev);
              setModelMenuOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <Bot className="h-3.5 w-3.5 text-lime-400" />
            <span className="hidden max-w-[140px] truncate md:inline">
              {currentAgent.name}
            </span>
            <span className="inline md:hidden">Agent</span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          </button>

          {agentMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-800 bg-[#121215] p-2 shadow-2xl shadow-black/80">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Select Active Agent
              </div>
              <div className="mt-1 space-y-1">
                {AGENT_OPTIONS.map((agent) => {
                  const isSelected = agent.id === selectedAgent;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => {
                        setSelectedAgent(agent.id);
                        setAgentMenuOpen(false);
                      }}
                      className={`flex w-full items-start justify-between rounded-xl px-3 py-2.5 text-left transition ${
                        isSelected
                          ? "border border-lime-500/30 bg-lime-500/10"
                          : "border border-transparent hover:bg-zinc-800/70"
                      }`}
                    >
                      <div className="pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-100">
                            {agent.name}
                          </span>
                          <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-lime-400">
                            {agent.badge}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-400">
                          {agent.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Hybrid AI Model Selector (Easy Presets + Custom Model Input) */}
        <div className="relative" ref={modelDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setModelMenuOpen((prev) => !prev);
              setAgentMenuOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-lime-500/30 bg-zinc-900/95 px-3 py-2 text-xs font-medium text-zinc-100 shadow-sm transition hover:border-lime-400/60 hover:bg-zinc-900"
          >
            <Cpu className="h-3.5 w-3.5 text-lime-400" />
            <span className="rounded bg-lime-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-lime-400">
              {selectedModel.provider}
            </span>
            <span className="max-w-[130px] truncate sm:max-w-[180px]">
              {selectedModel.label}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          </button>

          {modelMenuOpen && (
            <div className="absolute right-0 mt-2 w-[340px] sm:w-[390px] rounded-2xl border border-zinc-800 bg-[#121215] p-3 shadow-2xl shadow-black/90">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-100">
                    AI Brain & Model Selector
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Pick a ready preset or enter any custom model ID
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomForm((prev) => !prev)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    showCustomForm
                      ? "bg-zinc-800 text-zinc-200"
                      : "bg-lime-500 text-zinc-950 hover:bg-lime-400"
                  }`}
                >
                  {showCustomForm ? (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Presets
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      Custom Model
                    </>
                  )}
                </button>
              </div>

              {showCustomForm ? (
                <form
                  onSubmit={handleSaveCustomModel}
                  className="mt-2 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-lime-400">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Add & Activate Custom Model</span>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                      1. Select Provider
                    </label>
                    <select
                      value={customProvider}
                      onChange={(e) =>
                        setCustomProvider(e.target.value as LLMProvider)
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 focus:border-lime-400 focus:outline-none"
                    >
                      <option value="groq">Groq (Fast Free / Paid API)</option>
                      <option value="google">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="openrouter">OpenRouter</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                      2. Exact Model ID{" "}
                      <span className="text-lime-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      placeholder={PROVIDER_PLACEHOLDERS[customProvider]}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-lime-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                      3. Display Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={customNickname}
                      onChange={(e) => setCustomNickname(e.target.value)}
                      placeholder="e.g. My Groq Free Model"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-lime-400 focus:outline-none"
                    />
                  </div>

                  {customError && (
                    <p className="text-[11px] font-medium text-red-400">
                      {customError}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-lime-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-lime-400"
                    >
                      Save & Use Model
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mt-1 flex items-center gap-1 overflow-x-auto border-b border-zinc-800 pb-2">
                    {PROVIDER_TABS.map((tab) => {
                      const active = providerFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setProviderFilter(tab.id)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                            active
                              ? "bg-lime-500/20 text-lime-400"
                              : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {filteredModels.map((model) => {
                      const isSelected =
                        selectedModel.provider === model.provider &&
                        selectedModel.modelName === model.modelName;

                      return (
                        <div
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model);
                            setModelMenuOpen(false);
                          }}
                          className={`group flex cursor-pointer items-start justify-between rounded-xl border p-2.5 transition ${
                            isSelected
                              ? "border-lime-500/40 bg-lime-500/10"
                              : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900"
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-zinc-100">
                                {model.label}
                              </span>
                              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-300">
                                {model.provider}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  model.isCustom
                                    ? "bg-amber-500/15 text-amber-300"
                                    : "bg-lime-500/15 text-lime-400"
                                }`}
                              >
                                {model.badge}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-zinc-400">
                              {model.description}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                              ID: {model.modelName}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {model.isCustom && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCustomModel(model.id);
                                }}
                                title="Remove custom model"
                                className="rounded-lg p-1 text-zinc-500 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {isSelected && (
                              <Check className="h-4 w-4 shrink-0 text-lime-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-lime-400" />
                      Active:{" "}
                      <strong className="text-zinc-300">
                        {selectedModel.modelName}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(true)}
                      className="font-medium text-lime-400 hover:underline"
                    >
                      + Enter custom ID
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;