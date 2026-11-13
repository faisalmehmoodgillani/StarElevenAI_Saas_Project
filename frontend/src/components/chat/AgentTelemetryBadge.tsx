"use client";

import React from "react";
import {
  Bot,
  Database,
  Globe,
  Cpu,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { AgentNodeType } from "@/types/chat";

interface AgentTelemetryBadgeProps {
  agent?: AgentNodeType;
  isStreaming?: boolean;
  latencyMs?: number;
}

interface AgentMeta {
  label: string;
  toolLabel: string;
  icon: React.ReactNode;
  badgeStyle: string;
}

function getAgentMeta(agent?: AgentNodeType): AgentMeta {
  switch (agent) {
    case "research_agent":
      return {
        label: "Deep Research Agent",
        toolLabel: "Tavily Live Web Search",
        icon: <Globe className="h-3.5 w-3.5" />,
        badgeStyle:
          "border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.12)]",
      };
    case "crm_agent":
      return {
        label: "CRM & Lead Specialist",
        toolLabel: "Supabase Tenant DB Query",
        icon: <Database className="h-3.5 w-3.5" />,
        badgeStyle:
          "border-[#84CC16]/40 bg-[#84CC16]/10 text-[#A3E635] shadow-[0_0_15px_rgba(132,204,22,0.15)]",
      };
    case "general_agent":
      return {
        label: "Enterprise Operations Copilot",
        toolLabel: "Direct Synthesis Engine",
        icon: <Bot className="h-3.5 w-3.5" />,
        badgeStyle:
          "border-zinc-700 bg-zinc-800/80 text-zinc-200",
      };
    default:
      return {
        label: "Meta-Intent Router",
        toolLabel: "Analyzing Intent & Selecting Agent",
        icon: <Cpu className="h-3.5 w-3.5" />,
        badgeStyle:
          "border-amber-500/40 bg-amber-500/10 text-amber-300",
      };
  }
}

export function AgentTelemetryBadge({
  agent,
  isStreaming = false,
  latencyMs,
}: AgentTelemetryBadgeProps) {
  const meta = getAgentMeta(agent);

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-all ${meta.badgeStyle}`}
      >
        <span className={isStreaming ? "animate-pulse" : ""}>{meta.icon}</span>
        <span>{meta.label}</span>
        <span className="mx-1 text-zinc-600">•</span>
        <span className="font-mono text-[10px] opacity-90">
          {isStreaming ? `Executing ${meta.toolLabel}...` : meta.toolLabel}
        </span>
        {isStreaming ? (
          <Sparkles className="ml-1 h-3 w-3 animate-spin text-[#A3E635]" />
        ) : (
          <CheckCircle2 className="ml-1 h-3 w-3 text-[#84CC16]" />
        )}
      </div>

      {!isStreaming && typeof latencyMs === "number" && latencyMs > 0 && (
        <span className="rounded-md border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-[10px] text-zinc-400">
          {(latencyMs / 1000).toFixed(2)}s
        </span>
      )}
    </div>
  );
}