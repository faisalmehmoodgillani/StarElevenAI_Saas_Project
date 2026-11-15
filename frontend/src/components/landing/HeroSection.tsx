"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  Lock,
  Network,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { Spotlight3DCard } from "./Spotlight3DCard";

type DemoWorkspace = "apex_realty" | "nova_agency";
type DemoAgent = "meta_router" | "research_agent" | "crm_agent";
type DemoModel = "llama-3.3-70b" | "gemini-2.5-flash" | "claude-3.7-sonnet";

const WORKSPACE_DEMOS: Record<
  DemoWorkspace,
  {
    name: string;
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
    planBadge: "PRIVATE WORKSPACE • $0/MO BYOK",
    prompt:
      "Qualify buyer Omar K. ($450K budget, waterfront villa) and check latest rental yield rates.",
    outputs: {
      meta_router: {
        routeLabel: "Smart AI Team → Market Research + Buyer Qualification",
        toolTrace: "Checking live property rates & scoring buyer readiness...",
        responseTitle: "High-Intent Cash Buyer Qualified (Score: 94/100)",
        bullets: [
          "Buyer Profile: Ready to invest $450K–$520K within 30 days.",
          "Live Market Check: Waterfront units earning 7.4% annual yield.",
          "Action Taken: Viewing slot reserved & saved to private CRM.",
        ],
        latency: "0.4s Live",
      },
      research_agent: {
        routeLabel: "Live Web Researcher → Verified Market Data",
        toolTrace: "Scanning current waterfront occupancy & rental trends...",
        responseTitle: "Live Waterfront Rental Yield Report",
        bullets: [
          "Prime waterfront occupancy reached 96.2% this quarter.",
          "Furnished short-stay units earn +1.8% higher net returns.",
          "All research stays 100% private inside Apex Realty's account.",
        ],
        latency: "0.6s Live",
      },
      crm_agent: {
        routeLabel: "CRM Assistant → Private Client Database",
        toolTrace: "Updating buyer profile & notifying property advisor...",
        responseTitle: "Buyer Lead Saved & Assigned",
        bullets: [
          "Status: Hot Cash Investor • Assigned to Senior Advisor.",
          "Checklist Complete: Budget, location & timeline confirmed.",
          "Zero data mixing — other client accounts cannot see this.",
        ],
        latency: "0.3s Live",
      },
    },
  },
  nova_agency: {
    name: "Nova Growth Agency",
    planBadge: "MANAGED PLAN • ZERO SETUP",
    prompt:
      "Research prospect CloudPulse and write a tailored AI automation proposal for their sales team.",
    outputs: {
      meta_router: {
        routeLabel: "Smart AI Team → Company Audit + Proposal Writer",
        toolTrace: "Researching CloudPulse growth signals & drafting scope...",
        responseTitle: "Custom Client Proposal Ready in 4 Seconds",
        bullets: [
          "Problem Found: Sales team takes 14+ hours to reply to leads.",
          "Solution Pitch: 24/7 AI Lead Qualifier + Instant Call Booking.",
          "Expected Result: 3.4x more booked demos in 45 days.",
        ],
        latency: "0.4s Live",
      },
      research_agent: {
        routeLabel: "Live Web Researcher → Company Intelligence",
        toolTrace: "Checking CloudPulse news, team size & hiring trends...",
        responseTitle: "Company Snapshot — CloudPulse Inc.",
        bullets: [
          "45-person B2B software company expanding their sales team.",
          "Recently launched an enterprise tier with high inquiry volume.",
          "Insights saved exclusively to Nova Growth's workspace.",
        ],
        latency: "0.6s Live",
      },
      crm_agent: {
        routeLabel: "CRM Assistant → Agency Retainer Tracker",
        toolTrace: "Logging proposal & assigning task to account manager...",
        responseTitle: "Proposal Logged for Team Review",
        bullets: [
          "Recommended Retainer: $4,500/mo AI Sales Automation Setup.",
          "Staff Access: Account manager works safely without seeing keys.",
          "Ready to send to client in one click.",
        ],
        latency: "0.3s Live",
      },
    },
  },
};

const MODEL_LABELS: Record<DemoModel, { label: string; provider: string }> = {
  "llama-3.3-70b": { label: "Fast AI (Llama 3.3)", provider: "Groq" },
  "gemini-2.5-flash": { label: "Gemini 2.5", provider: "Google" },
  "claude-3.7-sonnet": { label: "Claude 3.7", provider: "Anthropic" },
};

const MARQUEE_ITEMS = [
  "Groq Ultra-Fast LPU",
  "Google Gemini 2.5",
  "OpenAI GPT-4o & o3",
  "Anthropic Claude 3.7",
  "OpenRouter 100+ Models",
  "100% Isolated Client Workspaces",
  "Bank-Grade AES-256 Vault",
  "LangGraph Multi-Agent Engine",
  "Live Web Intelligence",
];

interface HeroSectionProps {
  onOpenBookCall: () => void;
}

export function HeroSection({ onOpenBookCall }: HeroSectionProps) {
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<DemoWorkspace>("apex_realty");
  const [selectedAgent, setSelectedAgent] = useState<DemoAgent>("meta_router");
  const [selectedModel, setSelectedModel] =
    useState<DemoModel>("llama-3.3-70b");

  const activeWs = WORKSPACE_DEMOS[selectedWorkspace];
  const activeOutput = activeWs.outputs[selectedAgent];

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-zinc-800/80 pt-12 pb-0 sm:pt-16"
    >
      {/* Perspective Cyber Floor Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 25%, rgba(132,204,22,0.16), transparent 55%), linear-gradient(to right, #27272A 1px, transparent 1px), linear-gradient(to bottom, #27272A 1px, transparent 1px)",
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      />

      {/* Ambient Neon Orbs */}
      <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#84CC16]/12 blur-[130px]" />
      <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-[#A3E635]/10 blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left 6 Columns: Persuasive Business Copy */}
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/10 px-3.5 py-1.5 text-xs font-semibold text-[#A3E635] shadow-[0_0_25px_rgba(132,204,22,0.18)]">
              <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
              <span>Next-Gen AI Workforce for Businesses &amp; Agencies</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl xl:text-[54px]">
              Your 24/7 AI Sales, Research &amp; Support Team —{" "}
              <span className="bg-gradient-to-r from-[#84CC16] via-[#A3E635] to-lime-200 bg-clip-text text-transparent">
                Private for Every Client.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              ChatGPT only writes text. StarEleven gives every business or
              client you manage a{" "}
              <strong className="font-semibold text-white">
                100% separate, private AI workspace
              </strong>{" "}
              that qualifies leads, searches live market data, and updates your
              CRM automatically —{" "}
              <span className="font-semibold text-[#A3E635]">
                zero coding required.
              </span>
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-col gap-3.5 pt-1 sm:flex-row sm:items-center">
              <Link
                href="/register?plan=byok_free&interval=annual"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-6 py-3.5 text-sm font-bold text-[#09090B] shadow-[0_0_32px_rgba(132,204,22,0.35)] transition-all hover:scale-[1.02] hover:bg-[#A3E635] active:scale-[0.99]"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span>Start Free ($0/mo)</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                type="button"
                onClick={onOpenBookCall}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#121215]/90 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-[#84CC16]/60 hover:text-[#A3E635]"
              >
                <Calendar className="h-4 w-4 text-[#84CC16]" />
                <span>Book a 1-on-1 Demo Call</span>
              </button>
            </div>

            {/* Trust Guarantees */}
            <div className="grid grid-cols-1 gap-2.5 border-t border-zinc-800/80 pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>Zero Client Data Mixing</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Lock className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>Bank-Grade Key Vault</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Cpu className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>5+ Top AI Models Built-In</span>
              </div>
            </div>

            {/* Subtle Tech Stack Line */}
            <div className="rounded-xl border border-zinc-800/90 bg-[#121215]/80 px-3.5 py-2.5 font-mono text-[11px] text-zinc-400">
              <span className="font-bold text-[#A3E635]">Architecture:</span>{" "}
              LangGraph Multi-Agent Router • PostgreSQL Row-Level Isolation •
              AES-256 Vault • Groq, Gemini, OpenAI &amp; Claude
            </div>
          </div>

          {/* Right 6 Columns: 3D Tilted Floating AI Stage */}
          <div className="relative lg:col-span-6">
            {/* Floating 3D Depth Pill — Top Right */}
            <div className="animate-float-slow pointer-events-none absolute -right-2 -top-5 z-20 hidden items-center gap-2 rounded-xl border border-[#84CC16]/50 bg-[#09090B]/95 px-3.5 py-2 text-[11px] font-bold text-[#A3E635] shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md sm:flex">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#84CC16]" />
              <span>Real-Time SSE Streaming</span>
            </div>

            {/* Floating 3D Depth Pill — Bottom Left */}
            <div className="animate-float-delayed pointer-events-none absolute -bottom-4 -left-3 z-20 hidden items-center gap-2 rounded-xl border border-zinc-700 bg-[#09090B]/95 px-3.5 py-2 text-[11px] font-semibold text-zinc-200 shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-md sm:flex">
              <Lock className="h-3.5 w-3.5 text-[#84CC16]" />
              <span>100% Isolated Client Vault</span>
            </div>

            <Spotlight3DCard highlighted={true} maxTilt={4}>
              {/* Window Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-[#09090B]/90 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#84CC16]" />
                  <span className="ml-1.5 text-xs font-semibold text-zinc-300">
                    Interactive 3D Command Stage
                  </span>
                </div>

                {/* Switch Client Workspace */}
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
                    <span>Real Estate Client</span>
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
                    <span>Agency Client</span>
                  </button>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="grid grid-cols-1 gap-2.5 border-b border-zinc-800/80 bg-[#0D0D10] px-4 py-3 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">
                    1. Choose AI Specialist
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "meta_router", label: "Auto Team", icon: Network },
                        { id: "research_agent", label: "Web Research", icon: Globe },
                        { id: "crm_agent", label: "CRM Leads", icon: Database },
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

                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-400">
                    2. Switch AI Brain Anytime
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(MODEL_LABELS) as DemoModel[]).map((mKey) => {
                      const active = selectedModel === mKey;
                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => setSelectedModel(mKey)}
                          className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
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

              {/* Live Output */}
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 text-[11px]">
                  <span className="text-zinc-400">
                    Workspace: <strong className="text-white">{activeWs.name}</strong>
                  </span>
                  <span className="rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                    {activeWs.planBadge}
                  </span>
                </div>

                <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm border border-[#84CC16]/30 bg-[#84CC16]/10 px-4 py-3 text-xs leading-relaxed text-zinc-100">
                  {activeWs.prompt}
                </div>

                <div className="rounded-2xl rounded-tl-sm border border-zinc-800 bg-[#09090B]/95 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[11px] font-semibold text-[#A3E635]">
                        {activeOutput.routeLabel}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {MODEL_LABELS[selectedModel].provider} •{" "}
                      {activeOutput.latency}
                    </span>
                  </div>

                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
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
            </Spotlight3DCard>
          </div>
        </div>
      </div>

      {/* Infinite Kinetic AI Ecosystem Ticker */}
      <div className="relative overflow-hidden border-t border-zinc-800/80 bg-[#0B0B0E]/90 py-3.5">
        <div className="animate-marquee flex items-center gap-8">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="flex shrink-0 items-center gap-2.5 text-xs font-semibold text-zinc-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#84CC16]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}