"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  HelpCircle,
  KeyRound,
  Sparkles,
  Zap,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question:
      "How does BYOK Free ($0/mo) work compared to Fully Managed plans?",
    answer:
      "On BYOK Free, you get 1 isolated workspace at $0/mo platform fee and store your own Groq, Gemini, OpenAI, Anthropic, or OpenRouter API keys inside our AES-256 encrypted vault—paying providers directly with zero markup. Fully Managed plans include dedicated monthly token pools (2M to 35M tokens/workspace) with pre-configured master keys so you never need to manage external API billing.",
  },
  {
    question:
      "Are client conversations, leads, and API keys isolated across workspaces?",
    answer:
      "Yes. Every workspace is strictly scoped by workspace_id with Supabase PostgreSQL Row-Level Security (RLS), isolated LangGraph conversation checkpoints, and separate Fernet AES-256 encrypted API key vaults. Data never bleeds between client workspaces.",
  },
  {
    question:
      "How do Owner and Operator team permissions protect our API Vault?",
    answer:
      "Workspace Owners control API key configuration, team invitations, industry rules, and plan upgrades. Invited Operators can run AI Command Center chats, research missions, and CRM workflows using the workspace's configured keys without ever viewing or exporting raw API secrets.",
  },
  {
    question:
      "Can we switch between BYOK and Managed plans or add more client workspaces later?",
    answer:
      "Yes. Each workspace manages its own billing tier independently inside Dashboard → Pricing & Quotas. You can start on BYOK Free today and upgrade that workspace—or provision additional Managed client workspaces—whenever your volume scales.",
  },
  {
    question: "Which AI models and orchestration tools are supported?",
    answer:
      "StarEleven supports hot-swapping across Groq (Llama 3.3 70B), Google Gemini (2.5 Flash / Pro), OpenAI (GPT-4o / o3), Anthropic Claude, and OpenRouter—orchestrated by our LangGraph Auto Meta-Router with live Tavily web intelligence and MCP-ready architecture.",
  },
];

export function FaqAndCta() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <>
      {/* FAQ Section */}
      <section
        id="faq"
        className="border-b border-zinc-800/80 bg-[#09090B] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121215] px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#A3E635]">
              <HelpCircle className="h-3.5 w-3.5 text-[#84CC16]" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Architecture, Security & Billing Clarity
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.question}
                  className={`overflow-hidden rounded-2xl border transition-colors ${
                    isOpen
                      ? "border-[#84CC16]/50 bg-[#121215]"
                      : "border-zinc-800 bg-[#121215]/70 hover:border-zinc-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                  >
                    <span className="text-sm font-bold text-zinc-100">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#84CC16] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-zinc-800/80 px-5 py-4 text-xs leading-relaxed text-zinc-400 sm:px-6 sm:text-sm">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* High-Impact Final Conversion Banner */}
      <section className="relative overflow-hidden bg-[#09090B] py-20 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#84CC16]/15 blur-[140px]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-[#84CC16]/40 bg-gradient-to-br from-[#141910] via-[#121215] to-[#0D0D10] p-8 text-center shadow-[0_0_50px_rgba(132,204,22,0.14)] sm:p-12">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3.5 py-1 font-mono text-[11px] font-bold text-[#A3E635]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>PROVISION YOUR WORKSPACE IN 60 SECONDS</span>
            </div>

            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to Deploy Your Multi-Tenant AI Command Center?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              Create your isolated workspace today with BYOK Free ($0/mo) or
              select a Managed token pool—complete with Gmail OTP security,
              Google OAuth, and real-time SSE agent streaming.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/register?plan=byok_free&interval=annual"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-7 py-3.5 text-sm font-bold text-[#09090B] shadow-[0_0_30px_rgba(132,204,22,0.3)] transition hover:bg-[#A3E635] sm:w-auto"
              >
                <KeyRound className="h-4 w-4" />
                <span>Create Free Workspace</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#09090B] px-7 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-[#84CC16]/50 hover:text-white sm:w-auto"
              >
                <span>Sign In to Existing Workspace</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Cyber-Obsidian Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#09090B] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#84CC16]/40 bg-[#84CC16]/15">
              <Zap className="h-4 w-4 text-[#84CC16]" />
            </div>
            <span className="text-sm font-bold text-white">
              Star<span className="text-[#84CC16]">Eleven</span> AI
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              © {new Date().getFullYear()} Multi-Tenant Agent OS
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-400">
            <a href="#platform" className="hover:text-[#A3E635]">
              Platform
            </a>
            <a href="#comparison" className="hover:text-[#A3E635]">
              Comparison
            </a>
            <a href="#industries" className="hover:text-[#A3E635]">
              Industries
            </a>
            <a href="#pricing" className="hover:text-[#A3E635]">
              Pricing
            </a>
            <Link href="/login" className="hover:text-[#A3E635]">
              Sign In
            </Link>
            <Link
              href="/register?plan=byok_free&interval=annual"
              className="font-semibold text-[#A3E635] hover:underline"
            >
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}