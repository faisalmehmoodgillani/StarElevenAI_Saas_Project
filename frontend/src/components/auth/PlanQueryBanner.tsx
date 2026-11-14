"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Sparkles } from "lucide-react";

export interface ResolvedPlanSelection {
  planTier: string;
  planMode: "byok" | "managed";
  billingInterval: "monthly" | "annual";
  label: string;
  priceTag: string;
}

const PLAN_LABELS: Record<
  string,
  {
    label: string;
    mode: "byok" | "managed";
    monthlyPrice: number;
    annualPrice: number;
  }
> = {
  byok_free: {
    label: "BYOK Free",
    mode: "byok",
    monthlyPrice: 0,
    annualPrice: 0,
  },
  managed_starter: {
    label: "Managed Starter",
    mode: "managed",
    monthlyPrice: 49,
    annualPrice: 39,
  },
  managed_growth: {
    label: "Managed Growth",
    mode: "managed",
    monthlyPrice: 149,
    annualPrice: 119,
  },
  managed_enterprise: {
    label: "Managed Agency",
    mode: "managed",
    monthlyPrice: 399,
    annualPrice: 319,
  },
};

interface PlanQueryBannerProps {
  showBackHome?: boolean;
  showPlanPill?: boolean;
  onPlanResolved?: (selection: ResolvedPlanSelection) => void;
}

function PlanQueryInner({
  showBackHome = true,
  showPlanPill = true,
  onPlanResolved,
}: PlanQueryBannerProps) {
  const searchParams = useSearchParams();
  const rawPlan = (searchParams.get("plan") || "").toLowerCase().trim();
  const rawInterval =
    searchParams.get("interval") === "monthly" ? "monthly" : "annual";

  const matched = PLAN_LABELS[rawPlan];

  useEffect(() => {
    if (!matched || !onPlanResolved) return;
    const price =
      rawInterval === "annual" ? matched.annualPrice : matched.monthlyPrice;
    onPlanResolved({
      planTier: rawPlan,
      planMode: matched.mode,
      billingInterval: rawInterval,
      label: matched.label,
      priceTag: `$${price}/mo`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPlan, rawInterval]);

  const activePrice = matched
    ? rawInterval === "annual"
      ? matched.annualPrice
      : matched.monthlyPrice
    : 0;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      {showBackHome ? (
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-[#A3E635]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      ) : (
        <span />
      )}

      {showPlanPill && matched && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3 py-1 font-mono text-[11px] font-bold text-[#A3E635]">
          {matched.mode === "byok" ? (
            <KeyRound className="h-3 w-3" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          <span>
            {matched.label} (${activePrice}/mo • {rawInterval})
          </span>
        </span>
      )}
    </div>
  );
}

export function PlanQueryBanner(props: PlanQueryBannerProps) {
  return (
    <Suspense fallback={null}>
      <PlanQueryInner {...props} />
    </Suspense>
  );
}