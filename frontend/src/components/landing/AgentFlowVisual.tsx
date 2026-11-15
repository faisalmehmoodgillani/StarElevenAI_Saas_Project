"use client";

import React from "react";
import {
  Bot,
  Database,
  Globe,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Spotlight3DCard } from "./Spotlight3DCard";

export function AgentFlowVisual() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-800/80 bg-[#09090B] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#84CC16]/35 bg-[#84CC16]/10 px-3.5 py-1 text-xs font-semibold text-[#A3E635]">
            <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>How StarEleven Works in Real Time</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            One Message Triggers Your Entire AI Team
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Watch how a single inquiry automatically routes through your
            private AI hub to research live data, qualify leads, and update
            your client workspace.
          </p>
        </div>

        {/* 3-Stage Animated Neural Architecture */}
        <div className="relative mt-14 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Stage 1: Inbound Inquiry (Left 3 Cols) */}
          <div className="lg:col-span-3">
            <Spotlight3DCard className="p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-[#09090B] text-[#A3E635]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase text-zinc-500">
                    Step 01 • Input
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Customer or Team Prompt
                  </h3>
                </div>
              </div>
              <p className="mt-3 rounded-xl border border-zinc-800 bg-[#09090B] p-3 text-xs leading-relaxed text-zinc-300">
                &ldquo;Find market prices &amp; qualify this $500K buyer lead.&rdquo;
              </p>
            </Spotlight3DCard>
          </div>

          {/* Animated SVG Light Beam Left -> Center */}
          <div className="hidden justify-center lg:col-span-1 lg:flex">
            <svg className="h-8 w-full overflow-visible" viewBox="0 0 80 24">
              <line
                x1="0"
                y1="12"
                x2="80"
                y2="12"
                stroke="#27272A"
                strokeWidth="2"
              />
              <line
                x1="0"
                y1="12"
                x2="80"
                y2="12"
                stroke="#84CC16"
                strokeWidth="3"
                className="animate-beam"
              />
            </svg>
          </div>

          {/* Stage 2: Pulsing Central StarEleven AI Hub (Center 4 Cols) */}
          <div className="lg:col-span-4">
            <Spotlight3DCard highlighted={true} className="p-6 text-center">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span className="animate-pulse-ring absolute inset-0 rounded-full border-2 border-[#84CC16]" />
                <span className="animate-pulse-ring absolute inset-2 rounded-full border border-[#A3E635] [animation-delay:0.8s]" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#84CC16] bg-[#84CC16]/20 text-[#A3E635] shadow-[0_0_30px_rgba(132,204,22,0.35)]">
                  <Bot className="h-8 w-8" />
                </div>
              </div>

              <span className="mt-4 inline-block rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                STEP 02 • SMART AI ROUTER
              </span>
              <h3 className="mt-2 text-lg font-extrabold text-white">
                StarEleven Orchestration Core
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                Picks the fastest AI model, enforces your industry rules, and
                dispatches tasks in parallel.
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-1.5 font-mono text-[10px] text-zinc-400">
                <ShieldCheck className="h-3.5 w-3.5 text-[#84CC16]" />
                <span>Private Workspace Verified</span>
              </div>
            </Spotlight3DCard>
          </div>

          {/* Animated SVG Light Beam Center -> Right */}
          <div className="hidden justify-center lg:col-span-1 lg:flex">
            <svg className="h-8 w-full overflow-visible" viewBox="0 0 80 24">
              <line
                x1="0"
                y1="12"
                x2="80"
                y2="12"
                stroke="#27272A"
                strokeWidth="2"
              />
              <line
                x1="0"
                y1="12"
                x2="80"
                y2="12"
                stroke="#A3E635"
                strokeWidth="3"
                className="animate-beam"
              />
            </svg>
          </div>

          {/* Stage 3: 3 Parallel Live Outcomes (Right 3 Cols) */}
          <div className="space-y-3 lg:col-span-3">
            {[
              {
                icon: Globe,
                title: "Live Web Intelligence",
                desc: "Fetches real-time prices & facts",
              },
              {
                icon: UserCheck,
                title: "24/7 Lead Qualification",
                desc: "Scores budget & books meetings",
              },
              {
                icon: Database,
                title: "Isolated CRM Sync",
                desc: "Saves privately to client account",
              },
            ].map((node) => {
              const Icon = node.icon;
              return (
                <Spotlight3DCard key={node.title} className="p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {node.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400">{node.desc}</p>
                    </div>
                  </div>
                </Spotlight3DCard>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}