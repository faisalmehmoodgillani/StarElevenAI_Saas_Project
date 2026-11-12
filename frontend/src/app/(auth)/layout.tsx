import React from "react";
import { Cpu, ShieldCheck, Sparkles, Zap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface-bg text-zinc-100 selection:bg-brand/30 selection:text-brand-glow">
      {/* Animated Cyber Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Ambient Electric Lime Glow Orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-brand/15 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] animate-pulse rounded-full bg-brand-glow/10 blur-[140px]" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-12">
        {/* Left Brand & Architecture Showcase Panel */}
        <div className="hidden flex-col justify-between border-r border-surface-border/70 bg-surface-card/40 p-10 backdrop-blur-md lg:col-span-5 lg:flex">
          {/* Top Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-brand/40 bg-brand/15 shadow-lime-sm">
              <Zap className="h-5 w-5 text-brand" />
              <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                Star<span className="text-brand">Eleven</span>
              </span>
              <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                Agentic AI SaaS OS
              </p>
            </div>
          </div>

          {/* Center Hero Copy & Live Feature Cards */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-medium text-brand-glow shadow-lime-sm">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand" />
              <span>Multi-Tenant LangGraph + MCP Engine</span>
            </div>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
              Autonomous AI Agents for{" "}
              <span className="bg-gradient-to-r from-brand to-brand-glow bg-clip-text text-transparent">
                Modern Agencies
              </span>
            </h1>

            <p className="text-sm leading-relaxed text-zinc-400">
              Orchestrate specialized Research, CRM, and Automation agents with
              isolated Supabase workspaces, real-time SSE token streaming, and
              AES-256 encrypted API key vaults.
            </p>

            {/* Animated Capability Cards */}
            <div className="space-y-3 pt-2">
              <div className="group flex items-start gap-3.5 rounded-xl border border-surface-border bg-surface-bg/80 p-3.5 transition-all duration-300 hover:border-brand/50 hover:shadow-lime-sm">
                <div className="mt-0.5 rounded-lg bg-brand/15 p-2 text-brand transition-transform duration-300 group-hover:scale-110">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-100">
                    Dynamic Multi-LLM Routing
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Hot-swap Groq, Gemini, OpenAI, Anthropic & OpenRouter per
                    client workspace.
                  </p>
                </div>
              </div>

              <div className="group flex items-start gap-3.5 rounded-xl border border-surface-border bg-surface-bg/80 p-3.5 transition-all duration-300 hover:border-brand/50 hover:shadow-lime-sm">
                <div className="mt-0.5 rounded-lg bg-brand/15 p-2 text-brand transition-transform duration-300 group-hover:scale-110">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-100">
                    Enterprise Tenant Isolation & Vault
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    PostgreSQL Row-Level Security + Fernet AES-256 encrypted
                    credentials.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Status Footer */}
          <div className="flex items-center justify-between border-t border-surface-border/70 pt-5 text-xs text-zinc-500">
            <span className="font-mono">v1.0.0 • PRODUCTION CORE</span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-brand shadow-lime-sm" />
              Supabase & FastAPI Ready
            </span>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="flex items-center justify-center p-6 sm:p-10 lg:col-span-7">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}