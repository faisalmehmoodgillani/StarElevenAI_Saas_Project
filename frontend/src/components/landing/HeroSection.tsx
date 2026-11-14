"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  KeyRound,
  Lock,
  Network,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

type DemoWorkspace = "apex_realty" | "nova_agency";
type DemoAgent = "meta_router" | "research_agent" | "crm_agent";
type DemoModel = "llama-3.3-70b" | "gemini-2.5-flash" | "claude-3.7-sonnet";

const WORKSPACE_DEMOS: Record<
  DemoWorkspace,
  {
    name: string;
    slug: string;
    industry: string;
    planBadge: string;
    prompt: string;
    outputs: Record<
      DemoAgent,
      {
        routeLabel: string;
        toolTrace: string;
        responseTitle: string;
        bullets: string[];
        latency: string;
      }
    >;
  }
> = {
  apex_realty: {
    name: "Apex Luxury Realty",
    slug: "apex-realty",
    industry: "Real Estate & Property",
    planBadge: "BYOK VAULT • AES-256",
    prompt:
      "Qualify inbound investor lead Omar K. ($450K budget, Marina waterfront) and compare Q4 rental yield trends.",
    outputs: {
      meta_router: {
        routeLabel: "Auto Meta-Router → Research + CRM Subgraph",
        toolTrace: "Executing Tavily Market Intel + Supabase Tenant CRM...",
        responseTitle: "Lead Qualified (Score: 94/100) & Yield Brief Ready",
        bullets: [
          "Investor Tier: Cash-ready buyer ($450K–$520K) seeking 30-day closing.",
          "Market Benchmark: Waterfront 2BR net yields averaging 7.4% YoY.",
          "Next Action: Site tour slot reserved & dossier synced to workspace CRM.",
        ],
        latency: "410ms SSE",
      },
      research_agent: {
        routeLabel: "Research Agent → Live Tavily Web Search",
        toolTrace: "Querying verified Q4 commercial & waterfront property indices...",
        responseTitle: "Live Waterfront Rental Yield & Supply Snapshot",
        bullets: [
          "Prime waterfront occupancy reached 96.2% across Q4 institutional reports.",
          "Short-stay furnished units outperform annual leases by +1.8% net yield.",
          "Sources verified & isolated inside Apex Luxury Realty memory thread.",
        ],
        latency: "680ms SSE",
      },
      crm_agent: {
        routeLabel: "CRM Agent → PostgreSQL RLS Workspace Store",
        toolTrace: "Inspecting tenant lead pipeline & qualification rules...",
        responseTitle: "Tenant Lead Record Updated (RLS Verified)",
        bullets: [
          "Assigned Stage: High-Intent Investor • Owner: Senior Property Advisor.",
          "Guardrail Check: Budget, timeline, and financing criteria 100% captured.",
          "Zero cross-tenant leakage — isolated to workspace_id: 9f4a...c12.",
        ],
        latency: "290ms SSE",
      },
    },
  },
  nova_agency: {
    name: "Nova Growth Partners",
    slug: "nova-growth",
    industry: "Marketing & AI Agency",
    planBadge: "MANAGED GROWTH • 10M POOL",
    prompt:
      "Audit B2B SaaS prospect CloudPulse and generate a tailored outbound AI automation proposal.",
    outputs: {
      meta_router: {
        routeLabel: "Auto Meta-Router → Deep Research + Proposal Engine",
        toolTrace: "Synthesizing company stack + Industry AI Brain rules...",
        responseTitle: "Executive AI Deployment Roadmap Generated",
        bullets: [
          "Bottleneck Detected: 14-hour average SDR lead response delay.",
          "Proposed Stack: 24/7 Multi-Agent Inbound Qualifier + HubSpot MCP sync.",
          "Projected ROI: 3.4x demo booking lift within first 45 days.",
        ],
        latency: "385ms SSE",
      },
      research_agent: {
        routeLabel: "Research Agent → Live Tavily Intelligence",
        toolTrace: "Scanning CloudPulse product changelog, hiring & funding signals...",
        responseTitle: "Prospect Intelligence Brief — CloudPulse Inc.",
        bullets: [
          "Series A B2B SaaS (45 employees) actively hiring 3 RevOps engineers.",
          "Recent launch of enterprise tier creates immediate onboarding volume.",
          "Citations indexed to Nova Growth Partners thread checkpoint.",
        ],
        latency: "620ms SSE",
      },
      crm_agent: {
        routeLabel: "CRM Agent → Workspace Quota & Pipeline Ops",
        toolTrace: "Checking workspace token pool & operator RBAC permissions...",
        responseTitle: "Proposal Logged & Operator Task Dispatched",
        bullets: [
          "Retainer Tier Matched: $4,500/mo Autonomous RevOps Implementation.",
          "Token Usage: 1,420 tokens deducted from Nova Growth isolated pool.",
          "Ready for one-click client presentation export.",
        ],
        latency: "260ms SSE",
      },
    },
  },
};

const MODEL_LABELS: Record<DemoModel, { label: string; provider: string }> = {
  "llama-3.3-70b": { label: "Llama 3.3 70B", provider: "Groq LPU" },
  "gemini-2.5-flash": { label: "Gemini 2.5 Flash", provider: "Google AI" },
  "claude-3.7-sonnet": { label: "Claude 3.7 Sonnet", provider: "Anthropic" },
};

export function HeroSection() {
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<DemoWorkspace>("apex_realty");
  const [selectedAgent, setSelectedAgent] = useState<DemoAgent>("meta_router");
  const [selectedModel, setSelectedModel] =
    useState<DemoModel>("llama-3.3-70b");

  const activeWs = WORKSPACE_DEMOS[selectedWorkspace];
  const activeOutput = activeWs.outputs[selectedAgent];

  return (
    <section className="relative overflow-hidden border-b border-zinc-800/80 pt-14 pb-20 sm:pt-20 sm:pb-28">
      {/* Cyber Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #27272A 1px, transparent 1px), linear-gradient(to bottom, #27272A 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Ambient Electric Lime Glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[780px] -translate-x-1/2 rounded-full bg-[#84CC16]/12 blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left 6 Columns: Persuasive B2B SaaS Copy & Dual CTAs */}
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#84CC16]/35 bg-[#84CC16]/10 px-3.5 py-1.5 text-xs font-semibold text-[#A3E635] shadow-[0_0_20px_rgba(132,204,22,0.15)]">
              <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
              <span>Multi-Tenant Agentic AI OS for Agencies & B2B Teams</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl xl:text-[54px]">
              Stop Renting Single-Bot Chats.{" "}
              <span className="bg-gradient-to-r from-[#84CC16] via-[#A3E635] to-lime-300 bg-clip-text text-transparent">
                Orchestrate Isolated AI Workspaces.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              StarEleven AI unites{" "}
              <strong className="font-semibold text-zinc-200">
                LangGraph multi-agent routing
              </strong>
              , live web intelligence, and{" "}
              <strong className="font-semibold text-zinc-200">
                AES-256 BYOK key vaults
              </strong>{" "}
              inside Row-Level Security isolated tenant workspaces. Run your own
              keys at <span className="font-mono text-[#A3E635]">$0/mo</span> or
              deploy turnkey Managed token pools per client.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col gap-3.5 pt-2 sm:flex-row sm:items-center">
              <Link
                href="/register?plan=byok_free&interval=annual"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-6 py-3.5 text-sm font-bold text-[#09090B] shadow-[0_0_30px_rgba(132,204,22,0.32)] transition-all hover:bg-[#A3E635] active:scale-[0.99]"
              >
                <KeyRound className="h-4 w-4" />
                <span>Start Free with BYOK ($0/mo)</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#121215] px-6 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-[#84CC16]/50 hover:text-white"
              >
                <span>Compare Managed Plans</span>
              </a>
            </div>

            {/* Enterprise Trust Telemetry Strip */}
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/80 pt-6 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>PostgreSQL RLS Isolated</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Lock className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>Fernet AES-256 Vault</span>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-xs text-zinc-400 sm:col-span-1">
                <Cpu className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>5+ LLM Providers Hot-Swap</span>
              </div>
            </div>
          </div>

          {/* Right 6 Columns: Interactive Live AI Command Center Preview Card */}
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215]/95 shadow-[0_0_50px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              {/* Top Electric Lime Shimmer Accent */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#84CC16] to-transparent" />

              {/* Window Bar + Interactive Workspace Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-[#09090B]/90 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#84CC16]" />
                  <span className="ml-1.5 font-mono text-[11px] font-semibold text-zinc-300">
                    command-center // live-preview
                  </span>
                </div>

                {/* Tenant Workspace Toggle */}
                <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-[#121215] p-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedWorkspace("apex_realty")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      selectedWorkspace === "apex_realty"
                        ? "bg-[#84CC16] text-[#09090B]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Building2 className="h-3 w-3" />
                    <span>Apex Realty</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkspace("nova_agency")}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      selectedWorkspace === "nova_agency"
                        ? "bg-[#84CC16] text-[#09090B]"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Nova Agency</span>
                  </button>
                </div>
              </div>

              {/* Controls Bar: Agent Router + LLM Model Switcher */}
              <div className="grid grid-cols-1 gap-2.5 border-b border-zinc-800/80 bg-[#0D0D10] px-4 py-3 sm:grid-cols-2">
                {/* Agent Selector Pills */}
                <div>
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Active LangGraph Node
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "meta_router", label: "Meta-Router", icon: Network },
                        { id: "research_agent", label: "Research", icon: Globe },
                        { id: "crm_agent", label: "CRM Ops", icon: Database },
                      ] as const
                    ).map((agent) => {
                      const Icon = agent.icon;
                      const active = selectedAgent === agent.id;
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => setSelectedAgent(agent.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                            active
                              ? "border-[#84CC16]/60 bg-[#84CC16]/15 text-[#A3E635]"
                              : "border-zinc-800 bg-[#121215] text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{agent.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LLM Provider Hot-Swap */}
                <div>
                  <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Hot-Swappable LLM Engine
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(MODEL_LABELS) as DemoModel[]).map((mKey) => {
                      const active = selectedModel === mKey;
                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => setSelectedModel(mKey)}
                          className={`rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold transition ${
                            active
                              ? "border-[#84CC16]/60 bg-[#84CC16]/15 text-[#A3E635]"
                              : "border-zinc-800 bg-[#121215] text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {MODEL_LABELS[mKey].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Simulated Live Chat Stream */}
              <div className="space-y-4 p-4 sm:p-5">
                {/* Tenant Context Telemetry */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 text-[11px]">
                  <span className="font-mono text-zinc-400">
                    Tenant: <strong className="text-white">{activeWs.name}</strong>{" "}
                    <span className="text-zinc-500">({activeWs.industry})</span>
                  </span>
                  <span className="rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                    {activeWs.planBadge}
                  </span>
                </div>

                {/* User Prompt Bubble */}
                <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm border border-[#84CC16]/30 bg-[#84CC16]/10 px-4 py-3 text-xs leading-relaxed text-zinc-100">
                  {activeWs.prompt}
                </div>

                {/* AI Execution & Streaming Output Card */}
                <div className="rounded-2xl rounded-tl-sm border border-zinc-800 bg-[#09090B]/95 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-[#A3E635]">
                        {activeOutput.routeLabel}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {MODEL_LABELS[selectedModel].provider} •{" "}
                      {activeOutput.latency}
                    </span>
                  </div>

                  {/* Tool Execution Pill */}
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-300">
                    <Terminal className="h-3 w-3 animate-pulse" />
                    <span>{activeOutput.toolTrace}</span>
                  </div>

                  <h3 className="mt-3 text-xs font-bold text-white">
                    {activeOutput.responseTitle}
                  </h3>

                  <ul className="mt-2 space-y-1.5">
                    {activeOutput.bullets.map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-2 text-xs leading-relaxed text-zinc-300"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#84CC16]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}