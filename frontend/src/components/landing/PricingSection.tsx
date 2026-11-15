"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  KeyRound,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { Spotlight3DCard } from "./Spotlight3DCard";

export type PublicPlanTierId =
  | "byok_free"
  | "managed_starter"
  | "managed_growth"
  | "managed_enterprise";

interface PublicPricingTier {
  id: PublicPlanTierId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  tokenPoolLabel: string;
  badge: string;
  highlight?: boolean;
  ctaLabel: string;
  features: string[];
}

export const PUBLIC_PLAN_CATALOG: PublicPricingTier[] = [
  {
    id: "byok_free",
    name: "BYOK Free",
    tagline: "Use your own API keys at $0/mo platform fee.",
    monthlyPrice: 0,
    annualPrice: 0,
    tokenPoolLabel: "Unlimited (Your Own Keys)",
    badge: "1 Free Workspace",
    ctaLabel: "Start Free with BYOK",
    features: [
      "1 private BYOK workspace included at $0/mo",
      "Bank-grade AES-256 encrypted key vault",
      "Supports Groq, Gemini, OpenAI, Claude & OpenRouter",
      "Zero token markup — pay providers directly",
      "Invite staff safely (Owner & Operator roles)",
    ],
  },
  {
    id: "managed_starter",
    name: "Managed Starter",
    tagline: "All-inclusive AI workspace — zero API key setup needed.",
    monthlyPrice: 49,
    annualPrice: 39,
    tokenPoolLabel: "2,000,000 tokens / mo",
    badge: "Per Workspace",
    ctaLabel: "Start with Starter",
    features: [
      "2,000,000 monthly AI tokens for your workspace",
      "Pre-connected Groq, Gemini & OpenAI master keys",
      "1-click Industry AI Brain & custom brand rules",
      "Real-time live streaming & private chat memory",
      "Standard email support",
    ],
  },
  {
    id: "managed_growth",
    name: "Managed Growth",
    tagline: "High-capacity monthly AI pool for active client teams.",
    monthlyPrice: 149,
    annualPrice: 119,
    tokenPoolLabel: "10,000,000 tokens / mo",
    badge: "Most Popular",
    highlight: true,
    ctaLabel: "Start with Growth",
    features: [
      "10,000,000 monthly AI tokens for your workspace",
      "All top reasoning & ultra-fast AI models unlocked",
      "Priority AI routing & 30-day automatic quota reset",
      "Full live web research & CRM automation tools",
      "Priority email & live troubleshooting support",
    ],
  },
  {
    id: "managed_enterprise",
    name: "Managed Agency",
    tagline: "Maximum monthly capacity for high-volume agencies.",
    monthlyPrice: 399,
    annualPrice: 319,
    tokenPoolLabel: "35,000,000 tokens / mo",
    badge: "High Volume",
    ctaLabel: "Start with Agency",
    features: [
      "35,000,000 monthly AI tokens for your workspace",
      "Dedicated high-speed limits across all AI models",
      "Custom industry guardrails & compliance rules",
      "Multi-operator team seat management",
      "Dedicated priority Slack/WhatsApp engineering SLA",
    ],
  },
];

export function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "annual"
  );

  return (
    <section
      id="pricing"
      className="border-b border-zinc-800/80 bg-[#0B0B0E] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-3.5 py-1 text-xs font-semibold text-[#A3E635]">
            <Layers className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>Simple, Transparent Pricing</span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Start Free at $0/mo, or Pick an All-Inclusive Managed Plan
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Every workspace has its own isolated usage pool and billing mode.
            Upgrade or add more client workspaces anytime inside your dashboard.
          </p>

          {/* Monthly / Annual Billing Toggle */}
          <div className="mt-8 inline-flex items-center rounded-xl border border-zinc-800 bg-[#121215] p-1">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                billingInterval === "monthly"
                  ? "bg-[#84CC16] text-[#09090B]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                billingInterval === "annual"
                  ? "bg-[#84CC16] text-[#09090B]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${
                  billingInterval === "annual"
                    ? "bg-[#09090B]/20 text-[#09090B]"
                    : "bg-[#84CC16]/15 text-[#A3E635]"
                }`}
              >
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* 4 3D Spotlight Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PUBLIC_PLAN_CATALOG.map((tier) => {
            const price =
              billingInterval === "annual"
                ? tier.annualPrice
                : tier.monthlyPrice;
            const registerHref = `/register?plan=${tier.id}&interval=${billingInterval}`;

            return (
              <Spotlight3DCard
                key={tier.id}
                highlighted={Boolean(tier.highlight)}
                maxTilt={4}
                className="flex flex-col justify-between p-6"
              >
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-3 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider ${
                          tier.highlight
                            ? "bg-[#84CC16] text-[#09090B]"
                            : "border border-zinc-700 bg-zinc-900 text-zinc-300"
                        }`}
                      >
                        {tier.badge}
                      </span>
                      {tier.id !== "byok_free" &&
                        billingInterval === "annual" && (
                          <span className="font-mono text-[10px] font-semibold text-[#A3E635]">
                            Billed yearly
                          </span>
                        )}
                    </div>

                    <h3 className="mt-4 text-xl font-extrabold text-white">
                      {tier.name}
                    </h3>
                    <p className="mt-1.5 min-h-[38px] text-xs leading-relaxed text-zinc-400">
                      {tier.tagline}
                    </p>

                    <div className="mt-5 flex items-baseline gap-1.5 border-b border-zinc-800 pb-5">
                      <span className="text-4xl font-extrabold tracking-tight text-white">
                        ${price}
                      </span>
                      <span className="text-xs text-zinc-400">
                        / mo {tier.id !== "byok_free" ? "per workspace" : ""}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2.5">
                      {tier.id === "byok_free" ? (
                        <KeyRound className="h-4 w-4 shrink-0 text-[#84CC16]" />
                      ) : (
                        <Zap className="h-4 w-4 shrink-0 text-[#84CC16]" />
                      )}
                      <span className="font-mono text-[11px] font-semibold text-zinc-200">
                        {tier.tokenPoolLabel}
                      </span>
                    </div>

                    <ul className="mt-5 space-y-2.5">
                      {tier.features.map((feat) => (
                        <li
                          key={feat}
                          className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-300"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#84CC16]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-7 pt-2">
                    <Link
                      href={registerHref}
                      className={`group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                        tier.highlight
                          ? "bg-[#84CC16] text-[#09090B] shadow-[0_0_24px_rgba(132,204,22,0.28)] hover:bg-[#A3E635]"
                          : "border border-zinc-700 bg-[#09090B] text-white hover:border-[#84CC16] hover:text-[#A3E635]"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{tier.ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </Spotlight3DCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}