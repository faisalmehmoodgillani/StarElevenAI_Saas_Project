"use client";

import React from "react";
import {
  BrainCircuit,
  Cpu,
  KeyRound,
  Layers,
  Lock,
  Network,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { Spotlight3DCard } from "./Spotlight3DCard";

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
            <span>3D Enterprise Capabilities</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Built to Save Costs, Protect Clients &amp; Scale Fast
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Simple enough for any business owner to launch in 60 seconds —
            powerful enough for technical teams to customize every layer.
          </p>
        </div>

        {/* 12-Column 3D Spotlight Bento Grid */}
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Card 1: BYOK Vault with Visual Provider Matrix (7 Cols) */}
          <Spotlight3DCard highlighted={true} className="p-6 sm:p-7 lg:col-span-7">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-md">
                <span className="rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3 py-1 font-mono text-[10px] font-bold text-[#A3E635]">
                  $0/MO PLATFORM FEE • ZERO MARKUP
                </span>
                <h3 className="mt-4 text-xl font-extrabold text-white">
                  Bring Your Own AI Keys — Save Up to 70%
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                  Plug in your own Groq, Gemini, OpenAI, Claude, or OpenRouter
                  keys inside an encrypted vault, or pick an all-inclusive
                  Managed plan with zero setup.
                </p>
                <p className="mt-3 font-mono text-[11px] text-zinc-500">
                  Tech: Fernet AES-256 Encrypted Key Custody
                </p>
              </div>

              {/* Animated Visual Vault Widget */}
              <div className="shrink-0 rounded-2xl border border-zinc-800 bg-[#09090B] p-4 sm:w-56">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <span className="font-mono text-[10px] font-bold text-[#A3E635]">
                    AES-256 VAULT
                  </span>
                  <Lock className="h-3.5 w-3.5 text-[#84CC16]" />
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { name: "Groq LPU", status: "ENCRYPTED" },
                    { name: "Gemini 2.5", status: "ENCRYPTED" },
                    { name: "OpenAI / Claude", status: "READY" },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-[#121215] px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="font-medium text-zinc-200">
                        {row.name}
                      </span>
                      <span className="font-mono text-[9px] font-bold text-[#84CC16]">
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Spotlight3DCard>

          {/* Card 2: Multi-Tenant Stacked Workspaces (5 Cols) */}
          <Spotlight3DCard className="p-6 sm:p-7 lg:col-span-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                <Layers className="h-5 w-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-zinc-400">
                100% CLIENT ISOLATION
              </span>
            </div>

            <h3 className="mt-4 text-lg font-extrabold text-white">
              Separate Private Space Per Client
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              Manage 5 or 50 client brands from one login. Every client gets
              private memory, leads, and quotas.
            </p>

            {/* Stacked Workspace Visual */}
            <div className="mt-4 space-y-1.5 rounded-xl border border-zinc-800 bg-[#09090B] p-3">
              <div className="flex items-center justify-between rounded-lg border border-[#84CC16]/40 bg-[#84CC16]/10 px-3 py-1.5 text-[11px] font-semibold text-white">
                <span>Client A • Real Estate</span>
                <span className="font-mono text-[9px] text-[#A3E635]">ISOLATED</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-[#121215] px-3 py-1.5 text-[11px] text-zinc-400">
                <span>Client B • E-Commerce</span>
                <span className="font-mono text-[9px]">ISOLATED</span>
              </div>
            </div>
          </Spotlight3DCard>

          {/* Card 3: Smart Action Agents (5 Cols) */}
          <Spotlight3DCard className="p-6 sm:p-7 lg:col-span-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                <Network className="h-5 w-5" />
              </div>
              <span className="font-mono text-[10px] font-bold text-zinc-400">
                LIVE WEB + CRM
              </span>
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-white">
              AI That Takes Real Action
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              Searches live Google/web data, scores lead budgets, and updates
              your database automatically in real time.
            </p>
            <p className="mt-4 border-t border-zinc-800/80 pt-3 font-mono text-[11px] text-zinc-500">
              Tech: LangGraph Meta-Router + Tavily + SSE
            </p>
          </Spotlight3DCard>

          {/* Card 4: Safe Staff Permissions (7 Cols) */}
          <Spotlight3DCard className="p-6 sm:p-7 lg:col-span-7">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-md">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-[#A3E635]">
                    OWNER &amp; OPERATOR ROLES
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-extrabold text-white">
                  Invite Staff Without Exposing Secret Keys
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                  Send 1-click email invites to your team or client operators.
                  They can chat and manage leads daily while billing and API
                  keys stay locked to you.
                </p>
              </div>

              {/* RBAC Visual Card */}
              <div className="shrink-0 space-y-2 rounded-2xl border border-zinc-800 bg-[#09090B] p-4 sm:w-56">
                <div className="rounded-lg border border-[#84CC16]/40 bg-[#84CC16]/10 p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#A3E635]">
                    <span>Owner</span>
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <p className="mt-0.5 text-[10px] text-zinc-300">
                    Full Vault, Billing &amp; Team Control
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-[#121215] p-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-200">
                    <span>Operator</span>
                    <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                  </div>
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    Runs AI Chats &amp; Leads (Keys Hidden)
                  </p>
                </div>
              </div>
            </div>
          </Spotlight3DCard>

          {/* Card 5: Industry Brain (6 Cols) */}
          <Spotlight3DCard className="p-6 sm:p-7 lg:col-span-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-[#A3E635]">
                  NO PROMPT ENGINEERING
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  1-Click Industry AI Brain
                </h3>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              Pick Real Estate, Agency, E-Commerce, Healthcare, Education, or
              SaaS — StarEleven loads proven sales qualification questions and
              safety guardrails automatically.
            </p>
          </Spotlight3DCard>

          {/* Card 6: MCP & Workflow Ready (6 Cols) */}
          <Spotlight3DCard className="p-6 sm:p-7 lg:col-span-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-[#A3E635]">
                  MCP + FASTAPI V1
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Ready for External Tools &amp; Workflows
                </h3>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-300 sm:text-sm">
              Built on standardized Model Context Protocol (MCP) and modular
              APIs so your agents connect smoothly to CRMs, documents, and
              custom automations.
            </p>
          </Spotlight3DCard>
        </div>
      </div>
    </section>
  );
}