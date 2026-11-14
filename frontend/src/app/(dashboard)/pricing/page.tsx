"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  KeyRound,
  Zap,
  Building2,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  Loader2,
  Layers,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import {
  useWorkspace,
  type PlanTierId,
} from "@/context/WorkspaceContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface PricingTier {
  id: PlanTierId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  tokenPoolLabel: string;
  monthlyTokens: number;
  highlight?: boolean;
  badge?: string;
  ctaLabel: string;
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "byok_free",
    name: "BYOK Free",
    tagline: "One Free Workspace (Own API Keys) powered by your own encrypted API keys.",
    monthlyPrice: 0,
    annualPrice: 0,
    tokenPoolLabel: "1 Free Workspace (Own API Keys)",
    monthlyTokens: 0,
    badge: "1 Free",
    ctaLabel: "Use BYOK Free",
    features: [
      "Create 1 Free Workspace (Own API Keys) at $0/mo",
      "AES-256 Fernet encrypted key vault per workspace",
      "Supports Groq, Gemini, OpenAI, Anthropic & OpenRouter",
      "Zero platform token markup — pay providers directly",
      "RBAC team invitations (Owner & Operator roles)",
    ],
  },
  {
    id: "managed_starter",
    name: "Managed Starter",
    tagline: "Turnkey AI workspace with zero API key management required.",
    monthlyPrice: 49,
    annualPrice: 39,
    tokenPoolLabel: "2,000,000 tokens / mo",
    monthlyTokens: 2_000_000,
    badge: "Per Workspace",
    ctaLabel: "Select Starter",
    features: [
      "2,000,000 managed tokens/month for this workspace",
      "Pre-configured Groq, Gemini & OpenAI master keys",
      "Industry AI Brain & custom system persona rules",
      "Real-time SSE streaming & persistent memory",
      "Standard email support",
    ],
  },
  {
    id: "managed_growth",
    name: "Managed Growth",
    tagline: "High-throughput monthly token pool for active client operations.",
    monthlyPrice: 149,
    annualPrice: 119,
    tokenPoolLabel: "10,000,000 tokens / mo",
    monthlyTokens: 10_000_000,
    highlight: true,
    badge: "Most Popular",
    ctaLabel: "Upgrade to Growth",
    features: [
      "10,000,000 managed tokens/month for this workspace",
      "All frontier reasoning & fast models unlocked",
      "Priority LLM routing & automated 30-day cycle reset",
      "Full MCP connectors & specialized agent subgraphs",
      "Priority email & live troubleshooting support",
    ],
  },
  {
    id: "managed_enterprise",
    name: "Managed Agency",
    tagline: "Maximum monthly capacity for high-volume agency & enterprise tenants.",
    monthlyPrice: 399,
    annualPrice: 319,
    tokenPoolLabel: "35,000,000 tokens / mo",
    monthlyTokens: 35_000_000,
    badge: "High Volume",
    ctaLabel: "Upgrade to Agency",
    features: [
      "35,000,000 managed tokens/month for this workspace",
      "Dedicated high-concurrency rate limits across models",
      "Custom industry guardrails & compliance controls",
      "Multi-operator team seat management",
      "Dedicated priority Slack/WhatsApp engineering SLA",
    ],
  },
];

const INDUSTRY_LABELS: Record<string, string> = {
  agency: "Agency & Consulting",
  real_estate: "Real Estate & Property",
  ecommerce: "E-commerce & D2C",
  healthcare: "Healthcare & Clinics",
  education: "Education & EdTech",
  saas: "SaaS & B2B Tech",
  other: "Other Vertical",
};

export default function PricingPage() {
  const {
    workspaces,
    activeWorkspace,
    switchWorkspace,
    refreshWorkspaces,
    userEmail,
  } = useWorkspace();

  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "annual"
  );
  const [submittingTier, setSubmittingTier] = useState<PlanTierId | null>(null);
  const [liveBilling, setLiveBilling] = useState<{
    plan_tier: PlanTierId;
    plan_mode: "byok" | "managed";
    managed_approved: boolean;
    managed_request_status: string;
    requested_plan_tier?: string | null;
    monthly_token_limit: number;
    tokens_used_this_month: number;
    billing_cycle_end?: string | null;
    industry?: string;
  } | null>(null);

  const [bannerFeedback, setBannerFeedback] = useState<{
    type: "success" | "pending" | "error";
    text: string;
  } | null>(null);

  const workspaceId =
    activeWorkspace?.id || activeWorkspace?.workspace_id || "";

  const fetchWorkspaceBilling = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/billing`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setLiveBilling(data.workspace);
        }
      }
    } catch {
      // Fallback to context values if offline
    }
  }, [workspaceId]);

  useEffect(() => {
    setBannerFeedback(null);
    fetchWorkspaceBilling();
  }, [fetchWorkspaceBilling]);

  const currentTier: PlanTierId =
    liveBilling?.plan_tier ||
    activeWorkspace?.plan_tier ||
    (activeWorkspace?.managed_approved ? "managed_starter" : "byok_free");

  const isManagedApproved = Boolean(
    liveBilling?.managed_approved ?? activeWorkspace?.managed_approved
  );
  const requestStatus =
    liveBilling?.managed_request_status ||
    activeWorkspace?.managed_request_status ||
    "none";
  const requestedTier =
    liveBilling?.requested_plan_tier ?? activeWorkspace?.requested_plan_tier;

  const monthlyLimit = Number(
    liveBilling?.monthly_token_limit ??
      activeWorkspace?.monthly_token_limit ??
      0
  );
  const tokensUsed = Number(
    liveBilling?.tokens_used_this_month ??
      activeWorkspace?.tokens_used_this_month ??
      0
  );
  const usagePercent =
    monthlyLimit > 0
      ? Math.min(100, Math.round((tokensUsed / monthlyLimit) * 1000) / 10)
      : 0;

  const cycleEndRaw =
    liveBilling?.billing_cycle_end ?? activeWorkspace?.billing_cycle_end;
  const formattedCycleEnd = cycleEndRaw
    ? new Date(cycleEndRaw).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const workspaceIndustry =
    liveBilling?.industry || activeWorkspace?.industry || "agency";

  const handleSelectPlan = async (tier: PricingTier) => {
    if (!workspaceId) return;
    setSubmittingTier(tier.id);
    setBannerFeedback(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/plan-upgrade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_tier: tier.id,
            billing_interval: billingInterval,
            requester_email: userEmail,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update workspace plan.");
      }

      await Promise.all([refreshWorkspaces(), fetchWorkspaceBilling()]);

      if (data.status === "pending_approval") {
        setBannerFeedback({
          type: "pending",
          text:
            data.message ||
            `Upgrade request submitted for ${tier.name}. You can also add a BYOK key in Settings while awaiting activation.`,
        });
      } else {
        setBannerFeedback({
          type: "success",
          text:
            data.message ||
            `${tier.name} is now active for ${activeWorkspace?.name}.`,
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not process plan change.";
      setBannerFeedback({ type: "error", text: msg });
    } finally {
      setSubmittingTier(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Per-Workspace Selector & Live Quota Banner */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-[#121215] via-[#151811] to-[#121215] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#84CC16] shadow-[0_0_10px_#84CC16]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#A3E635]">
                Per-Workspace Billing & Quota Isolation
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 font-mono text-[10px] text-zinc-300">
                {INDUSTRY_LABELS[workspaceIndustry] || workspaceIndustry}
              </span>
            </div>

            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Upgrade & Token Quotas —{" "}
              <span className="text-[#A3E635]">
                {activeWorkspace?.name || "Active Workspace"}
              </span>
            </h1>
            <p className="max-w-2xl text-xs text-zinc-400">
              Create unlimited <strong className="text-zinc-200">BYOK Free</strong>{" "}
              workspaces with your own encrypted API keys, or license a{" "}
              <strong className="text-zinc-200">Fully Managed</strong> monthly
              token pool isolated per client workspace.
            </p>
          </div>

          {/* Target Workspace Switcher + Vault Link */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-2.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Target Workspace
              </label>
              <div className="mt-1 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#84CC16]" />
                <select
                  value={workspaceId}
                  onChange={(e) => switchWorkspace(e.target.value)}
                  className="bg-transparent pr-2 text-xs font-semibold text-white focus:outline-none"
                >
                  {workspaces.map((ws) => {
                    const id = ws.id || ws.workspace_id;
                    return (
                      <option
                        key={id}
                        value={id}
                        className="bg-[#09090B] text-white"
                      >
                        {ws.name} (
                        {(ws.plan_tier || "byok_free")
                          .replace("managed_", "")
                          .replace("_", " ")
                          .toUpperCase()}
                        )
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-3 text-xs font-semibold text-zinc-200 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
            >
              <KeyRound className="h-4 w-4 text-[#84CC16]" />
              <span>Settings & Vault</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Live Workspace Quota Meter & Pending Approval Pill */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-zinc-800/80 pt-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-[#09090B]/90 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Current Workspace Plan</span>
              {requestStatus === "pending" && requestedTier ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                  <Clock className="h-3 w-3" /> Pending:{" "}
                  {requestedTier.replace("managed_", "").toUpperCase()}
                </span>
              ) : (
                <span className="rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-[#A3E635]">
                  {currentTier.replace("_", " ")}
                </span>
              )}
            </div>
            <p className="mt-2 font-mono text-sm font-bold text-white">
              {isManagedApproved && currentTier !== "byok_free"
                ? "Fully Managed Pool Active"
                : "BYOK Vault Mode ($0 Platform Fee)"}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#09090B]/90 p-3.5 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-zinc-300">
                Monthly Token Consumption (Isolated to{" "}
                {activeWorkspace?.name || "Workspace"})
              </span>
              <span className="font-mono text-xs text-[#A3E635]">
                {monthlyLimit > 0
                  ? `${tokensUsed.toLocaleString()} / ${monthlyLimit.toLocaleString()} tokens (${usagePercent}%)`
                  : `${tokensUsed.toLocaleString()} tokens tracked • Unlimited BYOK`}
              </span>
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent >= 90 ? "bg-rose-500" : "bg-[#84CC16]"
                }`}
                style={{
                  width: `${monthlyLimit > 0 ? Math.max(2, usagePercent) : 100}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>
                {monthlyLimit > 0
                  ? `Remaining pool: ${Math.max(
                      0,
                      monthlyLimit - tokensUsed
                    ).toLocaleString()} tokens`
                  : "Using your workspace AES-256 Vault API keys"}
              </span>
              {formattedCycleEnd && (
                <span>Cycle resets: {formattedCycleEnd}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerFeedback && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-xs ${
            bannerFeedback.type === "success"
              ? "border-[#84CC16]/40 bg-[#84CC16]/10 text-[#A3E635]"
              : bannerFeedback.type === "pending"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
        >
          {bannerFeedback.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : bannerFeedback.type === "pending" ? (
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{bannerFeedback.text}</p>
            {bannerFeedback.type === "pending" && (
              <p className="mt-1 text-[11px] text-amber-300/90">
                Want to chat immediately while your Managed quota is being
                approved?{" "}
                <Link
                  href="/settings"
                  className="underline hover:text-white"
                >
                  Add a BYOK key in Settings → Plan & AI Vault
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      )}

      {/* Monthly / Annual Billing Toggle */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#121215] px-5 py-4 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <Layers className="h-4 w-4 text-[#84CC16]" />
          <span>
            Each Managed subscription applies exclusively to{" "}
            <strong className="text-white">{activeWorkspace?.name}</strong>.
          </span>
        </div>

        <div className="inline-flex items-center rounded-xl border border-zinc-800 bg-[#09090B] p-1">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              billingInterval === "monthly"
                ? "bg-[#84CC16] text-[#09090B]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("annual")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              billingInterval === "annual"
                ? "bg-[#84CC16] text-[#09090B]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Annual</span>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
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

      {/* 4 Pricing Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PRICING_TIERS.map((tier) => {
          const price =
            billingInterval === "annual" ? tier.annualPrice : tier.monthlyPrice;
          const isCurrentPlan = currentTier === tier.id;
          const isPendingThisTier =
            requestStatus === "pending" && requestedTier === tier.id;
          const isSubmitting = submittingTier === tier.id;

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                tier.highlight
                  ? "border-[#84CC16] bg-[#121410] shadow-[0_0_30px_rgba(132,204,22,0.12)]"
                  : isCurrentPlan
                  ? "border-[#84CC16]/60 bg-[#121215]"
                  : "border-zinc-800 bg-[#121215] hover:border-zinc-700"
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      tier.highlight
                        ? "bg-[#84CC16] text-[#09090B]"
                        : "border border-zinc-700 bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    {tier.badge}
                  </span>

                  {isCurrentPlan && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#A3E635]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> ACTIVE
                    </span>
                  )}
                  {isPendingThisTier && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-300">
                      <Clock className="h-3.5 w-3.5" /> PENDING
                    </span>
                  )}
                </div>

                <h2 className="mt-3.5 text-lg font-bold text-white">
                  {tier.name}
                </h2>
                <p className="mt-1 min-h-[34px] text-xs leading-relaxed text-zinc-400">
                  {tier.tagline}
                </p>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-1 border-b border-zinc-800 pb-4">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    ${price}
                  </span>
                  <span className="text-xs text-zinc-400">
                    / mo {tier.id !== "byok_free" ? "per workspace" : ""}
                  </span>
                </div>

                {/* Included Token Pool Pill */}
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2">
                  {tier.id === "byok_free" ? (
                    <KeyRound className="h-4 w-4 shrink-0 text-[#84CC16]" />
                  ) : (
                    <Zap className="h-4 w-4 shrink-0 text-[#84CC16]" />
                  )}
                  <span className="font-mono text-[11px] font-semibold text-zinc-200">
                    {tier.tokenPoolLabel}
                  </span>
                </div>

                {/* Feature Bullets */}
                <ul className="mt-4 space-y-2.5">
                  {tier.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-xs text-zinc-300"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#84CC16]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-2">
                <button
                  type="button"
                  disabled={isCurrentPlan || isPendingThisTier || isSubmitting}
                  onClick={() => handleSelectPlan(tier)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    isCurrentPlan
                      ? "cursor-default border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]"
                      : isPendingThisTier
                      ? "cursor-default border border-amber-500/40 bg-amber-500/15 text-amber-200"
                      : tier.highlight
                      ? "bg-[#84CC16] text-[#09090B] shadow-lg shadow-[#84CC16]/20 hover:bg-[#A3E635]"
                      : "border border-zinc-700 bg-[#09090B] text-white hover:border-[#84CC16] hover:text-[#A3E635]"
                  } disabled:opacity-75`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Active on Workspace
                    </>
                  ) : isPendingThisTier ? (
                    <>
                      <Clock className="h-4 w-4" />
                      Approval Requested
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {isManagedApproved && tier.id !== "byok_free"
                        ? `Switch to ${tier.name}`
                        : tier.ctaLabel}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-Workspace Architecture Footer Note */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#84CC16]/30 bg-[#84CC16]/10 text-[#A3E635]">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">
              Need custom multi-client agency packaging or BYOK key setup?
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Each workspace maintains its own AES-256 API Vault, token meter,
              and Industry AI Brain. Manage keys or invite operators anytime in
              Settings.
            </p>
          </div>
        </div>

        <Link
          href="/settings"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 px-4 py-2 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B]"
        >
          Open Workspace Vault
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}