import React from "react";
import { Check, Minus, ShieldCheck, Sparkles, X } from "lucide-react";

interface ComparisonRow {
  capability: string;
  rawChat: string | boolean;
  singleChannelCrm: string | boolean;
  starEleven: string | boolean;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    capability: "Multi-Tenant Client Workspace Isolation",
    rawChat: false,
    singleChannelCrm: "Partial (Shared DB)",
    starEleven: "Strict PostgreSQL RLS + Workspace ID",
  },
  {
    capability: "Bring Your Own Keys (BYOK) at $0/mo",
    rawChat: false,
    singleChannelCrm: false,
    starEleven: "AES-256 Fernet Vault (Zero Markup)",
  },
  {
    capability: "Supported LLM Providers",
    rawChat: "Locked to 1 Vendor",
    singleChannelCrm: "1–2 Hardcoded Models",
    starEleven: "Groq, Gemini, OpenAI, Claude & OpenRouter",
  },
  {
    capability: "Multi-Agent Orchestration & Web Research",
    rawChat: "Manual Prompting",
    singleChannelCrm: "Rigid Rule Trees",
    starEleven: "LangGraph Meta-Router + Tavily + MCP",
  },
  {
    capability: "Team RBAC (Owner vs. Operator Access)",
    rawChat: "Expensive Per-Seat",
    singleChannelCrm: "Basic Permissions",
    starEleven: "Vault-Protected Owner & Operator Roles",
  },
  {
    capability: "Turnkey Managed Token Pools (No Key Setup)",
    rawChat: "Rate-Limited Caps",
    singleChannelCrm: "3x–5x Token Markup",
    starEleven: "Transparent Per-Workspace Monthly Pools",
  },
  {
    capability: "Industry-Specific AI Brain & Guardrails",
    rawChat: false,
    singleChannelCrm: "Generic Templates",
    starEleven: "1-Click Vertical Presets & Live Rules",
  },
];

function renderCellValue(val: string | boolean, isStarEleven = false) {
  if (typeof val === "boolean") {
    return val ? (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#84CC16]/20 text-[#A3E635]">
        <Check className="h-3.5 w-3.5" />
      </span>
    ) : (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-zinc-600">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        isStarEleven ? "font-semibold text-[#A3E635]" : "text-zinc-400"
      }`}
    >
      {isStarEleven ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-[#84CC16]" />
      ) : (
        <Minus className="h-3 w-3 shrink-0 text-zinc-600" />
      )}
      <span>{val}</span>
    </span>
  );
}

export function ComparisonMatrix() {
  return (
    <section
      id="comparison"
      className="border-b border-zinc-800/80 bg-[#09090B] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121215] px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#A3E635]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>Why Agencies & B2B Teams Switch</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Built for Multi-Client Operations, Not Single-Player Chat
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Consumer chat subscriptions leak context across clients, and rigid
            CRMs lock you into one overpriced model. StarEleven gives you full
            architectural control.
          </p>
        </div>

        {/* Responsive Comparison Table */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#09090B]">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Platform Capability
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400">
                    Raw AI Subscriptions
                    <span className="mt-0.5 block font-mono text-[10px] font-normal text-zinc-500">
                      ChatGPT / Claude Consumer
                    </span>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400">
                    Single-Channel AI Tools
                    <span className="mt-0.5 block font-mono text-[10px] font-normal text-zinc-500">
                      Rigid Wrappers & Legacy CRMs
                    </span>
                  </th>
                  <th className="border-l border-[#84CC16]/30 bg-[#84CC16]/10 px-6 py-4 text-xs font-extrabold text-white">
                    <div className="flex items-center gap-1.5 text-[#A3E635]">
                      <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
                      <span>StarEleven AI OS</span>
                    </div>
                    <span className="mt-0.5 block font-mono text-[10px] font-normal text-zinc-300">
                      Multi-Tenant Agent Infrastructure
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.capability}
                    className="transition-colors hover:bg-zinc-900/50"
                  >
                    <td className="px-6 py-4 text-xs font-semibold text-zinc-200 sm:text-sm">
                      {row.capability}
                    </td>
                    <td className="px-6 py-4">
                      {renderCellValue(row.rawChat)}
                    </td>
                    <td className="px-6 py-4">
                      {renderCellValue(row.singleChannelCrm)}
                    </td>
                    <td className="border-l border-[#84CC16]/25 bg-[#84CC16]/[0.04] px-6 py-4">
                      {renderCellValue(row.starEleven, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}