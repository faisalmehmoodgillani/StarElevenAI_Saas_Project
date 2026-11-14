import React from "react";
import {
  BrainCircuit,
  Cpu,
  KeyRound,
  Layers,
  Network,
  ShieldAlert,
  Users,
  Workflow,
} from "lucide-react";

const BENTO_FEATURES = [
  {
    title: "AES-256 Fernet BYOK Vault",
    description:
      "Connect your own Groq, Gemini, OpenAI, Anthropic, or OpenRouter API keys per workspace. Encrypted at rest with Fernet AES-256, verified on save, and billed at raw provider rates with zero markup.",
    badge: "ZERO MARKUP • 5 PROVIDERS",
    icon: KeyRound,
    span: "lg:col-span-7",
    highlight: true,
    chips: ["Groq LPU", "Gemini 2.5", "OpenAI", "Anthropic Claude", "OpenRouter"],
  },
  {
    title: "Strict Multi-Tenant Workspace Isolation",
    description:
      "Every client brand runs inside its own workspace_id boundary backed by Supabase PostgreSQL Row-Level Security, isolated chat checkpoints, and dedicated token quotas.",
    badge: "POSTGRESQL RLS",
    icon: Layers,
    span: "lg:col-span-5",
    highlight: false,
    chips: ["Isolated Threads", "Hard-Delete Purge"],
  },
  {
    title: "LangGraph Multi-Agent Orchestration",
    description:
      "Our Auto Meta-Router classifies intent in milliseconds and delegates tasks across Deep Research (Tavily), CRM Intelligence, and specialized subgraphs with real-time SSE token streaming.",
    badge: "STATEFUL EXECUTION",
    icon: Network,
    span: "lg:col-span-5",
    highlight: false,
    chips: ["Meta-Router", "Tavily Web Search", "SSE Stream"],
  },
  {
    title: "RBAC Owner & Operator Security",
    description:
      "Invite team members and client operators via Gmail SMTP without exposing raw credentials. Owners govern the API Vault and billing; Operators run daily AI workflows safely.",
    badge: "ENTERPRISE GOVERNANCE",
    icon: Users,
    span: "lg:col-span-7",
    highlight: false,
    chips: ["Owner Vault Lock", "Operator Seat Access", "Audit Ready"],
  },
  {
    title: "1-Click Industry AI Brain",
    description:
      "Deploy domain-tuned system personas, lead qualification criteria, and custom compliance guardrails tailored for Real Estate, E-Commerce, Healthcare, Education, Agencies, and SaaS.",
    badge: "DOMAIN INTELLIGENCE",
    icon: BrainCircuit,
    span: "lg:col-span-6",
    highlight: false,
    chips: ["Auto Qualification", "Brand Tone Rules"],
  },
  {
    title: "MCP & Workflow-Ready Architecture",
    description:
      "Engineered on FastAPI v1 and Model Context Protocol standards so your agents connect cleanly to external CRMs, vector knowledge bases, and custom automation pipelines.",
    badge: "MCP + FASTAPI V1",
    icon: Workflow,
    span: "lg:col-span-6",
    highlight: false,
    chips: ["Standardized Tool Links", "REST + SSE APIs"],
  },
];

export function CapabilitiesBento() {
  return (
    <section
      id="platform"
      className="border-b border-zinc-800/80 bg-[#0B0B0E] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#A3E635]">
            <Cpu className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>Enterprise Architecture</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Everything Required to Run Production AI Across Clients
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            From encrypted key custody to per-workspace quota metering, every
            layer of StarEleven is engineered for security, speed, and agency
            scalability.
          </p>
        </div>

        {/* 12-Column Bento Grid */}
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {BENTO_FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 sm:p-7 ${
                  item.span
                } ${
                  item.highlight
                    ? "border-[#84CC16]/50 bg-gradient-to-br from-[#131710] via-[#121215] to-[#121215] shadow-[0_0_35px_rgba(132,204,22,0.1)] hover:border-[#84CC16]"
                    : "border-zinc-800 bg-[#121215] hover:border-[#84CC16]/45"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635] transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-[#09090B] px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-zinc-400 group-hover:border-[#84CC16]/30 group-hover:text-[#A3E635]">
                    {item.badge}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold text-white sm:text-xl">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  {item.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {item.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-lg border border-zinc-800/90 bg-[#09090B] px-2.5 py-1 font-mono text-[11px] text-zinc-300"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Assurance Strip */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#121215]/80 px-5 py-4 text-xs text-zinc-400 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#84CC16]" />
            <span>
              <strong className="text-zinc-200">Zero Key Exposure Guarantee:</strong>{" "}
              Operators can trigger LLM chats using workspace keys without ever
              viewing or exporting decrypted secrets.
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#A3E635]">
            FERNET + RLS VERIFIED
          </span>
        </div>
      </div>
    </section>
  );
}