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
    title: "Save 70% on AI Bills — Bring Your Own Keys ($0/mo)",
    description:
      "Connect your own Groq, Google Gemini, OpenAI, Claude, or OpenRouter keys inside a secure vault. Pay AI providers directly at wholesale rates with zero extra markup from us — or pick an all-inclusive plan if you don't want to manage keys.",
    badge: "ZERO MARKUP • 5 PROVIDERS",
    techSpec: "Under the hood: Fernet AES-256 encrypted key vault",
    icon: KeyRound,
    span: "lg:col-span-7",
    highlight: true,
    chips: ["Groq Fast AI", "Google Gemini", "OpenAI GPT", "Anthropic Claude", "OpenRouter"],
  },
  {
    title: "100% Separate Space for Every Client",
    description:
      "Manage 5 or 50 client brands from one login. Every client gets their own private chat history, lead records, and monthly usage limit so data never mixes across accounts.",
    badge: "STRICT CLIENT PRIVACY",
    techSpec: "Under the hood: PostgreSQL Row-Level Security (RLS)",
    icon: Layers,
    span: "lg:col-span-5",
    highlight: false,
    chips: ["Private Client Memory", "1-Click Data Purge"],
  },
  {
    title: "AI That Searches Live Web & Qualifies Leads",
    description:
      "Instead of generic replies, StarEleven automatically routes tasks to the right AI specialist — checking live Google/web data, qualifying buyer budgets, and updating your CRM in real time.",
    badge: "SMART ACTION AGENTS",
    techSpec: "Under the hood: LangGraph Meta-Router + Tavily + SSE",
    icon: Network,
    span: "lg:col-span-5",
    highlight: false,
    chips: ["Live Web Research", "Auto Lead Scoring"],
  },
  {
    title: "Invite Your Staff Without Sharing API Keys",
    description:
      "Add team members or client staff via email invitation. Owners control billing and secret keys, while Operators can run daily AI chats and lead tasks safely without ever seeing your private credentials.",
    badge: "SAFE TEAM COLLABORATION",
    techSpec: "Under the hood: Role-Based Access Control (Owner / Operator)",
    icon: Users,
    span: "lg:col-span-7",
    highlight: false,
    chips: ["Hidden Secret Keys", "Staff Role Permissions", "Gmail Invites"],
  },
  {
    title: "1-Click Setup for Your Specific Industry",
    description:
      "Don't waste weeks writing prompts. Pick your business type (Real Estate, Agency, E-Commerce, Clinic, Education, or SaaS) and StarEleven automatically loads proven sales questions and safety rules.",
    badge: "NO PROMPT ENGINEERING",
    techSpec: "Under the hood: Dynamic Industry System Prompts & Guardrails",
    icon: BrainCircuit,
    span: "lg:col-span-6",
    highlight: false,
    chips: ["Ready Sales Scripts", "Brand Safety Rules"],
  },
  {
    title: "Built to Connect With Your Existing Tools",
    description:
      "Seamlessly link your AI workforce with external CRMs, email workflows, and internal knowledge documents so your team works from one unified command center.",
    badge: "FUTURE-PROOF INTEGRATIONS",
    techSpec: "Under the hood: FastAPI v1 + Model Context Protocol (MCP)",
    icon: Workflow,
    span: "lg:col-span-6",
    highlight: false,
    chips: ["CRM & Workflow Ready", "REST & Live Streaming"],
  },
];

export function CapabilitiesBento() {
  return (
    <section
      id="platform"
      className="border-b border-zinc-800/80 bg-[#0B0B0E] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-3.5 py-1 text-xs font-semibold text-[#A3E635]">
            <Cpu className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>Key Benefits &amp; Capabilities</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Everything You Need to Automate Work &amp; Scale Client Accounts
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Designed to be effortless for non-technical business owners, while
            giving technical teams full enterprise security and API control.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {BENTO_FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 transition-all duration-300 sm:p-7 ${
                  item.span
                } ${
                  item.highlight
                    ? "border-[#84CC16]/50 bg-gradient-to-br from-[#131710] via-[#121215] to-[#121215] shadow-[0_0_35px_rgba(132,204,22,0.1)] hover:border-[#84CC16]"
                    : "border-zinc-800 bg-[#121215] hover:border-[#84CC16]/45"
                }`}
              >
                <div>
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
                  <p className="mt-2.5 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {item.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-lg border border-zinc-800/90 bg-[#09090B] px-2.5 py-1 text-[11px] font-medium text-zinc-200"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <p className="border-t border-zinc-800/70 pt-2.5 font-mono text-[11px] text-zinc-500">
                    {item.techSpec}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#121215]/80 px-5 py-4 text-xs text-zinc-300 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#84CC16]" />
            <span>
              <strong className="text-white">100% Peace of Mind:</strong> Your
              staff can use your workspace AI daily without ever seeing,
              copying, or leaking your private API keys.
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#A3E635]">
            BANK-GRADE ENCRYPTION
          </span>
        </div>
      </div>
    </section>
  );
}