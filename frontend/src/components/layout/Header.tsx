"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  Cpu,
  Globe,
  Menu,
  MessageSquareText,
  Network,
  Users,
} from "lucide-react";
import {
  AgentType,
  AVAILABLE_MODELS,
  useWorkspace,
} from "@/context/WorkspaceContext";

const AGENT_OPTIONS: {
  id: AgentType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "meta_router",
    label: "Auto Meta-Router",
    description: "Intelligent multi-agent orchestration",
    icon: Network,
  },
  {
    id: "research_agent",
    label: "Research Agent",
    description: "Live Tavily web intelligence",
    icon: Globe,
  },
  {
    id: "crm_agent",
    label: "CRM Agent",
    description: "Workspace leads & tenant ops",
    icon: Users,
  },
  {
    id: "general_chat",
    label: "General Assistant",
    description: "Direct LLM reasoning",
    icon: MessageSquareText,
  },
];

const ROUTE_TITLES: Record<string, string> = {
  "/chat": "AI Command Center",
  "/agents": "Agent Studio & Prompts",
  "/knowledge": "RAG Knowledge Base",
  "/crm": "CRM & Lead Pipeline",
  "/settings": "Workspace & API Vault",
  "/change-password": "Account Security",
};

export function Header() {
  const pathname = usePathname();
  const {
    activeWorkspace,
    activeAgent,
    setActiveAgent,
    selectedModel,
    setSelectedModel,
    setIsMobileSidebarOpen,
  } = useWorkspace();

  const pageTitle =
    Object.entries(ROUTE_TITLES).find(([route]) =>
      pathname?.startsWith(route)
    )?.[1] || "StarEleven Workspace";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-[#09090B]/90 px-4 backdrop-blur-md lg:px-6">
      {/* Left: Mobile Trigger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="rounded-xl border border-zinc-800 bg-[#121215] p-2 text-zinc-300 hover:border-zinc-700 hover:text-white lg:hidden"
          aria-label="Open Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-sm font-bold text-white sm:text-base">
            {pageTitle}
          </h1>
          {activeWorkspace && (
            <p className="hidden text-[11px] text-zinc-500 sm:block">
              Tenant:{" "}
              <span className="font-mono text-zinc-400">
                {activeWorkspace.name}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Right: Active Agent Selector + LLM Model Selector */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Active Agent Selector */}
        <div className="relative flex items-center">
          <Bot className="pointer-events-none absolute left-3 h-4 w-4 text-[#84CC16]" />
          <select
            value={activeAgent}
            onChange={(e) => setActiveAgent(e.target.value as AgentType)}
            aria-label="Select Active Agent"
            className="h-9 cursor-pointer appearance-none rounded-xl border border-zinc-800 bg-[#121215] pl-9 pr-7 text-xs font-semibold text-zinc-100 transition hover:border-[#84CC16]/50 focus:border-[#84CC16] focus:outline-none"
          >
            {AGENT_OPTIONS.map((agent) => (
              <option
                key={agent.id}
                value={agent.id}
                className="bg-[#121215] text-zinc-100"
              >
                {agent.label}
              </option>
            ))}
          </select>
        </div>

        {/* LLM Engine / Model Selector */}
        <div className="relative hidden items-center md:flex">
          <Cpu className="pointer-events-none absolute left-3 h-4 w-4 text-[#A3E635]" />
          <select
            value={selectedModel.id}
            onChange={(e) => {
              const found = AVAILABLE_MODELS.find(
                (m) => m.id === e.target.value
              );
              if (found) setSelectedModel(found);
            }}
            aria-label="Select LLM Model"
            className="h-9 cursor-pointer appearance-none rounded-xl border border-zinc-800 bg-[#121215] pl-9 pr-7 font-mono text-xs text-zinc-200 transition hover:border-[#84CC16]/50 focus:border-[#84CC16] focus:outline-none"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option
                key={model.id}
                value={model.id}
                className="bg-[#121215] text-zinc-100"
              >
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live Engine Status Pill */}
        <div
          className="hidden items-center gap-1.5 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-2.5 py-1 xl:flex"
          title="Multi-Tenant Engine Connected"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#84CC16]" />
          <span className="font-mono text-[11px] font-semibold text-[#A3E635]">
            ONLINE
          </span>
        </div>
      </div>
    </header>
  );
}