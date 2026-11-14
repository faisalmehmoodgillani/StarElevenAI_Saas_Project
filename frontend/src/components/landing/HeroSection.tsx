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
} from "lucide-react";

type DemoWorkspace = "apex_realty" | "nova_agency";
type DemoAgent = "meta_router" | "research_agent" | "crm_agent";
type DemoModel = "llama-3.3-70b" | "gemini-2.5-flash" | "claude-3.7-sonnet";

const WORKSPACE_DEMOS: Record<
  DemoWorkspace,
  {
    name: string;
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
    industry: "Real Estate & Property",
    planBadge: "PRIVATE WORKSPACE • $0/MO BYOK",
    prompt:
      "Qualify buyer Omar K. ($450K budget, waterfront apartment) and check latest rental yield rates.",
    outputs: {
      meta_router: {
        routeLabel: "Smart AI Team → Market Research + Buyer Qualification",
        toolTrace: "Checking live property rates & scoring buyer readiness...",
        responseTitle: "High-Intent Cash Buyer Qualified (Score: 94/100)",
        bullets: [
          "Buyer Profile: Ready to invest $450K–$520K within 30 days.",
          "Live Market Check: Waterfront 2BR units are earning 7.4% annual yield.",
          "Action Taken: Viewing slot reserved & buyer summary saved to CRM.",
        ],
        latency: "0.4s Live",
      },
      research_agent: {
        routeLabel: "Live Web Researcher → Verified Market Data",
        toolTrace: "Scanning current waterfront occupancy & rental trends...",
        responseTitle: "Live Waterfront Rental Yield Report",
        bullets: [
          "Prime waterfront occupancy reached 96.2% in the latest quarter.",
          "Furnished short-stay units earn +1.8% higher net returns.",
          "All research stays 100% private inside Apex Realty's workspace.",
        ],
        latency: "0.6s Live",
      },
      crm_agent: {
        routeLabel: "CRM Assistant → Private Client Database",
        toolTrace: "Updating buyer profile & notifying property advisor...",
        responseTitle: "Buyer Lead Saved & Assigned",
        bullets: [
          "Status: Hot Cash Investor • Assigned to Senior Property Advisor.",
          "Checklist Complete: Budget, location & timeline confirmed automatically.",
          "100% isolated — other client accounts cannot see this data.",
        ],
        latency: "0.3s Live",
      },
    },
  },
  nova_agency: {
    name: "Nova Growth Agency",
    industry: "Marketing & B2B Agency",
    planBadge: "ALL-INCLUSIVE PLAN • ZERO SETUP",
    prompt:
      "Research prospect CloudPulse and write a tailored AI automation proposal for their sales team.",
    outputs: {
      meta_router: {
        routeLabel: "Smart AI Team → Company Audit + Proposal Writer",
        toolTrace: "Researching CloudPulse growth signals & drafting scope...",
        responseTitle: "Custom Client Proposal Ready in 4 Seconds",
        bullets: [
          "Problem Found: Their sales team takes 14+ hours to reply to new leads.",
          "Solution Pitch: 24/7 AI Lead Qualifier + Instant Calendar Booking.",
          "Expected Result: 3.4x more booked demos in the first 45 days.",
        ],
        latency: "0.4s Live",
      },
      research_agent: {
        routeLabel: "Live Web Researcher → Company Intelligence",
        toolTrace: "Checking CloudPulse news, team size & hiring trends...",
        responseTitle: "Company Snapshot — CloudPulse Inc.",
        bullets: [
          "45-person B2B software company currently expanding their sales team.",
          "Recently launched a new enterprise product with high inquiry volume.",
          "Insights saved exclusively to Nova Growth Agency's workspace.",
        ],
        latency: "0.6s Live",
      },
      crm_agent: {
        routeLabel: "CRM Assistant → Agency Retainer Tracker",
        toolTrace: "Logging proposal & assigning task to account manager...",
        responseTitle: "Proposal Logged for Team Review",
        bullets: [
          "Recommended Retainer: $4,500/mo AI Sales Automation Setup.",
          "Team Access: Account manager can edit without seeing billing keys.",
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
      className="relative overflow-hidden border-b border-zinc-800/80 pt-12 pb-20 sm:pt-18 sm:pb-24"
    >
      {/* Subtle Cyber Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #27272A 1px, transparent 1px), linear-gradient(to bottom, #27272A 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Ambient Electric Lime Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[#84CC16]/12 blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left 6 Columns: Crystal-Clear Business Outcome Copy */}
          <div className="space-y-6 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#84CC16]/35 bg-[#84CC16]/10 px-3.5 py-1.5 text-xs font-semibold text-[#A3E635]">
              <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
              <span>All-in-One AI Workforce for Businesses &amp; Agencies</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.13] tracking-tight text-white sm:text-5xl xl:text-[52px]">
              Your 24/7 AI Sales, Research &amp; Support Team —{" "}
              <span className="bg-gradient-to-r from-[#84CC16] via-[#A3E635] to-lime-300 bg-clip-text text-transparent">
                Private for Every Client.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              ChatGPT only writes text. StarEleven gives each of your businesses
              or clients a{" "}
              <strong className="font-semibold text-white">
                100% separate, private AI workspace
              </strong>{" "}
              that qualifies leads, researches live market data, and updates
              your CRM automatically —{" "}
              <span className="font-semibold text-[#A3E635]">
                no coding or prompt skills needed.
              </span>
            </p>

            {/* Dual Conversion CTAs: Start Free + Book a Demo Call */}
            <div className="flex flex-col gap-3.5 pt-1 sm:flex-row sm:items-center">
              <Link
                href="/register?plan=byok_free&interval=annual"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-6 py-3.5 text-sm font-bold text-[#09090B] shadow-[0_0_30px_rgba(132,204,22,0.32)] transition-all hover:bg-[#A3E635] active:scale-[0.99]"
              >
                <span>Start Free ($0/mo)</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                type="button"
                onClick={onOpenBookCall}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#121215] px-6 py-3.5 text-sm font-semibold text-white transition hover:border-[#84CC16]/60 hover:text-[#A3E635]"
              >
                <Calendar className="h-4 w-4 text-[#84CC16]" />
                <span>Book a 1-on-1 Demo Call</span>
              </button>
            </div>

            {/* Non-Technical Business Guarantees */}
            <div className="grid grid-cols-1 gap-2.5 border-t border-zinc-800/80 pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>Zero Client Data Mixing</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Lock className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>Bank-Grade Key Security</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Cpu className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <span>5+ Top AI Models Built-In</span>
              </div>
            </div>

            {/* Clean Technical Architecture Pill (For CTOs & Technical Buyers) */}
            <div className="rounded-xl border border-zinc-800/90 bg-[#121215]/80 px-3.5 py-2.5 font-mono text-[11px] text-zinc-400">
              <span className="font-bold text-[#A3E635]">Tech Stack:</span>{" "}
              LangGraph Multi-Agent Router • PostgreSQL Row-Level Isolation •
              AES-256 Key Vault • Groq, Gemini, OpenAI &amp; Claude
            </div>
          </div>

          {/* Right 6 Columns: Interactive Live Workspace Demo */}
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215]/95 shadow-[0_0_50px_rgba(0,0,0,0.85)] backdrop-blur-xl">
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#84CC16] to-transparent" />

              {/* Top Bar + Workspace Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-[#09090B]/90 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#84CC16]" />
                  <span className="ml-1.5 text-xs font-semibold text-zinc-300">
                    Interactive Live Preview
                  </span>
                </div>

                {/* Switch Between Two Client Accounts */}
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

              {/* Specialist & AI Brain Controls */}
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

              {/* Simulated Live Output */}
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 text-[11px]">
                  <span className="text-zinc-400">
                    Workspace: <strong className="text-white">{activeWs.name}</strong>
                  </span>
                  <span className="rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                    {activeWs.planBadge}
                  </span>
                </div>

                {/* User Inquiry */}
                <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm border border-[#84CC16]/30 bg-[#84CC16]/10 px-4 py-3 text-xs leading-relaxed text-zinc-100">
                  {activeWs.prompt}
                </div>

                {/* AI Result */}
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}