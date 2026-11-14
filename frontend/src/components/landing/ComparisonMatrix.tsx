import React from "react";
import { Check, Minus, ShieldCheck, Sparkles, X } from "lucide-react";

interface ComparisonRow {
  capability: string;
  subLabel: string;
  rawChat: string | boolean;
  singleChannelCrm: string | boolean;
  starEleven: string | boolean;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    capability: "Separate Private Workspace Per Client",
    subLabel: "Tech: Strict PostgreSQL Row-Level Security (RLS)",
    rawChat: false,
    singleChannelCrm: "Shared database risk",
    starEleven: "100% Isolated Client Workspaces",
  },
  {
    capability: "Use Your Own AI Keys at $0 Platform Fee",
    subLabel: "Tech: Bank-Grade AES-256 Encrypted Key Vault",
    rawChat: false,
    singleChannelCrm: false,
    starEleven: "Included Free (Zero Markup)",
  },
  {
    capability: "Freedom to Switch AI Providers Anytime",
    subLabel: "Tech: Groq, Gemini, OpenAI, Claude & OpenRouter",
    rawChat: "Locked to 1 provider",
    singleChannelCrm: "1 fixed expensive model",
    starEleven: "All 5+ Top AI Providers in 1 Place",
  },
  {
    capability: "AI That Researches Web & Qualifies Leads",
    subLabel: "Tech: LangGraph Multi-Agent Router + Live Tavily",
    rawChat: "Only writes plain text",
    singleChannelCrm: "Rigid if/else bots",
    starEleven: "Smart Multi-Agent Execution",
  },
  {
    capability: "Safe Staff Access Without Sharing Passwords",
    subLabel: "Tech: Owner & Operator Role-Based Access (RBAC)",
    rawChat: "Pay per seat ($20–$30 each)",
    singleChannelCrm: "Basic user roles",
    starEleven: "Staff Work Safely, Keys Stay Hidden",
  },
  {
    capability: "Ready-to-Use Industry Templates",
    subLabel: "Tech: Pre-tuned Domain Prompts & Guardrails",
    rawChat: false,
    singleChannelCrm: "Generic scripts",
    starEleven: "1-Click Setup for Your Industry",
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
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121215] px-3.5 py-1 text-xs font-semibold text-[#A3E635]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>Why Businesses &amp; Agencies Choose StarEleven</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            More Than a Chatbot — A Complete Business AI System
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Buying individual ChatGPT or Claude accounts mixes up client data
            and requires constant prompting. StarEleven gives you a ready-to-run
            workspace for every business you manage.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#09090B]">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    What Your Business Gets
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400">
                    Regular AI Chats
                    <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                      ChatGPT / Claude Personal Plans
                    </span>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-400">
                    Single-Bot CRM Tools
                    <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                      Locked &amp; Overpriced AI Add-ons
                    </span>
                  </th>
                  <th className="border-l border-[#84CC16]/30 bg-[#84CC16]/10 px-6 py-4 text-xs font-extrabold text-white">
                    <div className="flex items-center gap-1.5 text-[#A3E635]">
                      <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
                      <span>StarEleven AI</span>
                    </div>
                    <span className="mt-0.5 block text-[11px] font-normal text-zinc-300">
                      All-in-One Multi-Client AI OS
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
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-zinc-100 sm:text-sm">
                        {row.capability}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                        {row.subLabel}
                      </p>
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